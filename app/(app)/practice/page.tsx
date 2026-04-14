// app/(app)/practice/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import PatternTable from "@/components/patterns/PatternTable";
import ExamSwitcher from "@/components/patterns/ExamSwitcher";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practice – PatternMaster",
  description: "Practice GATE CSE, ISRO, BARC & ESE topics with AI-generated questions.",
};



// Cache unique subjects and their topic counts for the tabs
const getSubjectStats = (examType: string, branch: string | null) => {
  return unstable_cache(
    async () => {
      // Use groupBy for major performance gain over fetching all pattern rows
      const statsBySubject = await prisma.pattern.groupBy({
        by: ['subject'],
        where: { exam_type: examType, ...(branch ? { branch } : {}) },
        _count: { _all: true }
      });

      const stats: Record<string, number> = {};
      statsBySubject.forEach(entry => {
        stats[entry.subject] = entry._count._all;
      });

      // Special case: subjectPatterns (subject-level practice cards)
      const subjectPatternStats = await prisma.subjectPattern.findMany({
        select: { subject_name: true },
      });
      subjectPatternStats.forEach(sp => {
        stats[sp.subject_name] = (stats[sp.subject_name] || 0) + 1;
      });

      return stats;
    },
    [`subject-stats-${examType}-${branch || "all"}`],
    { revalidate: 3600, tags: ["patterns"] }
  )();
};

const getTopicsForSubject = (userId: string | null, examType: string, branch: string | null, subject: string | null) => {
  return unstable_cache(
    async () => {
      const isAll = !subject || subject === "All";

      // Fetch subject-level patterns with counts only (no individual rows)
      const subjectPatterns = await prisma.subjectPattern.findMany({
        where: !isAll ? { subject_name: subject } : {},
        select: {
          id: true,
          subject_name: true,
          _count: { select: { pyqs: true } },
        },
      });

      // Batch fetch solved counts for subject PYQs in a single query
      let subjectSolvedMap: Record<string, number> = {};
      if (userId && subjectPatterns.length > 0) {
        const spIds = subjectPatterns.map((sp) => sp.id);
        const solvedCounts = await prisma.attempt.groupBy({
          by: ["subject_pyq_id"],
          where: {
            user_id: userId,
            is_correct: true,
            subject_pyq: { subject_pattern_id: { in: spIds } },
          },
          _count: true,
        });
        solvedCounts.forEach((row) => {
          if (row.subject_pyq_id) {
            // We need to map subject_pyq_id back to subject_pattern_id
            // For simplicity, count distinct solved PYQs per subject pattern
            subjectSolvedMap[row.subject_pyq_id] = (subjectSolvedMap[row.subject_pyq_id] || 0) + 1;
          }
        });
      }

      // Batch: count solved subject PYQs per subject_pattern_id
      let solvedBySubjectPattern: Record<string, number> = {};
      if (userId && subjectPatterns.length > 0) {
        const spIds = subjectPatterns.map((sp) => sp.id);
        const rows = await prisma.$queryRaw<{ sp_id: string; solved: bigint }[]>`
          SELECT sp.subject_pattern_id as sp_id, COUNT(DISTINCT a.subject_pyq_id)::bigint as solved
          FROM "Attempt" a
          JOIN "SubjectPYQ" sp ON sp.id = a.subject_pyq_id
          WHERE a.user_id = ${userId}
            AND a.is_correct = true
            AND sp.subject_pattern_id = ANY(${spIds})
          GROUP BY sp.subject_pattern_id
        `;
        rows.forEach((r) => {
          solvedBySubjectPattern[r.sp_id] = Number(r.solved);
        });
      }

      const mappedSubjects = subjectPatterns.map((sp) => ({
        id: `subject-${sp.id}`,
        subject: sp.subject_name,
        topic_name: sp.subject_name,
        atomic_logic: `Comprehensive practice covering all seeded questions for ${sp.subject_name}.`,
        isSubjectLevel: true,
        totalQuestions: sp._count.pyqs,
        questionsCount: 0,
        pyqsCount: sp._count.pyqs,
        solvedQuestions: solvedBySubjectPattern[sp.id] ?? 0,
        questions: [],
        pyqs: [],
      }));

      if (isAll) return mappedSubjects;

      // Fetch topic patterns with counts only
      const topicPatterns = await prisma.pattern.findMany({
        where: {
          exam_type: examType,
          ...(branch ? { branch } : {}),
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

      // Batch fetch solved counts for topic questions + PYQs
      let solvedQByPattern: Record<string, number> = {};
      let solvedPByPattern: Record<string, number> = {};
      if (userId && topicPatterns.length > 0) {
        const patternIds = topicPatterns.map((p) => p.id);
        const [qSolved, pSolved] = await Promise.all([
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
        ]);
        qSolved.forEach((r) => { solvedQByPattern[r.pid] = Number(r.solved); });
        pSolved.forEach((r) => { solvedPByPattern[r.pid] = Number(r.solved); });
      }

      const mappedTopics = topicPatterns.map((p) => ({
        ...p,
        totalQuestions: p._count.questions + p._count.pyqs,
        questionsCount: p._count.questions,
        pyqsCount: p._count.pyqs,
        solvedQuestions: (solvedQByPattern[p.id] ?? 0) + (solvedPByPattern[p.id] ?? 0),
        questions: [],
        pyqs: [],
      }));

      return [...mappedSubjects, ...mappedTopics];
    },
    [`topics-${examType}-${branch || "all"}-${userId || "guest"}-${subject || "all"}-v6`],
    { revalidate: 300, tags: ["patterns"] }
  )();
};

const getCachedExamMeta = unstable_cache(
  async () => {
    const rows = await prisma.pattern.findMany({
      select: { exam_type: true, branch: true },
      distinct: ["exam_type", "branch"],
    });

    const exams = [...new Set(rows.map((r) => r.exam_type))].sort();
    const branchesByExam: Record<string, string[]> = {};
    for (const row of rows) {
      if (!branchesByExam[row.exam_type]) branchesByExam[row.exam_type] = [];
      if (!branchesByExam[row.exam_type].includes(row.branch)) {
        branchesByExam[row.exam_type].push(row.branch);
      }
    }
    return { exams, branchesByExam };
  },
  ["exam-meta"],
  { revalidate: 3600, tags: ["patterns"] }
);

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ patternId?: string; exam?: string; branch?: string; subject?: string }>;
}) {
  const { patternId, exam, branch: branchParam, subject: subjectParam } = await searchParams;
  const { userId } = await auth();

  let topics: any[] = [];
  let subjectStats: Record<string, number> = {};
  let baseExamType = "GATE";
  let baseBranch: string | null = null;

  try {
    const examMeta = await getCachedExamMeta();

    const activeExamType = exam || baseExamType;
    const activeBranch = branchParam ?? baseBranch;

    const availableBranches = examMeta.branchesByExam[activeExamType] ?? [];

    [subjectStats, topics] = await Promise.all([
      getSubjectStats(activeExamType, activeBranch),
      getTopicsForSubject(userId, activeExamType, activeBranch, subjectParam || "All"),
    ]);


    return (
      <div className="max-w-4xl mx-auto py-8 md:py-12 px-4">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase" style={{ color: "var(--text-primary)" }}>
              Prep Tracker
            </h1>
            <span className="bg-blue-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
              {activeExamType}{activeBranch ? ` · ${activeBranch}` : ""}
            </span>
          </div>
          <p className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
            Master every topic with AI-generated pattern questions.
          </p>
          <ExamSwitcher
            currentExam={activeExamType}
            currentBranch={activeBranch}
            availableExams={examMeta.exams}
            availableBranches={availableBranches}
          />
        </header>

        {/* Practice Disclaimer */}
        <div className="mb-6 p-4 rounded-2xl border border-blue-500/10 bg-blue-500/5 flex items-start gap-3.5">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400">
            i
          </div>
          <p className="text-xs md:text-[13px] leading-relaxed italic" style={{ color: "var(--text-secondary)" }}>
            <strong className="not-italic text-blue-400 uppercase tracking-widest text-[9px] block mb-1 font-black">Practice Note</strong>
            Topic-level questions are designed to be extremely close to the GATE standard, but they may or may not have appeared in an actual exam. For guaranteed official previous year questions, click on the <strong style={{ color: "var(--text-primary)" }} className="not-italic">Subject Name</strong> cards at the top of the list.
          </p>
        </div>

        {topics.length === 0 && (subjectParam && subjectParam !== "All") ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl" style={{ background: "var(--bg-surface-2)" }}>🔍</div>
            <h3 className="text-lg font-black mb-1" style={{ color: "var(--text-primary)" }}>No topics found</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              We haven&apos;t added study patterns for {subjectParam} yet.
            </p>
          </div>
        ) : (
          <PatternTable 
            patterns={topics} 
            highlightPatternId={patternId} 
            subjectStats={subjectStats}
            activeSubject={subjectParam || "All"}
          />
        )}
      </div>
    );
  } catch (err) {
    console.error("Practice Page Error:", err);
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center text-red-100">
          <p className="text-red-400 font-bold text-lg mb-2">⚠️ Something went wrong</p>
          <p className="opacity-70 text-sm">
            We couldn&apos;t load your personalized study list. Please try again in a moment.
          </p>
        </div>
      </div>
    );
  }
}
