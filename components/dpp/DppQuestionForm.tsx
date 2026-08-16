"use client";

import { useState } from "react";
import { BE } from "@/lib/theme";

// One form for BOTH pasting a new question and editing an existing one, so the
// two can never drift apart in what they accept. Submits the coaching-shaped
// body that lib/dppAdapter expects — the server re-validates and re-adapts, so
// this component never decides the stored shape.

export type FormValue = {
  question_type: string; // mcq | msq | nat
  question_text: string;
  options: { label: string; text: string }[];
  correct_answer: string;
  nat_tolerance?: string;
  max_marks: string;
  solution: string;
  question_text_hindi?: string;
  solution_hindi?: string;
};

const LABELS = ["A", "B", "C", "D", "E", "F"];

export const emptyValue = (): FormValue => ({
  question_type: "mcq",
  question_text: "",
  options: LABELS.slice(0, 4).map((l) => ({ label: l, text: "" })),
  correct_answer: "",
  nat_tolerance: "",
  max_marks: "1",
  solution: "",
  question_text_hindi: "",
  solution_hindi: "",
});

/** Rebuild form state from a stored row. Stored options are flat, label-prefixed
 *  strings ("A. ALU") — split the label back off so the fields show clean text. */
export function valueFromStored(q: {
  question_type: string;
  question_text: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
  marks: number;
  question_text_hindi?: string | null;
  explanation_hindi?: string | null;
}): FormValue {
  const flat = Array.isArray(q.options) ? (q.options as string[]) : [];
  const options = flat.map((o, i) => {
    const m = String(o).match(/^\s*\(?\s*([A-Za-z0-9]{1,3})\s*[).:\-\]]\s*/);
    return m
      ? { label: m[1], text: String(o).slice(m[0].length) }
      : { label: LABELS[i] ?? String(i + 1), text: String(o) };
  });
  const isRange = /^[\d.-]+\s*(?::|to)\s*[\d.-]+$/i.test(q.correct_answer);
  let answer = q.correct_answer;
  let tol = "";
  if (q.question_type === "NAT" && isRange) {
    // Stored as "lo:hi" — show it back as midpoint ± tolerance.
    const [lo, hi] = q.correct_answer.split(/\s*(?::|to)\s*/i).map(Number);
    answer = String(Number(((lo + hi) / 2).toFixed(6)));
    tol = String(Number(((hi - lo) / 2).toFixed(6)));
  }
  return {
    question_type: q.question_type.toLowerCase(),
    question_text: q.question_text,
    options: options.length ? options : emptyValue().options,
    correct_answer: answer,
    nat_tolerance: tol,
    max_marks: String(q.marks ?? 1),
    solution: q.explanation ?? "",
    question_text_hindi: q.question_text_hindi ?? "",
    solution_hindi: q.explanation_hindi ?? "",
  };
}

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: BE.textDim,
  marginBottom: 6,
};
const field: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 9,
  border: `1px solid ${BE.line}`,
  background: BE.surface,
  color: BE.text,
  fontSize: 14,
  fontFamily: "inherit",
};

export default function DppQuestionForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  busy,
  error,
}: {
  value: FormValue;
  onChange: (v: FormValue) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
}) {
  const [showHindi, setShowHindi] = useState(
    Boolean(value.question_text_hindi || value.solution_hindi),
  );
  const set = (patch: Partial<FormValue>) => onChange({ ...value, ...patch });
  const hasOptions = value.question_type === "mcq" || value.question_type === "msq";

  const setOption = (i: number, text: string) => {
    const options = value.options.map((o, j) => (j === i ? { ...o, text } : o));
    set({ options });
  };

  const toggleMsq = (lbl: string) => {
    const picked = value.correct_answer.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    const next = picked.includes(lbl) ? picked.filter((p) => p !== lbl) : [...picked, lbl];
    // Keep the stored order stable so two edits of the same answer agree.
    next.sort((a, b) => LABELS.indexOf(a) - LABELS.indexOf(b));
    set({ correct_answer: next.join(";") });
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ minWidth: 130 }}>
          <label style={label}>Type</label>
          <select
            style={field}
            value={value.question_type}
            onChange={(e) => set({ question_type: e.target.value, correct_answer: "" })}
          >
            <option value="mcq">MCQ (one answer)</option>
            <option value="msq">MSQ (multiple)</option>
            <option value="nat">NAT (numeric)</option>
          </select>
        </div>
        <div style={{ width: 100 }}>
          <label style={label}>Marks</label>
          <input
            style={field}
            type="number"
            min={1}
            value={value.max_marks}
            onChange={(e) => set({ max_marks: e.target.value })}
          />
        </div>
        {value.question_type === "nat" && (
          <div style={{ width: 130 }}>
            <label style={label}>Tolerance ±</label>
            <input
              style={field}
              type="number"
              step="any"
              min={0}
              placeholder="0"
              value={value.nat_tolerance ?? ""}
              onChange={(e) => set({ nat_tolerance: e.target.value })}
            />
          </div>
        )}
      </div>

      <div>
        <label style={label}>Question</label>
        <textarea
          style={{ ...field, minHeight: 90, resize: "vertical" }}
          value={value.question_text}
          onChange={(e) => set({ question_text: e.target.value })}
          placeholder="Paste the question text. LaTeX between $…$ renders on the site."
        />
      </div>

      {hasOptions && (
        <div>
          <label style={label}>
            Options — select the correct {value.question_type === "msq" ? "answers" : "answer"}
          </label>
          <div style={{ display: "grid", gap: 8 }}>
            {value.options.map((o, i) => {
              const picked =
                value.question_type === "msq"
                  ? value.correct_answer
                      .split(/[;,]/)
                      .map((s) => s.trim())
                      .includes(o.label)
                  : value.correct_answer === o.label;
              return (
                <div key={o.label} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() =>
                      value.question_type === "msq"
                        ? toggleMsq(o.label)
                        : set({ correct_answer: o.label })
                    }
                    title="Mark correct"
                    style={{
                      width: 34,
                      height: 34,
                      flexShrink: 0,
                      borderRadius: 8,
                      border: `1.5px solid ${picked ? BE.good : BE.line}`,
                      background: picked ? BE.goodSoft : "transparent",
                      color: picked ? BE.good : BE.textDim,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {o.label}
                  </button>
                  <input
                    style={field}
                    value={o.text}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${o.label}`}
                  />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {value.options.length < 6 && (
              <button
                type="button"
                onClick={() =>
                  set({
                    options: [
                      ...value.options,
                      { label: LABELS[value.options.length], text: "" },
                    ],
                  })
                }
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
                + option
              </button>
            )}
            {value.options.length > 2 && (
              <button
                type="button"
                onClick={() => {
                  const dropped = value.options[value.options.length - 1].label;
                  set({
                    options: value.options.slice(0, -1),
                    correct_answer: value.correct_answer
                      .split(/[;,]/)
                      .map((s) => s.trim())
                      .filter((s) => s && s !== dropped)
                      .join(";"),
                  });
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
                − option
              </button>
            )}
          </div>
        </div>
      )}

      {value.question_type === "nat" && (
        <div>
          <label style={label}>Correct value</label>
          <input
            style={field}
            type="number"
            step="any"
            value={value.correct_answer}
            onChange={(e) => set({ correct_answer: e.target.value })}
            placeholder="e.g. 9.8"
          />
        </div>
      )}

      <div>
        <label style={label}>Explanation</label>
        <textarea
          style={{ ...field, minHeight: 70, resize: "vertical" }}
          value={value.solution}
          onChange={(e) => set({ solution: e.target.value })}
          placeholder="Worked solution shown after the student answers."
        />
      </div>

      <button
        type="button"
        onClick={() => setShowHindi((s) => !s)}
        style={{
          justifySelf: "start",
          fontSize: 12,
          padding: "5px 10px",
          borderRadius: 8,
          border: `1px solid ${BE.line}`,
          background: "transparent",
          color: BE.textDim,
          cursor: "pointer",
        }}
      >
        {showHindi ? "Hide Hindi" : "+ Hindi (optional)"}
      </button>

      {showHindi && (
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <label style={label}>Question (Hindi)</label>
            <textarea
              style={{ ...field, minHeight: 60, resize: "vertical" }}
              value={value.question_text_hindi ?? ""}
              onChange={(e) => set({ question_text_hindi: e.target.value })}
            />
          </div>
          <div>
            <label style={label}>Explanation (Hindi)</label>
            <textarea
              style={{ ...field, minHeight: 60, resize: "vertical" }}
              value={value.solution_hindi ?? ""}
              onChange={(e) => set({ solution_hindi: e.target.value })}
            />
          </div>
        </div>
      )}

      {error && (
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
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          style={{
            padding: "10px 16px",
            borderRadius: 9,
            border: "none",
            background: busy ? BE.line : BE.accent,
            color: busy ? BE.textMute : "#1a1205",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
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
        )}
      </div>
    </div>
  );
}

/** Turn form state into the body lib/dppAdapter expects. */
export function toBody(v: FormValue): Record<string, unknown> {
  const hasOptions = v.question_type === "mcq" || v.question_type === "msq";
  return {
    question_type: v.question_type,
    question_text: v.question_text,
    options: hasOptions ? v.options.filter((o) => o.text.trim()) : [],
    correct_answer: v.correct_answer,
    nat_tolerance:
      v.question_type === "nat" && v.nat_tolerance ? Number(v.nat_tolerance) : undefined,
    max_marks: Number(v.max_marks) || 1,
    solution: v.solution,
    question_text_hindi: v.question_text_hindi || undefined,
    solution_hindi: v.solution_hindi || undefined,
  };
}
