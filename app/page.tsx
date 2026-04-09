// app/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import PatternTable from "@/components/patterns/PatternTable";
import ExamSwitcher from "@/components/patterns/ExamSwitcher";
import { unstable_cache } from "next/cache";

// Cache pattern list based on exam type and branch
const getCachedPatterns = (userId: string | null, examType: string, branch: string | null) => {
  return unstable_cache(
    async () => {
      return prisma.pattern.findMany({
        where: {
          exam_type: examType,
          ...(branch ? { branch: branch } : {}),
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
    [`patterns-list-${examType}-${branch || 'all'}-${userId || 'guest'}`],
    { revalidate: 60, tags: ["patterns"] }
  )();
};

export default async function Home({ 
  searchParams 
}: { 
  searchParams: Promise<{ patternId?: string; exam?: string; branch?: string }> 
}) {
  const { patternId, exam, branch: branchParam } = await searchParams;
  const { userId } = await auth();

  let patterns: any[] = [];
  let userProfile = null;

  // 1. Determine base preference from DB
  let baseExamType = "GATE";
  let baseBranch = null;

  try {
    if (userId) {
      userProfile = await prisma.user.findUnique({
        where: { id: userId },
        select: { exam_type: true, branch: true }
      });
      
      if (userProfile?.exam_type) {
        baseExamType = userProfile.exam_type;
      }
      if (userProfile?.branch) {
        baseBranch = userProfile.branch;
      }
    }

    // 2. Priority: URL Param > DB Preference > Default
    const activeExamType = exam || baseExamType;
    const activeBranch = branchParam || baseBranch;

    patterns = await getCachedPatterns(userId, activeExamType, activeBranch);

    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <header className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-black text-white tracking-tight">PREP TRACKER</h1>
                <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-blue-500/20">
                  {activeExamType} {activeBranch && `• ${activeBranch}`}
                </span>
              </div>
              <p className="text-gray-400 font-medium">Master every {activeExamType} topic with laser-focused AI questions.</p>
            </div>
            
            {/* Exam & Branch Selector */}
            <ExamSwitcher currentExam={activeExamType} currentBranch={activeBranch} />
          </div>
        </header>

        {patterns.length === 0 ? (
          <div className="bg-gray-800/20 border border-gray-700/50 rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4 text-gray-500">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No patterns found</h3>
            <p className="text-gray-400 max-w-sm mx-auto">
              We haven't added study patterns for {activeExamType} {activeBranch ? `in ${activeBranch}` : ""} yet. Check back soon!
            </p>
          </div>
        ) : (
          <PatternTable patterns={patterns} highlightPatternId={patternId} />
        )}
      </div>
    );
  } catch (err) {
    console.error("Home Page Error:", err);
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center text-red-100">
          <p className="text-red-400 font-bold text-lg mb-2">⚠️ Something went wrong</p>
          <p className="opacity-70 text-sm">We couldn't load your personalized study list. Please try again in a moment.</p>
        </div>
      </div>
    );
  }
}