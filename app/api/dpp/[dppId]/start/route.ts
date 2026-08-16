import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getDppPaper } from "@/lib/dppPaper";
import { rateLimit } from "@/lib/rateLimit";
import { findResumableRun, retireStaleRuns } from "@/lib/dppRun";

// Start — or RESUME — a scored (Test-mode) DPP run.
//
// Signed-in OR anonymous — the sign-in wall gates the SCORE, not the attempt
// (see the DPP growth plan). An anonymous run is created with user_id: null
// and claimed later at /dpp/claim/[runId]. Practice mode does not come through
// here at all: it writes nothing and needs no run row.
//
// A signed-in student with a live run on this DPP gets that run back instead of
// a second one. Without this, a mid-test refresh silently abandoned the attempt
// while its server-side clock kept running — see lib/dppRun.ts.

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ dppId: string }> }) {
  const { userId } = await auth();

  const { dppId } = await params;

  // Signed-in visitors are rate-limited by user; anonymous ones by IP — a
  // shared "unknown" bucket would let one signed-out user starve every other
  // signed-out visitor behind the same proxy, but that's an acceptable
  // fallback over no limit at all. rateLimit fails OPEN when Redis is
  // unconfigured; that's acceptable here because the run row itself is the
  // real guard (single-submit, ownership once claimed).
  const rateKey = userId ? `dpp-start:${userId}` : `dpp-start-ip:${clientIp(req)}`;
  const { success } = await rateLimit(rateKey, 30, 60);
  if (!success) return NextResponse.json({ error: "too many requests" }, { status: 429 });

  // getDppPaper filters is_public + status:"ready", so an unreleased DPP is
  // indistinguishable from a missing one.
  const paper = await getDppPaper(dppId);
  if (!paper) return NextResponse.json({ error: "not found" }, { status: 404 });

  // ── Resume before create ──────────────────────────────────────────────────
  // Retire first, so a run whose timer has already run out is cleared away by
  // the same click rather than lingering as `in_progress` forever.
  await retireStaleRuns(dppId, userId ?? null, paper.config.durationSecs);
  const resumable = await findResumableRun(dppId, userId ?? null, paper.config.durationSecs);
  if (resumable) {
    // Attribution (`from` / `via`) is deliberately NOT re-applied: this run was
    // already attributed when it was created, and a resume is not a new arrival.
    return NextResponse.json({
      runId: resumable.id,
      resumed: true,
      expiresAt: resumable.expiresAt.toISOString(),
      questions: paper.questions,
      config: paper.config,
      name: paper.name,
      topicName: paper.topicName,
    });
  }

  const body = await req.json().catch(() => ({}));

  // Attribution: only accept a challenge code that belongs to THIS DPP, so a
  // code from another sheet cannot cross-link the referral tree.
  let challengedFromId: string | null = null;
  const from = typeof body?.from === "string" ? body.from.trim() : "";
  if (from) {
    const parent = await prisma.dppRun.findUnique({
      where: { share_code: from },
      select: { id: true, dpp_id: true },
    });
    if (parent && parent.dpp_id === dppId) challengedFromId = parent.id;
  }

  // Recorded INDEPENDENTLY of `from`. A plain sheet share (the Share button on
  // the DPP tab) has no parent run to link, and gating the channel tag on one
  // would leave that entire share path unmeasurable — the exact blind spot the
  // tracking fixes exist to close.
  const via = typeof body?.via === "string" ? body.via.trim().slice(0, 16) : "";
  const sourceChannel = via || null;

  // started_at is stamped by the DB default — never sent by the client. The
  // submit route derives elapsed time from it, so a forged client clock can only
  // make the runner's own time worse.
  const run = await prisma.dppRun.create({
    data: {
      dpp_id: dppId,
      user_id: userId ?? null,
      status: "in_progress",
      challenged_from_id: challengedFromId,
      source_channel: sourceChannel,
    },
    select: { id: true },
  });

  return NextResponse.json({
    runId: run.id,
    resumed: false,
    expiresAt: new Date(Date.now() + paper.config.durationSecs * 1000).toISOString(),
    // Answer-free by construction: TestQuestion has no correct_answer field and
    // the paper's Prisma select never fetches one.
    questions: paper.questions,
    config: paper.config,
    name: paper.name,
    topicName: paper.topicName,
  });
}
