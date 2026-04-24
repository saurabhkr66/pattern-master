import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

// NAT and MSQ are always 2 marks; MCQ uses the stored per-question value.
function resolveMarks(questionType: string, dbMarks: number): number {
  if (questionType === "NAT" || questionType === "MSQ") return 2;
  return dbMarks ?? 1;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { userId } = await auth();

        // Wrap the internal logic in unstable_cache
        const getData = unstable_cache(
            async () => {
                // Check if it's a regular topic pattern or a subject-level pattern
                if (id.startsWith("subject-")) {
                    const actualId = id.replace("subject-", "");

                    const subjectPattern = await prisma.subjectPattern.findUnique({
                        where: { id: actualId },
                        select: {
                            id: true,
                            subject_name: true,
                            pyqs: {
                                select: {
                                    id: true,
                                    question_text: true,
                                    question_text_hindi: true,
                                    options: true,
                                    options_hindi: true,
                                    correct_answer: true,
                                    explanation: true,
                                    explanation_hindi: true,
                                    year: true,
                                    question_type: true,
                                    marks: true,
                                    images: true,
                                    attempts: {
                                        where: userId ? { user_id: userId } : { user_id: "none" },
                                        select: { id: true, is_correct: true, created_at: true },
                                        orderBy: { created_at: "desc" },
                                        take: 1,
                                    },
                                    bookmarks: {
                                        where: userId ? { user_id: userId } : { user_id: "none" },
                                        select: { id: true },
                                        take: 1,
                                    },
                                },
                                orderBy: { year: "desc" },
                            },
                        },
                    });

                    if (!subjectPattern) return { error: "Subject Pattern not found", status: 404 };

                    return {
                        data: {
                            questions: [],
                            pyqs: subjectPattern.pyqs.map(pyq => ({
                                ...pyq,
                                marks: resolveMarks(pyq.question_type, pyq.marks),
                                isBookmarked: pyq.bookmarks?.length > 0,
                                _isSubjectPyq: true,
                            })),
                        }
                    };
                }

                // Regular Topic Pattern
                const pattern = await prisma.pattern.findUnique({
                    where: { id },
                    select: {
                        questions: {
                            select: {
                                id: true,
                                question_text: true,
                                question_text_hindi: true,
                                options: true,
                                options_hindi: true,
                                correct_answer: true,
                                explanation: true,
                                explanation_hindi: true,
                                difficulty_level: true,
                                question_type: true,
                                marks: true,
                                images: true,
                                attempts: {
                                    where: userId ? { user_id: userId } : { user_id: "none" },
                                    select: { id: true, is_correct: true, created_at: true },
                                    orderBy: { created_at: "desc" },
                                    take: 1,
                                },
                                bookmarks: {
                                    where: userId ? { user_id: userId } : { user_id: "none" },
                                    select: { id: true },
                                    take: 1,
                                },
                            },
                            orderBy: { created_at: "desc" },
                        },
                        pyqs: {
                            select: {
                                id: true,
                                question_text: true,
                                question_text_hindi: true,
                                options: true,
                                options_hindi: true,
                                correct_answer: true,
                                explanation: true,
                                explanation_hindi: true,
                                year: true,
                                exam_type: true,
                                question_type: true,
                                marks: true,
                                images: true,
                                attempts: {
                                    where: userId ? { user_id: userId } : { user_id: "none" },
                                    select: { id: true, is_correct: true, created_at: true },
                                    orderBy: { created_at: "desc" },
                                    take: 1,
                                },
                                bookmarks: {
                                    where: userId ? { user_id: userId } : { user_id: "none" },
                                    select: { id: true },
                                    take: 1,
                                },
                            },
                            orderBy: { year: "desc" },
                        },
                    },
                });

                if (!pattern) return { error: "Topic Pattern not found", status: 404 };

                return {
                    data: {
                        questions: pattern.questions.map(q => ({
                            ...q,
                            marks: resolveMarks(q.question_type, q.marks),
                            isBookmarked: q.bookmarks?.length > 0,
                        })),
                        pyqs: pattern.pyqs.map(q => ({
                            ...q,
                            marks: resolveMarks(q.question_type, q.marks),
                            isBookmarked: q.bookmarks?.length > 0,
                        })),
                    }
                };
            },
            [`pattern-questions-${id}-${userId || "guest"}-v3`],
            { revalidate: 600, tags: ["patterns"] }
        );

        const result = await getData();

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json(result.data);

    } catch (error) {
        console.error("[GET_PATTERN_QUESTIONS]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
