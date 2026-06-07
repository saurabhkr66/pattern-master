import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getCachedCoachingBySlug } from "@/lib/coachingCache";
import { finalizeOverdueAttempts } from "@/lib/coachingFinalize";
import { testWindowState } from "@/lib/coachingTestRuntime";
import { getTestLeaderboard } from "@/lib/coachingLeaderboard";
import StudentLeaderboard from "@/components/coaching/StudentLeaderboard";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string; testId: string }>;
}) {
  const { slug, testId } = await params;

  const coaching = await getCachedCoachingBySlug(slug); // Redis-cached
  if (!coaching || !coaching.active) notFound();

  const student = await getCurrentStudent(coaching.id);
  if (!student) redirect(`/c/${slug}/login`);

  // Load the test (tenancy-scoped) and this student's own attempt together — both
  // gate access and the test title is needed for the header.
  const [test, ownAttempt] = await Promise.all([
    prisma.coachingTest.findFirst({
      where: { id: testId, coaching_id: coaching.id },
      select: { id: true, title: true, start_at: true, end_at: true },
    }),
    prisma.testAttempt.findFirst({
      where: { test_id: testId, student_id: student.id, coaching_id: coaching.id },
      select: { status: true },
    }),
  ]);
  if (!test) notFound();

  // Access gate: a student may see the board only once they've submitted, or once
  // the window has closed (they missed it but the test is over). Otherwise they'd
  // be peeking at classmates' scores before taking the test themselves.
  const windowClosed = testWindowState(test.start_at, test.end_at) === "after";
  if (ownAttempt?.status !== "submitted" && !windowClosed) {
    redirect(`/c/${slug}/dashboard`);
  }

  // Grade any closed-but-unsubmitted attempts (closed app / dead phone) so they
  // appear ranked — same on-view finalize the result page does. This also busts
  // the leaderboard cache (via gradeAndWrite) before we read it below.
  await finalizeOverdueAttempts(testId, coaching.id);

  const entries = await getTestLeaderboard(testId, coaching.id);

  return (
    <StudentLeaderboard
      testTitle={test.title}
      entries={entries}
      currentStudentId={student.id}
      dashboardHref={`/c/${slug}/dashboard`}
    />
  );
}
