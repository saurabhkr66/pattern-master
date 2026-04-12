// app/api/test/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const TARGET_QUESTIONS = 55;
// 1-mark: first 22 questions, 2-mark: next 33 questions
const ONE_MARK_COUNT = 22;

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const subjectFilters = searchParams.getAll("subject").flatMap(s => s.split(",")).map(s => s.trim()).filter(Boolean);
        const sortedFilters = [...subjectFilters].sort();

        // 1. Fetch matching MockTestTemplates to see if a valid one already exists
        const matchingTemplates = await prisma.mockTestTemplate.findMany({
            include: {
                sessions: {
                    where: { user_id: userId }
                }
            },
            orderBy: { created_at: "asc" }
        });

        // Filter templates to those that have the EXACT same subjects
        const exactTemplates = matchingTemplates.filter(t => {
            if (t.subjects.length !== sortedFilters.length) return false;
            const tSorted = [...t.subjects].sort();
            return tSorted.every((val, index) => val === sortedFilters[index]);
        });

        // Find the first one the user hasn't taken
        const availableTemplate = exactTemplates.find(t => t.sessions.length === 0);

        if (availableTemplate) {
            return NextResponse.json({
                mockTestId: availableTemplate.id,
                title: availableTemplate.title,
                questions: availableTemplate.questions,
                totalQuestions: availableTemplate.total_questions,
                maxScore: availableTemplate.max_score,
                subjects: availableTemplate.subjects.length > 0 ? availableTemplate.subjects : ["All Subjects"],
            });
        }

        // 2. If no available template, generate a new one
        // Fetch PYQs and SubjectPYQs, optionally filtered by subject
        const [pyqs, subjectPyqs] = await Promise.all([
            prisma.pYQ.findMany({
                where: subjectFilters.length > 0
                    ? { pattern: { subject: { in: subjectFilters } } }
                    : undefined,
                select: {
                    id: true,
                    question_text: true,
                    options: true,
                    correct_answer: true,
                    explanation: true,
                    question_type: true,
                    year: true,
                    exam_type: true,
                    images: true,
                    pattern: {
                        select: { subject: true },
                    },
                },
            }),
            prisma.subjectPYQ.findMany({
                where: subjectFilters.length > 0
                    ? { subject_pattern: { subject_name: { in: subjectFilters } } }
                    : undefined,
                select: {
                    id: true,
                    question_text: true,
                    options: true,
                    correct_answer: true,
                    explanation: true,
                    question_type: true,
                    year: true,
                    images: true,
                    subject_pattern: { select: { subject_name: true } },
                },
            }),
        ]);

        // Normalize to common shape
        const normalizedPyqs = pyqs.map(q => ({
            id: q.id,
            source: "pyq" as const,
            question_text: q.question_text,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            question_type: q.question_type,
            year: q.year,
            subject: q.pattern?.subject ?? "Core CS",
            images: q.images,
        }));

        const normalizedSubjectPyqs = subjectPyqs.map(q => ({
            id: q.id,
            source: "subject_pyq" as const,
            question_text: q.question_text,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            question_type: q.question_type,
            year: q.year,
            subject: q.subject_pattern?.subject_name ?? "General",
            images: q.images,
        }));

        const allQuestions = shuffle([...normalizedPyqs, ...normalizedSubjectPyqs]);

        if (allQuestions.length === 0) {
            return NextResponse.json({ error: "No questions found for the selected subject." }, { status: 404 });
        }

        // Target type ratios
        const mcqs = allQuestions.filter(q => q.question_type === "MCQ");
        const msqs = allQuestions.filter(q => q.question_type === "MSQ");
        const nats = allQuestions.filter(q => q.question_type === "NAT");

        // Target: ~62% MCQ, ~13% MSQ, ~25% NAT of 55
        const targetMCQ = Math.min(34, mcqs.length);
        const targetMSQ = Math.min(7, msqs.length);
        const targetNAT = Math.min(55 - targetMCQ - targetMSQ, nats.length);

        const selected = shuffle([
            ...mcqs.slice(0, targetMCQ),
            ...msqs.slice(0, targetMSQ),
            ...nats.slice(0, targetNAT),
        ]).slice(0, TARGET_QUESTIONS);

        // Assign marks: first ONE_MARK_COUNT questions = 1 mark, rest = 2 marks
        const questionsWithMarks = selected.map((q, idx) => {
            const marks = idx < ONE_MARK_COUNT ? 1 : 2;
            // Remove correct_answer from client-side response to prevent cheating
            const { correct_answer, explanation, ...safeQ } = q;
            return { ...safeQ, marks };
        });

        const maxScore = questionsWithMarks.reduce((sum, q) => sum + q.marks, 0);

        // Generate persistent template name
        const testName = sortedFilters.length > 0 
            ? `${sortedFilters.join(", ")} Test #${exactTemplates.length + 1}`
            : `Full Mock Test #${exactTemplates.length + 1}`;

        const newTemplate = await prisma.mockTestTemplate.create({
            data: {
                title: testName,
                subjects: sortedFilters,
                total_questions: questionsWithMarks.length,
                max_score: maxScore,
                questions: questionsWithMarks as any, // Prisma accepts objects for JSON fields
            }
        });

        return NextResponse.json({
            mockTestId: newTemplate.id,
            title: newTemplate.title,
            questions: questionsWithMarks,
            totalQuestions: questionsWithMarks.length,
            maxScore: maxScore,
            subjects: sortedFilters.length > 0 ? sortedFilters : ["All Subjects"],
        });

    } catch (error) {
        console.error("Test generation error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
