// app/api/test/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidateTag, revalidatePath } from "next/cache";

interface SubmittedAnswer {
    questionId: string;
    source: "pyq" | "subject_pyq";
    questionType: string;
    marks: number; // 1 or 2
    userAnswer: string | null; // null = skipped
}

function checkNat(userAnswer: string, correctAnswer: string): boolean {
    if (!userAnswer) return false;
    const ca = correctAnswer.trim();
    if (ca.includes(":")) {
        const [minStr, maxStr] = ca.split(":");
        const val = parseFloat(userAnswer.trim());
        return !isNaN(val) && val >= parseFloat(minStr) && val <= parseFloat(maxStr);
    }
    return userAnswer.trim() === ca;
}

function checkMsq(userAnswer: string, correctAnswer: string): boolean {
    if (!userAnswer) return false;
    const userSet = userAnswer.split(/[;,]/).map(s => s.trim().toUpperCase()).filter(Boolean).sort();
    const correctSet = correctAnswer.split(/[;,]/).map(s => s.trim().toUpperCase()).filter(Boolean).sort();
    return JSON.stringify(userSet) === JSON.stringify(correctSet);
}

function checkMcq(userAnswer: string, correctAnswer: string): boolean {
    if (!userAnswer) return false;
    return userAnswer.trim().toUpperCase() === correctAnswer.trim().toUpperCase();
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { answers, timeTakenSecs, mockTestId }: { answers: SubmittedAnswer[]; timeTakenSecs: number; mockTestId?: string } = body;

        if (!answers || !Array.isArray(answers)) {
            return NextResponse.json({ error: "Invalid answers payload" }, { status: 400 });
        }

        // Fetch correct answers for all questions from DB
        const pyqIds = answers.filter(a => a.source === "pyq").map(a => a.questionId);
        const subjectPyqIds = answers.filter(a => a.source === "subject_pyq").map(a => a.questionId);

        const [fetchedPyqs, fetchedSubjectPyqs] = await Promise.all([
            pyqIds.length > 0 ? prisma.pYQ.findMany({
                where: { id: { in: pyqIds } },
                select: { id: true, correct_answer: true, explanation: true, question_text: true, options: true },
            }) : [],
            subjectPyqIds.length > 0 ? prisma.subjectPYQ.findMany({
                where: { id: { in: subjectPyqIds } },
                select: { id: true, correct_answer: true, explanation: true, question_text: true, options: true },
            }) : [],
        ]);

        const pyqMap = new Map(fetchedPyqs.map(q => [q.id, q]));
        const subjPyqMap = new Map(fetchedSubjectPyqs.map(q => [q.id, q]));

        let score = 0;
        let maxScore = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let skippedCount = 0;
        const breakdown: any[] = [];

        for (const ans of answers) {
            const qData = ans.source === "pyq" ? pyqMap.get(ans.questionId) : subjPyqMap.get(ans.questionId);
            if (!qData) continue;

            maxScore += ans.marks;
            const isSkipped = !ans.userAnswer || ans.userAnswer.trim() === "";

            let isCorrect = false;
            if (!isSkipped) {
                if (ans.questionType === "MCQ") {
                    isCorrect = checkMcq(ans.userAnswer!, qData.correct_answer);
                } else if (ans.questionType === "MSQ") {
                    isCorrect = checkMsq(ans.userAnswer!, qData.correct_answer);
                } else if (ans.questionType === "NAT") {
                    isCorrect = checkNat(ans.userAnswer!, qData.correct_answer);
                }
            }

            // Calculate score delta
            if (isSkipped) {
                skippedCount++;
            } else if (isCorrect) {
                correctCount++;
                score += ans.marks;
            } else {
                wrongCount++;
                // Negative marking: only for MCQ
                if (ans.questionType === "MCQ") {
                    score -= ans.marks === 1 ? 0.33 : 0.66;
                }
            }

            breakdown.push({
                questionId: ans.questionId,
                source: ans.source,
                questionType: ans.questionType,
                marks: ans.marks,
                userAnswer: ans.userAnswer ?? null,
                correctAnswer: qData.correct_answer,
                isCorrect,
                isSkipped,
                explanation: qData.explanation,
                questionText: qData.question_text,
                options: qData.options,
            });
        }

        const finalScore = Math.max(0, Math.round(score * 100) / 100);

        // Save TestSession to DB (graceful fallback if table not yet created)
        let sessionId = "local-" + Date.now();
        try {
            const session = await prisma.testSession.create({
                data: {
                    user_id: userId,
                    score: finalScore,
                    max_score: maxScore,
                    total_questions: answers.length,
                    correct_count: correctCount,
                    wrong_count: wrongCount,
                    skipped_count: skippedCount,
                    time_taken_secs: timeTakenSecs ?? null,
                    answers: breakdown,
                    mock_test_id: mockTestId || null,
                },
            });
            sessionId = session.id;
        } catch (dbErr: any) {
            if (!(dbErr?.code === "P2021" || dbErr?.message?.includes("does not exist"))) {
                throw dbErr; // rethrow unexpected errors
            }
            // Table not created yet — attempts will still be saved below
        }

        // Save individual attempts for dashboard tracking
        await Promise.allSettled(
            answers.map(async (ans) => {
                const qData = ans.source === "pyq" ? pyqMap.get(ans.questionId) : subjPyqMap.get(ans.questionId);
                if (!qData || (!ans.userAnswer && ans.userAnswer !== "")) return;

                const isSkipped = !ans.userAnswer || ans.userAnswer.trim() === "";
                if (isSkipped) return;

                let isCorrect = false;
                if (ans.questionType === "MCQ") isCorrect = checkMcq(ans.userAnswer!, qData.correct_answer);
                else if (ans.questionType === "MSQ") isCorrect = checkMsq(ans.userAnswer!, qData.correct_answer);
                else if (ans.questionType === "NAT") isCorrect = checkNat(ans.userAnswer!, qData.correct_answer);

                await prisma.attempt.create({
                    data: {
                        user_id: userId,
                        pyq_id: ans.source === "pyq" ? ans.questionId : null,
                        subject_pyq_id: ans.source === "subject_pyq" ? ans.questionId : null,
                        is_correct: isCorrect,
                        user_answer: ans.userAnswer ?? null,
                    },
                });
            })
        );

        await revalidatePath("/dashboard", "page");
        await revalidateTag("dashboard", "page");
        await revalidateTag("patterns", "page");

        return NextResponse.json({
            sessionId,
            score: finalScore,
            maxScore,
            correctCount,
            wrongCount,
            skippedCount,
            breakdown,
        }, { status: 201 });


    } catch (error) {
        console.error("Test submit error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
