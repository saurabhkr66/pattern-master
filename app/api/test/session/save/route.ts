import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { saveDraftState } from "@/lib/draft";
import { prisma } from "@/lib/prisma";
import { isRedisConfigured } from "@/lib/redis";

// Autosave runs every 20 minutes per test taker, plus on tab close /
// visibility hidden. The hot path is a single Redis SET — no DB touch, no GET.
// Authorization is by-key-construction: userId from the authenticated session
// is baked into the Redis key, so a malicious save lands on a never-read key.
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { draftId, state } = await req.json();
  if (!draftId) {
    return NextResponse.json({ error: "Missing draftId" }, { status: 400 });
  }

  if (isRedisConfigured()) {
    const result = await saveDraftState(userId, draftId, state);
    return NextResponse.json({ ok: result.ok });
  }

  // Redis-not-configured fallback: write to DB so we don't silently lose state.
  try {
    const draft = await prisma.testSessionDraft.update({
      where: { id: draftId },
      data: { state },
      select: { user_id: true },
    });
    if (draft.user_id !== userId) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
