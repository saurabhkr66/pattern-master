// app/api/bookmarks/toggle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { questionId, pyqId, mockQuestionId } = body;

        if (!questionId && !pyqId && !mockQuestionId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Find existing bookmark
        const existingBookmark = await prisma.bookmark.findFirst({
            where: {
                user_id: userId,
                question_id: questionId || null,
                pyq_id: pyqId || null,
                mock_question_id: mockQuestionId || null,
            }
        });

        // Only invalidate the `bookmarks` tag — the bookmarks listing page is
        // the only cache that actually reflects bookmark state. The `patterns`
        // tag was being wiped here too, which nuked 8 unrelated caches
        // (mastery notes, question banks, topic SEO pages, subject stats, etc.)
        // for every user across the whole app on every toggle. The questions
        // API overlays bookmark state per-request after reading the cached
        // static payload — the static payload itself never depends on
        // bookmarks, so it never needs to be invalidated when one toggles.
        if (existingBookmark) {
            await prisma.bookmark.delete({
                where: { id: existingBookmark.id }
            });
            revalidateTag("bookmarks", "page");
            return NextResponse.json({ bookmarked: false });
        } else {
            await prisma.bookmark.create({
                data: {
                    user_id: userId,
                    question_id: questionId || null,
                    pyq_id: pyqId || null,
                    mock_question_id: mockQuestionId || null,
                }
            });
            revalidateTag("bookmarks", "page");
            return NextResponse.json({ bookmarked: true });
        }
    } catch (error) {
        console.error("Failed to toggle bookmark:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
