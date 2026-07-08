import Link from "next/link";
import type { RelatedTopic } from "../_lib/dataFetch";

// Internal-link block: real <a> links (via next/link) to sibling topics in the
// same subject. Improves crawl discovery and spreads link equity to deep topic
// pages, and keeps users moving deeper instead of dead-ending.
export default function RelatedTopics({
  topics,
  examType,
  subject,
  subjectLabel,
}: {
  topics: RelatedTopic[];
  examType: string;
  subject: string;
  subjectLabel: string;
}) {
  if (topics.length === 0) return null;

  return (
    <nav
      aria-label={`Related ${subjectLabel} topics`}
      className="mt-12 p-6 rounded-2xl border"
      style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}
    >
      <h2 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        More {subjectLabel} topics to practise
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {topics.map((t) => (
          <li key={t.topicSlug}>
            <Link
              href={`/${examType}/${subject}/${t.topicSlug}`}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="text-sm font-medium">{t.topicName}</span>
              <span className="text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
                {t.totalQ} Qs
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
