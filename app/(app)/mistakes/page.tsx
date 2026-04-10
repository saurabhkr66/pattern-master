import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import MathRenderer from "@/components/ui/MathRenderer";
import MistakeCard from "@/components/review/MistakeCard";

export const metadata: Metadata = {
  title: "Mistakes – PatternMaster",
  description: "Review all the questions you got wrong, grouped by topic.",
};

export default async function MistakesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { page } = await searchParams;
  const currentPage = Number(page || "1");
  const PAGE_SIZE = 2;

  const wrongAttempts = await prisma.attempt.findMany({
    where: { user_id: userId, is_correct: false },
    include: {
      question: { include: { pattern: true } },
      pyq: { include: { pattern: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const seen = new Set<string>();
  const uniqueWrong = wrongAttempts.filter((a) => {
    const key = a.question_id ?? a.pyq_id ?? a.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Pagination Logic
  const totalQuestions = uniqueWrong.length;
  const totalPages = Math.ceil(totalQuestions / PAGE_SIZE);
  const safePage = Math.min(Math.max(1, currentPage), totalPages || 1);
  const paginatedMistakes = uniqueWrong.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const patternMap = new Map<string, { pattern: any; count: number }>();
  for (const a of uniqueWrong) {
    const pattern = a.question?.pattern ?? a.pyq?.pattern;
    if (!pattern) continue;
    const existing = patternMap.get(pattern.id);
    if (existing) existing.count++;
    else patternMap.set(pattern.id, { pattern, count: 1 });
  }
  const patternSummary = Array.from(patternMap.values()).sort((a, b) => b.count - a.count);

  const subjectMap = new Map<string, number>();
  for (const { pattern, count } of patternSummary) {
    subjectMap.set(pattern.subject, (subjectMap.get(pattern.subject) ?? 0) + count);
  }
  const subjectSummary = Array.from(subjectMap.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-4xl mx-auto py-8 md:py-12 px-4 min-h-screen bg-transparent">

      {/* Header */}
      <header className="mb-8 font-outfit">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
            Mistake Log
          </h1>
          {uniqueWrong.length > 0 && (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 uppercase tracking-widest">
              {uniqueWrong.length} items
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Analyze the gaps in your logic, one pattern at a time.
        </p>
      </header>

      {uniqueWrong.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-emerald-700 dark:text-emerald-400 text-lg font-black mb-1">Clean Sheet!</p>
          <p className="text-emerald-600/70 dark:text-emerald-500/60 text-sm mb-6">No mistakes recorded yet. Keep it up!</p>
          <Link
            href="/practice"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
          >
            Start Practicing →
          </Link>
        </div>
      ) : (
        <>
          {/* Subject chips */}
          {subjectSummary.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {subjectSummary.map(([subject, count]) => (
                <span
                  key={subject}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400"
                >
                  {subject} — {count} unique
                </span>
              ))}
            </div>
          )}

          {/* Weak Topics grid */}
          <section className="mb-12">
            <h2 className="text-sm font-black uppercase tracking-widest mb-5 text-gray-400 dark:text-gray-500">
              Pattern Concentration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {patternSummary.map(({ pattern, count }) => (
                <div
                  key={pattern.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3 border border-gray-100 dark:border-white/5 bg-white dark:bg-[#111] shadow-sm hover:border-indigo-500/30 transition-all group"
                >
                  <div className="min-w-0">
                    <MathRenderer 
                      content={pattern.topic_name} 
                      className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" 
                    />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-0.5">{pattern.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-red-500 font-black text-xs">{count}✕</span>
                    <Link
                      href={`/practice?patternId=${pattern.id}`}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors uppercase"
                    >
                      Fix It
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* All wrong questions */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Detailed Log
              </h2>
              {totalPages > 1 && (
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600">
                  Page {safePage} of {totalPages}
                </span>
              )}
            </div>
            <div className="space-y-6">
              {paginatedMistakes.map((attempt) => {
                const q = attempt.question ?? attempt.pyq;
                const pattern = attempt.question?.pattern ?? attempt.pyq?.pattern;
                if (!q || !pattern) return null;

                return (
                  <MistakeCard
                    key={attempt.id}
                    attempt={{
                      id: attempt.id,
                      user_answer: attempt.user_answer,
                    }}
                    question={{
                      question_text: q.question_text,
                      options: q.options,
                      correct_answer: q.correct_answer,
                      explanation: q.explanation,
                      year: "year" in q ? (q.year as number) : null,
                    }}
                    pattern={{
                      subject: pattern.subject,
                      topic_name: pattern.topic_name,
                    }}
                  />
                );
              })}
            </div>
          </section>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-4 py-8 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Link
                  href={`/mistakes?page=${safePage - 1}`}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                    safePage > 1 
                      ? "bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-indigo-500 shadow-sm"
                      : "opacity-30 cursor-not-allowed pointer-events-none border-gray-100 dark:border-white/5 text-gray-400"
                  }`}
                >
                  ← Prev
                </Link>
                
                <div className="flex items-center gap-1.5 px-3">
                   {Array.from({ length: totalPages }).map((_, i) => {
                     const p = i + 1;
                     // Only show first, last, and pages around current if totalPages > 5
                     const isVisible = totalPages <= 5 || p === 1 || p === totalPages || Math.abs(p - safePage) <= 1;
                     
                     if (!isVisible) {
                       if (p === 2 || p === totalPages - 1) return <span key={p} className="text-gray-300 dark:text-gray-700">·</span>;
                       return null;
                     }

                     return (
                       <Link
                         key={p}
                         href={`/mistakes?page=${p}`}
                         className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${
                           safePage === p
                             ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                             : "text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                         }`}
                       >
                         {p}
                       </Link>
                     );
                   })}
                </div>

                <Link
                  href={`/mistakes?page=${safePage + 1}`}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                    safePage < totalPages 
                      ? "bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-indigo-500 shadow-sm"
                      : "opacity-30 cursor-not-allowed pointer-events-none border-gray-100 dark:border-white/5 text-gray-400"
                  }`}
                >
                  Next →
                </Link>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                {totalQuestions} Mistakes Across {totalPages} Pages
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
