import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";

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
    const user = await currentUser();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await request.json();

    // Ensure User record exists in our local DB (synced from Clerk)
    // We use upsert here to be safe
    await prisma.user.upsert({
        where: { id: userId },
        update: {}, // No updates needed if it exists
        create: {
            id: userId,
            email: user?.emailAddresses[0]?.emailAddress || `${userId}@placeholder.com`,
        }
    });

    const userNote = await prisma.userNote.upsert({
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

    return NextResponse.json(userNote);
  } catch (error) {
    console.error("[USER_NOTES_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
