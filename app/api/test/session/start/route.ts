import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { addActiveParticipant } from "@/lib/leaderboard";
import { initDraft, readDraftState, DEADLINE_CLEANUP_BUFFER_MS } from "@/lib/draft";
import { getCachedTemplateById } from "@/lib/mockTemplate";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mockTestId, examType, branch, durationSecs } = await req.json();

  // The client picks the paper size for random tests, so durationSecs is
  // user-influenced input — never trust it for the deadline. The template is
  // the authority; the client value is only a fallback when there's no template.
  let effectiveDuration = Number(durationSecs);
  if (mockTestId) {
    const template = await getCachedTemplateById(mockTestId);
    if (template?.duration_secs) effectiveDuration = template.duration_secs;
  }
  if (!Number.isFinite(effectiveDuration) || effectiveDuration <= 0) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  // Resume existing unexpired draft for this test
  if (mockTestId) {
    const existing = await prisma.testSessionDraft.findFirst({
      where: { user_id: userId, mock_test_id: mockTestId, expires_at: { gt: new Date() } },
    });
    if (existing) {
      const timeLeftSecs = Math.max(
        0,
        Math.floor(
          (existing.expires_at.getTime() - DEADLINE_CLEANUP_BUFFER_MS - Date.now()) / 1000
        )
      );
      addActiveParticipant(mockTestId, userId, existing.expires_at.getTime()).catch(
        (e) => console.warn("[leaderboard] addActiveParticipant failed", e)
      );
      // Prefer Redis state (current); fall back to DB.state (last persisted).
      const redisState = await readDraftState(userId, existing.id);
      const state = redisState ?? existing.state;
      // Expose the *user-facing* deadline (DB cleanup buffer subtracted),
      // so the client's timer math doesn't have to know about the buffer.
      const userDeadline = new Date(
        existing.expires_at.getTime() - DEADLINE_CLEANUP_BUFFER_MS,
      );
      return NextResponse.json({
        draftId: existing.id,
        startedAt: existing.started_at.toISOString(),
        expiresAt: userDeadline.toISOString(),
        timeLeftSecs,
        state,
        resumed: true,
      });
    }
    // Clean up any expired drafts for this test
    await prisma.testSessionDraft.deleteMany({
      where: { user_id: userId, mock_test_id: mockTestId },
    });
  }

  const expiresAt = new Date(Date.now() + effectiveDuration * 1000 + DEADLINE_CLEANUP_BUFFER_MS);

  const draft = await prisma.testSessionDraft.create({
    data: {
      user_id: userId,
      mock_test_id: mockTestId ?? null,
      exam_type: examType,
      branch: branch ?? null,
      expires_at: expiresAt,
      state: {},
    },
  });

  if (mockTestId) {
    addActiveParticipant(mockTestId, userId, expiresAt.getTime()).catch((e) =>
      console.warn("[leaderboard] addActiveParticipant failed", e)
    );
  }

  // Seed Redis with empty state so subsequent saves don't touch the DB.
  initDraft(userId, draft.id, {}).catch((e) =>
    console.warn("[draft] initDraft failed", e)
  );

  // User-facing deadline (DB cleanup buffer subtracted) — the client's timer
  // computes off this, and we don't want the buffer leaking into UI time.
  const userDeadline = new Date(draft.expires_at.getTime() - DEADLINE_CLEANUP_BUFFER_MS);
  return NextResponse.json({
    draftId: draft.id,
    startedAt: draft.started_at.toISOString(),
    expiresAt: userDeadline.toISOString(),
    timeLeftSecs: effectiveDuration,
    state: {},
    resumed: false,
  });
}
