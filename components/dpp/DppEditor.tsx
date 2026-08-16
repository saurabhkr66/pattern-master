"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BE } from "@/lib/theme";
import MathRenderer from "@/components/ui/MathRenderer";
import DppQuestionForm, {
  emptyValue,
  toBody,
  valueFromStored,
  type FormValue,
} from "./DppQuestionForm";
import DppBulkPaste from "./DppBulkPaste";
import DppImportModal from "./DppImportModal";

export type StoredQuestion = {
  id: string;
  order: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  question_type: string;
  marks: number;
  question_text_hindi: string | null;
  explanation_hindi: string | null;
  answer_disputed: boolean | null;
  blind_answer: string | null;
  verify_answer: string | null;
  figure_missing: boolean | null;
  reviewed: boolean;
  source: string | null;
};

export type EditorDpp = {
  id: string;
  name: string;
  order: number;
  status: string;
  isPublic: boolean;
  topicName: string;
  subject: string;
  examType: string;
  branch: string;
  questions: StoredQuestion[];
};

const card: React.CSSProperties = {
  background: BE.surface,
  border: `1px solid ${BE.line}`,
  borderRadius: 14,
  padding: 16,
};

function Flag({ text, tone }: { text: string; tone: "bad" | "warn" | "good" | "mute" }) {
  const map = {
    bad: [BE.badSoft, BE.bad],
    warn: [BE.warnSoft, BE.warn],
    good: [BE.goodSoft, BE.good],
    mute: ["transparent", BE.textMute],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 999,
        background: bg,
        color: fg,
        border: `1px solid ${tone === "mute" ? BE.line : "transparent"}`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export type ModelOption = { id: string; label: string };
export type ModelChoices = {
  verify: ModelOption[];
  answer: ModelOption[];
  compare: ModelOption[];
};

export default function DppEditor({
  dpp,
  models,
}: {
  dpp: EditorDpp;
  models: ModelChoices;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(dpp.name);
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [importing, setImporting] = useState(false);
  const [addValue, setAddValue] = useState<FormValue>(emptyValue());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<FormValue>(emptyValue());

  const qs = dpp.questions;
  const count = qs.length;
  // The only visibility question that matters: students filter on BOTH.
  const live = dpp.isPublic && dpp.status === "ready";
  // Soft target from the plan: 15-20 is a normal DPP; 25 is the import hard cap.
  const sizeNote =
    count === 0
      ? null
      : count < 15
        ? `${count} questions — below the usual 15–20`
        : count > 25
          ? `${count} questions — above the 25 cap`
          : count > 20
            ? `${count} questions — above the usual 15–20`
            : null;

  async function call(url: string, method: string, body?: unknown) {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? `Failed (${res.status})`);
        return null;
      }
      router.refresh();
      return j;
    } finally {
      setBusy(false);
    }
  }

  async function addQuestion() {
    const j = await call(`/api/admin/dpp/${dpp.id}/questions`, "POST", {
      ...toBody(addValue),
      source: "paste",
    });
    if (j) {
      setAddValue(emptyValue());
      setAdding(false);
    }
  }

  async function saveEdit(qid: string) {
    const j = await call(`/api/admin/dpp/${dpp.id}/questions/${qid}`, "PATCH", toBody(editValue));
    if (j) setEditingId(null);
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= qs.length) return;
    const ids = qs.map((q) => q.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await call(`/api/admin/dpp/${dpp.id}/questions`, "PATCH", { orderedIds: ids });
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px", color: BE.text }}>
      {importing && (
        <DppImportModal
          dppId={dpp.id}
          dppName={dpp.name}
          models={models}
          onClose={() => setImporting(false)}
          onDone={() => router.refresh()}
        />
      )}
      <Link href="/admin/dpp" style={{ color: BE.textDim, fontSize: 13, textDecoration: "none" }}>
        ← All DPPs
      </Link>

      {/* ── header ─────────────────────────────────────────────────────────── */}
      <div style={{ ...card, marginTop: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim() && name !== dpp.name) {
                call(`/api/admin/dpp/${dpp.id}`, "PATCH", { name: name.trim() });
              } else if (!name.trim()) {
                setName(dpp.name);
              }
            }}
            style={{
              flex: 1,
              minWidth: 180,
              fontSize: 20,
              fontWeight: 700,
              padding: "6px 8px",
              borderRadius: 8,
              border: `1px solid transparent`,
              background: "transparent",
              color: BE.text,
            }}
          />
          <Flag text={dpp.status} tone={dpp.status === "ready" ? "good" : "warn"} />
          {/* One pill for the thing that actually matters: can a student see it.
              Students require is_public AND status "ready", so showing the two
              flags separately just invited the released-but-draft confusion. */}
          <Flag text={live ? "live" : "not live"} tone={live ? "good" : "mute"} />
          <Flag text={`${count} questions`} tone="mute" />
          <button
            onClick={() =>
              call(`/api/admin/dpp/${dpp.id}`, "PATCH", {
                status: dpp.status === "ready" ? "draft" : "ready",
              })
            }
            disabled={busy}
            style={{
              padding: "8px 12px",
              borderRadius: 9,
              border: `1px solid ${BE.line}`,
              background: "transparent",
              color: BE.text,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {dpp.status === "ready" ? "Mark draft" : "Mark ready"}
          </button>
        </div>

        {/* Release gate. Students see a DPP only when it is BOTH ready and
            released — status is the authoring lifecycle, is_public is the
            switch. Keeping them separate lets you pull a sheet without losing
            its reviewed state. */}
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${live ? BE.good : BE.line}`,
            background: live ? BE.goodSoft : "transparent",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {live ? "Live for students" : "Not live"}
            </div>
            <div style={{ fontSize: 11.5, color: BE.textDim, marginTop: 2 }}>
              {live
                ? "Showing in the DPP tab on the practice page."
                : "Releasing also marks it ready — students see it in the DPP tab straight away."}
            </div>
          </div>
          <button
            onClick={() =>
              call(
                `/api/admin/dpp/${dpp.id}`,
                "PATCH",
                // Release sets BOTH gates. Two separate switches produced a
                // released-but-draft state that silently showed nothing.
                // Unrelease clears only is_public, so "ready" (i.e. reviewed)
                // survives being pulled — which was the reason for two flags.
                live ? { isPublic: false } : { isPublic: true, status: "ready" },
              )
            }
            disabled={busy || count === 0}
            title={count === 0 ? "Add questions first" : undefined}
            style={{
              padding: "9px 14px",
              borderRadius: 9,
              border: "none",
              background: busy || count === 0 ? BE.line : live ? BE.bad : BE.good,
              color: busy || count === 0 ? BE.textMute : "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: busy || count === 0 ? "not-allowed" : "pointer",
            }}
          >
            {live ? "Unrelease" : "Release to students"}
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: BE.textDim, marginTop: 6, paddingLeft: 8 }}>
          {dpp.examType} · {dpp.branch} · {dpp.subject} · <strong>{dpp.topicName}</strong>
        </div>
        {sizeNote && (
          <div style={{ fontSize: 12, color: BE.warn, marginTop: 6, paddingLeft: 8 }}>
            {sizeNote}
          </div>
        )}
      </div>

      {err && (
        <div
          style={{
            color: BE.bad,
            background: BE.badSoft,
            border: `1px solid ${BE.bad}`,
            borderRadius: 10,
            padding: 12,
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {err}
        </div>
      )}

      {/* ── questions ──────────────────────────────────────────────────────── */}
      {count === 0 ? (
        <div style={{ ...card, textAlign: "center", color: BE.textDim, marginBottom: 14 }}>
          No questions yet. Paste one below, or import a PDF.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {qs.map((q, i) => (
            <div key={q.id} style={card}>
              {editingId === q.id ? (
                <>
                  <div style={{ fontSize: 12, color: BE.textDim, marginBottom: 10 }}>
                    Editing Q{q.order}
                  </div>
                  <DppQuestionForm
                    value={editValue}
                    onChange={setEditValue}
                    onSubmit={() => saveEdit(q.id)}
                    onCancel={() => setEditingId(null)}
                    submitLabel="Save changes"
                    busy={busy}
                  />
                </>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: BE.accent }}>
                      Q{q.order}
                    </span>
                    <Flag text={q.question_type} tone="mute" />
                    <Flag text={`${q.marks}m`} tone="mute" />
                    {q.source && <Flag text={q.source} tone="mute" />}
                    {q.reviewed ? (
                      <Flag text="reviewed" tone="good" />
                    ) : (
                      <Flag text="unreviewed" tone="warn" />
                    )}
                    {q.answer_disputed && <Flag text="answer disputed" tone="bad" />}
                    {q.figure_missing && <Flag text="figure missing" tone="bad" />}
                    <span style={{ flex: 1 }} />
                    <button
                      onClick={() => move(i, -1)}
                      disabled={busy || i === 0}
                      title="Move up"
                      style={iconBtn(i === 0)}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={busy || i === qs.length - 1}
                      title="Move down"
                      style={iconBtn(i === qs.length - 1)}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => {
                        setEditValue(valueFromStored(q));
                        setEditingId(q.id);
                        setAdding(false);
                      }}
                      style={smallBtn()}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`Delete Q${q.order}?`)) return;
                        call(`/api/admin/dpp/${dpp.id}/questions/${q.id}`, "DELETE");
                      }}
                      disabled={busy}
                      style={{ ...smallBtn(), borderColor: BE.bad, color: BE.bad }}
                    >
                      Delete
                    </button>
                  </div>

                  <AnswerAudit
                    q={q}
                    busy={busy}
                    onResolve={(mode) =>
                      call(`/api/admin/dpp/${dpp.id}/questions/${q.id}`, "PATCH", {
                        resolve: mode,
                      })
                    }
                    onEdit={() => {
                      setEditValue(valueFromStored(q));
                      setEditingId(q.id);
                      setAdding(false);
                    }}
                  />

                  <MathRenderer
                    content={q.question_text}
                    style={{ fontSize: 14, marginTop: 10 }}
                  />

                  {q.options.length > 0 && (
                    <div style={{ display: "grid", gap: 5, marginTop: 10 }}>
                      {q.options.map((o, k) => {
                        // The letter comes from the string's first character —
                        // the same contract every renderer in the app uses.
                        const letter = String(o).trim().charAt(0).toUpperCase();
                        const correct = q.correct_answer
                          .split(/[;,]/)
                          .map((s) => s.trim().toUpperCase())
                          .includes(letter);
                        return (
                          <div
                            key={k}
                            style={{
                              fontSize: 13.5,
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: `1px solid ${correct ? BE.good : BE.line}`,
                              background: correct ? BE.goodSoft : "transparent",
                              color: correct ? BE.good : BE.textDim,
                            }}
                          >
                            <MathRenderer content={o} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.question_type === "NAT" && (
                    <div style={{ fontSize: 13, color: BE.good, marginTop: 8 }}>
                      Answer: {q.correct_answer}
                      {q.correct_answer.includes(":") && " (range)"}
                    </div>
                  )}

                  {q.explanation && (
                    <MathRenderer
                      content={q.explanation}
                      style={{ fontSize: 12.5, color: BE.textMute, marginTop: 10 }}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── add ────────────────────────────────────────────────────────────── */}
      {adding ? (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            Paste question {count + 1}
          </div>
          <DppQuestionForm
            value={addValue}
            onChange={setAddValue}
            onSubmit={addQuestion}
            onCancel={() => setAdding(false)}
            submitLabel="Add to DPP"
            busy={busy}
          />
        </div>
      ) : bulk ? (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            Bulk paste JSON — appends after Q{count}
          </div>
          <DppBulkPaste
            dppId={dpp.id}
            startOrder={count + 1}
            onDone={() => {
              setBulk(false);
              router.refresh();
            }}
            onCancel={() => setBulk(false)}
          />
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setAdding(true);
              setBulk(false);
              setEditingId(null);
            }}
            style={{
              padding: "11px 16px",
              borderRadius: 10,
              border: "none",
              background: BE.accent,
              color: "#1a1205",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            + Paste a question
          </button>
          <button
            onClick={() => {
              setBulk(true);
              setAdding(false);
              setEditingId(null);
            }}
            style={{
              padding: "11px 16px",
              borderRadius: 10,
              border: `1px solid ${BE.accent}`,
              background: "transparent",
              color: BE.accent,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ⇊ Bulk paste JSON
          </button>
          <button
            onClick={() => {
              setImporting(true);
              setAdding(false);
              setBulk(false);
              setEditingId(null);
            }}
            style={{
              padding: "11px 16px",
              borderRadius: 10,
              border: `1px solid ${BE.line}`,
              background: "transparent",
              color: BE.text,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ⇪ Import PDF
          </button>
          {count > 0 && (
            <button
              onClick={() => {
                if (!confirm(`Delete ALL ${count} questions from "${dpp.name}"?\n\nThe DPP itself is kept. This cannot be undone.`)) return;
                call(`/api/admin/dpp/${dpp.id}/questions`, "DELETE");
              }}
              disabled={busy}
              style={{
                padding: "11px 16px",
                borderRadius: 10,
                border: `1px solid ${BE.bad}`,
                background: "transparent",
                color: BE.bad,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Clear all questions
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Normalize an answer for comparison: "A;C", "A, C" and "c;a" are the same
 *  answer. Mirrors evaluateAnswer in PracticeButton.tsx:275. */
function normAns(s: string | null | undefined): string {
  return (s ?? "")
    .split(/[;,]/)
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(",");
}

/**
 * Three-way answer audit.
 *
 * The import can produce three independent answers for one question — the
 * recorded answer-key pass, the blind cross-check, and the opt-in verify pass.
 * `answer_disputed` is raised by the verify pass, so a bare "disputed" pill
 * tells the reviewer a problem exists without telling them what it is. This
 * shows every answer that ran, marks the ones that disagree, and stays out of
 * the way (renders nothing) when only one answer exists or all of them agree.
 */
function AnswerAudit({
  q,
  busy,
  onResolve,
  onEdit,
}: {
  q: StoredQuestion;
  busy: boolean;
  onResolve: (mode: "keep" | "verify" | "blind") => void;
  onEdit: () => void;
}) {
  const recorded = normAns(q.correct_answer);
  const others = [
    { who: "blind check", value: q.blind_answer, mode: "blind" as const },
    { who: "verifier", value: q.verify_answer, mode: "verify" as const },
  ].filter((x) => x.value && x.value.trim());

  if (others.length === 0) return null;

  const disagreeing = others.filter((x) => normAns(x.value) !== recorded);
  if (disagreeing.length === 0 && !q.answer_disputed) {
    // Everything that ran agreed — one quiet line, no alarm.
    return (
      <div style={{ fontSize: 11.5, color: BE.good, marginTop: 8 }}>
        ✓ {others.map((o) => o.who).join(" and ")} agreed on {q.correct_answer}
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 9,
        border: `1px solid ${BE.bad}`,
        background: BE.badSoft,
        borderRadius: 9,
        padding: "8px 10px",
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 700, color: BE.bad, marginBottom: 5 }}>
        Answers disagree — pick the right one
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5 }}>
        <span style={{ color: BE.text }}>
          <span style={{ color: BE.textMute }}>stored </span>
          <strong>{q.correct_answer || "—"}</strong>
        </span>
        {others.map((o) => {
          const differs = normAns(o.value) !== recorded;
          return (
            <span key={o.who} style={{ color: differs ? BE.bad : BE.good }}>
              <span style={{ color: BE.textMute }}>{o.who} </span>
              <strong>{o.value}</strong>
              {differs ? " ✕" : " ✓"}
            </span>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>
        <button onClick={() => onResolve("keep")} disabled={busy} style={resolveBtn()}>
          Keep {q.correct_answer}
        </button>
        {disagreeing.map((o) => (
          <button
            key={o.mode}
            onClick={() => onResolve(o.mode)}
            disabled={busy}
            style={resolveBtn()}
          >
            Use {o.value} ({o.who})
          </button>
        ))}
        <button onClick={onEdit} disabled={busy} style={resolveBtn()}>
          Edit question
        </button>
      </div>
      <div style={{ fontSize: 10.5, color: BE.textMute, marginTop: 6 }}>
        Resolving clears the flag and marks the question reviewed. The recorded answers stay
        visible as history.
      </div>
    </div>
  );
}

const resolveBtn = (): React.CSSProperties => ({
  padding: "5px 10px",
  borderRadius: 7,
  border: `1px solid ${BE.line}`,
  background: BE.surface,
  color: BE.text,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
});

const iconBtn = (disabled: boolean): React.CSSProperties => ({
  width: 28,
  height: 28,
  borderRadius: 7,
  border: `1px solid ${BE.line}`,
  background: "transparent",
  color: disabled ? BE.textMute : BE.textDim,
  fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
});

const smallBtn = (): React.CSSProperties => ({
  padding: "5px 10px",
  borderRadius: 7,
  border: `1px solid ${BE.line}`,
  background: "transparent",
  color: BE.text,
  fontSize: 12.5,
  cursor: "pointer",
});
