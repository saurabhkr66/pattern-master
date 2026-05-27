import Link from "next/link";

interface Props {
  pageNum: number;
  totalPages: number;
  basePath: string;
}

export default function TopicPagination({ pageNum, totalPages, basePath }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="mt-12 flex items-center justify-between"
      aria-label="Pagination"
    >
      {pageNum > 1 ? (
        <Link
          href={pageNum === 2 ? basePath : `${basePath}/page/${pageNum - 1}`}
          className="px-4 py-2 rounded-xl text-sm font-bold border hover:border-indigo-500/40 transition-colors"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            borderColor: "var(--border)",
          }}
          rel="prev"
        >
          ← Page {pageNum - 1}
        </Link>
      ) : (
        <span />
      )}

      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        Page {pageNum} of {totalPages}
      </span>

      {pageNum < totalPages ? (
        <Link
          href={`${basePath}/page/${pageNum + 1}`}
          className="px-4 py-2 rounded-xl text-sm font-bold border hover:border-indigo-500/40 transition-colors"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            borderColor: "var(--border)",
          }}
          rel="next"
        >
          Page {pageNum + 1} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
