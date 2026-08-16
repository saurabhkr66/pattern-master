import "server-only";
import { prisma } from "@/lib/prisma";

// Resuming an in-progress DPP run.
//
// Every click of "Take as Test" used to mint a fresh DppRun. Refresh the tab
// mid-test — or tap back and re-enter — and the old row was orphaned
// `in_progress` forever while its clock kept running, so the abandoned attempt
// both littered the table and (because elapsed time is derived server-side from
// started_at) would have recorded a nonsense time if it were ever submitted.
//
// A run is resumable while its own timer still has meaningful time left on it.
// Past that it is retired rather than resumed: handing back a run with four
// seconds remaining would auto-submit an empty paper the instant the engine
// mounted.

/** Below this many seconds remaining, resuming is worse than starting over. */
const MIN_RESUME_SECS = 30;

export type ResumableRun = {
  id: string;
  startedAt: Date;
  /** When this run's timer runs out — handed to TestEngine as `serverExpiresAt`
   *  so a resumed paper counts down from real elapsed time, not from full. */
  expiresAt: Date;
};

/** The cutoff `started_at` must be after for a run to still be worth resuming. */
function resumeCutoff(durationSecs: number): Date {
  return new Date(Date.now() - Math.max(0, durationSecs - MIN_RESUME_SECS) * 1000);
}

/**
 * The newest run this student can still walk back into, or null.
 *
 * Read-only — safe to call during a page render. Anonymous visitors always get
 * null: with `user_id: null` there is no identity to match a run against, so an
 * anonymous refresh still starts over (the runId in the URL is their only
 * handle on it, and they have already left it by then).
 */
export async function findResumableRun(
  dppId: string,
  userId: string | null,
  durationSecs: number,
): Promise<ResumableRun | null> {
  if (!userId) return null;

  const run = await prisma.dppRun.findFirst({
    where: {
      dpp_id: dppId,
      user_id: userId,
      status: "in_progress",
      started_at: { gt: resumeCutoff(durationSecs) },
    },
    orderBy: { started_at: "desc" },
    select: { id: true, started_at: true },
  });
  if (!run) return null;

  return {
    id: run.id,
    startedAt: run.started_at,
    expiresAt: new Date(run.started_at.getTime() + durationSecs * 1000),
  };
}

/**
 * Mark this student's un-resumable in-progress runs on this DPP as `abandoned`.
 *
 * Called on the start path, so stale rows are cleaned up by the same action that
 * would otherwise create another one. `abandoned` is inert everywhere that
 * matters: the submit route's guarded UPDATE only fires `WHERE status =
 * 'in_progress'`, and `hasSubmittedRun` only matches `'submitted'` — so a
 * retired run can never be submitted and never unlocks practice.
 *
 * Raw SQL because updateMany throws on the Neon HTTP adapter.
 */
export async function retireStaleRuns(
  dppId: string,
  userId: string | null,
  durationSecs: number,
): Promise<void> {
  if (!userId) return;
  await prisma.$executeRaw`
    UPDATE "DppRun"
       SET status = 'abandoned'
     WHERE dpp_id = ${dppId}
       AND user_id = ${userId}
       AND status = 'in_progress'
       AND started_at <= ${resumeCutoff(durationSecs)}`;
}
