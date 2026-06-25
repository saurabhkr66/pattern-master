import { NextRequest, NextResponse } from "next/server";
import {
  submitGradingBatch,
  pollGradingBatches,
  countStalePendingGrading,
} from "@/lib/subjectiveBatch";

// Subjective grading sweeper, driven by the VPS system cron (and reusable by the
// page-view self-heal). Each run: (1) POLLS open Gemini batch jobs and writes any
// completed results back to attempts, then (2) SUBMITS a new batch for pending,
// not-yet-batched answers. Idempotent and safe to run on any interval.
//
// IMPORTANT (exec-bit trap): cron must NOT invoke a repo .sh by path — those check
// out without +x on the VPS and fail silently. Invoke this via curl instead, e.g.
//   */15 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
//     http://localhost:3000/api/cron/grade-batch >> /home/battle/grade-cron.log 2>&1

// Reading the auth header makes this dynamic; be explicit so it's never cached.
export const dynamic = "force-dynamic";
// Headroom for fetching answer images (R2) + creating the batch job.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[grade-batch] CRON_SECRET not configured");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Poll first so finished jobs land promptly, then queue new work.
    const polled = await pollGradingBatches();
    const submitted = await submitGradingBatch();
    // Heartbeat: anything stuck pending for hours means the sweeper is falling
    // behind (cron gap / quota / stuck batch) — make it visible, not silent.
    const stalePending = await countStalePendingGrading(6);
    if (stalePending > 0) {
      console.warn(
        `[grade-batch] ${stalePending} attempt(s) pending > 6h — sweeper falling behind`
      );
    }
    return NextResponse.json({ ok: true, polled, submitted, stalePending });
  } catch (err) {
    console.error("[grade-batch] sweep failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
