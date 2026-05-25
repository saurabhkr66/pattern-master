import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import MistakeLog from "@/components/review/MistakeLog";
import MistakesTabs from "@/components/review/MistakesTabs";
import type { Metadata } from "next";

export type MockMistakePaper = {
  mockTestId: string | null;
  sessionId: string;
  title: string;
  examType: string;
  takenAt: string;
  wrong: {
    questionId: string;
    questionText: string;
    userAnswer: string | null;
    correctAnswer: string;
    subject?: string;
    topic?: string;
  }[];
};

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
                   PARTITION BY COALESCE(question_id, pyq_id)
                   ORDER BY created_at DESC
                 ) as rn
          FROM "Attempt"
          WHERE user_id = ${userId} AND mock_question_id IS NULL
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
          question: {
            select: {
              id: true,
              question_text: true,
              correct_answer: true,
              pattern: { select: { id: true, topic_name: true, subject: true, exam_type: true, branch: true } },
            },
          },
          pyq: {
            select: {
              id: true,
              question_text: true,
              correct_answer: true,
              year: true,
              pattern: { select: { id: true, topic_name: true, subject: true, exam_type: true, branch: true } },
            },
          },
        },
        orderBy: { created_at: "desc" },
      });

      const cards = wrongAttempts
        .map((a) => {
          const q = a.question ?? a.pyq;
          const pattern = a.question?.pattern ?? a.pyq?.pattern ?? null;
          if (!q || !pattern) return null;

          const qId = a.question_id ?? a.pyq_id ?? a.id;

          return {
            id: qId,
            attemptId: a.id,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            user_answer: a.user_answer ?? null,
            topic_name: pattern.topic_name,
            subject: pattern.subject,
            patternId: pattern.id,
            ispyq: !!a.pyq_id,
            year: "year" in q ? (q.year as number) : undefined,
            created_at: a.created_at.toISOString(),
            practiceUrl: `/practice?patternId=${pattern.id}&questionId=${qId}&subject=${encodeURIComponent(pattern.subject)}&exam=${encodeURIComponent(pattern.exam_type)}${(pattern as any).branch ? `&branch=${encodeURIComponent((pattern as any).branch)}` : ""}`,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      return cards;
    },
    [`mistakes-v2-${userId}`],
    { revalidate: 60, tags: [`dashboard-${userId}`] }
  )();
}

function getCachedMockMistakes(userId: string) {
  return unstable_cache(
    async (): Promise<MockMistakePaper[]> => {
      // Latest session per mock_test_id (only sessions linked to a mock).
      // We pull the `answers` JSONB and filter wrong+unskipped client-side
      // because the JSON shape changes across the codebase's history.
      const rows = await prisma.$queryRaw<{
        session_id: string;
        mock_test_id: string | null;
        title: string | null;
        exam_type: string;
        created_at: Date;
        answers: any;
      }[]>`
        SELECT DISTINCT ON (ts.mock_test_id)
          ts.id          AS session_id,
          ts.mock_test_id,
          mtt.title      AS title,
          ts.exam_type,
          ts.created_at,
          ts.answers
        FROM "TestSession" ts
        LEFT JOIN "MockTestTemplate" mtt ON mtt.id = ts.mock_test_id
        WHERE ts.user_id = ${userId}
          AND ts.mock_test_id IS NOT NULL
        ORDER BY ts.mock_test_id, ts.created_at DESC
      `;

      const papers: MockMistakePaper[] = rows.map((r) => {
        const answers: any[] = Array.isArray(r.answers) ? r.answers : [];
        const wrong = answers
          .filter((a) => a && a.isCorrect === false && a.isSkipped !== true)
          .map((a) => ({
            questionId: String(a.questionId ?? ""),
            questionText: String(a.questionText ?? ""),
            userAnswer: a.userAnswer ?? null,
            correctAnswer: String(a.correctAnswer ?? ""),
            subject: a.subject ?? undefined,
            topic: a.topic ?? undefined,
          }));
        return {
          mockTestId: r.mock_test_id,
          sessionId: r.session_id,
          title: r.title ?? "Untitled Mock",
          examType: r.exam_type,
          takenAt: r.created_at.toISOString(),
          wrong,
        };
      })
      .filter((p) => p.wrong.length > 0)
      .sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1));

      return papers;
    },
    [`mock-mistakes-v1-${userId}`],
    { revalidate: 60, tags: [`dashboard-${userId}`] }
  )();
}

export default async function MistakesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [cards, mockPapers] = await Promise.all([
    getCachedMistakes(userId),
    getCachedMockMistakes(userId),
  ]);

  return (
    <div className="be-screen" style={{ minHeight: "100%" }}>
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "36px 20px 100px",
        }}
      >
        <MistakesTabs practice={<MistakeLog cards={cards} />} mockPapers={mockPapers} />
      </div>
    </div>
  );
}
