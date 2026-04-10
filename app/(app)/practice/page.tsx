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

// Cache pattern list based on exam type, branch, and user
const getCachedPatterns = (userId: string | null, examType: string, branch: string | null) => {
  return unstable_cache(
    async () => {
      return prisma.pattern.findMany({
        where: {
          exam_type: examType,
          ...(branch ? { branch } : {}),
        },
        include: {
          questions: {
            include: {
              attempts: {
                where: userId ? { user_id: userId } : { user_id: "none" },
                orderBy: { created_at: "desc" },
                take: 1,
              },
            },
            orderBy: { created_at: "desc" },
          },
          pyqs: {
            include: {
              attempts: {
                where: userId ? { user_id: userId } : { user_id: "none" },
                orderBy: { created_at: "desc" },
                take: 1,
              },
            },
            orderBy: { year: "desc" },
          },
        },
        orderBy: { topic_name: "asc" },
      });
    },
    [`patterns-list-${examType}-${branch || "all"}-${userId || "guest"}-v2`],
    { revalidate: 1, tags: ["patterns"] }
  )();
};

// Cache distinct exams and branches from Pattern table
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
  searchParams: Promise<{ patternId?: string; exam?: string; branch?: string }>;
}) {
  const { patternId, exam, branch: branchParam } = await searchParams;
  const { userId } = await auth();

  let patterns: any[] = [];
  let baseExamType = "GATE";
  let baseBranch: string | null = null;

  try {
    const [userProfile, examMeta] = await Promise.all([
      userId
        ? prisma.user.findUnique({ where: { id: userId }, select: { exam_type: true, branch: true } })
        : null,
      getCachedExamMeta(),
    ]);

    if (userProfile?.exam_type) baseExamType = userProfile.exam_type;
    if (userProfile?.branch) baseBranch = userProfile.branch;

    const activeExamType = exam || baseExamType;
    const activeBranch = branchParam ?? baseBranch;

    // Branches available for the currently viewed exam
    const availableBranches = examMeta.branchesByExam[activeExamType] ?? [];

    patterns = await getCachedPatterns(userId, activeExamType, activeBranch);

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

        {patterns.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl" style={{ background: "var(--bg-surface-2)" }}>🔍</div>
            <h3 className="text-lg font-black mb-1" style={{ color: "var(--text-primary)" }}>No patterns found</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              We haven&apos;t added study patterns for {activeExamType}{activeBranch ? ` in ${activeBranch}` : ""} yet.
            </p>
          </div>
        ) : (
          <PatternTable patterns={patterns} highlightPatternId={patternId} />
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
