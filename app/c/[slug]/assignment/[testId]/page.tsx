import { randomUUID } from "crypto";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getCachedCoachingBySlug } from "@/lib/coachingCache";
import { studentInTestBatches } from "@/lib/coachingBatch";
import { testWindowState } from "@/lib/coachingTestRuntime";
import { getResolvedTestQuestions, studentQuestionsFromBase } from "@/lib/coachingQuestionCache";
import AssignmentRunner, { type RunnerQuestion } from "@/components/coaching/AssignmentRunner";

export const dynamic = "force-dynamic";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ slug: string; testId: string }>;
}) {
  const { slug, testId } = await params;

  const coaching = await getCachedCoachingBySlug(slug);
  if (!coaching || !coaching.active) notFound();

  const student = await getCurrentStudent(coaching.id);
  if (!student) redirect(`/c/${slug}/login`);
  if (student.status !== "approved") redirect(`/c/${slug}/dashboard`);

  const test = await prisma.coachingTest.findFirst({
    where: { id: testId, coaching_id: coaching.id },
    select: {
      id: true, mode: true, status: true, title: true, pass_pct: true,
      batch_ids: true, end_at: true, shuffle: true, pool_size: true, questions: true,
    },
  });
  if (!test || test.mode !== "assignment") notFound();
  if (test.status !== "active" || !studentInTestBatches(test.batch_ids, student.batch_id)) {
    return <Centered title="Assignment not available">This assignment isn&apos;t open for you right now.</Centered>;
  }
  if (testWindowState(null, test.end_at) === "after") {
    return <Centered title="Assignment closed">The due date for this assignment has passed.</Centered>;
  }

  // One attempt row per (assignment, student). Idempotent raw upsert (Neon HTTP:
  // no prisma.upsert transaction); the no-op DO UPDATE returns the existing row
  // on resume so we learn its current status (in_progress vs review_locked).
  const rows = await prisma.$queryRaw<{ id: string; status: string }[]>`
    INSERT INTO "TestAttempt" (id, coaching_id, test_id, student_id)
    VALUES (${randomUUID()}, ${coaching.id}, ${test.id}, ${student.id})
    ON CONFLICT (test_id, student_id)
    DO UPDATE SET test_id = EXCLUDED.test_id
    RETURNING id, status
  `;
  const attempt = rows[0];
  if (!attempt) return <Centered title="Could not open">Please try again in a moment.</Centered>;

  // This student's paper, with answers/solutions stripped (the submit route is
  // the only place correctness/solutions are revealed, after a Check).
  const base = await getResolvedTestQuestions(test, coaching.id);
  const resolved = studentQuestionsFromBase(base, test, student.id);
  const questions: RunnerQuestion[] = resolved.map((q) => ({
    id: q.id,
    question_type: q.question_type,
    question_text: q.question_text,
    question_html: q.question_html,
    options: q.options,
    marks: q.marks,
    images: q.images,
  }));

  return (
    <AssignmentRunner
      slug={slug}
      testId={test.id}
      attemptId={attempt.id}
      title={test.title}
      passPct={test.pass_pct ?? 0}
      questions={questions}
      initialLocked={attempt.status === "review_locked"}
    />
  );
}

function Centered({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center" style={{ background: "#06060c" }}>
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-slate-400">{children}</p>
    </div>
  );
}
