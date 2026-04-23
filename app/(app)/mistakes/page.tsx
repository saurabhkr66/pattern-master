import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import MistakeLog from "@/components/review/MistakeLog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mistake Log – PatternMaster",
  description: "Analyse your wrong answers by pattern to fix root causes, not symptoms.",
};

function getCachedMistakes(userId: string) {
  return unstable_cache(
    async () => {
      const wrongAttempts = await prisma.attempt.findMany({
        where: { user_id: userId, is_correct: false },
        include: {
          question: {
            include: {
              pattern: { select: { id: true, topic_name: true, subject: true, exam_type: true } },
            },
          },
          pyq: {
            include: {
              pattern: { select: { id: true, topic_name: true, subject: true, exam_type: true } },
            },
          },
          subject_pyq: {
            include: { subject_pattern: { select: { id: true, subject_name: true } } },
          },
        },
        orderBy: { created_at: "desc" },
        take: 200,
      });

      // De-duplicate: one card per question, keep most recent attempt
      const seen = new Set<string>();
      const cards = wrongAttempts
        .filter((a) => {
          const key = a.question_id ?? a.pyq_id ?? a.subject_pyq_id ?? a.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((a) => {
          const q = a.question ?? a.pyq ?? a.subject_pyq;
          const sp = a.subject_pyq?.subject_pattern;
          const pattern =
            a.question?.pattern ??
            a.pyq?.pattern ??
            (sp
              ? { id: sp.id, topic_name: sp.subject_name, subject: sp.subject_name, exam_type: "GATE" }
              : null);
          if (!q || !pattern) return null;

          const qId = a.question_id ?? a.pyq_id ?? a.subject_pyq_id ?? a.id;

          return {
            id: qId,
            attemptId: a.id,
            question_text: q.question_text,
            options: (q.options as string[]) ?? [],
            correct_answer: q.correct_answer,
            user_answer: a.user_answer ?? null,
            explanation: q.explanation,
            topic_name: pattern.topic_name,
            subject: pattern.subject,
            patternId: pattern.id,
            ispyq: !!a.pyq_id || !!a.subject_pyq_id,
            year: "year" in q ? (q.year as number) : undefined,
            created_at: a.created_at.toISOString(),
            practiceUrl: `/practice?patternId=${pattern.id}&questionId=${qId}&subject=${encodeURIComponent(pattern.subject)}`,
          };
        })
        .filter(Boolean) as any[];

      return cards;
    },
    [`mistakes-v2-${userId}`],
    { revalidate: 60, tags: ["dashboard"] }
  )();
}

export default async function MistakesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const cards = await getCachedMistakes(userId);

  return (
    <div className="be-screen" style={{ minHeight: "100%" }}>
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "36px 20px 100px",
        }}
      >
        <MistakeLog cards={cards} />
      </div>
    </div>
  );
}
