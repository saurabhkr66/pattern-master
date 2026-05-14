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
            select: {
                id: true,
                exam_type: true,
                score: true,
                max_score: true,
                total_questions: true,
                correct_count: true,
                wrong_count: true,
                skipped_count: true,
                time_taken_secs: true,
                section_scores: true,
                answers: true,
                mock_test_id: true,
                created_at: true,
                mock_test: { select: { title: true } },
            },
        });

        if (!session) {
            return NextResponse.json({ error: "Test session not found" }, { status: 404 });
        }

        // Hydrate missing topics from the MockTestTemplate ONLY when the session
        // snapshot is actually missing them. Modern sessions store topics inline
        // at submit time, so the common case skips the template fetch entirely.
        // When we do need it, pull just {id, topic} pairs via JSONB extract
        // instead of the full questions array (~500KB-1MB → ~5KB).
        if (session.mock_test_id && Array.isArray(session.answers)) {
            const needsHydration = (session.answers as any[]).some((ans) =>
                !ans.topic || ans.topic === "Uncategorized" || ans.topic === "General" || ans.topic === ""
            );

            if (needsHydration) {
                const topicRows = await prisma.$queryRaw<{ qid: string | null; qtext: string | null; topic: string | null }[]>`
                    SELECT
                        elem->>'id' AS qid,
                        elem->>'question_text' AS qtext,
                        COALESCE(elem->>'topic', elem->>'topic_name') AS topic
                    FROM "MockTestTemplate", jsonb_array_elements(questions) AS elem
                    WHERE id = ${session.mock_test_id}
                      AND (elem->>'topic' IS NOT NULL OR elem->>'topic_name' IS NOT NULL)
                `;

                const topicMap = new Map<string, string>();
                topicRows.forEach((r) => {
                    if (r.topic) {
                        if (r.qid) topicMap.set(r.qid, r.topic);
                        if (r.qtext) topicMap.set(r.qtext, r.topic);
                    }
                });

                session.answers = (session.answers as any[]).map((ans) => {
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
