import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { draftId, state } = await req.json();
  if (!draftId) return NextResponse.json({ error: "Missing draftId" }, { status: 400 });

  try {
    const draft = await prisma.testSessionDraft.update({
      where: { id: draftId },
      data: { state },
      select: { expires_at: true },
    });

    const timeLeftSecs = Math.max(
      0,
      Math.floor((draft.expires_at.getTime() - Date.now()) / 1000)
    );
    return NextResponse.json({ ok: true, timeLeftSecs });
  } catch {
    // Draft may have been deleted (e.g., after submit) — ignore silently
    return NextResponse.json({ ok: false });
  }
}
