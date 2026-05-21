"use client";
import { Check } from "lucide-react";
import { fmtDuration, type ExamConfig, type ExamType } from "@/lib/examConfigs";
import { BE } from "@/lib/theme";
import { getMarkingRows } from "./mockTestUtils";
import type { SeededMock } from "./MockTestPage";

interface BriefPhaseProps {
  config: ExamConfig;
  selectedExam: ExamType | null;
  selectedMode: "seeded" | "random" | null;
  selectedMock: SeededMock | null;
  briefAgreed: boolean;
  error: string | null;
  onToggleAgreed: () => void;
  onBack: () => void;
  onBeginTest: () => void;
}

function BriefStat({ label, val, sub }: { label: string; val: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 600, letterSpacing: '-0.4px', marginTop: 2, color: BE.text }}>{val}</div>
      {sub && <div style={{ fontSize: 10.5, color: BE.textDim }}>{sub}</div>}
    </div>
  );
}

function MarkRow({ type, marks, neg }: { type: string; marks: string; neg: string }) {
  return (
    <div className="p-2.5 border rounded-lg" style={{ borderColor: BE.line }}>
      <div style={{ fontFamily: BE.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: BE.accent, marginBottom: 4 }}>{type}</div>
      <div style={{ fontSize: 11, color: BE.text, marginBottom: 1 }}>{marks}</div>
      <div style={{ fontSize: 10.5, color: BE.textMute }}>{neg}</div>
    </div>
  );
}

export default function BriefPhase({
  config, selectedExam, selectedMode, selectedMock,
  briefAgreed, error,
  onToggleAgreed, onBack, onBeginTest,
}: BriefPhaseProps) {
  const isSpec = selectedMode === "seeded";
  const markingRows = getMarkingRows(config, selectedExam);
  const cols = Math.min(markingRows.length, 3);

  return (
    <>
      <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
        Step 2 of 4 · {isSpec ? 'Past paper' : 'Random test'}
      </div>
      <h1 style={{ fontFamily: BE.serif, fontWeight: 500, fontSize: 28, letterSpacing: '-0.6px', marginBottom: 4, color: BE.text }}>Read this. Then begin.</h1>
      <div style={{ fontSize: 13.5, color: BE.textDim, marginBottom: 20 }}>
        {isSpec ? `${selectedMock?.title} · ${config.label}` : `Custom paper · ${config.label}`}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3.5 mb-4">
        <div className="flex flex-col gap-2.5">
          <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Exam pattern</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <BriefStat label="Questions" val={isSpec ? String(selectedMock?.total_questions) : String(config.totalQuestions)} />
              <BriefStat label="Total marks" val={isSpec ? String(selectedMock?.max_score) : String(config.maxScore)} />
              <BriefStat label="Time" val={isSpec ? fmtDuration(selectedMock?.duration_secs ?? 0) : "3h"} />
              <BriefStat label="Sections" val={String(config.sections.length)} />
            </div>
          </div>
          <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Marking scheme</div>
            <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {markingRows.map((r) => (
                <MarkRow key={r.type} type={r.type} marks={r.marks} neg={r.neg} />
              ))}
            </div>
          </div>
          <div className="border rounded-xl p-3.5 flex gap-2.5" style={{ borderColor: BE.warn + '33', background: `linear-gradient(135deg, ${BE.warn}08, transparent)` }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={BE.warn} strokeWidth="1.6" className="shrink-0 mt-0.5"><circle cx="9" cy="9" r="7.5"/><path d="M9 5v4M9 12v.5"/></svg>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: BE.text }}>Timer cannot be paused.</div>
              <div style={{ fontSize: 11.5, color: BE.textDim, lineHeight: 1.5 }}>Refreshing is fine — answers auto-save. Closing the tab won't stop the clock.</div>
            </div>
          </div>
        </div>

        <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
          <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Instructions</div>
          <ol className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed" style={{ color: BE.text }}>
            {[
              'Use the question palette to navigate freely.',
              'Mark for review to revisit later.',
              'Type numeric answers for NAT questions.',
              'A virtual calculator is available (Ctrl+K).',
              'Auto-saves every 15 seconds. Refresh is safe.',
              'You can change answers before final submit.',
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5">
                <span style={{ fontFamily: BE.mono, fontSize: 10.5, color: BE.accent, fontWeight: 600, minWidth: 14 }}>{String(i + 1).padStart(2, '0')}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div
        className="border rounded-xl p-3.5 flex items-center gap-2.5 cursor-pointer select-none mb-4"
        style={{ borderColor: briefAgreed ? BE.accent : BE.line, background: BE.surface }}
        onClick={onToggleAgreed}
      >
        <div className="flex items-center justify-center rounded-[4px] shrink-0 border transition-all"
          style={{ width: 18, height: 18, background: briefAgreed ? BE.accent : 'transparent', borderColor: briefAgreed ? BE.accent : BE.line, color: '#fff' }}>
          {briefAgreed && <Check size={11} />}
        </div>
        <div style={{ fontSize: 12.5, color: BE.text }}>I have read the instructions and agree to abide by them.</div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg border text-sm text-red-500 bg-red-500/10" style={{ borderColor: BE.bad + '33' }}>{error}</div>}

      <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: BE.line }}>
        <button className="be-btn" onClick={onBack}>← Back</button>
        <button className="be-btn be-btn-primary" disabled={!briefAgreed} onClick={onBeginTest} style={{ padding: '11px 26px', fontSize: 14 }}>Begin Test →</button>
      </div>
    </>
  );
}
