import Link from "next/link";

interface Props {
  examType: string;
  subject: string;
  subjectLabel: string;
  topicLabel: string;
  examFullLabel: string;
  atomicLogic: string | null;
  totalQ: number;
  pyqCount: number;
  gqCount: number;
  year: number;
  shortNotes: string | null;
}

export default function TopicHeader({
  examType, subject, subjectLabel, topicLabel, examFullLabel,
  atomicLogic, totalQ, pyqCount, gqCount, year, shortNotes,
}: Props) {
  return (
    <>
      <nav
        className="text-xs font-medium mb-6 flex items-center gap-2 flex-wrap"
        style={{ color: "var(--text-secondary)" }}
      >
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span>›</span>
        <Link href={`/${examType}/${subject}`} className="hover:underline">
          {subjectLabel}
        </Link>
        <span>›</span>
        <span style={{ color: "var(--text-primary)" }}>{topicLabel}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
          {examFullLabel} · {subjectLabel}
        </p>
        <h1
          className="text-3xl md:text-4xl font-black mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          {topicLabel} Practice Questions
        </h1>
        {atomicLogic && (
          <p
            className="text-sm max-w-2xl mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {atomicLogic}
          </p>
        )}
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {totalQ} questions · {pyqCount} PYQs · {gqCount} AI practice · {examFullLabel} {year}
        </p>
      </header>

      {shortNotes && (
        <section
          className="mb-10 p-5 rounded-2xl border"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <h2
            className="text-sm font-black uppercase tracking-widest mb-3"
            style={{ color: "var(--accent)" }}
          >
            📘 {topicLabel} – Concept Summary
          </h2>
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--text-primary)" }}
          >
            {shortNotes}
          </div>
        </section>
      )}
    </>
  );
}
