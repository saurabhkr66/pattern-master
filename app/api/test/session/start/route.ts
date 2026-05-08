import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mockTestId, examType, branch, durationSecs } = await req.json();

  // Resume existing unexpired draft for this test
  if (mockTestId) {
    const existing = await prisma.testSessionDraft.findFirst({
      where: { user_id: userId, mock_test_id: mockTestId, expires_at: { gt: new Date() } },
    });
    if (existing) {
      const timeLeftSecs = Math.max(
        0,
        Math.floor((existing.expires_at.getTime() - Date.now()) / 1000)
      );
      return NextResponse.json({
        draftId: existing.id,
        startedAt: existing.started_at.toISOString(),
        expiresAt: existing.expires_at.toISOString(),
        timeLeftSecs,
        state: existing.state,
        resumed: true,
      });
    }
    // Clean up any expired drafts for this test
    await prisma.testSessionDraft.deleteMany({
      where: { user_id: userId, mock_test_id: mockTestId },
    });
  }

  const expiresAt = new Date(Date.now() + durationSecs * 1000 + 3_600_000); // +1h buffer

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

  return NextResponse.json({
    draftId: draft.id,
    startedAt: draft.started_at.toISOString(),
    expiresAt: draft.expires_at.toISOString(),
    timeLeftSecs: durationSecs,
    state: {},
    resumed: false,
  });
}
