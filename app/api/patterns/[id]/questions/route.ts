import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

// NAT and MSQ are always 2 marks; MCQ uses the stored per-question value.
function resolveMarks(questionType: string, dbMarks: number): number {
  if (questionType === "NAT" || questionType === "MSQ") return 2;
  return dbMarks ?? 1;
}

const PYQ_SELECT = {
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
} as const;

// ── Global cache for question content (no userId) ──
// Question text, options, correct answers, explanations are static data.
// This cache is shared across ALL users hitting the same pattern.
// skip/take only applies to subject patterns (pagination); 0 = fetch all.
const getStaticQuestions = unstable_cache(
  async (id: string, skip = 0, take = 0) => {
    if (id.startsWith("subject-")) {
      const actualId = id.replace("subject-", "");
      const paginate = take > 0;

      const [subjectPattern, total] = await Promise.all([
        prisma.subjectPattern.findUnique({
          where: { id: actualId },
          select: {
            id: true,
            subject_name: true,
            pyqs: {
              select: PYQ_SELECT,
              orderBy: { year: "desc" },
              ...(paginate ? { skip, take } : {}),
            },
          },
        }),
        paginate
          ? prisma.subjectPYQ.count({ where: { subject_pattern_id: actualId } })
          : Promise.resolve(0),
      ]);

      if (!subjectPattern) return { error: "Subject Pattern not found", status: 404 };

      return {
        data: {
          questions: [],
          pyqs: subjectPattern.pyqs.map(pyq => ({
            ...pyq,
            marks: resolveMarks(pyq.question_type, pyq.marks),
            _isSubjectPyq: true,
            attempts: [],
            isBookmarked: false,
          })),
          total,
        }
      };
    }

    if (id.startsWith("mock-")) {
      const actualId = id.replace("mock-", "");
      const mock = await prisma.mockTestTemplate.findUnique({
        where: { id: actualId },
        select: { questions: true }
      });

      if (!mock) return { error: "Mock Test not found", status: 404 };

      const mockQuestions = (mock.questions as any[]) || [];

      return {
        data: {
          questions: mockQuestions.map(q => ({
            ...q,
            marks: q.marks || 1,
            attempts: [],
            isBookmarked: false,
          })),
          pyqs: [],
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
          attempts: [],
          isBookmarked: false,
        })),
        pyqs: pattern.pyqs.map(q => ({
          ...q,
          marks: resolveMarks(q.question_type, q.marks),
          attempts: [],
          isBookmarked: false,
        })),
      }
    };
  },
  ["pattern-questions-static"],
  { revalidate: 3600, tags: ["patterns"] }
);

// ── Per-user state: attempts + bookmarks ─────────────────────────────────────
// Single UNION ALL query — 1 DB connection instead of 2 concurrent ones.
async function getUserState(userId: string, questionIds: string[], pyqIds: string[], subjectPyqIds: string[]) {
  const allIds = [...questionIds, ...pyqIds, ...subjectPyqIds];
  if (allIds.length === 0) return { attemptMap: {}, bookmarkSet: new Set<string>() };

  const qClause = questionIds.length > 0 ? Prisma.sql`OR question_id::text = ANY(${questionIds})` : Prisma.empty;
  const pClause = pyqIds.length > 0 ? Prisma.sql`OR pyq_id::text = ANY(${pyqIds})` : Prisma.empty;
  const spClause = subjectPyqIds.length > 0 ? Prisma.sql`OR subject_pyq_id::text = ANY(${subjectPyqIds})` : Prisma.empty;
  // FALSE starts the OR chain so each clause can be appended uniformly
  const whereIds = Prisma.sql`(FALSE ${qClause} ${pClause} ${spClause})`;

  const rows = await prisma.$queryRaw<{
    type: string;
    id: string;
    is_correct: boolean | null;
    created_at: Date | null;
  }[]>(Prisma.sql`
    SELECT 'a'::text AS type,
           COALESCE(question_id, pyq_id, subject_pyq_id)::text AS id,
           is_correct, created_at
    FROM "Attempt"
    WHERE user_id = ${userId} AND ${whereIds}
    UNION ALL
    SELECT 'b'::text AS type,
           COALESCE(question_id, pyq_id, subject_pyq_id)::text AS id,
           NULL::boolean AS is_correct, NULL::timestamptz AS created_at
    FROM "Bookmark"
    WHERE user_id = ${userId} AND ${whereIds}
    ORDER BY created_at DESC NULLS LAST
  `);

  const attemptMap: Record<string, { is_correct: boolean; created_at: Date }> = {};
  const bookmarkSet = new Set<string>();

  for (const r of rows) {
    if (r.type === "a") {
      if (!attemptMap[r.id]) attemptMap[r.id] = { is_correct: r.is_correct!, created_at: r.created_at! };
    } else {
      bookmarkSet.add(r.id);
    }
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
        const { searchParams } = new URL(request.url);
        const skip = parseInt(searchParams.get("skip") || "0", 10);
        const take = parseInt(searchParams.get("take") || "0", 10);

        // 1. Get static question content from global cache
        const result = await getStaticQuestions(id, skip, take);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { questions, pyqs, total } = result.data!;

        // 2. If user is logged in, overlay their attempt/bookmark state
        if (userId) {
          const isSubjectLevel = id.startsWith("subject-");
          const isMock = id.startsWith("mock-");
          const questionIds = (isSubjectLevel || isMock) ? [] : questions.map((q: any) => q.id);
          const pyqIds = (isSubjectLevel || isMock) ? [] : pyqs.map((q: any) => q.id);
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
            total,
          });
        }

        // 3. Guest — return static data as-is
        return NextResponse.json({ questions, pyqs, total });

    } catch (error) {
        console.error("[GET_PATTERN_QUESTIONS]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
