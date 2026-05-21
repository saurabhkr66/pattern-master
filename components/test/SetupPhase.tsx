"use client";
import { Search, Trash2, X } from "lucide-react";
import { EXAM_CONFIGS, fmtDuration, type ExamConfig, type ExamType } from "@/lib/examConfigs";
import { BE } from "@/lib/theme";
import type { SeededMock } from "./MockTestPage";

interface SetupPhaseProps {
  selectedExam: ExamType | null;
  selectedBranch: string | null;
  selectedMode: "seeded" | "random" | null;
  selectedMock: SeededMock | null;
  selectedSubjects: string[];
  availableSubjects: string[];
  seededMocks: SeededMock[];
  mockSearch: string;
  config: ExamConfig | null;
  hasBranches: boolean;
  isAdmin: boolean;
  canContinue: boolean;
  examPaperTotal: (et: string) => number;
  branchPaperCount: (et: string, br: string) => number;
  onSelectExam: (exam: ExamType) => void;
  onSelectBranch: (branch: string) => void;
  onSelectMode: (mode: "seeded" | "random") => void;
  onSelectMock: (mock: SeededMock) => void;
  onSearchChange: (q: string) => void;
  onSubjectsChange: (subjects: string[]) => void;
  onDeleteTest: (mockId: string, title: string) => void;
  onContinue: () => void;
  onGoToBrief: (mock: SeededMock) => void;
  onLoadAnalysis: (mock: SeededMock) => void;
}

export default function SetupPhase({
  selectedExam, selectedBranch, selectedMode, selectedMock,
  selectedSubjects, availableSubjects, seededMocks, mockSearch,
  config, hasBranches, isAdmin, canContinue,
  examPaperTotal, branchPaperCount,
  onSelectExam, onSelectBranch, onSelectMode, onSelectMock,
  onSearchChange, onSubjectsChange, onDeleteTest,
  onContinue, onGoToBrief, onLoadAnalysis,
}: SetupPhaseProps) {
  const isSpec = selectedMode === "seeded";
  const isRandom = selectedMode === "random";

  return (
    <>
      <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Step 1 of 4 · Setup</div>
      <h1 style={{ fontFamily: BE.serif, fontWeight: 500, fontSize: 28, letterSpacing: '-0.6px', marginBottom: 20, color: BE.text }}>Configure your test.</h1>

      {/* Exam selection */}
      <div className="mb-6">
        <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Exam</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EXAM_CONFIGS.map((exam) => {
            const sel = selectedExam === exam.examType;
            return (
              <div
                key={exam.examType}
                onClick={() => onSelectExam(exam.examType)}
                className="border rounded-xl p-3 cursor-pointer transition-all hover:shadow-sm"
                style={{
                  borderColor: sel ? BE.accent : BE.line,
                  borderWidth: sel ? 2 : 1,
                  background: sel ? `${BE.accent}10` : BE.surface,
                }}
              >
                <div style={{ fontFamily: BE.serif, fontSize: 18, fontWeight: 600, color: BE.text, marginBottom: 2 }}>{exam.label}</div>
                <div style={{ fontSize: 11, color: BE.textDim, marginBottom: 8 }}>{exam.description}</div>
                <div className="flex gap-2.5 pt-2 border-t" style={{ borderColor: BE.line, fontSize: 10, color: BE.textMute }}>
                  <span><span style={{ color: BE.text, fontFamily: BE.mono, fontWeight: 600 }}>{exam.totalQuestions}</span> Q</span>
                  <span><span style={{ color: BE.text, fontFamily: BE.mono, fontWeight: 600 }}>{Math.round(exam.durationSecs / 60)}</span> min</span>
                  <span>
                    <span style={{ color: BE.text, fontFamily: BE.mono, fontWeight: 600 }}>{examPaperTotal(exam.examType)}</span>{' '}
                    {examPaperTotal(exam.examType) === 1 ? 'paper' : 'papers'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Branch selection */}
      {selectedExam && config && hasBranches && (
        <div className="mb-6">
          <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Branch</div>
          <div className="flex flex-wrap gap-2">
            {config.branches?.map((b) => {
              const sel = selectedBranch === b.id;
              const count = branchPaperCount(selectedExam!, b.id);
              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBranch(b.id)}
                  className="border rounded-lg px-3.5 py-2.5 cursor-pointer transition-all flex items-center gap-2.5"
                  style={{
                    borderColor: sel ? BE.accent : BE.line,
                    borderWidth: sel ? 2 : 1,
                    background: sel ? `${BE.accent}10` : BE.surface,
                  }}
                >
                  <span style={{ fontFamily: BE.mono, fontSize: 12, fontWeight: 700, color: sel ? BE.accent : BE.textDim }}>{b.id}</span>
                  <span style={{ fontSize: 12, color: BE.text }}>{b.label}</span>
                  <span style={{
                    fontFamily: BE.mono, fontSize: 10.5, fontWeight: 600,
                    color: count > 0 ? (sel ? BE.accent : BE.textDim) : BE.textMute,
                    opacity: count > 0 ? 1 : 0.6,
                    marginLeft: 4,
                  }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode selection */}
      {selectedExam && (!hasBranches || selectedBranch) && (
        <div className="mb-6">
          <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Mode</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => onSelectMode("seeded")}
              className="border-2 rounded-xl p-4 cursor-pointer transition-all"
              style={{ borderColor: isSpec ? BE.accent : BE.line, background: isSpec ? `${BE.accent}10` : BE.surface }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isSpec ? BE.accentSoft : 'rgba(255,255,255,0.05)', color: isSpec ? BE.accent : BE.textDim }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
                </div>
                <div style={{ fontFamily: BE.serif, fontSize: 16, fontWeight: 600, color: BE.text }}>Specialized Mock</div>
                {!selectedMode && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: BE.accent }}>REC</span>}
              </div>
              <div style={{ fontSize: 12, color: BE.textDim, lineHeight: 1.5 }}>Fixed past-paper set. Same questions every attempt — comparable scores.</div>
            </div>
            <div
              onClick={() => onSelectMode("random")}
              className="border-2 rounded-xl p-4 cursor-pointer transition-all"
              style={{ borderColor: isRandom ? BE.accent : BE.line, background: isRandom ? `${BE.accent}10` : BE.surface }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isRandom ? BE.accentSoft : 'rgba(255,255,255,0.05)', color: isRandom ? BE.accent : BE.textDim }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
                </div>
                <div style={{ fontFamily: BE.serif, fontSize: 16, fontWeight: 600, color: BE.text }}>Random Test</div>
              </div>
              <div style={{ fontSize: 12, color: BE.textDim, lineHeight: 1.5 }}>Fresh paper from the bank. Filter by subjects. Great for daily drilling.</div>
            </div>
          </div>
        </div>
      )}

      {/* Seeded mock picker */}
      {isSpec && (() => {
        const q = mockSearch.trim().toLowerCase();
        const visibleMocks = q
          ? seededMocks.filter(m => m.title.toLowerCase().includes(q) || String(m.mock_number).includes(q))
          : seededMocks;
        return (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Select Paper</div>
              {seededMocks.length > 0 && (
                <div className="relative" style={{ width: 220, maxWidth: '60%' }}>
                  <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: BE.textMute, pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={mockSearch}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search papers…"
                    className="w-full rounded-lg outline-none transition-colors"
                    style={{ fontSize: 12, padding: '6px 26px 6px 28px', background: BE.surface, border: `1px solid ${BE.line}`, color: BE.text }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = BE.accent; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = BE.line; }}
                  />
                  {mockSearch && (
                    <button onClick={() => onSearchChange("")} aria-label="Clear search" className="absolute" style={{ right: 6, top: '50%', transform: 'translateY(-50%)', padding: 2, color: BE.textMute }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
            {seededMocks.length === 0 ? (
              <div className="border border-dashed rounded-xl p-10 text-center" style={{ borderColor: BE.line }}>
                <div className="text-xl mb-2">📭</div>
                <div style={{ fontSize: 13, color: BE.textDim }}>No papers seeded yet.</div>
              </div>
            ) : visibleMocks.length === 0 ? (
              <div className="border border-dashed rounded-xl p-8 text-center" style={{ borderColor: BE.line }}>
                <div style={{ fontSize: 13, color: BE.textDim }}>No papers match &ldquo;{mockSearch}&rdquo;.</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {visibleMocks.map((m) => {
                  const taken = !!m.session;
                  const isSel = selectedMock?.mock_number === m.mock_number;
                  return (
                    <div
                      key={m.mock_number}
                      onClick={() => onSelectMock(m)}
                      className="border rounded-xl p-3 cursor-pointer relative hover:shadow-sm transition-all group"
                      style={{ borderColor: isSel ? BE.accent : BE.line, borderWidth: isSel ? 2 : 1, background: isSel ? `${BE.accent}10` : BE.surface }}
                    >
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteTest(m.id, m.title); }}
                          className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        ><Trash2 size={12} /></button>
                      )}
                      <div style={{ fontFamily: BE.mono, fontSize: 10, color: BE.textMute, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                        {m.mock_number}
                        {taken && <span className="ml-2" style={{ color: BE.good }}>● Done</span>}
                      </div>
                      <div style={{ fontFamily: BE.serif, fontSize: 15, fontWeight: 600, color: BE.text, marginBottom: 2 }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: BE.textDim }}>{m.total_questions} Q · {fmtDuration(m.duration_secs)}</div>
                      {taken && m.session && (
                        <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: BE.line }}>
                          <div style={{ fontFamily: BE.mono, fontSize: 11, fontWeight: 700, color: BE.text }}>
                            Score: {m.session.score} / {m.session.max_score}
                          </div>
                          {m.session.section_scores && Array.isArray(m.session.section_scores) && (
                            <div className="grid grid-cols-1 gap-0.5 pt-0.5 border-t border-dashed mt-1" style={{ borderColor: BE.line }}>
                              {m.session.section_scores.map((ss: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-[9px] leading-tight">
                                  <div style={{ color: BE.textMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{ss.name}</div>
                                  <div style={{ fontWeight: 600, color: BE.textDim }}>{ss.score}/{ss.maxScore}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {isSel && (
                        <div className="mt-2 pt-2 border-t flex gap-1.5" style={{ borderColor: BE.line }}>
                          {taken ? (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); onGoToBrief(m); }}
                                className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-colors"
                                style={{ background: BE.accent, color: '#fff' }}
                              >Retake</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onLoadAnalysis(m); }}
                                className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-colors"
                                style={{ background: BE.accentSoft, color: BE.accent }}
                              >Analysis</button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); onGoToBrief(m); }}
                              className="w-full rounded-lg py-1.5 text-[11px] font-semibold transition-colors"
                              style={{ background: BE.accent, color: '#fff' }}
                            >Continue →</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Random test config */}
      {isRandom && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 mb-6">
          <div className="flex flex-col gap-3">
            <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: BE.text, marginBottom: 8 }}>Difficulty mix</div>
              <div className="flex h-6 rounded-lg overflow-hidden mb-1">
                <div className="flex items-center justify-center text-[10px] font-bold text-black" style={{ flex: 30, background: BE.good + '99' }}>Easy 30%</div>
                <div className="flex items-center justify-center text-[10px] font-bold text-black" style={{ flex: 50, background: BE.warn + '99' }}>Medium 50%</div>
                <div className="flex items-center justify-center text-[10px] font-bold text-white" style={{ flex: 20, background: BE.bad + '99' }}>Hard 20%</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="border rounded-xl p-3" style={{ borderColor: BE.line, background: BE.surface }}>
                <div style={{ fontSize: 10, color: BE.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Questions</div>
                <div style={{ fontFamily: BE.serif, fontSize: 28, fontWeight: 600, color: BE.text }}>{config?.totalQuestions}</div>
              </div>
              <div className="border rounded-xl p-3" style={{ borderColor: BE.line, background: BE.surface }}>
                <div style={{ fontSize: 10, color: BE.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Duration</div>
                <div style={{ fontFamily: BE.serif, fontSize: 28, fontWeight: 600, color: BE.text }}>{Math.round((config?.durationSecs ?? 0) / 60)}<span style={{ fontSize: 12, color: BE.textDim }}> min</span></div>
              </div>
            </div>
          </div>
          <div className="border rounded-xl p-4" style={{ borderColor: BE.line, background: BE.surface }}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ fontSize: 12, fontWeight: 600, color: BE.text }}>Filter subjects <span style={{ color: BE.textMute, fontWeight: 400 }}>(optional)</span></div>
              <button className="be-btn text-[10px] px-2 py-1" onClick={() => onSubjectsChange([])}>Clear</button>
            </div>
            <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
              {availableSubjects.map((s) => {
                const sel = selectedSubjects.includes(s);
                return (
                  <div
                    key={s}
                    onClick={() => onSubjectsChange(sel ? selectedSubjects.filter(x => x !== s) : [...selectedSubjects, s])}
                    className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all"
                    style={{ borderColor: sel ? BE.accent : BE.line, background: sel ? BE.accentSoft : 'transparent' }}
                  >
                    <div className="w-3 h-3 rounded border flex items-center justify-center text-[9px] text-white shrink-0" style={{ borderColor: sel ? BE.accent : BE.line, background: sel ? BE.accent : 'transparent' }}>{sel && "✓"}</div>
                    <span style={{ fontSize: 12, color: BE.text }}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Continue button (shown for random mode, not seeded) */}
      {!isSpec && (
        <div className="flex justify-end pt-4 border-t" style={{ borderColor: BE.line }}>
          <button
            className="be-btn be-btn-primary"
            disabled={!canContinue}
            onClick={onContinue}
            style={{ padding: '10px 24px', opacity: canContinue ? 1 : 0.4 }}
          >
            Continue →
          </button>
        </div>
      )}
    </>
  );
}
