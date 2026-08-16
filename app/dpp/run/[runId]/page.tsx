import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDppPaper } from "@/lib/dppPaper";
import DppRunner from "@/components/dpp/DppRunner";

// The Test-mode runner.
//
// Owner-only for a claimed run. An unclaimed (user_id: null) run belongs to
// whoever holds the link — the runId itself, an unguessable UUID nobody else
// was ever shown, is the access key. See the nullability note on
// DppRun.user_id in prisma/schema/dpprun.prisma.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DppRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const { userId } = await auth();

  const run = await prisma.dppRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      dpp_id: true,
      user_id: true,
      status: true,
      share_code: true,
      started_at: true,
    },
  });
  if (!run) notFound();

  if (run.user_id !== null) {
    if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/dpp/run/${runId}`)}`);
    // Ownership, not just existence — someone else's runId must not open a
    // paper. 404 rather than 403 so a probe can't confirm the id exists.
    if (run.user_id !== userId) notFound();
  }

  // Already finished → an unclaimed run has no result page yet (claim first);
  // a claimed one goes to its canonical result.
  if (run.status === "submitted") {
    redirect(run.user_id === null ? `/dpp/claim/${run.id}` : run.share_code ? `/dpp/r/${run.share_code}` : "/dpp");
  }

  // Retired by a later start (see lib/dppRun.ts). The submit route would refuse
  // it anyway — its guarded UPDATE only fires on `in_progress` — so opening the
  // paper would end in an unexplained failure at the end of a full attempt.
  if (run.status !== "in_progress") redirect(`/dpp/${run.dpp_id}`);

  const paper = await getDppPaper(run.dpp_id);
  if (!paper) notFound();

  // The engine counts down to this, not from the full duration — so a refresh
  // resumes the real clock instead of silently granting a fresh one. The submit
  // route derives its authoritative elapsed time from the same `started_at`.
  const expiresAt = new Date(run.started_at.getTime() + paper.config.durationSecs * 1000);

  // Timer already gone: send them back rather than mounting an engine that
  // instantly auto-submits an empty paper.
  if (expiresAt.getTime() <= Date.now()) redirect(`/dpp/${run.dpp_id}`);

  const user = await currentUser();

  return (
    <DppRunner
      runId={run.id}
      questions={paper.questions}
      config={paper.config}
      title={`${paper.name} · ${paper.topicName}`}
      userName={user?.firstName ?? undefined}
      expiresAt={expiresAt.toISOString()}
    />
  );
}
