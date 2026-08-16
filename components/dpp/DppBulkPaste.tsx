"use client";

import { useState } from "react";
import { BE } from "@/lib/theme";

// Paste a JSON array of questions and add them all in one go.
//
// The server re-validates every row through lib/dppAdapter and refuses the whole
// batch if any row is bad, reporting every problem at once. This component only
// does the cheap local checks (is it JSON? is it an array?) so obvious mistakes
// are caught without a round-trip.

const SAMPLE = `[
  {
    "question_text": "Which unit performs arithmetic operations in a CPU?",
    "options": ["A. ALU", "B. Control Unit", "C. Cache", "D. MAR"],
    "correct_answer": "A",
    "solution": "The ALU performs arithmetic and logic operations.",
    "max_marks": 1
  },
  {
    "question_type": "nat",
    "question_text": "How many bits are in a byte?",
    "correct_answer": "8",
    "solution": "One byte is 8 bits.",
    "max_marks": 2
  }
]`;

type Problem = { index: number; error: string };

export default function DppBulkPaste({
  dppId,
  startOrder,
  onDone,
  onCancel,
}: {
  dppId: string;
  startOrder: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);

  // Cheap local parse for the preview + the "N questions" count.
  let parsed: Record<string, unknown>[] | null = null;
  let parseError: string | null = null;
  if (text.trim()) {
    try {
      const j = JSON.parse(text);
      if (Array.isArray(j)) parsed = j;
      else if (j && typeof j === "object" && Array.isArray((j as { questions?: unknown }).questions))
        parsed = (j as { questions: Record<string, unknown>[] }).questions;
      else if (j && typeof j === "object") parsed = [j as Record<string, unknown>];
      else parseError = "Expected a JSON array of questions.";
    } catch (e) {
      parseError = (e as Error).message;
    }
  }

  const preview = (parsed ?? []).map((q, i) => {
    const rec = q as Record<string, unknown>;
    const textOf =
      rec.question_text ?? rec.question ?? rec.text ?? rec.statement ?? "(no question text)";
    const optionCount = Array.isArray(rec.options)
      ? rec.options.length
      : rec.options && typeof rec.options === "object"
        ? Object.keys(rec.options).length
        : 0;
    return {
      n: startOrder + i,
      text: String(textOf).slice(0, 90),
      type: String(rec.question_type ?? rec.type ?? "mcq").toUpperCase(),
      optionCount,
    };
  });

  async function submit() {
    if (!parsed || parsed.length === 0) return;
    setErr(null);
    setProblems([]);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/dpp/${dppId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: parsed, source: "paste" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? `Failed (${res.status})`);
        setProblems(Array.isArray(j.problems) ? j.problems : []);
        return;
      }
      setText("");
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 12.5, color: BE.textDim }}>
        Paste a JSON array. Keys are flexible — <code>question_text</code>/<code>question</code>/
        <code>text</code>, <code>correct_answer</code>/<code>answer</code>,{" "}
        <code>solution</code>/<code>explanation</code>, <code>max_marks</code>/<code>marks</code>.
        Options may be <code>[&quot;A. …&quot;]</code>, bare strings, <code>{"{A: …}"}</code>, or{" "}
        <code>[{"{label,text}"}]</code>.
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={SAMPLE}
        spellCheck={false}
        style={{
          width: "100%",
          minHeight: 220,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${parseError ? BE.bad : BE.line}`,
          background: BE.surface,
          color: BE.text,
          fontSize: 12.5,
          fontFamily: BE.mono,
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setText(SAMPLE)}
          style={{
            fontSize: 12,
            padding: "5px 10px",
            borderRadius: 8,
            border: `1px solid ${BE.line}`,
            background: "transparent",
            color: BE.textDim,
            cursor: "pointer",
          }}
        >
          Insert sample
        </button>
        {text.trim() && (
          <button
            type="button"
            onClick={() => {
              setText("");
              setErr(null);
              setProblems([]);
            }}
            style={{
              fontSize: 12,
              padding: "5px 10px",
              borderRadius: 8,
              border: `1px solid ${BE.line}`,
              background: "transparent",
              color: BE.textDim,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {parseError && (
        <div
          style={{
            color: BE.bad,
            background: BE.badSoft,
            border: `1px solid ${BE.bad}`,
            borderRadius: 9,
            padding: 10,
            fontSize: 12.5,
            fontFamily: BE.mono,
          }}
        >
          Not valid JSON — {parseError}
        </div>
      )}

      {preview.length > 0 && (
        <div
          style={{
            border: `1px solid ${BE.line}`,
            borderRadius: 10,
            padding: 10,
            display: "grid",
            gap: 6,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: BE.textDim }}>
            {preview.length} question{preview.length > 1 ? "s" : ""} — will be added as Q
            {preview[0].n}
            {preview.length > 1 ? `–Q${preview[preview.length - 1].n}` : ""}
          </div>
          {preview.map((p, i) => {
            const bad = problems.find((x) => x.index === i);
            return (
              <div
                key={i}
                style={{
                  fontSize: 12.5,
                  padding: "6px 8px",
                  borderRadius: 7,
                  border: `1px solid ${bad ? BE.bad : BE.line}`,
                  background: bad ? BE.badSoft : "transparent",
                  color: bad ? BE.bad : BE.textDim,
                }}
              >
                <strong>Q{p.n}</strong> · {p.type}
                {p.optionCount > 0 ? ` · ${p.optionCount} options` : ""} — {p.text}
                {bad && <div style={{ marginTop: 3, fontWeight: 600 }}>✕ {bad.error}</div>}
              </div>
            );
          })}
        </div>
      )}

      {err && (
        <div
          style={{
            color: BE.bad,
            background: BE.badSoft,
            border: `1px solid ${BE.bad}`,
            borderRadius: 9,
            padding: 10,
            fontSize: 13,
          }}
        >
          {err}
          {problems.length > 0 && (
            <div style={{ marginTop: 4, fontSize: 12 }}>
              Nothing was saved — fix the flagged rows above and submit again.
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !parsed || parsed.length === 0}
          style={{
            padding: "10px 16px",
            borderRadius: 9,
            border: "none",
            background: busy || !parsed?.length ? BE.line : BE.accent,
            color: busy || !parsed?.length ? BE.textMute : "#1a1205",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: busy || !parsed?.length ? "not-allowed" : "pointer",
          }}
        >
          {busy
            ? "Adding…"
            : parsed?.length
              ? `Add ${parsed.length} question${parsed.length > 1 ? "s" : ""}`
              : "Add questions"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          style={{
            padding: "10px 16px",
            borderRadius: 9,
            border: `1px solid ${BE.line}`,
            background: "transparent",
            color: BE.textDim,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
