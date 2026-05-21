import QuestionViewer from "@/components/question/QuestionViewer";
import type { CombinedQuestion } from "../_lib/dataFetch";

interface Props {
  pageQuestions: CombinedQuestion[];
  start: number;
  examLabel: string;
  practiceHref: string;
}

export default function QuestionList({ pageQuestions, start, examLabel, practiceHref }: Props) {
  return (
    <section className="space-y-6">
      {pageQuestions.map((q, i) => {
        const position = start + i + 1;
        const anchor = `q-${q.source}-${q.id}`;
        return (
          <article key={anchor} id={anchor} className="scroll-mt-20">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className="text-[11px] font-black uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Q{position}
              </span>
              {q.source === "pyq" && q.year > 2000 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                  {examLabel} {q.year}
                </span>
              )}
              {q.source === "gq" && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    q.difficulty === "Hard"
                      ? "bg-red-500/10 text-red-400"
                      : q.difficulty === "Medium"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {q.difficulty}
                </span>
              )}
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--bg-surface-2)",
                  color: "var(--text-muted)",
                }}
              >
                {q.questionType}
              </span>
            </div>

            <QuestionViewer
              question={{
                id: q.id,
                prefix: q.source,
                questionText: q.questionText,
                questionTextHindi: q.questionTextHindi ?? undefined,
                options: q.options,
                optionsHindi: (q.optionsHindi as string[] | undefined) ?? undefined,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                explanationHindi: q.explanationHindi ?? undefined,
                questionType: q.questionType,
                images: (q.images as any) ?? undefined,
              }}
              practiceHref={practiceHref}
            />
          </article>
        );
      })}
    </section>
  );
}
