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

        if (existingBookmark) {
            await prisma.bookmark.delete({
                where: { id: existingBookmark.id }
            });
            revalidateTag("bookmarks", "page");
            revalidateTag("patterns", "page");
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
            revalidateTag("patterns", "page");
            return NextResponse.json({ bookmarked: true });
        }
    } catch (error) {
        console.error("Failed to toggle bookmark:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
