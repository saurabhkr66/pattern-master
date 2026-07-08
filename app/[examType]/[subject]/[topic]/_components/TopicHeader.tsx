import Link from "next/link";

interface Props {
  examType: string;
  subject: string;
  topic: string;
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
  examType, subject, topic, subjectLabel, topicLabel, examFullLabel,
  atomicLogic, totalQ, pyqCount, gqCount, year, shortNotes,
}: Props) {
  // The full notes live on their own SEO page (.../[topic]/notes); here we only
  // surface a link to them so the questions page stays question-focused.
  const hasNotes = !!shortNotes && shortNotes.trim().length > 0;

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
          {topicLabel} – {examFullLabel} {subjectLabel} Practice Questions &amp; PYQs
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

      {hasNotes && (
        <Link
          href={`/${examType}/${subject}/${topic}/notes`}
          className="mb-10 flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all hover:brightness-110"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <span className="flex items-center gap-3">
            <span className="text-xl">📘</span>
            <span>
              <span
                className="block text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {topicLabel} Notes &amp; Formulas
              </span>
              <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                Quick concept summary before you practise
              </span>
            </span>
          </span>
          <span className="text-sm font-bold shrink-0" style={{ color: "var(--accent)" }}>
            Read notes →
          </span>
        </Link>
      )}
    </>
  );
}
