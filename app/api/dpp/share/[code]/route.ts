import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Records that the run's OWNER actually clicked a share action (native share,
// WhatsApp, or copy) on their own result. Advisory: ShareChallenge fires this
// without awaiting it, so a network blip just leaves shared_at null rather than
// blocking the share itself.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await params;
  if (!code || code.length > 32) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Ownership is enforced in the WHERE clause rather than a separate read, since
  // the only effect of getting it wrong would be a no-op update.
  await prisma.$executeRaw`
    UPDATE "DppRun"
       SET shared_at = NOW()
     WHERE share_code = ${code}
       AND user_id = ${userId}
       AND shared_at IS NULL`;

  return NextResponse.json({ ok: true });
}
