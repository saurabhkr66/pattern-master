import { notFound, redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/studentAuth";
import { testWindowState } from "@/lib/coachingTestRuntime";
import { getCachedFullTest } from "@/lib/coachingQuestionCache";
import { getCachedCoachingBySlug } from "@/lib/coachingCache";
import TestGate from "@/components/coaching/TestGate";

export const dynamic = "force-dynamic";

/**
 * Thin gate shell — deliberately CHEAP to render. The paper itself is never
 * SSR'd here: TestGate prefetches it encrypted during the waiting room (the
 * `paper` endpoint) and the attempt is created at T-0 (the `start` endpoint),
 * so a whole batch opening this page costs Redis-cached reads only. This page
 * just authenticates, gates on the test's existence/status, and hands the
 * window schedule to the client.
 */
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

  // Static test row (status/window) is identical for every student and Redis-
  // cached. Per-student work (attempt, paper) happens behind the gate endpoints.
  const test = await getCachedFullTest(testId, coaching.id);
  if (!test) notFound();

  if (test.status !== "active") {
    return (
      <Centered title="Test not available">
        This test is not currently open.
      </Centered>
    );
  }

  // Closed is terminal — render it server-side. "before" is NOT handled here:
  // the gate runs the countdown and flips into the test without a reload.
  if (testWindowState(test.start_at, test.end_at) === "after") {
    return <Centered title="Test closed">The submission window has ended.</Centered>;
  }

  return (
    <TestGate
      slug={slug}
      testId={test.id}
      testTitle={test.title}
      studentName={student.name}
      startAt={test.start_at ? test.start_at.toISOString() : null}
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
