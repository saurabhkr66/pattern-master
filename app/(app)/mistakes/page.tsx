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
      // Find only the LATEST attempt for each question that is WRONG.
      // Capped at 100 (was 200). Selective `select:` below drops `options`
      // and `explanation` since MistakeLog never displays them.
      const latestWrongRows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM (
          SELECT id, is_correct, created_at,
                 ROW_NUMBER() OVER (
                   PARTITION BY COALESCE(question_id, pyq_id, subject_pyq_id)
                   ORDER BY created_at DESC
                 ) as rn
          FROM "Attempt"
          WHERE user_id = ${userId}
        ) t
        WHERE rn = 1 AND is_correct = false
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const ids = latestWrongRows.map((r) => r.id);
      if (ids.length === 0) return [];

      const wrongAttempts = await prisma.attempt.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          user_answer: true,
          created_at: true,
          question_id: true,
          pyq_id: true,
          subject_pyq_id: true,
          question: {
            select: {
              id: true,
              question_text: true,
              correct_answer: true,
              pattern: { select: { id: true, topic_name: true, subject: true, exam_type: true } },
            },
          },
          pyq: {
            select: {
              id: true,
              question_text: true,
              correct_answer: true,
              year: true,
              pattern: { select: { id: true, topic_name: true, subject: true, exam_type: true } },
            },
          },
          subject_pyq: {
            select: {
              id: true,
              question_text: true,
              correct_answer: true,
              year: true,
              subject_pattern: { select: { id: true, subject_name: true } },
            },
          },
        },
        orderBy: { created_at: "desc" },
      });

      const cards = wrongAttempts
        .map((a) => {
          const q = a.question ?? a.pyq ?? a.subject_pyq;
          const sp = a.subject_pyq?.subject_pattern;
          const pattern =
            a.question?.pattern ??
            a.pyq?.pattern ??
            (sp
              ? { id: `subject-${sp.id}`, topic_name: sp.subject_name, subject: sp.subject_name, exam_type: "GATE" }
              : null);
          if (!q || !pattern) return null;

          const qId = a.question_id ?? a.pyq_id ?? a.subject_pyq_id ?? a.id;

          return {
            id: qId,
            attemptId: a.id,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            user_answer: a.user_answer ?? null,
            topic_name: pattern.topic_name,
            subject: pattern.subject,
            patternId: pattern.id,
            ispyq: !!a.pyq_id || !!a.subject_pyq_id,
            year: "year" in q ? (q.year as number) : undefined,
            created_at: a.created_at.toISOString(),
            practiceUrl: `/practice?patternId=${pattern.id}&questionId=${qId}&subject=${encodeURIComponent(pattern.subject)}`,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      return cards;
    },
    [`mistakes-v2-${userId}`],
    { revalidate: 60, tags: [`dashboard-${userId}`] }
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
