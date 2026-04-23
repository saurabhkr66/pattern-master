// app/(app)/practice/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import PatternTable from "@/components/patterns/PatternTable";
import ExamSwitcher from "@/components/patterns/ExamSwitcher";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { BE } from "@/lib/theme";

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

      // Subject-level patterns only apply to CSE — skip entirely for other branches
      if (!branch || branch === "CSE") {
        const subjectPatternStats = await prisma.subjectPattern.findMany({
          select: { subject_name: true },
        });
        subjectPatternStats.forEach(sp => {
          stats[sp.subject_name] = (stats[sp.subject_name] || 0) + 1;
        });
      }

      return stats;
    },
    [`subject-stats-${examType}-${branch || "all"}-v3`],
    { revalidate: 3600, tags: ["patterns"] }
  )();
};

const getTopicsForSubject = (userId: string | null, examType: string, branch: string | null, subject: string | null) => {
  return unstable_cache(
    async () => {
      const isAll = !subject || subject === "All";

      // Subject-level patterns only apply to CSE — skip entirely for other branches
      const subjectPatterns = (!branch || branch === "CSE")
        ? await prisma.subjectPattern.findMany({
            where: !isAll ? { subject_name: subject } : {},
            select: {
              id: true,
              subject_name: true,
              _count: { select: { pyqs: true } },
            },
          })
        : [];

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

      if (isAll && mappedSubjects.length > 0) return mappedSubjects;

      // Fetch topic patterns with counts only
      const topicPatterns = await prisma.pattern.findMany({
        where: {
          exam_type: examType,
          ...(branch ? { branch } : {}),
          ...(!isAll ? { subject } : {}),
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
    [`topics-${examType}-${branch || "all"}-${userId || "guest"}-${subject || "all"}-v8`],
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
  searchParams: Promise<{ patternId?: string; exam?: string; branch?: string; subject?: string; questionId?: string }>;
}) {
  const { patternId, exam, branch: branchParam, subject: subjectParam, questionId } = await searchParams;
  const { userId } = await auth();

  let topics: any[] = [];
  let subjectStats: Record<string, number> = {};
  let baseExamType = "GATE";
  let baseBranch: string | null = null;

  try {
    const examMeta = await getCachedExamMeta();

    // Fetch user preferences for defaults
    const dbUser = userId ? await prisma.user.findUnique({
      where: { id: userId },
      select: { preferred_exam: true, preferred_branch: true }
    }) : null;

    const activeExamType = exam || dbUser?.preferred_exam || baseExamType;
    const activeBranch = branchParam ?? dbUser?.preferred_branch ?? baseBranch;

    const availableBranches = examMeta.branchesByExam[activeExamType] ?? [];

    [subjectStats, topics] = await Promise.all([
      getSubjectStats(activeExamType, activeBranch),
      getTopicsForSubject(userId, activeExamType, activeBranch, subjectParam || "All"),
    ]);


    return (
      <div className="be-screen" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="max-w-[1280px] mx-auto w-full flex flex-col md:flex-row gap-8 px-4 py-6 md:px-8 md:py-12 md:pb-20">
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header — tighter */}
            <div className="mb-5 md:mb-6">
              <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BE.textMute }}>
                {activeExamType}{activeBranch ? ` · ${activeBranch}` : ''} · Prep tracker
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 leading-[1.1]" style={{ fontFamily: BE.serif, color: BE.text }}>
                Master every topic, One pattern at a time.
              </h1>
              <div className="text-sm md:text-[15.5px] leading-relaxed max-w-[640px]" style={{ color: BE.textDim }}>
                Practice across {Object.keys(subjectStats).length} subjects. Drill into any subtopic to get the question bank, previous years, and your notes.
              </div>
            </div>

            <ExamSwitcher
              currentExam={activeExamType}
              currentBranch={activeBranch}
              availableExams={examMeta.exams}
              availableBranches={availableBranches}
            />

            {/* Practice Disclaimer */}
            {/* <div style={{ 
              marginBottom: 18, 
              padding: '12px 16px', 
              borderRadius: 12, 
              border: `1px solid ${BE.line}`, 
              background: BE.accentSoft,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start'
            }}>
              <div style={{ 
                width: 20, height: 20, borderRadius: 10, 
                background: BE.accentSoft, color: BE.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 900, flexShrink: 0
              }}>i</div>
              <p style={{ fontSize: 13, color: BE.textDim, lineHeight: 1.5, margin: 0, fontStyle: 'italic', fontFamily: BE.serif }}>
                <strong style={{ fontStyle: 'normal', color: BE.accent, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10, display: 'block', marginBottom: 2, fontWeight: 800 }}>Practice Note</strong>
                Topic-level questions are designed to be extremely close to the GATE standard. For guaranteed official previous year questions, select the <strong style={{ color: BE.text, fontStyle: 'normal' }}>PYQ</strong> tab within any subtopic.
              </p>
            </div> */}

            {topics.length === 0 && (subjectParam && subjectParam !== "All") ? (
              <div style={{ borderRadius: 16, padding: '48px 24px', textAlign: 'center', background: BE.surface, border: `1px solid ${BE.line}` }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, marginBottom: 16, fontSize: 24, background: 'var(--bg-surface-2)' }}>🔍</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: BE.text }}>No topics found</h3>
                <p style={{ fontSize: 14, color: BE.textDim }}>
                  We haven&apos;t added study patterns for {subjectParam} yet.
                </p>
              </div>
            ) : (
              <PatternTable 
                patterns={topics} 
                highlightPatternId={patternId} 
                directQuestionId={questionId}
                subjectStats={subjectStats}
                activeSubject={subjectParam || "All"}
              />
            )}
          </div>

          {/* Right Rail Mock */}
          <div className="hidden lg:block w-[300px] shrink-0">
            {/* Ad Rail or Info Rail would go here */}
          </div>
        </div>
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
