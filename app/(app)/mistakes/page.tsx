import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mistakes – PatternMaster",
  description: "Review all the questions you got wrong, grouped by topic.",
};

export default async function MistakesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Fetch all wrong attempts with full question/pyq + pattern info
  const wrongAttempts = await prisma.attempt.findMany({
    where: { user_id: userId, is_correct: false },
    include: {
      question: { include: { pattern: true } },
      pyq: { include: { pattern: true } },
    },
    orderBy: { created_at: "desc" },
  });

  // Deduplicate by question id so each question appears once
  const seen = new Set<string>();
  const uniqueWrong = wrongAttempts.filter((a) => {
    const key = a.question_id ?? a.pyq_id ?? a.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Group by pattern for the summary section
  const patternMap = new Map<
    string,
    { pattern: any; count: number }
  >();
  for (const a of uniqueWrong) {
    const pattern = a.question?.pattern ?? a.pyq?.pattern;
    if (!pattern) continue;
    const existing = patternMap.get(pattern.id);
    if (existing) existing.count++;
    else patternMap.set(pattern.id, { pattern, count: 1 });
  }
  const patternSummary = Array.from(patternMap.values()).sort(
    (a, b) => b.count - a.count
  );

  // Group by subject for the summary badges
  const subjectMap = new Map<string, number>();
  for (const { pattern, count } of patternSummary) {
    subjectMap.set(pattern.subject, (subjectMap.get(pattern.subject) ?? 0) + count);
  }
  const subjectSummary = Array.from(subjectMap.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-4xl mx-auto py-8 md:py-12 px-4">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
            Mistake Log
          </h1>
          <span className="bg-red-600/80 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
            {uniqueWrong.length} Wrong
          </span>
        </div>
        <p className="text-gray-400 font-medium">
          Every question you got wrong — study the pattern, not just the answer.
        </p>
      </header>

      {uniqueWrong.length === 0 ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-12 text-center">
          <p className="text-green-400 text-xl font-black mb-1">Clean Sheet!</p>
          <p className="text-green-300/60 text-sm">No mistakes recorded yet. Keep practicing!</p>
          <Link
            href="/practice"
            className="inline-block mt-6 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
          >
            Start Practicing →
          </Link>
        </div>
      ) : (
        <>
          {/* Subject Summary Chips */}
          <div className="flex flex-wrap gap-2 mb-8">
            {subjectSummary.map(([subject, count]) => (
              <span
                key={subject}
                className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full"
              >
                {subject} — {count} wrong
              </span>
            ))}
          </div>

          {/* Pattern-level Summary */}
          <section className="mb-10">
            <h2 className="text-lg font-black text-white mb-4 uppercase tracking-wide">
              Weak Topics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {patternSummary.map(({ pattern, count }) => (
                <div
                  key={pattern.id}
                  className="flex items-center justify-between bg-[#111] border border-white/10 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">{pattern.topic_name}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                      {pattern.subject}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-red-400 font-black text-sm">{count}✕</span>
                    <Link
                      href={`/practice?patternId=${pattern.id}`}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors uppercase"
                    >
                      Practice →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Full Wrong Questions List */}
          <section>
            <h2 className="text-lg font-black text-white mb-4 uppercase tracking-wide">
              All Wrong Questions
            </h2>
            <div className="space-y-4">
              {uniqueWrong.map((attempt) => {
                const q = attempt.question ?? attempt.pyq;
                const pattern = attempt.question?.pattern ?? attempt.pyq?.pattern;
                if (!q || !pattern) return null;

                const options: string[] = Array.isArray(q.options) ? q.options as string[] : [];

                return (
                  <div
                    key={attempt.id}
                    className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden"
                  >
                    {/* Topic tag */}
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                        {pattern.subject}
                      </span>
                      <span className="text-gray-600">·</span>
                      <span className="text-[10px] font-bold text-gray-400">{pattern.topic_name}</span>
                      {"year" in q && q.year && (
                        <>
                          <span className="text-gray-600">·</span>
                          <span className="text-[10px] font-bold text-orange-400">PYQ {q.year as number}</span>
                        </>
                      )}
                    </div>

                    <div className="px-5 py-4">
                      {/* Question */}
                      <p className="text-white font-medium text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                        {q.question_text}
                      </p>

                      {/* Options */}
                      <div className="space-y-2 mb-4">
                        {options.map((opt: string) => {
                          const letter = opt.charAt(0);
                          const isCorrect = letter === q.correct_answer;
                          return (
                            <div
                              key={opt}
                              className={`px-4 py-2.5 rounded-lg text-sm border ${
                                isCorrect
                                  ? "bg-green-500/10 border-green-500/40 text-green-300 font-bold"
                                  : "bg-white/[0.03] border-white/5 text-gray-400"
                              }`}
                            >
                              {isCorrect && <span className="mr-2">✓</span>}
                              {opt}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                        <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-1">
                          Explanation
                        </p>
                        <p className="text-blue-200/80 text-sm leading-relaxed">{q.explanation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
