import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const draft = await prisma.testSessionDraft.findFirst({
    where: { user_id: userId, expires_at: { gt: new Date() } },
    orderBy: { started_at: "desc" },
  });

  if (!draft) return NextResponse.json({ draft: null });

  const timeLeftSecs = Math.max(
    0,
    Math.floor((draft.expires_at.getTime() - Date.now()) / 1000)
  );

  return NextResponse.json({
    draft: {
      draftId: draft.id,
      mockTestId: draft.mock_test_id,
      examType: draft.exam_type,
      branch: draft.branch,
      startedAt: draft.started_at.toISOString(),
      expiresAt: draft.expires_at.toISOString(),
      timeLeftSecs,
      state: draft.state,
    },
  });
}
