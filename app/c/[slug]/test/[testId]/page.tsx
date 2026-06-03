import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { stripAnswers } from "@/lib/resolveQuestions";
import {
  testWindowState,
  optionPermutation,
  optionSeed,
} from "@/lib/coachingTestRuntime";
import {
  getResolvedTestQuestions,
  studentQuestionsFromBase,
  primeTestConfig,
} from "@/lib/coachingQuestionCache";
import { getCachedCoachingBySlug } from "@/lib/coachingCache";
import { getCoachingDraft } from "@/lib/coachingDraft";
import type { ExamConfig } from "@/lib/examConfigs";
import type { TestQuestion } from "@/components/test/testEngineTypes";
import StudentTestRunner from "@/components/coaching/StudentTestRunner";

export const dynamic = "force-dynamic";

export default async function StudentTestPage({
  params,
}: {
  params: Promise<{ slug: string; testId: string }>;
}) {
  const { slug, testId } = await params;

  const coaching = await getCachedCoachingBySlug(slug); // Redis-cached
  if (!coaching || !coaching.active) notFound();

  const student = await getCurrentStudent(coaching.id);
  if (!student) redirect(`/c/${slug}/login`);

  // Test + THIS student's attempt in ONE query (merged read).
  const test = await prisma.coachingTest.findFirst({
    where: { id: testId, coaching_id: coaching.id },
    include: {
      attempts: {
        where: { student_id: student.id },
        select: { id: true, status: true, started_at: true },
        take: 1,
      },
    },
  });
  if (!test) notFound();

  if (test.status !== "active") {
    return (
      <Centered title="Test not available">
        This test is not currently open.
      </Centered>
    );
  }

  const windowState = testWindowState(test.start_at, test.end_at);
  if (windowState === "before") {
    return (
      <Centered title="Not started yet">
        This test opens at {test.start_at?.toLocaleString()}.
      </Centered>
    );
  }
  if (windowState === "after") {
    return <Centered title="Test closed">The submission window has ended.</Centered>;
  }

  // Idempotent attempt: resume in-progress, redirect if already submitted.
  // NOTE: no prisma.upsert here — Prisma runs upsert as an internal transaction,
  // which the Neon HTTP adapter rejects ("Transactions are not supported in HTTP
  // mode"). Find-then-create, with the unique (test_id, student_id) constraint
  // catching the race.
  const attemptSelect = { id: true, status: true, started_at: true };
  let attempt: { id: string; status: string; started_at: Date } | null =
    test.attempts[0] ?? null; // from the merged query above
  if (!attempt) {
    // Spread concurrent attempt-creates over a short window to avoid a Neon
    // write spike when an entire batch starts the exam at the same moment.
    // (Server component, not a React render — the per-request jitter is intended.)
    // eslint-disable-next-line react-hooks/purity
    await new Promise((r) => setTimeout(r, Math.random() * 5000));
    try {
      attempt = await prisma.testAttempt.create({
        data: { coaching_id: coaching.id, test_id: test.id, student_id: student.id },
        select: attemptSelect,
      });
    } catch {
      // Concurrent create won the unique constraint — re-read it.
      attempt = await prisma.testAttempt.findUnique({
        where: { test_id_student_id: { test_id: test.id, student_id: student.id } },
        select: attemptSelect,
      });
    }
  }
  if (!attempt) {
    return <Centered title="Could not start">Please try again.</Centered>;
  }
  if (attempt.status === "submitted") {
    redirect(`/c/${slug}/result/${attempt.id}`);
  }

  // Resolved set is cached in Redis per test; this student's paper (pool +
  // shuffle) is derived from it in memory — no per-student question DB read.
  // Also warm the runtime-config cache so the eventual submit never reads the
  // test row from the DB (the submit spike stays fully on Redis).
  const [base] = await Promise.all([
    getResolvedTestQuestions(test, coaching.id),
    primeTestConfig({
      id: test.id,
      questions: test.questions,
      shuffle: test.shuffle,
      pool_size: test.pool_size,
      duration_secs: test.duration_secs,
      end_at: test.end_at,
    }),
  ]);
  const resolved = studentQuestionsFromBase(base, test, student.id);
  if (resolved.length === 0) {
    return <Centered title="No questions">This test has no available questions.</Centered>;
  }
  const safe = resolved.map(stripAnswers);

  const engineQuestions: TestQuestion[] = safe.map((q) => {
    // Per-student option shuffle (MCQ only). The submit endpoint applies the
    // same permutation in reverse to grade — see optionPermutation.
    let options = q.options.length ? q.options : null;
    if (test.shuffle && q.question_type === "mcq" && options) {
      const perm = optionPermutation(optionSeed(student.id, test.id, q.id), options.length);
      options = perm.map((p) => options![p]);
    }
    return {
      id: q.id,
      source: "template" as const, // engine union is pyq|template; coaching maps to template
      sectionIndex: 0,
      sectionName: "Questions",
      isOptional: false,
      question_text: q.question_text,
      options,
      question_type:
        q.question_type === "nat" ? "NAT" : q.question_type === "msq" ? "MSQ" : "MCQ",
      marks: q.marks,
      subject: q.subject ?? "General",
      topic: q.topic ?? undefined,
      images: q.images ?? null,
    };
  });

  const maxScore = engineQuestions.reduce((s, q) => s + q.marks, 0);

  // Server-anchored timer: started_at + duration, capped by the test's close time.
  let expiresMs = attempt.started_at.getTime() + test.duration_secs * 1000;
  if (test.end_at) expiresMs = Math.min(expiresMs, test.end_at.getTime());
  const serverExpiresAt = new Date(expiresMs).toISOString();

  // Restore any autosaved answers (resume after reload / crash). Stored in the
  // same display space the engine uses, so it drops straight back into state.
  const savedDraft = await getCoachingDraft(attempt.id, student.id);

  const config: ExamConfig = {
    examType: "GATE",
    label: test.title,
    description: test.description ?? "",
    emoji: "📝",
    hasBranches: false,
    durationSecs: test.duration_secs,
    totalQuestions: engineQuestions.length,
    maxScore,
    sections: [
      {
        name: "Questions",
        subjects: null,
        totalQuestions: engineQuestions.length,
        maxScore,
        questionTypes: ["MCQ", "NAT"],
        markDistribution: [],
        negativePerMark: 0,
      },
    ],
    themeColor: "#6366f1",
    instructions: [
      "Do not switch tabs or leave the page — switches are recorded.",
      "Your answers are submitted when you click Submit or when time runs out.",
    ],
  };

  return (
    <StudentTestRunner
      slug={slug}
      testId={test.id}
      attemptId={attempt.id}
      questions={engineQuestions}
      config={config}
      serverExpiresAt={serverExpiresAt}
      studentName={student.name}
      initialState={savedDraft}
    />
  );
}

function Centered({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-slate-400">{children}</p>
    </div>
  );
}
