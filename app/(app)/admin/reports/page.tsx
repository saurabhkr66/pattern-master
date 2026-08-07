import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { loadDarkImageWorklist, darkRefsOf, darkLabel } from "@/lib/darkImageAudit";
import ReportsClient from "./ReportsClient";

export const revalidate = 120;

export default async function AdminReportsPage() {
  // Admin check keys off the Clerk session email, not a DB row — the Clerk
  // userId differs per instance, but the email is the real credential.
  await requireAdmin();

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

  // Two users reporting the same question create two separate QuestionReport
  // rows — without this, both showed up as separate cards in the UI, and
  // resolving one left the other sitting there as a "duplicate" of an issue
  // that was already fixed. Group by the underlying question identity so the
  // admin sees one card with a reporter count; `allReportIds` lets resolving
  // it clear every row in the group at once (see resolveReport call below).
  type ManualReport = (typeof manualReports)[number];
  const reportGroupKey = (r: ManualReport): string =>
    r.pyq_id ? `pyq:${r.pyq_id}`
      : r.question_id ? `q:${r.question_id}`
      : r.mock_question_id ? `mock:${r.mock_question_id}`
      : `id:${r.id}`;

  const reportGroups = new Map<string, ManualReport[]>();
  for (const r of manualReports) {
    const key = reportGroupKey(r);
    const group = reportGroups.get(key);
    if (group) group.push(r); else reportGroups.set(key, [r]);
  }

  // manualReports is ordered created_at desc, so a group's first row is its
  // most recent report — used as the representative id/timestamp.
  const groupedManualReports = Array.from(reportGroups.values()).map((group) => {
    const [primary] = group;
    const reporterEmails = [...new Set(group.map((g) => g.user?.email).filter((e): e is string => !!e))];
    const reasons = [...new Set(group.map((g) => g.reason))];
    const combinedDetails = group
      .filter((g) => g.details)
      .map((g) => `${g.user?.email || "user"}: ${g.details}`)
      .join("\n");
    return {
      ...primary,
      reason: reasons.join(" · "),
      details: combinedDetails || primary.details,
      reportCount: group.length,
      reporterEmails,
      allReportIds: group.map((g) => g.id),
    };
  });

  const reportedMockQuestionIds = groupedManualReports
    .map(r => r.mock_question_id)
    .filter((id): id is string => Boolean(id));

  // Dark-image worklist: a file read, not a query. Drives the extra lookups below.
  const darkList = await loadDarkImageWorklist();
  const darkPyqIds = [...new Set(
    darkList.entries.flatMap(e => e.rows.filter(r => r.model === "pYQ").map(r => r.id))
  )];
  const darkGeneratedIds = [...new Set(
    darkList.entries.flatMap(e => e.rows.filter(r => r.model === "generatedQuestion").map(r => r.id))
  )];
  const darkRefs = darkList.entries.map(e => e.ref);
  // Containment needles: `[{"filename": ref}]` matches an images array holding
  // that filename, regardless of the entry's other fields (index, type).
  const darkRefNeedles = darkRefs.map(ref => JSON.stringify([{ filename: ref }]));

  // All remaining queries run in parallel
  const [
    missingPYQs,
    mockTemplatesMeta,
    missingMockRows,
    flaggedMockRows,
    reportedMockRows,
    darkPyqs,
    darkGenerated,
    darkMockRows,
  ] = await Promise.all([
    prisma.pYQ.findMany({
      where: { explanation: "", exam_type: { in: EXAMS } },
      take: 15,
      select: {
        id: true, question_text: true, options: true, correct_answer: true,
        explanation: true, question_type: true, exam_type: true, images: true,
        pattern: { select: { exam_type: true, subject: true, topic_name: true } },
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
    // Questions whose figure the dark-image audit flagged. Looked up by primary
    // key, so these are cheap despite the wide select.
    darkPyqIds.length > 0
      ? prisma.pYQ.findMany({
          where: { id: { in: darkPyqIds } },
          select: {
            id: true, question_text: true, options: true, correct_answer: true,
            explanation: true, question_type: true, exam_type: true, images: true,
            pattern: { select: { exam_type: true, subject: true, topic_name: true } },
          },
        })
      : Promise.resolve([]),
    darkGeneratedIds.length > 0
      ? prisma.generatedQuestion.findMany({
          where: { id: { in: darkGeneratedIds } },
          select: {
            id: true, question_text: true, options: true, correct_answer: true,
            explanation: true, question_type: true, images: true,
            pattern: { select: { exam_type: true, subject: true, topic_name: true } },
          },
        })
      : Promise.resolve([]),
    // Mock questions carry no ID we can join on, so match on the image ref
    // itself. Containment rather than unnesting elem->'images': jsonb_array_elements
    // raises on a non-array value, which would 500 the whole page over one
    // malformed question. Bounded by LIMIT like the other jsonb scans here.
    darkRefs.length > 0
      ? prisma.$queryRaw<{ template_id: string; title: string; exam_type: string; question: any }[]>`
          SELECT t.id AS template_id, t.title, t.exam_type, elem AS question
          FROM "MockTestTemplate" t,
          jsonb_array_elements(t.questions) AS elem
          WHERE EXISTS (
            SELECT 1
            FROM unnest(${darkRefNeedles}::jsonb[]) AS n(needle)
            WHERE COALESCE(elem->'images', '[]'::jsonb) @> n.needle
          )
          LIMIT 100
        `
      : Promise.resolve([]),
  ]);

  // Build a lookup for reported mock questions so manual reports can reference them
  const reportedMockQMap = Object.fromEntries(
    reportedMockRows.map(r => [r.question.id, { templateId: r.template_id, q: r.question }])
  );

  // Attach question data to manual reports that reference mock questions
  const enrichedManualReports = groupedManualReports.map(r => {
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

  // Dark/inverted figures. Sorted worst-first and placed at the head of the auto
  // reports: a 99%-black diagram is unreadable, which outranks a missing
  // explanation. Fixing one is an ImageKit overwrite (paste onto the image row
  // in the editor) — it writes nothing to the DB, so these entries persist until
  // scripts/audit-dark-images.mjs is re-run.
  const darkDetail = (refs: string[], worst: number, where: string) =>
    `Figure ${refs.map(r => `"${r}"`).join(", ")} is ${darkLabel(worst)} — likely an inverted or destroyed scan. ${where}`;

  const darkPyqReports = darkPyqs.flatMap(q => {
    const { refs, worst } = darkRefsOf(q.images, darkList.ratioByRef);
    if (refs.length === 0) return [];
    return [{
      id: `auto-dark-p-${q.id}`,
      reason: `🖤 Dark Image (${darkLabel(worst)})`,
      status: "pending",
      created_at: new Date(),
      user: { email: "Image Audit" },
      pyq_id: q.id,
      pyq: q,
      _darkRatio: worst,
      details: darkDetail(refs, worst, "Paste a replacement onto the image row below."),
    }];
  });

  const darkGeneratedReports = darkGenerated.flatMap(q => {
    const { refs, worst } = darkRefsOf(q.images, darkList.ratioByRef);
    if (refs.length === 0) return [];
    return [{
      id: `auto-dark-g-${q.id}`,
      reason: `🖤 Dark Image (${darkLabel(worst)})`,
      status: "pending",
      created_at: new Date(),
      user: { email: "Image Audit" },
      question_id: q.id,
      question: q,
      _darkRatio: worst,
      details: darkDetail(refs, worst, "Paste a replacement onto the image row below."),
    }];
  });

  const darkMockReports = darkMockRows.flatMap(row => {
    const { refs, worst } = darkRefsOf(row.question?.images, darkList.ratioByRef);
    if (refs.length === 0) return [];
    return [{
      id: `auto-dark-m-${row.template_id}-${row.question.id}`,
      reason: `🖤 Dark Image (${darkLabel(worst)})`,
      status: "pending",
      created_at: new Date(),
      user: { email: "Image Audit" },
      isMock: true,
      mock_test_id: row.template_id,
      mock_question_id: row.question.id,
      exam_type: row.exam_type,
      subject: row.question.subject || row.question.sectionName || row.question.topic_name || row.title,
      q: row.question,
      _darkRatio: worst,
      details: darkDetail(refs, worst, `Test: "${row.title}".`),
    }];
  });

  const darkReports = [...darkPyqReports, ...darkGeneratedReports, ...darkMockReports]
    .sort((a, b) => b._darkRatio - a._darkRatio);

  // Convert them into "virtual reports" so they show up in the UI.
  // Note: AI-detected mismatches for PYQ/GeneratedQuestion are persisted as
  // real QuestionReport rows (see generateAIExplanation) — they flow in via
  // the `manualReports` query above, no virtual entry needed.
  const autoReports = [
    ...darkReports,
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
