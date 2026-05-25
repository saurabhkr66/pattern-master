"use client";

import { useRouter } from "next/navigation";
import { getQuestionUrl } from "@/lib/seo";
import PracticeButton from "./PracticeButton";
import MathRenderer from "@/components/ui/MathRenderer";
import UserNotesEditor from "./UserNotesEditor";
import { useState, useEffect, useRef, useMemo, memo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { BE } from "@/lib/theme";
import { Bookmark, Loader2 } from "lucide-react";
import MasteryNotes from "../MasteryNotes";
import LoadingLogo from "@/components/ui/LoadingLogo";

interface PatternRowProps {
  pattern: any;
  isHighlighted?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  directQuestionId?: string;
}


const fetchPatternQuestions = async (patternId: string, skip = 0, take = 0) => {
  const params = new URLSearchParams();
  if (skip > 0) params.set("skip", String(skip));
  if (take > 0) params.set("take", String(take));
  const qs = params.toString();
  const res = await fetch(`/api/patterns/${patternId}/questions${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch questions");
  return res.json();
};

// ── NEW QUESTION CARD ─────────────────────────────────────────────
const QuestionCard = memo(({ q, i, pattern, onSelect, isPyqOverride, language }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const isPyq = isPyqOverride !== undefined ? isPyqOverride : q._isPyq;
  const statusDot = !q.attempts?.length 
    ? BE.textMute 
    : q.attempts[0].is_correct ? BE.good : BE.bad;

  return (
    <div 
      onClick={() => onSelect(q)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: 10,
        padding: 14, background: BE.surface, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 10, height: 180,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `1px solid ${isHovered ? BE.accent : BE.line}`,
        boxShadow: isHovered ? `0 0 0 1px ${BE.accent}, 0 10px 25px -5px rgba(0, 0, 0, 0.1)` : 'none'
      }}
      className="group hover:!border-amber-500/50"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: BE.textMute, letterSpacing: 0.06, textTransform: 'uppercase', fontWeight: 600 }}>
        <span style={{ fontFamily: BE.mono, textTransform: 'none', letterSpacing: 0, color: BE.textDim }}>#{String(i + 1).padStart(2,'0')}</span>
        {isPyq && <span style={{ color: BE.warn }}>PYQ {q.year}</span>}
        <span>· {q.exam_type}</span>
        <span>· {q.marks}M</span>
        <span style={{ flex: 1 }} />
        {q.isBookmarked && (
          <Bookmark size={11} fill={BE.accent} stroke="none" />
        )}
        <span style={{ width: 6, height: 6, borderRadius: 3, background: statusDot }} />
      </div>
      <div style={{ fontSize: 13, color: BE.text, lineHeight: 1.5, fontFamily: BE.serif, flex: 1,
        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        <MathRenderer content={(language === "hi" && q.question_text_hindi) ? q.question_text_hindi : q.question_text} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: statusDot }}>{!q.attempts?.length ? 'Not attempted' : q.attempts[0].is_correct ? 'Correct' : 'Wrong · retry'}</span>
        <span style={{ color: BE.accent, fontWeight: 500 }} className="opacity-0 group-hover:opacity-100 transition-opacity">Solve →</span>
      </div>
    </div>
  );
});

QuestionCard.displayName = "QuestionCard";

export default function PatternRow({ pattern, isHighlighted, isOpen, onToggle, directQuestionId }: PatternRowProps) {
  const router = useRouter();
  const rowRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeTab, setActiveTab] = useState<"bank" | "pyq" | "notes" | "review-notes">("pyq");
  const [visibleBank, setVisibleBank] = useState(12);
  const [visiblePyqs, setVisiblePyqs] = useState(12);
  const [questionStatusFilter, setQuestionStatusFilter] = useState<"all" | "unsolved" | "wrong" | "correct">("all");

  const isSubjectLevel = !!pattern.isSubjectLevel;

  useEffect(() => {
    if (isOpen && rowRef.current) {
      const t = setTimeout(() => {
        const block = window.innerWidth < 768 ? "start" : "center";
        rowRef.current?.scrollIntoView({ behavior: "smooth", block });
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      console.log(`[PatternRow] Row is OPEN for pattern ID: ${pattern.id}, Topic: ${pattern.topic_name}`);
    }
  }, [isOpen, pattern.id, pattern.topic_name]);

  // Fetch all questions at once for both subject and regular patterns
  const { data, isLoading: isLoadingAll } = useQuery({
    queryKey: ["patternQuestions", pattern.id],
    queryFn: () => fetchPatternQuestions(pattern.id),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const isLoadingQuestions = isLoadingAll;
  const questions = useMemo(() => data?.questions || [], [data?.questions]);
  const pyqs = useMemo(() => data?.pyqs || [], [data?.pyqs]);
  const shortNotes = data?.short_notes ?? pattern.short_notes ?? null;

  useEffect(() => {
    if (directQuestionId && (questions.length > 0 || pyqs.length > 0)) {
      const q = questions.find((x: any) => x.id === directQuestionId);
      console.log("[PatternRow] deep-link lookup", {
        directQuestionId,
        bank: questions.length,
        pyq: pyqs.length,
        foundInBank: !!q,
        firstPyqId: pyqs[0]?.id,
        pyqIdMatchType: pyqs[0] ? typeof pyqs[0].id : "n/a",
      });
      if (q) {
        setSelectedQuestion({ ...q, _isPyq: false });
        setActiveTab("bank");
        return;
      }
      const p = pyqs.find((x: any) => x.id === directQuestionId);
      console.log("[PatternRow] pyq lookup result", { foundInPyq: !!p, pyqId: p?.id });
      if (p) {
        setSelectedQuestion({ ...p, _isPyq: true });
        setActiveTab("pyq");
      }
    }
  }, [directQuestionId, questions, pyqs]);

  // Resolve the default tab once data arrives, but only if there's no
  // directQuestionId driving the choice (that effect above sets the tab itself).
  // Prefer PYQ when any exist; fall back to bank otherwise.
  useEffect(() => {
    if (!data) return;
    if (directQuestionId) return;
    setActiveTab(pyqs.length > 0 ? "pyq" : "bank");
  }, [data, pyqs.length, questions.length, directQuestionId]);

  // Sync URL when question is cleared — but only after THIS row has actually
  // had a selectedQuestion at some point. Without this guard, every freshly
  // mounted PatternRow (one per topic in the list) would race to strip the
  // ?questionId param before the matched row's data finished loading,
  // breaking deep-links from mistakes/bookmarks/dashboard on first click.
  const hadSelectionRef = useRef(false);
  useEffect(() => {
    if (selectedQuestion) hadSelectionRef.current = true;
  }, [selectedQuestion]);

  useEffect(() => {
    if (!hadSelectionRef.current) return;
    if (!selectedQuestion && !directQuestionId) {
      const url = new URL(window.location.href);
      if (url.searchParams.has("q") || url.searchParams.has("questionId")) {
        url.searchParams.delete("q");
        url.searchParams.delete("questionId");
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [selectedQuestion, directQuestionId]);

  const total = pattern.totalQuestions || 0;
  const solved = pattern.solvedQuestions || 0;
  const pct = Math.round((solved / total) * 100) || 0;

  const statusLabel = pct >= 75 ? 'mastered' : solved > 0 ? 'in-progress' : 'unstarted';
  const statusMap = {
    mastered:    { label: 'Mastered',    color: BE.good, soft: BE.goodSoft },
    'in-progress': { label: 'In progress', color: BE.accent, soft: BE.accentSoft },
    unstarted:   { label: 'Not started', color: BE.textMute, soft: 'rgba(255,255,255,0.04)' },
  };
  const s = statusMap[statusLabel];

  const applyFilters = (qs: any[]) => {
    let filtered = qs;
    if (questionStatusFilter === "unsolved") filtered = filtered.filter(q => !q.attempts?.length);
    if (questionStatusFilter === "wrong") filtered = filtered.filter(q => q.attempts?.length && !q.attempts[0].is_correct);
    if (questionStatusFilter === "correct") filtered = filtered.filter(q => q.attempts?.length && q.attempts[0].is_correct);

    const wrong   = filtered.filter(q => q.attempts?.length && !q.attempts[0].is_correct);
    const unseen  = filtered.filter(q => !q.attempts?.length);
    const correct = filtered.filter(q => q.attempts?.length &&  q.attempts[0].is_correct);
    return [...wrong, ...unseen, ...correct];
  };

  const displayedBank = useMemo(() => applyFilters(questions.map((q: any, i: number) => ({ ...q, _originalIndex: i }))), [questions, questionStatusFilter]);
  const displayedPyqs = useMemo(() => applyFilters(pyqs.map((p: any, i: number) => ({ ...p, _isPyq: true, _isSubjectPyq: false, _originalIndex: i }))), [pyqs, questionStatusFilter]);

  const queue = useMemo(() => {
    if (!selectedQuestion) return [];
    const source = selectedQuestion._isPyq ? displayedPyqs : displayedBank;
    
    // Filter the source to only include the current question + subsequent unsolved/wrong questions
    const filteredSource = source.filter(q => {
      if (q.id === selectedQuestion.id) return true;
      const isCorrect = q.attempts?.length && q.attempts[0].is_correct;
      return !isCorrect;
    });

    const idx = filteredSource.findIndex(q => q.id === selectedQuestion.id);
    return idx !== -1 ? filteredSource.slice(idx + 1) : [];
  }, [selectedQuestion, displayedBank, displayedPyqs]);

  return (
    <div ref={rowRef} id={`pattern-${pattern.id}`} style={{ borderBottom: `1px solid ${BE.line}` }}>
      {isNavigating && <LoadingLogo />}
      {/* Row Header */}
      <div
        onClick={onToggle}
        style={{
          padding: pattern.isMock ? '16px 4px 16px 12px' : '14px 4px', cursor: 'pointer',
          background: pattern.isMock
            ? isOpen ? 'rgba(255,143,0,0.08)' : 'rgba(255,143,0,0.04)'
            : isOpen ? 'rgba(255,255,255,0.02)' : 'transparent',
          borderBottom: `1px solid transparent`,
          borderLeft: pattern.isMock ? `3px solid ${BE.accent}` : '3px solid transparent',
          transition: 'all 0.2s',
          borderRadius: pattern.isMock ? '0 8px 8px 0' : undefined,
          marginLeft: pattern.isMock ? -4 : undefined,
        }}
        className={pattern.isMock ? "hover:bg-amber-500/10 group/row" : "hover:bg-amber-50/20 hover:border-b-amber-500/30 group/row"}
      >
        {/* Desktop grid layout */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 130px 170px 32px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
              <div style={{ fontSize: 14.5, fontWeight: 500, color: isOpen ? BE.accent : BE.text }}>{pattern.topic_name}</div>
              {pattern.pyqsCount > 0 && (
                <span className="hidden md:inline-block" style={{ 
                  fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, 
                  background: BE.warnSoft, color: BE.warn,
                  textTransform: 'uppercase', letterSpacing: 0.5
                }}>{pattern.pyqsCount} PYQ</span>
              )}
              {pattern.questionsCount > 0 && (
                <span className="hidden md:inline-block" style={{ 
                  fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, 
                  background: 'rgba(255,255,255,0.05)', color: BE.textDim,
                  textTransform: 'uppercase', letterSpacing: 0.5
                }}>{pattern.questionsCount} Bank</span>
              )}
              {pattern.isMock && (
                <span className="hidden md:inline-block" style={{
                  fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4,
                  background: BE.accent, color: '#fff',
                  textTransform: 'uppercase', letterSpacing: 0.5
                }}>Full Paper</span>
              )}
            </div>
          </div>
          <div>
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: s.soft, color: s.color 
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 3, background: s.color }} />
              {s.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: s.color, opacity: statusLabel === 'unstarted' ? 0 : 1 }} />
            </div>
            <div style={{ fontSize: 12, color: BE.textDim, fontFamily: BE.mono, minWidth: 46, textAlign: 'right' }}>{solved}/{total}</div>
          </div>
          <div style={{ textAlign: 'right', color: BE.textMute }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .15s' }}>
              <path d="M3 4.5l3 3 3-3"/>
            </svg>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="flex md:hidden items-center gap-3">
          <div className="flex-1 min-w-0">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: isOpen ? BE.accent : BE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pattern.topic_name}</div>
                {pattern.isMock && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 4,
                    background: BE.accent, color: '#fff',
                    textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0
                  }}>Full Paper</span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: BE.textDim, fontFamily: BE.mono, flexShrink: 0 }}>{solved}/{total}</div>
            </div>
            {/* Progress bar below topic name with reduced width */}
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', width: '60%' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: s.color, opacity: statusLabel === 'unstarted' ? 0 : 1, transition: 'width 0.4s' }} />
            </div>
          </div>
          <div style={{ textAlign: 'right', color: BE.textMute, flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .15s' }}>
              <path d="M3 4.5l3 3 3-3"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Body */}
      {isOpen && (
        <div style={{ padding: '0 4px 20px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginTop: 4, marginBottom: 16, borderBottom: `1px solid ${BE.line}`, overflowX: 'auto' }}>
            {(pattern.isMock ? [
               { id: 'bank', label: 'Questions', n: pattern.questionsCount, icon: 'bank' }
            ] : [
              { id: 'bank', label: 'Question bank', n: pattern.questionsCount, icon: 'bank' },
              { id: 'pyq',  label: 'Previous year', n: pattern.pyqsCount, icon: 'pyq' },
              { id: 'notes', label: 'Mastery notes', icon: 'notes' },
              { id: 'review-notes', label: 'My notes', icon: 'pencil', dot: true },
            ]).map(t => {
              const active = t.id === activeTab;
              return (
                <div key={t.id} onClick={() => { setActiveTab(t.id as any); setSelectedQuestion(null); setIsGenerating(false); }}
                  style={{
                    padding: '10px 14px', fontSize: 12, fontWeight: 600,
                    color: active ? BE.accent : BE.textDim,
                    borderBottom: `2px solid ${active ? BE.accent : 'transparent'}`,
                    marginBottom: -1, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    letterSpacing: 0.04, textTransform: 'uppercase', whiteSpace: 'nowrap'
                  }}>
                  <TabIcon kind={t.icon} active={active} className="w-4 h-4 md:w-[13px] md:h-[13px]" />
                  <span className="hidden md:inline">{t.label}</span>
                  {t.n !== undefined && <span className="hidden md:inline" style={{ fontSize: 10.5, fontFamily: BE.mono, opacity: 0.75, textTransform: 'none', letterSpacing: 0 }}>{t.n}</span>}
                </div>
              );
            })}
          </div>

          <div style={{ minHeight: 240 }}>
            {isLoadingQuestions ? (
               <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 12, color: BE.textMute }}>Loading content...</div>
            ) : selectedQuestion ? (
              <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, background: BE.surface, overflow: 'hidden' }}>
                <PracticeButton 
                  patternId={pattern.id} topicName={pattern.topic_name} 
                  initialQuestion={selectedQuestion} initialQueue={queue} 
                  isPyqMode={selectedQuestion._isPyq} onExit={() => setSelectedQuestion(null)} 
                />
              </div>
            ) : isGenerating ? (
              <div className="max-w-xl mx-auto py-4">
                <PracticeButton patternId={pattern.id} topicName={pattern.topic_name} onExit={() => setIsGenerating(false)} />
                <button onClick={() => setIsGenerating(false)} style={{ width: '100%', marginTop: 16, fontSize: 10, fontWeight: 800, color: BE.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>Cancel</button>
              </div>
            ) : (
              <>
                {activeTab === 'bank' || activeTab === 'pyq' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', padding: 3, borderRadius: 8, border: `1px solid ${BE.line}`, transition: 'border-color 0.2s' }} className="hover:border-amber-500/30">
                        {['all', 'unsolved', 'wrong', 'correct'].map(x => (
                          <div key={x} onClick={() => setQuestionStatusFilter(x as any)}
                            style={{ 
                              padding: '4px 10px', fontSize: 11.5, borderRadius: 5, 
                              color: questionStatusFilter === x ? BE.text : BE.textDim, 
                              background: questionStatusFilter === x ? 'rgba(255,255,255,0.08)' : 'transparent', 
                              cursor: 'pointer', fontWeight: 500, textTransform: 'capitalize' 
                            }}>{x}</div>
                        ))}
                      </div>
                      <div style={{ flex: 1 }} />
                      {pattern.isMock && (
                        <button
                          onMouseEnter={() => router.prefetch('/test')}
                          onClick={() => {
                            setIsNavigating(true);
                            router.push(`/test?id=${pattern.id.replace('mock-', '')}`);
                          }}
                          style={{
                            padding: '6px 14px', fontSize: 11, borderRadius: 8, border: `1px solid ${BE.accent}`,
                            background: BE.accentSoft, color: BE.accent, fontWeight: 700, cursor: 'pointer',
                            textTransform: 'uppercase', letterSpacing: 0.5
                          }}>Start Full Mock Test</button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                      {(activeTab === 'bank' ? displayedBank : displayedPyqs).slice(0, activeTab === 'bank' ? visibleBank : visiblePyqs).map((q: any) => (
                        <QuestionCard key={q.id} q={q} i={q._originalIndex} pattern={pattern} onSelect={setSelectedQuestion} language={language} isPyqOverride={activeTab === 'pyq'} />
                      ))}
                    </div>
                    {/* Client-side load more */}
                    {(activeTab === 'bank' ? displayedBank : displayedPyqs).length > (activeTab === 'bank' ? visibleBank : visiblePyqs) && (
                      <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <button onClick={() => activeTab === 'bank' ? setVisibleBank(v => v+12) : setVisiblePyqs(v => v+12)} style={{ fontSize: 11, fontWeight: 700, color: BE.accent, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>Load more</button>
                      </div>
                    )}
                  </>
                ) : activeTab === 'notes' ? (
                  <div style={{ padding: '10px 0' }}>
                    <MasteryNotes data={shortNotes} />
                  </div>
                ) : (
                  <UserNotesEditor patternId={pattern.id} />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabIcon({ kind, active, className }: { kind: string, active: boolean, className?: string }) {
  const c = active ? BE.accent : BE.textDim;
  const props = { viewBox: "0 0 14 14", fill: "none", stroke: c, strokeWidth: "1.5", className };
  if (kind === 'bank') return <svg {...props as any}><rect x="2" y="2.5" width="10" height="9" rx="1"/><path d="M4.5 5.5h5M4.5 8h3"/></svg>;
  if (kind === 'pyq')  return <svg {...props as any}><rect x="2.5" y="2" width="9" height="10" rx="1"/><path d="M4.5 5h5M4.5 7.5h5M4.5 10h3"/></svg>;
  if (kind === 'notes')return <svg {...props as any}><path d="M3 2.5h6l2 2v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-8a1 1 0 011-1z"/><path d="M9 2.5v2h2"/></svg>;
  if (kind === 'pencil')return <svg {...props as any}><path d="M2 12l2-.5 7.5-7.5-1.5-1.5L2.5 10 2 12z"/></svg>;
  return null;
}
