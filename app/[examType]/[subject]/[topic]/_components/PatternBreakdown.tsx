import Link from "next/link";
import MathInline from "@/components/ui/MathInline";
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
  const perYear = new Map(type.yearCounts.map((y) => [y.year, y.count]));
  const peak = Math.max(1, ...type.yearCounts.map((y) => y.count));
  const summary = type.yearCounts.map((y) => `${y.year}: ${y.count}`).join(", ");
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
          {/* method/trick carry $…$ KaTeX (see lib/subPatterns discovery prompt). */}
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            <MathInline content={type.method} />
          </p>
          {type.trick && (
            <div
              className="flex items-baseline gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg text-sm w-fit max-w-full overflow-x-auto"
              style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 shrink-0">Trick</span>
              <MathInline content={type.trick} />
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-black text-orange-400 leading-none">{`${type.count}×`}</p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            {`in ${examLabel}`}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 mt-3 flex-wrap">
        {/* Questions per year: count on top, bar scaled to this type's busiest
            year, 2-digit year below. Scrolls sideways on long exam histories. */}
        <div className="overflow-x-auto max-w-full">
          <div className="flex items-end gap-1" role="img" aria-label={`Questions per year: ${summary}`} title={summary}>
            {axis.map((y) => {
              const n = perYear.get(y) ?? 0;
              return (
                <div key={y} className="flex flex-col items-center w-6 shrink-0">
                  <span
                    className="text-[10px] font-bold leading-none mb-0.5"
                    style={{ color: n ? "var(--text-primary)" : "transparent" }}
                  >
                    {n || "0"}
                  </span>
                  <span
                    className={`w-3 rounded-sm ${n ? "bg-orange-400" : ""}`}
                    style={{
                      height: n ? `${4 + Math.round((n / peak) * 16)}px` : "2px",
                      ...(n ? {} : { background: "var(--border)" }),
                    }}
                  />
                  <span className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {`'${String(y).slice(2)}`}
                  </span>
                </div>
              );
            })}
          </div>
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
