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

// Cache user profile for 1 hour to prevent DB hits on every tab switch
const getCachedUserProfile = (userId: string) => {
  return unstable_cache(
    async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { exam_type: true, branch: true },
      });
    },
    [`user-profile-${userId}`],
    { revalidate: 3600, tags: ["user-profile"] }
  )();
};

// Cache pattern list based on exam type, branch, and user
// Cache unique subjects and their topic counts for the tabs
const getSubjectStats = (examType: string, branch: string | null) => {
  return unstable_cache(
    async () => {
      const regularPatterns = await prisma.pattern.findMany({
        where: { exam_type: examType, ...(branch ? { branch } : {}) },
        select: { subject: true },
      });

      const stats: Record<string, number> = {};
      regularPatterns.forEach(p => {
        stats[p.subject] = (stats[p.subject] || 0) + 1;
      });

      const subjectPatterns = await prisma.subjectPattern.findMany({
        select: { subject_name: true },
      });
      subjectPatterns.forEach(sp => {
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

      // If 'All' is selected, only show subject-level practice cards to keep the UI clean.
      // Detailed topics are only shown when a specific subject is filtered.
      const subjectPatterns = await prisma.subjectPattern.findMany({
        where: !isAll ? { subject_name: subject } : {},
        select: {
          id: true,
          subject_name: true,
          _count: {
            select: { pyqs: true }
          },
          pyqs: {
            select: {
              id: true,
              attempts: {
                where: userId ? { user_id: userId } : { user_id: "none" },
                select: { is_correct: true },
                orderBy: { created_at: "desc" },
                take: 1,
              }
            }
          }
        }
      });

      const mappedSubjects = subjectPatterns.map(sp => ({
        id: `subject-${sp.id}`,
        subject: sp.subject_name,
        topic_name: sp.subject_name,
        atomic_logic: `Comprehensive practice covering all seeded questions for ${sp.subject_name}.`,
        isSubjectLevel: true,
        totalQuestions: sp._count.pyqs,
        questionsCount: 0,
        pyqsCount: sp._count.pyqs,
        solvedQuestions: sp.pyqs.filter(pq => pq.attempts[0]?.is_correct).length,
        questions: [],
        pyqs: [],
      }));

      // Only fetch individual topic patterns if a specific subject is selected
      if (isAll) {
        return mappedSubjects;
      }

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
          _count: {
            select: { questions: true, pyqs: true }
          },
          questions: {
            select: {
              id: true,
              attempts: {
                where: userId ? { user_id: userId } : { user_id: "none" },
                select: { is_correct: true },
                orderBy: { created_at: "desc" },
                take: 1,
              }
            }
          },
          pyqs: {
            select: {
              id: true,
              attempts: {
                where: userId ? { user_id: userId } : { user_id: "none" },
                select: { is_correct: true },
                orderBy: { created_at: "desc" },
                take: 1,
              }
            }
          }
        },
        orderBy: { topic_name: "asc" },
      });

      const mappedTopics = topicPatterns.map(p => ({
        ...p,
        totalQuestions: p._count.questions + p._count.pyqs,
        questionsCount: p._count.questions,
        pyqsCount: p._count.pyqs,
        solvedQuestions: 
          p.questions.filter(q => q.attempts[0]?.is_correct).length + 
          p.pyqs.filter(pq => pq.attempts[0]?.is_correct).length,
        questions: [],
        pyqs: [],
      }));

      return [...mappedSubjects, ...mappedTopics];

    },
    [`topics-${examType}-${branch || "all"}-${userId || "guest"}-${subject || "all"}-v5`],
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
    const [userProfile, examMeta] = await Promise.all([
      userId ? getCachedUserProfile(userId) : null,
      getCachedExamMeta(),
    ]);

    if (userProfile?.exam_type) baseExamType = userProfile.exam_type;
    if (userProfile?.branch) baseBranch = userProfile.branch;

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
