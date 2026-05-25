import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ReportsClient from "./ReportsClient";

export const revalidate = 120;

export default async function AdminReportsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get email from our own database to avoid Clerk API timeouts
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();

  // SECURE ADMIN CHECK
  const adminEmails = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",");

  if (!userEmail || (!adminEmails.includes(userEmail) && userEmail !== "sauravkum4200@gmail.com")) {
    redirect("/");
  }

  const EXAMS = ["GATE", "JEE_MAIN", "JEE_ADVANCED", "NEET"];

  // Fetch manual reports first so we know which mock question IDs are reported.
  // Bounded `take:` + selective `include:` to cap egress per page load —
  // unbounded queries with full nested includes were the main culprit driving
  // Supabase egress past the free tier.
  const manualReports = await prisma.questionReport.findMany({
    where: { status: "pending" },
    orderBy: { created_at: "desc" },
    take: 100,
    include: {
      user: { select: { email: true } },
      question: {
        select: {
          id: true, question_text: true, options: true, correct_answer: true,
          explanation: true, question_type: true, images: true,
          pattern: { select: { id: true, topic_name: true, subject: true, exam_type: true } },
        },
      },
      pyq: {
        select: {
          id: true, question_text: true, options: true, correct_answer: true,
          explanation: true, question_type: true, year: true, images: true,
          pattern: { select: { id: true, topic_name: true, subject: true, exam_type: true } },
        },
      },
    }
  });

  const reportedMockQuestionIds = manualReports
    .map(r => r.mock_question_id)
    .filter((id): id is string => Boolean(id));

  // All remaining queries run in parallel
  const [
    missingPYQs,
    mockTemplatesMeta,
    missingMockRows,
    flaggedMockRows,
    reportedMockRows,
  ] = await Promise.all([
    prisma.pYQ.findMany({
      where: { explanation: "", exam_type: { in: EXAMS } },
      take: 15,
      select: {
        id: true, question_text: true, options: true, correct_answer: true,
        explanation: true, question_type: true, exam_type: true, images: true,
        pattern: { select: { exam_type: true, subject: true } },
      },
    }),
    // Only id + title needed for the PDF panel dropdown — no questions JSONB
    prisma.mockTestTemplate.findMany({
      where: { mode: 'seeded' },
      select: { id: true, title: true, exam_type: true },
    }),
    // Missing explanations: filter entirely in Postgres, 10 per exam (was 30).
    // Each `question` row carries the full question JSONB (~5-20KB), so
    // reducing the per-exam limit is the highest-leverage egress fix here.
    prisma.$queryRaw<{ template_id: string; title: string; exam_type: string; question: any }[]>`
      WITH ranked AS (
        SELECT
          t.id   AS template_id,
          t.title,
          t.exam_type,
          elem   AS question,
          ROW_NUMBER() OVER (PARTITION BY t.exam_type ORDER BY t.id) AS rn
        FROM "MockTestTemplate" t,
        jsonb_array_elements(t.questions) AS elem
        WHERE t.exam_type = ANY(${EXAMS}::text[])
          AND t.mode = 'seeded'
          AND (elem->>'explanation' IS NULL OR trim(elem->>'explanation') = '')
          AND NOT (COALESCE(elem->'images', '[]'::jsonb) @> '[{"type":"explanation"}]'::jsonb)
      )
      SELECT template_id, title, exam_type, question
      FROM ranked
      WHERE rn <= 10
    `,
    // AI mismatches: hard LIMIT to bound worst case.
    prisma.$queryRaw<{ template_id: string; title: string; exam_type: string; question: any }[]>`
      SELECT
        t.id   AS template_id,
        t.title,
        t.exam_type,
        elem   AS question
      FROM "MockTestTemplate" t,
      jsonb_array_elements(t.questions) AS elem
      WHERE t.mode = 'seeded'
        AND (elem->>'ai_answer_mismatch')::boolean = true
      LIMIT 50
    `,
    // Fetch only the specific questions that are manually reported
    reportedMockQuestionIds.length > 0
      ? prisma.$queryRaw<{ template_id: string; question: any }[]>`
          SELECT t.id AS template_id, elem AS question
          FROM "MockTestTemplate" t,
          jsonb_array_elements(t.questions) AS elem
          WHERE elem->>'id' = ANY(${reportedMockQuestionIds}::text[])
        `
      : Promise.resolve([]),
  ]);

  // Build a lookup for reported mock questions so manual reports can reference them
  const reportedMockQMap = Object.fromEntries(
    reportedMockRows.map(r => [r.question.id, { templateId: r.template_id, q: r.question }])
  );

  // Attach question data to manual reports that reference mock questions
  const enrichedManualReports = manualReports.map(r => {
    if (r.mock_question_id && reportedMockQMap[r.mock_question_id]) {
      return { ...r, q: reportedMockQMap[r.mock_question_id].q };
    }
    return r;
  });

  const missingMockQuestions = missingMockRows.map(row => ({
    id: `auto-mock-${row.template_id}-${row.question.id}`,
    reason: "Missing Explanation (Mock)",
    status: "pending",
    created_at: new Date(),
    user: { email: "System Scanner" },
    isMock: true,
    mock_test_id: row.template_id,
    mock_question_id: row.question.id,
    exam_type: row.exam_type,
    subject: row.question.subject || row.question.sectionName || row.question.topic_name || row.title,
    q: row.question,
    details: `Question in "${row.title}" has no explanation.`
  }));

  const flaggedMockQuestions = flaggedMockRows.map(row => ({
    id: `flag-mock-${row.template_id}-${row.question.id}`,
    reason: "⚠️ AI Answer Mismatch",
    status: "pending",
    created_at: new Date(),
    user: { email: "AI Verifier" },
    isMock: true,
    mock_test_id: row.template_id,
    mock_question_id: row.question.id,
    exam_type: row.exam_type,
    subject: row.question.subject || row.question.sectionName || row.question.topic_name || row.title,
    q: row.question,
    details: `AI thinks correct answer is "${row.question.ai_detected_answer}" but stored answer is "${row.question.correct_answer}". Test: "${row.title}"`
  }));

  // Convert them into "virtual reports" so they show up in the UI
  const autoReports = [
    ...flaggedMockQuestions,
    ...missingPYQs.map(q => ({
      id: `auto-empty-p-${q.id}`,
      reason: "Missing Explanation (Auto)",
      status: "pending",
      created_at: new Date(),
      user: { email: "System Scanner" },
      pyq_id: q.id,
      pyq: q,
      details: "This question currently has no explanation in the database."
    })),
    ...missingMockQuestions
  ];

  const allReports = [...enrichedManualReports, ...autoReports];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Flagged & Missing</h1>
          <p className="text-gray-500 font-medium">Review community reports and automatically fix missing explanations.</p>
        </div>
      </div>

      <ReportsClient reports={allReports} mockTests={mockTemplatesMeta} />
    </div>
  );
}
