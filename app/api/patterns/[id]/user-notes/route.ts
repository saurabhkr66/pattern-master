import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";

// Same recovery as app/api/save-attempt/route.ts: keyed on email, so a user
// whose row exists under a different Clerk id (dev vs prod instance) is
// re-pointed instead of hitting the email unique constraint. The old
// upsert-by-id could also create a `${userId}@placeholder.com` row.
async function syncUser(userId: string): Promise<void> {
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
  if (!email) throw new Error(`No email for Clerk user ${userId}`);
  await prisma.user.upsert({
    where: { email },
    create: { id: userId, email },
    update: { id: userId },
    select: { id: true },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patternId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userNote = await prisma.userNote.findUnique({
      where: {
        user_id_pattern_id: {
          user_id: userId,
          pattern_id: patternId,
        },
      },
    });

    return NextResponse.json({ content: userNote?.content || "" });
  } catch (error) {
    console.error("[USER_NOTES_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patternId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await request.json();

    const saveNote = () =>
      prisma.userNote.upsert({
        where: {
          user_id_pattern_id: {
            user_id: userId,
            pattern_id: patternId,
          },
        },
        update: {
          content,
        },
        create: {
          user_id: userId,
          pattern_id: patternId,
          content,
        },
      });

    // The User row almost always exists (the (app) layout creates it), so
    // write first and only pay for the Clerk Backend API call on the rare
    // FK miss — previously every note save called currentUser() + an upsert.
    let userNote;
    try {
      userNote = await saveNote();
    } catch (e: any) {
      if (e?.code !== "P2003") throw e;
      await syncUser(userId);
      userNote = await saveNote();
    }

    return NextResponse.json(userNote);
  } catch (error) {
    console.error("[USER_NOTES_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
