// app/api/test/history/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await prisma.testSession.findUnique({
            where: { id: params.id, user_id: userId },
            include: { mock_test: { select: { title: true } } }
        });

        if (!session) {
            return NextResponse.json({ error: "Test session not found" }, { status: 404 });
        }

        return NextResponse.json({ session });
    } catch (error) {
        console.error("Test session fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
