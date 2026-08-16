"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BE } from "@/lib/theme";

// The student DPP index.
//
// This was a flat list of every released sheet across every exam, newest-updated
// first — so a NEET student scrolled past JEE sheets, and once a few dozen exist
// there is no way to answer either question that actually matters: "which ones
// haven't I done?" and "which ones are for MY exam?".
//
// Filtering is client-side on purpose. DPPs are hand-curated, so the whole
// released set is small enough to ship once and filter instantly, and the
// alternative (a round-trip per chip tap) would feel worse for no benefit. If
// the catalogue ever outgrows that, the page's `take` is the thing to notice.

export type DppIndexItem = {
  id: string;
  name: string;
  questionCount: number;
  examType: string;
  subject: string;
  topicName: string;
  /** Best submitted run — highest score, ties broken by fastest. Null if this
   *  student has never finished this sheet. */
  bestScore: number | null;
  bestMaxScore: number | null;
};

type Status = "all" | "todo" | "done";

const ALL = "All";

export default function DppIndexClient({ dpps }: { dpps: DppIndexItem[] }) {
  const [exam, setExam] = useState<string>(ALL);
  const [subject, setSubject] = useState<string>(ALL);
  const [status, setStatus] = useState<Status>("all");
  const [q, setQ] = useState("");

  const exams = useMemo(
    () => [ALL, ...[...new Set(dpps.map((d) => d.examType))].sort()],
    [dpps],
  );

  // Subjects are scoped to the chosen exam — offering "Botany" to a GATE student
  // would just be a filter that always returns nothing.
  const subjects = useMemo(() => {
    const pool = exam === ALL ? dpps : dpps.filter((d) => d.examType === exam);
    return [ALL, ...[...new Set(pool.map((d) => d.subject))].sort()];
  }, [dpps, exam]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return dpps
      .filter((d) => exam === ALL || d.examType === exam)
      .filter((d) => subject === ALL || d.subject === subject)
      .filter((d) => {
        const done = d.bestScore !== null;
        return status === "all" || (status === "done" ? done : !done);
      })
      .filter(
        (d) =>
          !needle ||
          d.name.toLowerCase().includes(needle) ||
          d.topicName.toLowerCase().includes(needle),
      );
  }, [dpps, exam, subject, status, q]);

  // Unattempted first. The point of a DPP list is to find the next one to do;
  // sheets already finished are reference material and belong below the fold.
  // `dpps` arrives newest-updated first, and Array.sort is stable, so that order
  // survives within each group.
  const ordered = useMemo(() => {
    const undone = visible.filter((d) => d.bestScore === null);
    const done = visible.filter((d) => d.bestScore !== null);
    return [...undone, ...done];
  }, [visible]);

  const doneCount = dpps.filter((d) => d.bestScore !== null).length;

  function changeExam(next: string) {
    setExam(next);
    setSubject(ALL); // the old subject may not exist under the new exam
  }

  return (
    <>
      <p style={{ color: BE.textDim, fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Short curated sets. Take one as a timed test and challenge a friend, or work through it
        at your own pace.
        {dpps.length > 0 && (
          <>
            {" "}
            <strong style={{ color: BE.text }}>
              {doneCount}/{dpps.length} done
            </strong>
            .
          </>
        )}
      </p>

      {dpps.length === 0 ? (
        <EmptyBox>No DPPs are available yet. Check back soon.</EmptyBox>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {exams.length > 2 && (
              <ChipRow label="Exam" value={exam} options={exams} onChange={changeExam} />
            )}
            {subjects.length > 2 && (
              <ChipRow label="Subject" value={subject} options={subjects} onChange={setSubject} />
            )}
            <ChipRow
              label="Status"
              value={status}
              options={["all", "todo", "done"]}
              labels={{ all: "All", todo: "Not attempted", done: "Done" }}
              onChange={(v) => setStatus(v as Status)}
            />

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or topic…"
              aria-label="Search DPPs"
              style={{
                marginTop: 2,
                padding: "9px 12px",
                borderRadius: 10,
                border: `1px solid ${BE.line}`,
                background: BE.surface,
                color: BE.text,
                fontSize: 13,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>

          {ordered.length === 0 ? (
            <EmptyBox>
              {status === "todo"
                ? "You've finished every DPP that matches. Try another exam or subject."
                : "Nothing matches those filters."}
            </EmptyBox>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ordered.map((d) => (
                <Link
                  key={d.id}
                  href={`/dpp/${d.id}`}
                  style={{
                    background: BE.surface,
                    border: `1px solid ${BE.line}`,
                    borderRadius: 14,
                    padding: 16,
                    textDecoration: "none",
                    color: BE.text,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{d.name}</div>
                    <div style={{ fontSize: 12.5, color: BE.textDim, marginTop: 3 }}>
                      {d.examType} · {d.subject} · <strong>{d.topicName}</strong>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: BE.textMute }}>
                    {d.questionCount} questions
                  </span>
                  {d.bestScore !== null && (
                    <span
                      title="Your best score"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 999,
                        background: BE.goodSoft,
                        color: BE.good,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.bestScore}/{d.bestMaxScore}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: BE.surface,
        border: `1px solid ${BE.line}`,
        borderRadius: 14,
        padding: 24,
        textAlign: "center",
        color: BE.textDim,
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

function ChipRow({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: BE.textMute, minWidth: 52 }}>{label}</span>
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            aria-pressed={active}
            style={{
              padding: "5px 11px",
              borderRadius: 999,
              border: `1px solid ${active ? BE.accent : BE.line}`,
              background: active ? BE.accentSoft : "transparent",
              color: active ? BE.accent : BE.textDim,
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}
