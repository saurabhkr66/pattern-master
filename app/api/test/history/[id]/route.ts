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

        // Dynamically inject topics from the MockTestTemplate if the old session snapshot lacks them
        if (session.mock_test_id && Array.isArray(session.answers)) {
            const template = await prisma.mockTestTemplate.findUnique({
                where: { id: session.mock_test_id },
                select: { questions: true },
            });

            if (template && Array.isArray(template.questions)) {
                const topicMap = new Map<string, string>();
                template.questions.forEach((q: any) => {
                    if (q.id && (q.topic || q.topic_name)) {
                        topicMap.set(q.id, q.topic || q.topic_name);
                    }
                    if (q.question_text && (q.topic || q.topic_name)) {
                        topicMap.set(q.question_text, q.topic || q.topic_name);
                    }
                });

                session.answers = session.answers.map((ans: any) => {
                    if (!ans.topic || ans.topic === "Uncategorized" || ans.topic === "General" || ans.topic === "") {
                        const liveTopic = topicMap.get(ans.questionId) || (ans.questionText && topicMap.get(ans.questionText));
                        if (liveTopic) {
                            return { ...ans, topic: liveTopic };
                        }
                    }
                    return ans;
                });
            }
        }

        return NextResponse.json({ session });
    } catch (error) {
        console.error("Test session fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
