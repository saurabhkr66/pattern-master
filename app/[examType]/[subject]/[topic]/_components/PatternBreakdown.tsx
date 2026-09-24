import Link from "next/link";
import type { SubPatternSummary, SubPatternSummaryItem } from "../_lib/dataFetch";

interface Props {
  summary: SubPatternSummary;
  topicLabel: string;
  examLabel: string;
  basePath: string;
}

const VISIBLE = 5;

// "Question types in this chapter" — the reviewed sub-patterns, largest first.
// Server-rendered; "show all" is a native <details> so it costs no client JS
// and the full list stays in the HTML for crawlers.
export default function PatternBreakdown({ summary, topicLabel, examLabel, basePath }: Props) {
  const { types, pyqCount, coverageTop5 } = summary;
  if (types.length === 0) return null;

  // Shared year axis so every card's dots line up.
  const allYears = types.flatMap((t) => t.years);
  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);
  const axis = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  const head = types.slice(0, VISIBLE);
  const rest = types.slice(VISIBLE);

  return (
    <section
      className="mb-10 p-5 rounded-2xl border"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <h2 className="text-lg font-black mb-1" style={{ color: "var(--text-primary)" }}>
        {`Question types in ${topicLabel}`}
      </h2>
      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
        {`${pyqCount} ${examLabel} PYQs sorted into ${types.length} types by solving method`}
        {types.length > VISIBLE && coverageTop5 > 0 && (
          <>
            {" · "}
            <span className="font-bold text-orange-400">{`Top ${VISIBLE} types = ${coverageTop5}% of all PYQs`}</span>
          </>
        )}
      </p>

      <ol className="space-y-3">
        {head.map((t, i) => (
          <TypeCard key={t.id} type={t} rank={i + 1} axis={axis} examLabel={examLabel} basePath={basePath} />
        ))}
      </ol>

      {rest.length > 0 && (
        <details className="mt-3 group">
          <summary
            className="cursor-pointer text-sm font-bold list-none"
            style={{ color: "var(--accent)" }}
          >
            <span className="group-open:hidden">{`Show all ${types.length} types ↓`}</span>
            <span className="hidden group-open:inline">Show fewer ↑</span>
          </summary>
          <ol className="space-y-3 mt-3" start={VISIBLE + 1}>
            {rest.map((t, i) => (
              <TypeCard key={t.id} type={t} rank={VISIBLE + i + 1} axis={axis} examLabel={examLabel} basePath={basePath} />
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

function TypeCard({
  type, rank, axis, examLabel, basePath,
}: {
  type: SubPatternSummaryItem;
  rank: number;
  axis: number[];
  examLabel: string;
  basePath: string;
}) {
  const asked = new Set(type.years);
  return (
    <li
      className="p-4 rounded-xl border"
      style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {rank <= 3 && <span aria-hidden>🔥 </span>}
            {type.name}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            {type.method}
          </p>
          {type.trick && (
            <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
              {`Trick: ${type.trick}`}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-black text-orange-400 leading-none">{`${type.count}×`}</p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            {`in ${examLabel}`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
        <div
          className="flex items-center gap-1"
          aria-label={`Asked in ${type.years.join(", ")}`}
          title={`Asked in ${type.years.join(", ")}`}
        >
          {axis.map((y) => (
            <span
              key={y}
              className={`w-2 h-2 rounded-full ${asked.has(y) ? "bg-orange-400" : ""}`}
              style={asked.has(y) ? undefined : { background: "var(--border)" }}
            />
          ))}
          <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>
            {`${axis[0]}–${axis[axis.length - 1]}`}
          </span>
        </div>
        <Link
          href={`${basePath}/type/${type.slug}`}
          className="text-xs font-bold hover:underline"
          style={{ color: "var(--accent)" }}
        >
          {`See ${type.count} questions →`}
        </Link>
      </div>
    </li>
  );
}
