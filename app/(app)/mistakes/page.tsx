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
    <div className="max-w-4xl mx-auto py-8 md:py-12 px-4">

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight" style={{ color: "var(--text-primary)" }}>
            Mistake Log
          </h1>
          {uniqueWrong.length > 0 && (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 uppercase tracking-widest">
              {uniqueWrong.length} wrong
            </span>
          )}
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Study the pattern behind each mistake, not just the answer.
        </p>
      </header>

      {uniqueWrong.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-emerald-700 text-lg font-black mb-1">Clean Sheet!</p>
          <p className="text-emerald-600/70 text-sm mb-6">No mistakes recorded yet. Keep it up!</p>
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
                  className="text-xs font-bold px-3 py-1.5 rounded-full border bg-red-50 border-red-200 text-red-600"
                >
                  {subject} — {count} wrong
                </span>
              ))}
            </div>
          )}

          {/* Weak Topics grid */}
          <section className="mb-10">
            <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>
              Weak Topics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {patternSummary.map(({ pattern, count }) => (
                <div
                  key={pattern.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3 border bg-white"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{pattern.topic_name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">{pattern.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-red-500 font-black text-xs">{count}✕</span>
                    <Link
                      href={`/practice?patternId=${pattern.id}`}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors uppercase"
                    >
                      Practice
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* All wrong questions */}
          <section>
            <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>
              All Wrong Questions
            </h2>
            <div className="space-y-3">
              {uniqueWrong.map((attempt) => {
                const q = attempt.question ?? attempt.pyq;
                const pattern = attempt.question?.pattern ?? attempt.pyq?.pattern;
                if (!q || !pattern) return null;
                const options: string[] = Array.isArray(q.options) ? (q.options as string[]) : [];

                return (
                  <div
                    key={attempt.id}
                    className="rounded-2xl overflow-hidden border bg-white"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* Topic bar */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{pattern.subject}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-[10px] font-bold text-gray-500 truncate">{pattern.topic_name}</span>
                      {"year" in q && q.year && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-[10px] font-black text-orange-500">PYQ {q.year as number}</span>
                        </>
                      )}
                    </div>

                    <div className="px-4 py-4">
                      {/* Question */}
                      <p className="text-sm font-medium text-gray-800 leading-relaxed mb-3 whitespace-pre-wrap">
                        {q.question_text}
                      </p>

                      {/* Options */}
                      {options.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {options.map((opt: string) => {
                            const letter = opt.charAt(0);
                            const isCorrect = letter === q.correct_answer;
                            return (
                              <div
                                key={opt}
                                className={`px-3 py-2 rounded-lg text-sm border ${
                                  isCorrect
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                                    : "bg-gray-50 border-gray-100 text-gray-500"
                                }`}
                              >
                                {isCorrect && <span className="mr-2 text-emerald-600">✓</span>}
                                {opt}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Explanation</p>
                          <p className="text-sm text-blue-900/80 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
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
