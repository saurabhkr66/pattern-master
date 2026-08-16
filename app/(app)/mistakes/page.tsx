import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import MistakeLog from "@/components/review/MistakeLog";
import MistakesTabs from "@/components/review/MistakesTabs";
import type { Metadata } from "next";
// Type-only, so this erases at compile time and pulls in none of dppResult's
// server-only runtime. Using the real breakdown type here is what makes the
// "DppRun.answers is the stored BreakdownItem[]" claim checkable rather than a
// comment.
import { normalizeDppBreakdown } from "@/lib/dppResult";

/** One wrong question, shared by the Mocks and DPP panels so both can render
 *  through the same row component. */
export type WrongQuestion = {
  questionId: string;
  questionText: string;
  userAnswer: string | null;
  correctAnswer: string;
  subject?: string;
  topic?: string;
};

export type MockMistakePaper = {
  mockTestId: string | null;
  sessionId: string;
  title: string;
  examType: string;
  takenAt: string;
  wrong: WrongQuestion[];
};

export type DppMistakePaper = {
  dppId: string;
  runId: string;
  /** Links to /dpp/r/<code>, the owner's full analysis. Null on the rare
   *  collision path where a run submitted without a code. */
  shareCode: string | null;
  title: string;
  topicName: string;
  subject: string;
  takenAt: string;
  /** Practice mode is gated on having submitted a run — which, by construction,
   *  everyone in this list has. Only false when the sheet was later unreleased. */
  practiceAvailable: boolean;
  wrong: WrongQuestion[];
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
            -- Rows with no bank/PYQ ref: legacy mock rows, orphaned DPP rows
            -- (dpp_question_id SetNull on sheet delete), and live DPP practice
            -- answers. COALESCE lumps them all into ONE null partition, so
            -- without this they would keep a single arbitrary row, burn a slot
            -- in the LIMIT, and then be dropped downstream for having no
            -- question relation. DPP mistakes are not renderable here yet — the
            -- card needs a DppQuestion→Dpp→Pattern join path.
            AND COALESCE(question_id, pyq_id) IS NOT NULL
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

function getCachedDppMistakes(userId: string) {
  return unstable_cache(
    async (): Promise<DppMistakePaper[]> => {
      // Deliberately modelled on getCachedMockMistakes above, and for the same
      // reason it works: DppRun.answers is byte-compatible with
      // TestSession.answers (both BreakdownItem[]) — see prisma/schema/dpprun.prisma.
      //
      // So DPP mistakes come straight out of the run's stored breakdown. No
      // Attempt rows are involved, which is why this tab needed no
      // dpp_question_id fan-out at submit and no change to the COALESCE
      // partitions the Practice tab depends on.
      //
      // DISTINCT ON (dpp_id): the most recent submitted run per sheet, matching
      // the mocks panel. An older attempt's mistakes are superseded, not merged.
      const rows = await prisma.$queryRaw<{
        run_id: string;
        dpp_id: string;
        share_code: string | null;
        name: string;
        topic_name: string;
        subject: string;
        is_public: boolean;
        status: string;
        submitted_at: Date | null;
        answers: unknown;
      }[]>`
        SELECT DISTINCT ON (dr.dpp_id)
          dr.id           AS run_id,
          dr.dpp_id,
          dr.share_code,
          d.name,
          p.topic_name,
          p.subject,
          d.is_public,
          d.status,
          dr.submitted_at,
          dr.answers
        FROM "DppRun" dr
        JOIN "Dpp" d ON d.id = dr.dpp_id
        JOIN "Pattern" p ON p.id = d.pattern_id
        WHERE dr.user_id = ${userId}
          AND dr.status = 'submitted'
        ORDER BY dr.dpp_id, dr.submitted_at DESC
      `;

      const papers: DppMistakePaper[] = rows
        .map((r) => {
          const answers = normalizeDppBreakdown(r.answers);
          // isCorrect is `false` for answered-and-wrong and `null` for skipped,
          // so a strict === false already excludes skips — no isSkipped flag
          // needed, unlike the mock shape.
          const wrong: WrongQuestion[] = answers
            .filter((a) => a && a.isCorrect === false)
            .map((a) => ({
              questionId: String(a.questionId ?? ""),
              questionText: String(a.questionText ?? ""),
              userAnswer: a.userAnswer ?? null,
              correctAnswer: String(a.correctAnswer ?? ""),
              subject: a.subject ?? undefined,
              topic: a.topic ?? undefined,
            }));

          return {
            dppId: r.dpp_id,
            runId: r.run_id,
            shareCode: r.share_code,
            title: r.name,
            topicName: r.topic_name,
            subject: r.subject,
            takenAt: (r.submitted_at ?? new Date()).toISOString(),
            practiceAvailable: r.is_public && r.status === "ready",
            wrong,
          };
        })
        .filter((p) => p.wrong.length > 0)
        .sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1));

      return papers;
    },
    [`dpp-mistakes-v1-${userId}`],
    // Same tag the DPP submit path and save-attempt already bust.
    { revalidate: 60, tags: [`dashboard-${userId}`] }
  )();
}

export default async function MistakesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [cards, mockPapers, dppPapers] = await Promise.all([
    getCachedMistakes(userId),
    getCachedMockMistakes(userId),
    getCachedDppMistakes(userId),
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
        <MistakesTabs
          practice={<MistakeLog cards={cards} />}
          mockPapers={mockPapers}
          dppPapers={dppPapers}
        />
      </div>
    </div>
  );
}
