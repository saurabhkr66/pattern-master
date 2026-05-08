import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

// Module-level stable cache — keyed without userId so content is shared
const getTopicsBase = (examType: string, branch: string, subject: string) =>
  unstable_cache(
    async () => {
      const isAll = !subject || subject === "All";

      const subjectPatterns = await prisma.subjectPattern.findMany({
        where: {
          branch: branch || "CSE",
          ...(!isAll ? { subject_name: subject } : {}),
        },
        select: {
          id: true,
          subject_name: true,
          _count: { select: { pyqs: true } },
        },
      });

      const mappedSubjectsBase = subjectPatterns.map((sp) => ({
        id: `subject-${sp.id}`,
        _rawId: sp.id,
        subject: sp.subject_name,
        topic_name: sp.subject_name,
        atomic_logic: `Comprehensive practice covering all seeded questions for ${sp.subject_name}.`,
        isSubjectLevel: true,
        totalQuestions: sp._count.pyqs,
        questionsCount: 0,
        pyqsCount: sp._count.pyqs,
        solvedQuestions: 0, // merged below per-user
        questions: [],
        pyqs: [],
      }));

      if (isAll) return { subjects: mappedSubjectsBase, topics: [] };

      const topicPatterns = await prisma.pattern.findMany({
        where: {
          exam_type: examType,
          ...(branch && branch !== "null" ? { branch } : {}),
          subject,
        },
        select: {
          id: true,
          topic_name: true,
          subject: true,
          atomic_logic: true,
          short_notes: true,
          short_notes_hindi: true,
          _count: { select: { questions: true, pyqs: true } },
        },
        orderBy: { topic_name: "asc" },
      });

      const mappedTopicsBase = topicPatterns.map((p) => ({
        ...p,
        totalQuestions: p._count.questions + p._count.pyqs,
        questionsCount: p._count.questions,
        pyqsCount: p._count.pyqs,
        solvedQuestions: 0, // merged below per-user
        questions: [],
        pyqs: [],
      }));

      if (subject === "Full Papers") {
        const normalizedExamTypes = examType === "JEE_MAIN" || examType === "JEE Main" 
          ? ["JEE_MAIN", "JEE Main"] 
          : [examType];

        const mocks = await prisma.mockTestTemplate.findMany({
          where: {
            exam_type: { in: normalizedExamTypes },
            ...(branch && branch !== "null" && branch !== "Common" ? { branch } : {}),
            mode: 'seeded'
          },
          select: {
            id: true,
            title: true,
            total_questions: true,
            subjects: true,
          },
          orderBy: { mock_number: 'desc' }
        });

        const mappedMocks = mocks.map(m => ({
          id: `mock-${m.id}`,
          topic_name: m.title,
          subject: "Full Papers",
          atomic_logic: `Full paper practice for ${m.title}.`,
          totalQuestions: m.total_questions,
          questionsCount: m.total_questions,
          pyqsCount: 0,
          solvedQuestions: 0,
          questions: [],
          pyqs: [],
          isMock: true
        }));

        return { subjects: [], topics: mappedMocks };
      }

      return { subjects: mappedSubjectsBase, topics: mappedTopicsBase };
    },
    [`topics-base-${examType}-${branch || "all"}-${subject || "all"}-v2`],
    { revalidate: 600, tags: ["patterns"] }
  )();

// Module-level factory so unstable_cache deduplicates across concurrent requests.
// Uses a single UNION ALL query — 1 connection instead of 3 parallel ones.
const getSolvedCounts = (
  userId: string,
  examType: string,
  branch: string,
  subject: string,
  spIds: string[],
  patternIds: string[],
) =>
  unstable_cache(
    async () => {
      const results = {
        bySubjectPattern: {} as Record<string, number>,
        byQPattern: {} as Record<string, number>,
        byPPattern: {} as Record<string, number>,
      };

      if (spIds.length === 0 && patternIds.length === 0) return results;

      const parts: Prisma.Sql[] = [];

      if (spIds.length > 0) {
        parts.push(Prisma.sql`
          SELECT 'subject'::text as type, sp.subject_pattern_id::text as id,
                 COUNT(DISTINCT a.subject_pyq_id)::bigint as solved
          FROM "Attempt" a
          JOIN "SubjectPYQ" sp ON sp.id = a.subject_pyq_id
          WHERE a.user_id = ${userId} AND a.is_correct = true
            AND sp.subject_pattern_id = ANY(${spIds})
          GROUP BY sp.subject_pattern_id
        `);
      }

      if (patternIds.length > 0) {
        parts.push(Prisma.sql`
          SELECT 'gq'::text as type, q.pattern_id::text as id,
                 COUNT(DISTINCT a.question_id)::bigint as solved
          FROM "Attempt" a
          JOIN "GeneratedQuestion" q ON q.id = a.question_id
          WHERE a.user_id = ${userId} AND a.is_correct = true
            AND q.pattern_id = ANY(${patternIds})
          GROUP BY q.pattern_id
        `);
        parts.push(Prisma.sql`
          SELECT 'pyq'::text as type, p.pattern_id::text as id,
                 COUNT(DISTINCT a.pyq_id)::bigint as solved
          FROM "Attempt" a
          JOIN "PYQ" p ON p.id = a.pyq_id
          WHERE a.user_id = ${userId} AND a.is_correct = true
            AND p.pattern_id = ANY(${patternIds})
          GROUP BY p.pattern_id
        `);
      }

      const rows = await prisma.$queryRaw<{ type: string; id: string; solved: bigint }[]>(
        Prisma.sql`${Prisma.join(parts, " UNION ALL ")}`
      );

      for (const r of rows) {
        const n = Number(r.solved);
        if (r.type === "subject") results.bySubjectPattern[r.id] = n;
        else if (r.type === "gq") results.byQPattern[r.id] = n;
        else results.byPPattern[r.id] = n;
      }

      return results;
    },
    [`practice-solved-${userId}-${examType}-${branch || "all"}-${subject || "all"}`],
    { revalidate: 60, tags: [`dashboard-${userId}`] }
  )();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examType = searchParams.get("exam") || "GATE";
    const branch = searchParams.get("branch") || "";
    const subject = searchParams.get("subject") || "All";

    const { userId } = await auth();

    // 1. Get base data from long-lived cache (no userId)
    const { subjects, topics } = await getTopicsBase(examType, branch, subject);

    // 2. Merge user-specific solved counts (fast single queries)
    const spIds = subjects.map((s: any) => s._rawId).filter(Boolean);
    const patternIds = topics.filter((t: any) => !t.isMock).map((t: any) => t.id).filter(Boolean);

    let solvedBySubjectPattern: Record<string, number> = {};
    let solvedQByPattern: Record<string, number> = {};
    let solvedPByPattern: Record<string, number> = {};

    if (userId) {
      const counts = await getSolvedCounts(userId, examType, branch, subject, spIds, patternIds);
      solvedBySubjectPattern = counts.bySubjectPattern;
      solvedQByPattern = counts.byQPattern;
      solvedPByPattern = counts.byPPattern;
    }

    // 3. Merge solved counts into the base data
    const mergedSubjects = subjects.map((s: any) => ({
      ...s,
      solvedQuestions: solvedBySubjectPattern[s._rawId] ?? 0,
    }));

    const mergedTopics = topics.map((t: any) => ({
      ...t,
      solvedQuestions: (solvedQByPattern[t.id] ?? 0) + (solvedPByPattern[t.id] ?? 0),
    }));

    return NextResponse.json({
      topics: subject === "All" ? mergedSubjects : [...mergedSubjects, ...mergedTopics],
    });
  } catch (err) {
    console.error("[GET /api/practice/topics]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
