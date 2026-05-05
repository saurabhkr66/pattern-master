import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

// NAT and MSQ are always 2 marks; MCQ uses the stored per-question value.
function resolveMarks(questionType: string, dbMarks: number): number {
  if (questionType === "NAT" || questionType === "MSQ") return 2;
  return dbMarks ?? 1;
}

// ── Global cache for question content (no userId) ──
// Question text, options, correct answers, explanations are static data.
// This cache is shared across ALL users hitting the same pattern.
const getStaticQuestions = (id: string) =>
  unstable_cache(
    async () => {
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
              _isSubjectPyq: true,
              // defaults — hydrated on client
              attempts: [],
              isBookmarked: false,
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
            // defaults — hydrated on client
            attempts: [],
            isBookmarked: false,
          })),
          pyqs: pattern.pyqs.map(q => ({
            ...q,
            marks: resolveMarks(q.question_type, q.marks),
            // defaults — hydrated on client
            attempts: [],
            isBookmarked: false,
          })),
        }
      };
    },
    [`pattern-questions-static-${id}-v1`],
    { revalidate: 600, tags: ["patterns"] }
  )();

// ── Per-user state: attempts + bookmarks (NOT cached — fast lightweight query) ──
async function getUserState(userId: string, questionIds: string[], pyqIds: string[], subjectPyqIds: string[]) {
  const [attempts, bookmarks] = await Promise.all([
    prisma.attempt.findMany({
      where: {
        user_id: userId,
        OR: [
          ...(questionIds.length > 0 ? [{ question_id: { in: questionIds } }] : []),
          ...(pyqIds.length > 0 ? [{ pyq_id: { in: pyqIds } }] : []),
          ...(subjectPyqIds.length > 0 ? [{ subject_pyq_id: { in: subjectPyqIds } }] : []),
        ],
      },
      select: {
        question_id: true,
        pyq_id: true,
        subject_pyq_id: true,
        is_correct: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.bookmark.findMany({
      where: {
        user_id: userId,
        OR: [
          ...(questionIds.length > 0 ? [{ question_id: { in: questionIds } }] : []),
          ...(pyqIds.length > 0 ? [{ pyq_id: { in: pyqIds } }] : []),
          ...(subjectPyqIds.length > 0 ? [{ subject_pyq_id: { in: subjectPyqIds } }] : []),
        ],
      },
      select: { question_id: true, pyq_id: true, subject_pyq_id: true },
    }),
  ]);

  // Build lookup maps: only keep the latest attempt per question
  const attemptMap: Record<string, { is_correct: boolean; created_at: Date }> = {};
  for (const a of attempts) {
    const key = a.question_id || a.pyq_id || a.subject_pyq_id || "";
    if (!attemptMap[key]) {
      attemptMap[key] = { is_correct: a.is_correct, created_at: a.created_at };
    }
  }

  const bookmarkSet = new Set<string>();
  for (const b of bookmarks) {
    bookmarkSet.add(b.question_id || b.pyq_id || b.subject_pyq_id || "");
  }

  return { attemptMap, bookmarkSet };
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { userId } = await auth();

        // 1. Get static question content from global cache
        const result = await getStaticQuestions(id);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { questions, pyqs } = result.data!;

        // 2. If user is logged in, overlay their attempt/bookmark state
        if (userId) {
          const isSubjectLevel = id.startsWith("subject-");
          const questionIds = isSubjectLevel ? [] : questions.map((q: any) => q.id);
          const pyqIds = isSubjectLevel ? [] : pyqs.map((q: any) => q.id);
          const subjectPyqIds = isSubjectLevel ? pyqs.map((q: any) => q.id) : [];

          const { attemptMap, bookmarkSet } = await getUserState(userId, questionIds, pyqIds, subjectPyqIds);

          const hydrate = (q: any) => ({
            ...q,
            attempts: attemptMap[q.id] ? [{ id: q.id, is_correct: attemptMap[q.id].is_correct, created_at: attemptMap[q.id].created_at }] : [],
            isBookmarked: bookmarkSet.has(q.id),
          });

          return NextResponse.json({
            questions: questions.map(hydrate),
            pyqs: pyqs.map(hydrate),
          });
        }

        // 3. Guest — return static data as-is
        return NextResponse.json({ questions, pyqs });

    } catch (error) {
        console.error("[GET_PATTERN_QUESTIONS]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
