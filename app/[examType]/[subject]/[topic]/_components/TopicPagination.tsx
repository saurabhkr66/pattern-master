import Link from "next/link";

interface Props {
  pageNum: number;
  totalPages: number;
  basePath: string;
}

// Page 1 lives at the topic root, not /page/1.
function hrefFor(basePath: string, page: number) {
  return page === 1 ? basePath : `${basePath}/page/${page}`;
}

// Windowed page list: first, last, and the pages either side of the current one,
// with `null` marking an elided run.
//
// WHY numbered links and not just prev/next: `/page/N` URLs are deliberately not
// in the sitemap (see lib/sitemap-data.ts — they were 75% of submitted URLs and
// Google refused to index them), so this nav is now the ONLY way a crawler
// discovers them. A pure prev/next chain puts page 40 forty hops deep, which in
// practice means it never gets crawled and its questions go unseen. A window
// keeps every page ~2 hops from the topic root and spreads link equity across
// the whole topic instead of funnelling it down a single strand.
function pageWindow(pageNum: number, totalPages: number): (number | null)[] {
  const SPAN = 2; // pages shown either side of the current one
  const pages = new Set<number>([1, totalPages]);
  for (let p = pageNum - SPAN; p <= pageNum + SPAN; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push(null);
    out.push(p);
    prev = p;
  }
  return out;
}

const stepStyle = {
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  borderColor: "var(--border)",
} as const;

export default function TopicPagination({ pageNum, totalPages, basePath }: Props) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(pageNum, totalPages);

  return (
    <nav className="mt-12 flex flex-col items-center gap-4" aria-label="Pagination">
      <div className="flex items-center justify-between w-full gap-3">
        {pageNum > 1 ? (
          <Link
            href={hrefFor(basePath, pageNum - 1)}
            prefetch={false}
            className="px-4 py-2 rounded-xl text-sm font-bold border hover:border-indigo-500/40 transition-colors"
            style={stepStyle}
            rel="prev"
          >
            {`← Page ${pageNum - 1}`}
          </Link>
        ) : (
          <span />
        )}

        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {`Page ${pageNum} of ${totalPages}`}
        </span>

        {pageNum < totalPages ? (
          <Link
            href={hrefFor(basePath, pageNum + 1)}
            prefetch={false}
            className="px-4 py-2 rounded-xl text-sm font-bold border hover:border-indigo-500/40 transition-colors"
            style={stepStyle}
            rel="next"
          >
            {`Page ${pageNum + 1} →`}
          </Link>
        ) : (
          <span />
        )}
      </div>

      <ol className="flex items-center justify-center gap-1.5 flex-wrap">
        {pages.map((p, i) =>
          p === null ? (
            <li
              key={`gap-${i}`}
              aria-hidden="true"
              className="px-1 text-xs select-none"
              style={{ color: "var(--text-muted)" }}
            >
              …
            </li>
          ) : (
            <li key={p}>
              {p === pageNum ? (
                <span
                  aria-current="page"
                  className="inline-flex min-w-9 justify-center px-3 py-1.5 rounded-lg text-sm font-bold border"
                  style={{
                    background: "var(--accent)",
                    color: "#0c0c0e",
                    borderColor: "var(--accent)",
                  }}
                >
                  {p}
                </span>
              ) : (
                <Link
                  href={hrefFor(basePath, p)}
                  prefetch={false}
                  aria-label={`Page ${p}`}
                  className="inline-flex min-w-9 justify-center px-3 py-1.5 rounded-lg text-sm font-bold border hover:border-indigo-500/40 transition-colors"
                  style={stepStyle}
                >
                  {p}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}
