import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

// Module-level stable cache — keyed without userId so content is shared
const getTopicsBase = (examType: string, branch: string, subject: string) =>
  unstable_cache(
    async () => {
      const isAll = !subject || subject === "All";

      const subjectPatterns = await prisma.subjectPattern.findMany({
        where: !isAll ? { subject_name: subject } : {},
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

      return { subjects: mappedSubjectsBase, topics: mappedTopicsBase };
    },
    [`topics-base-${examType}-${branch || "all"}-${subject || "all"}-v1`],
    { revalidate: 600, tags: ["patterns"] }
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
    const patternIds = topics.map((t: any) => t.id).filter(Boolean);

    let solvedBySubjectPattern: Record<string, number> = {};
    let solvedQByPattern: Record<string, number> = {};
    let solvedPByPattern: Record<string, number> = {};

    if (userId) {
      const promises: Promise<any>[] = [];

      if (spIds.length > 0) {
        promises.push(
          prisma.$queryRaw<{ sp_id: string; solved: bigint }[]>`
            SELECT sp.subject_pattern_id as sp_id, COUNT(DISTINCT a.subject_pyq_id)::bigint as solved
            FROM "Attempt" a
            JOIN "SubjectPYQ" sp ON sp.id = a.subject_pyq_id
            WHERE a.user_id = ${userId}
              AND a.is_correct = true
              AND sp.subject_pattern_id = ANY(${spIds})
            GROUP BY sp.subject_pattern_id
          `.then((rows) => {
            rows.forEach((r) => { solvedBySubjectPattern[r.sp_id] = Number(r.solved); });
          })
        );
      }

      if (patternIds.length > 0) {
        promises.push(
          Promise.all([
            prisma.$queryRaw<{ pid: string; solved: bigint }[]>`
              SELECT q.pattern_id as pid, COUNT(DISTINCT a.question_id)::bigint as solved
              FROM "Attempt" a
              JOIN "GeneratedQuestion" q ON q.id = a.question_id
              WHERE a.user_id = ${userId} AND a.is_correct = true AND q.pattern_id = ANY(${patternIds})
              GROUP BY q.pattern_id
            `,
            prisma.$queryRaw<{ pid: string; solved: bigint }[]>`
              SELECT p.pattern_id as pid, COUNT(DISTINCT a.pyq_id)::bigint as solved
              FROM "Attempt" a
              JOIN "PYQ" p ON p.id = a.pyq_id
              WHERE a.user_id = ${userId} AND a.is_correct = true AND p.pattern_id = ANY(${patternIds})
              GROUP BY p.pattern_id
            `,
          ]).then(([qSolved, pSolved]) => {
            qSolved.forEach((r) => { solvedQByPattern[r.pid] = Number(r.solved); });
            pSolved.forEach((r) => { solvedPByPattern[r.pid] = Number(r.solved); });
          })
        );
      }

      await Promise.all(promises);
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
