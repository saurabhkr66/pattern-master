import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getDppPaper } from "@/lib/dppPaper";
import { gradeDppRun, type DppSubmittedAnswer } from "@/lib/dppResult";
import { writeDppAttempts } from "@/lib/dppAttempts";
import { rateLimit } from "@/lib/rateLimit";
import { randomCode } from "@/lib/shortCode";
import { isUniqueViolation } from "@/lib/dbHttp";

// Grade and finalise a DPP run.
//
// Everything that determines the score or the ranking is derived here:
//   • the answer key is read fresh from DppQuestion (never sent to the client)
//   • elapsed time comes from started_at, not the client's timeTakenSecs
//   • the share code is minted here, in the same write
//
// The client contributes only letters and advisory per-question times.
//
// Signed-in OR anonymous (user_id: null — see the DPP growth plan). An
// anonymous run is graded and finalised exactly the same way, EXCEPT no
// share_code is minted and the response carries no runCode: a code would make
// the run's score publicly reachable at /dpp/r/[code] before the visitor has
// signed up, defeating the whole point of gating the score. Claiming (setting
// user_id and minting the code) happens at /dpp/claim/[runId] — or inline,
// right here, if it turns out the visitor already has a session by the time
// they submit.

export const dynamic = "force-dynamic";

/** Below this, a "run" is not a genuine attempt. Guards a submit fired
 *  immediately after start, which would otherwise take the time tiebreak. */
const MIN_SECS_PER_QUESTION = 2;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { userId } = await auth();

  const { runId } = await params;

  const rateKey = userId ? `dpp-submit:${userId}` : `dpp-submit-ip:${clientIp(req)}`;
  const { success } = await rateLimit(rateKey, 20, 3600);
  if (!success) return NextResponse.json({ error: "too many requests" }, { status: 429 });

  const run = await prisma.dppRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      dpp_id: true,
      user_id: true,
      status: true,
      started_at: true,
      share_code: true,
      challenged_from_id: true,
    },
  });
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Ownership, not just existence — otherwise anyone could submit anyone's
  // run. An unclaimed run (user_id: null) has no owner to check: the runId
  // itself is the access key, same trust model as the run page.
  if (run.user_id !== null && run.user_id !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Claim opportunistically if this run is still unclaimed but the submitter
  // already has a session — e.g. they signed in in another tab mid-attempt.
  // Skips the claim-page hop entirely in that case.
  const claimingUserId = run.user_id === null ? userId ?? null : run.user_id;

  if (run.status === "submitted") {
    // Idempotent: a retry or double-click lands here, not on a second write.
    // An unclaimed run has no code to hand back — point the client at the
    // claim page instead, which will finish claiming it if this request is
    // now authenticated.
    if (run.user_id === null) {
      return NextResponse.json({ alreadySubmitted: true, needsAuth: true, runId: run.id });
    }
    return NextResponse.json({ alreadySubmitted: true, runCode: run.share_code });
  }

  const body = await req.json().catch(() => null);
  const answers: DppSubmittedAnswer[] = Array.isArray(body?.answers) ? body.answers : [];

  const paper = await getDppPaper(run.dpp_id);
  if (!paper) return NextResponse.json({ error: "DPP unavailable" }, { status: 404 });

  const graded = await gradeDppRun({
    dppId: run.dpp_id,
    answers,
    labelsByQuestion: paper.labelsByQuestion,
    topicName: paper.topicName,
    subject: paper.subject,
  });
  if (!graded) return NextResponse.json({ error: "DPP has no questions" }, { status: 409 });

  // ── Server-derived elapsed time ────────────────────────────────────────────
  // The client's reported figure is discarded. Clamped to the paper duration so
  // an abandoned tab reopened hours later doesn't record a nonsense time.
  const elapsed = Math.round((Date.now() - run.started_at.getTime()) / 1000);
  const timeTakenSecs = Math.min(Math.max(elapsed, 1), paper.config.durationSecs);

  const floor = paper.questions.length * MIN_SECS_PER_QUESTION;
  if (elapsed < floor) {
    return NextResponse.json(
      { error: "that was too fast to be a real attempt" },
      { status: 400 },
    );
  }

  // Mint the share code now rather than lazily on the Challenge click: a lazy
  // mint costs a write at the moment of highest intent and adds a spinner
  // failure mode. `shared_at` records whether they actually shared. Skipped
  // entirely while still anonymous — an unclaimed run must stay unreachable at
  // /dpp/r/[code], or the sign-in wall it's meant to gate would leak for free.
  let shareCode: string | null = null;
  if (claimingUserId) {
    shareCode = run.share_code;
    if (!shareCode) {
      for (let attempt = 0; attempt < 3 && !shareCode; attempt++) {
        const candidate = randomCode(8);
        const clash = await prisma.dppRun.findUnique({
          where: { share_code: candidate },
          select: { id: true },
        });
        if (!clash) shareCode = candidate;
      }
    }
  }

  // ── Single-submit guard ────────────────────────────────────────────────────
  // One guarded UPDATE; `count > 0` is the entire race gate, mirroring
  // gradeAndWrite in lib/coachingFinalize.ts. updateMany is unavailable on the
  // Neon HTTP adapter, so this is raw SQL. COALESCE on user_id opportunistically
  // claims a still-anonymous run when the submitter turns out to be signed in;
  // it's a no-op for every other case (already owned, or still anonymous).
  let updated = 0;
  try {
    updated = await prisma.$executeRaw`
      UPDATE "DppRun"
         SET status = 'submitted',
             submitted_at = NOW(),
             score = ${graded.scores.score},
             max_score = ${graded.scores.maxScore},
             correct_count = ${graded.scores.correctCount},
             wrong_count = ${graded.scores.wrongCount},
             skipped_count = ${graded.scores.skippedCount},
             time_taken_secs = ${timeTakenSecs},
             answers = ${JSON.stringify(graded.breakdown)}::jsonb,
             user_id = COALESCE(user_id, ${claimingUserId}),
             share_code = COALESCE(share_code, ${shareCode})
       WHERE id = ${runId}
         AND status = 'in_progress'`;
  } catch (e) {
    // A share_code collision that slipped past the pre-check: retry once without
    // touching the code, so the run is never lost over a cosmetic field.
    if (!isUniqueViolation(e)) throw e;
    updated = await prisma.$executeRaw`
      UPDATE "DppRun"
         SET status = 'submitted',
             submitted_at = NOW(),
             score = ${graded.scores.score},
             max_score = ${graded.scores.maxScore},
             correct_count = ${graded.scores.correctCount},
             wrong_count = ${graded.scores.wrongCount},
             skipped_count = ${graded.scores.skippedCount},
             time_taken_secs = ${timeTakenSecs},
             answers = ${JSON.stringify(graded.breakdown)}::jsonb,
             user_id = COALESCE(user_id, ${claimingUserId})
       WHERE id = ${runId}
         AND status = 'in_progress'`;
    shareCode = null;
  }

  if (updated === 0) {
    // Lost the race to a concurrent submit — read back what won.
    const now = await prisma.dppRun.findUnique({
      where: { id: runId },
      select: { share_code: true, user_id: true },
    });
    if (now?.user_id === null) {
      return NextResponse.json({ alreadySubmitted: true, needsAuth: true, runId: run.id });
    }
    return NextResponse.json({ alreadySubmitted: true, runCode: now?.share_code ?? null });
  }

  // ── Feed the dashboard ─────────────────────────────────────────────────────
  // One Attempt row per answered question, so a timed run counts toward the
  // streak and activity heatmap exactly as practice mode already does. Deferred
  // with after(): it is N inserts on the HTTP adapter and the student should not
  // wait for them to see their score. Reached only past the guarded UPDATE, so
  // it runs once per run. A still-anonymous run has no user to attribute to —
  // /dpp/claim/[runId] writes them at claim time instead.
  if (claimingUserId) {
    const uid = claimingUserId;
    after(async () => {
      try {
        await writeDppAttempts(uid, graded.breakdown);
      } catch (e) {
        // Never let bookkeeping surface as a failed submit — the run is already
        // graded and stored; the worst case is a missing day on the heatmap.
        console.error("DPP attempt fan-out failed", { runId, error: e });
      }
    });
  }

  if (!claimingUserId) {
    return NextResponse.json({
      needsAuth: true,
      runId: run.id,
      score: graded.scores.score,
      maxScore: graded.scores.maxScore,
      timeTakenSecs,
    });
  }

  return NextResponse.json({
    runCode: shareCode,
    score: graded.scores.score,
    maxScore: graded.scores.maxScore,
    timeTakenSecs,
  });
}
