"use client";

import { useRef, useState } from "react";
import { BE } from "@/lib/theme";
import type { ModelChoices } from "./DppEditor";

// Upload + live progress for a DPP PDF/image import.
//
// Deliberately NOT a fork of the 1400-line coaching QuestionImportModal: that
// modal exists because the coaching flow holds its review state in React and has
// to render the whole review UI before anything is saved. The DPP route persists
// rows as it finishes, so the DPP editor IS the review surface — this component
// only has to upload, show progress, and refresh.

type Ev = Record<string, unknown> & { t?: string };

export default function DppImportModal({
  dppId,
  dppName,
  models,
  onClose,
  onDone,
}: {
  dppId: string;
  dppName: string;
  models: ModelChoices;
  onClose: () => void;
  onDone: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [verify, setVerify] = useState(false);
  const [hindi, setHindi] = useState(false);
  const [deepseek, setDeepseek] = useState(true);
  const [showModels, setShowModels] = useState(false);
  // "" = let the server pick its configured default. Sending an empty field means
  // the route's `|| undefined` kicks in and resolve*Model falls back — so the
  // default is never duplicated here and cannot drift from the server's.
  const [answerModel, setAnswerModel] = useState("");
  const [compareModel, setCompareModel] = useState("");
  const [verifyModel, setVerifyModel] = useState("");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ saved: number; total: number; skipped: number } | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  const pdf = files.find((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
  const imgs = files.filter((f) => f !== pdf);

  function addLine(s: string) {
    setLog((l) => [...l.slice(-40), s]);
  }

  async function run() {
    if (files.length === 0) return;
    setErr(null);
    setResult(null);
    setLog([]);
    setRunning(true);
    setPhase("uploading");

    const fd = new FormData();
    fd.set("dppId", dppId);
    if (pdf) fd.set("pdf", pdf);
    for (const f of imgs) fd.append("images", f);
    fd.set("verify", verify ? "1" : "0");
    fd.set("hindi", hindi ? "1" : "0");
    fd.set("deepseek", deepseek ? "1" : "0");
    // Only sent when explicitly chosen — an empty field lets the server default win.
    if (answerModel) fd.set("answerModel", answerModel);
    if (compareModel) fd.set("compareModel", compareModel);
    if (verifyModel) fd.set("verifyModel", verifyModel);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/admin/dpp/import", {
        method: "POST",
        body: fd,
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? `Failed (${res.status})`);
        return;
      }

      // NDJSON: one JSON object per line, with bare "\n" heartbeats to skip.
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue; // heartbeat
          let ev: Ev;
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.t === "phase") {
            setPhase(String(ev.phase ?? ""));
            setProgress(null);
            addLine(`▸ ${ev.phase}${ev.total ? ` (${ev.total})` : ""}`);
          } else if (ev.t === "questions") {
            setProgress({ done: Number(ev.done ?? 0), total: Number(ev.total ?? 0) });
          } else if (ev.t === "usage") {
            addLine("▸ token usage recorded");
          } else if (ev.t === "error") {
            setErr(String(ev.error ?? "extraction failed"));
          } else if (ev.t === "done") {
            const skipped = Array.isArray(ev.skipped) ? ev.skipped.length : 0;
            setResult({
              saved: Number(ev.saved ?? 0),
              total: Number(ev.total ?? 0),
              skipped,
            });
            setPhase("done");
            if (skipped > 0) {
              for (const s of ev.skipped as { index: number; error: string }[]) {
                addLine(`✕ question ${s.index + 1} skipped — ${s.error}`);
              }
            }
            onDone();
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setErr((e as Error).message || "import failed");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        padding: 16,
      }}
      onClick={() => !running && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BE.surface,
          border: `1px solid ${BE.line}`,
          borderRadius: 16,
          padding: 20,
          width: "min(620px, 100%)",
          maxHeight: "88vh",
          overflowY: "auto",
          color: BE.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>
            Import into {dppName}
          </h2>
          {!running && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: BE.textDim,
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          )}
        </div>
        <p style={{ fontSize: 12.5, color: BE.textDim, marginTop: 0, marginBottom: 16 }}>
          Questions are <strong>appended</strong> and saved as you go — nothing existing is
          removed, and a refresh mid-run will not lose what has already been extracted.
        </p>

        {!result && (
          <>
            <input
              type="file"
              accept="application/pdf,image/*"
              multiple
              disabled={running}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: `1px dashed ${BE.line}`,
                background: "transparent",
                color: BE.textDim,
                fontSize: 13,
                marginBottom: 12,
              }}
            />

            {files.length > 0 && (
              <div style={{ fontSize: 12.5, color: BE.textDim, marginBottom: 12 }}>
                {pdf && <div>PDF: {pdf.name}</div>}
                {imgs.length > 0 && <div>{imgs.length} image(s)</div>}
              </div>
            )}

            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              <Toggle
                on={verify}
                set={setVerify}
                disabled={running}
                label="Verify answers (slower, costs more)"
                hint="Re-solves every question blind and flags disagreements for review."
              />
              <Toggle
                on={hindi}
                set={setHindi}
                disabled={running}
                label="Translate to Hindi"
                hint="Roughly doubles output tokens. Off for English-only sheets."
              />
              <Toggle
                on={deepseek}
                set={setDeepseek}
                disabled={running}
                label="Use DeepSeek for the blind cross-check"
                hint="Off falls back to Gemini flash-lite for the text-only solve."
              />
            </div>

            <button
              type="button"
              onClick={() => setShowModels((s) => !s)}
              disabled={running}
              style={{
                fontSize: 12,
                padding: "5px 10px",
                borderRadius: 8,
                border: `1px solid ${BE.line}`,
                background: "transparent",
                color: BE.textDim,
                cursor: "pointer",
                marginBottom: showModels ? 10 : 16,
              }}
            >
              {showModels ? "Hide models" : "⚙ Models (advanced)"}
            </button>

            {showModels && (
              <div
                style={{
                  border: `1px solid ${BE.line}`,
                  borderRadius: 10,
                  padding: 12,
                  display: "grid",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <ModelPick
                  label="Answer key + worked solution"
                  hint="Reads the printed answer off the page, so it must be multimodal — Gemini only."
                  options={models.answer}
                  value={answerModel}
                  set={setAnswerModel}
                  disabled={running}
                />
                <ModelPick
                  label="Blind cross-check"
                  hint="Re-solves from question TEXT only. Sets the blind answer used in the disagreement audit."
                  options={models.compare}
                  value={compareModel}
                  set={setCompareModel}
                  // Stays enabled when DeepSeek is toggled off: the cross-check
                  // still runs, and a Gemini model is a legitimate pick for it.
                  disabled={running}
                />
                <ModelPick
                  label="Verify pass"
                  hint={
                    verify
                      ? "Independent solve that raises the 'answer disputed' flag."
                      : "Only runs when “Verify answers” is on above."
                  }
                  options={models.verify}
                  value={verifyModel}
                  set={setVerifyModel}
                  disabled={running || !verify}
                />
                <div style={{ fontSize: 11, color: BE.textMute }}>
                  Leave any of these on “Server default” to use the configured model. A DeepSeek
                  pick falls back to Gemini automatically when DeepSeek is toggled off or its key
                  is missing.
                </div>
              </div>
            )}
          </>
        )}

        {running && (
          <div
            style={{
              border: `1px solid ${BE.line}`,
              borderRadius: 10,
              padding: 12,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: BE.accent }}>
              {phase || "working"}…
              {progress && ` ${progress.done}/${progress.total}`}
            </div>
            <div style={{ fontSize: 11.5, color: BE.textMute, marginTop: 6 }}>
              This can take several minutes. Keep this tab open.
            </div>
          </div>
        )}

        {log.length > 0 && (
          <pre
            style={{
              fontSize: 11.5,
              fontFamily: BE.mono,
              color: BE.textDim,
              background: "transparent",
              border: `1px solid ${BE.line}`,
              borderRadius: 10,
              padding: 10,
              maxHeight: 160,
              overflowY: "auto",
              margin: "0 0 14px",
              whiteSpace: "pre-wrap",
            }}
          >
            {log.join("\n")}
          </pre>
        )}

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

        {result && (
          <div
            style={{
              color: result.saved > 0 ? BE.good : BE.warn,
              background: result.saved > 0 ? BE.goodSoft : BE.warnSoft,
              border: `1px solid ${result.saved > 0 ? BE.good : BE.warn}`,
              borderRadius: 10,
              padding: 12,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            Saved <strong>{result.saved}</strong> of {result.total} extracted question
            {result.total === 1 ? "" : "s"}.
            {result.skipped > 0 && ` ${result.skipped} could not be converted (see the log).`}
            <div style={{ marginTop: 6, fontSize: 12 }}>
              They are marked <strong>unreviewed</strong> — check each one in the editor before
              marking this DPP ready.
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {!result && (
            <button
              onClick={run}
              disabled={running || files.length === 0}
              style={{
                padding: "11px 16px",
                borderRadius: 10,
                border: "none",
                background: running || files.length === 0 ? BE.line : BE.accent,
                color: running || files.length === 0 ? BE.textMute : "#1a1205",
                fontWeight: 700,
                fontSize: 14,
                cursor: running || files.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {running ? "Extracting…" : "Start import"}
            </button>
          )}
          {running ? (
            <button
              onClick={() => abortRef.current?.abort()}
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
              Cancel
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                padding: "11px 16px",
                borderRadius: 10,
                border: `1px solid ${BE.line}`,
                background: "transparent",
                color: BE.textDim,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {result ? "Close" : "Cancel"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModelPick({
  label,
  hint,
  options,
  value,
  set,
  disabled,
}: {
  label: string;
  hint: string;
  options: { id: string; label: string }[];
  value: string;
  set: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ opacity: disabled ? 0.55 : 1 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: BE.textDim,
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => set(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 9,
          border: `1px solid ${BE.line}`,
          background: BE.surface,
          color: BE.text,
          fontSize: 13,
        }}
      >
        <option value="">Server default</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <div style={{ fontSize: 11, color: BE.textMute, marginTop: 3 }}>{hint}</div>
    </div>
  );
}

function Toggle({
  on,
  set,
  label,
  hint,
  disabled,
}: {
  on: boolean;
  set: (v: boolean) => void;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 9,
        alignItems: "flex-start",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={on}
        disabled={disabled}
        onChange={(e) => set(e.target.checked)}
        style={{ marginTop: 2 }}
      />
      <span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span style={{ display: "block", fontSize: 11.5, color: BE.textMute }}>{hint}</span>
      </span>
    </label>
  );
}
