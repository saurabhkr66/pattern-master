"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MathRenderer from "@/components/ui/MathRenderer";
import { BE } from "@/lib/theme";

type SRSState = {
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: string;
  status: string;
  lastGrade: string | null;
};

type Flashcard = {
  id: string;
  question_id: string | null;
  pyq_id: string | null;
  subject_pyq_id: string | null;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic_name: string;
  subject: string;
  patternId: string;
  ispyq?: boolean;
  year?: number;
  srs: SRSState | null;
  isDue: boolean;
};

type Grade = "again" | "hard" | "good" | "easy";

type SessionCard = Flashcard & { sessionIndex: number };

const GRADE_CONFIG = [
  { key: "again" as Grade, label: "Again", shortcut: 1, sub: "<1 min",  color: BE.bad,    soft: BE.badSoft },
  { key: "hard"  as Grade, label: "Hard",  shortcut: 2, sub: "~6 min",  color: BE.warn,   soft: BE.warnSoft },
  { key: "good"  as Grade, label: "Good",  shortcut: 3, sub: "1 day",   color: BE.good,   soft: BE.goodSoft },
  { key: "easy"  as Grade, label: "Easy",  shortcut: 4, sub: "4 days",  color: BE.accent, soft: BE.accentSoft },
];

async function saveGrade(card: Flashcard, grade: Grade) {
  try {
    await fetch("/api/review/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId:    card.question_id,
        pyqId:         card.pyq_id,
        subjectPyqId:  card.subject_pyq_id,
        grade,
      }),
    });
  } catch (e) {
    console.error("Failed to save grade:", e);
  }
}

export default function FlashcardDeck({
  cards,
  dueCount = 0,
  newCount = 0,
}: {
  cards: Flashcard[];
  dueCount?: number;
  newCount?: number;
}) {
  const [queue, setQueue] = useState<SessionCard[]>(() =>
    cards.map((c, i) => ({ ...c, sessionIndex: i }))
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [graded, setGraded] = useState<{ card: SessionCard; grade: Grade }[]>([]);
  const [done, setDone] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);

  const current = queue[currentIdx];
  const total = queue.length;
  const goodCount  = graded.filter(g => g.grade === "good" || g.grade === "easy").length;
  const againCount = graded.filter(g => g.grade === "again" || g.grade === "hard").length;
  const seenCount  = graded.length;
  const estMin     = Math.ceil((total - seenCount) * 0.5);

  const flip = useCallback(() => {
    if (isAnimating || flipped) return;
    setIsAnimating(true);
    setTimeout(() => { setFlipped(true); setIsAnimating(false); }, 120);
  }, [isAnimating, flipped]);

  const grade = useCallback(async (g: Grade) => {
    if (!flipped || !current || isAnimating || savingGrade) return;

    setSavingGrade(true);
    // Fire-and-forget DB save (don't block UI)
    saveGrade(current, g).finally(() => setSavingGrade(false));

    const newGraded = [...graded, { card: current, grade: g }];
    setGraded(newGraded);

    setIsAnimating(true);
    setTimeout(() => {
      let newQueue = [...queue];
      if (g === "again") {
        // Re-inject the card 3 positions ahead
        const insertAt = Math.min(currentIdx + 3, newQueue.length);
        newQueue.splice(insertAt, 0, { ...current, sessionIndex: current.sessionIndex });
      }

      const nextIdx = currentIdx + 1;
      if (nextIdx >= newQueue.length - (g === "again" ? 1 : 0)) {
        setDone(true);
      } else {
        setCurrentIdx(nextIdx);
        setFlipped(false);
      }
      setQueue(newQueue);
      setIsAnimating(false);
    }, 150);
  }, [flipped, current, isAnimating, savingGrade, graded, queue, currentIdx]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === " " || e.key === "Enter") && !flipped) { e.preventDefault(); flip(); }
      else if (e.key === "1") grade("again");
      else if (e.key === "2") grade("hard");
      else if (e.key === "3") grade("good");
      else if (e.key === "4") grade("easy");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flip, grade, flipped]);

  /* ───────── EMPTY ───────── */
  if (cards.length === 0) {
    return (
      <div style={{ border: `1px solid ${BE.line}`, borderRadius: 16, padding: "64px 32px", textAlign: "center", background: BE.surface }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: BE.text, marginBottom: 6, fontFamily: BE.serif }}>All Clear!</div>
        <div style={{ fontSize: 14, color: BE.textDim, marginBottom: 24 }}>No wrong answers to review yet. Keep practicing!</div>
        <Link href="/practice" style={{ display: "inline-block", padding: "10px 28px", borderRadius: 10, background: BE.accent, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
          Start Practicing →
        </Link>
      </div>
    );
  }

  /* ───────── SESSION DONE ───────── */
  if (done) {
    const accuracy = graded.length > 0 ? Math.round((goodCount / graded.length) * 100) : 0;
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 11, color: BE.accent, letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Session complete · Saved to DB</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: BE.text, marginBottom: 24, fontFamily: BE.serif }}>
          You reviewed {graded.length} cards.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: BE.line, border: `1px solid ${BE.line}`, borderRadius: 12, marginBottom: 32, overflow: "hidden" }}>
          {[
            { label: "Accuracy",  val: `${accuracy}%`, color: accuracy >= 70 ? BE.good : BE.warn },
            { label: "Correct",   val: goodCount,      color: BE.good },
            { label: "Struggled", val: againCount,     color: BE.bad },
          ].map(s => (
            <div key={s.label} style={{ padding: "18px 16px", background: BE.surface, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: BE.mono }}>{s.val}</div>
              <div style={{ fontSize: 11, color: BE.textMute, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.06 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: BE.textMute, marginBottom: 24, lineHeight: 1.6 }}>
          Your progress is saved. Cards graded <span style={{ color: BE.good }}>Good</span> or <span style={{ color: BE.accent }}>Easy</span> won't appear again until they're due.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => { setQueue(cards.map((c, i) => ({ ...c, sessionIndex: i }))); setCurrentIdx(0); setFlipped(false); setGraded([]); setDone(false); }}
            style={{ padding: "10px 24px", borderRadius: 10, border: `1px solid ${BE.line}`, background: BE.surface, color: BE.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            Review again
          </button>
          <Link href="/practice" style={{ padding: "10px 24px", borderRadius: 10, background: BE.accent, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Go Practice →
          </Link>
        </div>
      </div>
    );
  }

  /* ───────── MAIN ───────── */
  const progressGoodPct  = total > 0 ? (goodCount  / total) * 100 : 0;
  const progressAgainPct = total > 0 ? (againCount / total) * 100 : 0;
  const isNew = !current.srs;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
          Spaced repetition · Flashcards
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5, margin: 0, fontFamily: BE.serif, color: BE.text }}>
            Today's review
          </h1>
          <div style={{ fontSize: 13, color: BE.textDim }}>
            <span style={{ color: BE.accent, fontWeight: 600 }}>{dueCount}</span> due ·{" "}
            <span style={{ color: BE.good, fontWeight: 600 }}>{newCount}</span> new ·{" "}
            est {estMin} min
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: BE.textDim, fontFamily: BE.mono, minWidth: 52 }}>
          {String(seenCount).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${progressGoodPct}%`,  height: "100%", background: BE.good,  transition: "width 0.4s" }} />
          <div style={{ width: `${progressAgainPct}%`, height: "100%", background: BE.bad,   transition: "width 0.4s" }} />
        </div>
        <div style={{ fontSize: 11, color: BE.textMute, display: "flex", gap: 10, flexShrink: 0 }}>
          <span><span style={{ color: BE.good }}>●</span> {goodCount}</span>
          <span><span style={{ color: BE.bad }}>●</span> {againCount}</span>
        </div>
      </div>

      {/* Card */}
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: BE.accent }}>{current.subject}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{current.topic_name}</span>
          {current.ispyq && current.year && (<><span style={{ opacity: 0.4 }}>·</span><span style={{ color: BE.warn }}>PYQ {current.year}</span></>)}
          <span style={{ flex: 1 }} />
          {isNew
            ? <span style={{ color: BE.good, fontWeight: 700 }}>NEW</span>
            : current.srs?.lastGrade && (
              <span style={{ fontFamily: BE.mono, textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>
                last: {current.srs.lastGrade} · {current.srs.repetitions}× seen
              </span>
            )
          }
        </div>

        {/* The card face */}
        <div
          onClick={() => !flipped && flip()}
          style={{
            border: `1px solid ${flipped ? BE.good + "55" : BE.line}`,
            borderRadius: 14, background: BE.surface, minHeight: 300,
            padding: "28px 28px 24px", display: "flex", flexDirection: "column",
            position: "relative", cursor: flipped ? "default" : "pointer",
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating ? "translateY(4px)" : "translateY(0)",
            transition: "opacity 0.12s, transform 0.12s, border-color 0.25s",
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 16, color: flipped ? BE.good : BE.textMute }}>
            {flipped ? "Answer" : "Question"}
          </div>

          {!flipped ? (
            <>
              <div style={{ fontSize: 17, lineHeight: 1.65, color: BE.text, fontFamily: BE.serif, flex: 1 }}>
                <MathRenderer content={current.question_text} />
              </div>
              {current.options.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 18 }}>
                  {current.options.map((opt, i) => (
                    <div key={i} style={{ padding: "7px 12px", borderRadius: 8, fontSize: 13, border: `1px solid ${BE.line}`, color: BE.textDim, background: "rgba(255,255,255,0.02)" }}>
                      <MathRenderer content={opt} />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, lineHeight: 1.4, fontWeight: 700, color: BE.text, marginBottom: 14, fontFamily: BE.mono }}>
                {current.correct_answer}
              </div>
              {current.options.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                  {current.options.map((opt, i) => {
                    const letter = opt.charAt(0).toUpperCase();
                    const isCorrect = current.correct_answer.toUpperCase().includes(letter);
                    return (
                      <div key={i} style={{ padding: "7px 12px", borderRadius: 8, fontSize: 13, border: `1px solid ${isCorrect ? BE.good + "55" : BE.line}`, color: isCorrect ? BE.good : BE.textMute, background: isCorrect ? BE.goodSoft : "transparent", display: "flex", alignItems: "center", gap: 6 }}>
                        {isCorrect && <span style={{ fontSize: 10, flexShrink: 0 }}>✓</span>}
                        <MathRenderer content={opt} />
                      </div>
                    );
                  })}
                </div>
              )}
              {current.explanation && (
                <div style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid rgba(255,255,255,0.06)`, background: "rgba(255,255,255,0.03)", fontSize: 13.5, color: BE.textDim, lineHeight: 1.65, fontFamily: BE.serif, flex: 1 }}>
                  <div style={{ fontSize: 10, color: BE.textMute, textTransform: "uppercase", letterSpacing: 0.08, fontWeight: 600, marginBottom: 8 }}>Explanation</div>
                  <MathRenderer content={current.explanation} />
                </div>
              )}
            </>
          )}

          <div style={{ position: "absolute", top: 16, right: 18, fontSize: 11, color: BE.textMute }}>
            {flipped ? "Press 1–4 to grade" : "Space to reveal"}
          </div>
          {savingGrade && (
            <div style={{ position: "absolute", bottom: 14, right: 16, fontSize: 10, color: BE.textMute }}>Saving…</div>
          )}
        </div>

        {/* Controls */}
        {flipped ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 14 }}>
            {GRADE_CONFIG.map(b => (
              <button
                key={b.key}
                onClick={() => grade(b.key)}
                disabled={savingGrade}
                style={{ border: `1px solid ${b.color}`, background: b.soft, color: b.color, padding: "12px 8px", borderRadius: 10, display: "flex", flexDirection: "column", gap: 4, alignItems: "center", cursor: "pointer", transition: "all 0.15s", opacity: savingGrade ? 0.6 : 1 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <kbd style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 15, height: 15, padding: "0 3px", border: `1px solid ${b.color}`, borderRadius: 3, background: "transparent", color: b.color, fontFamily: BE.mono, fontSize: 9, fontWeight: 700 }}>{b.shortcut}</kbd>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{b.label}</span>
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.7, fontFamily: BE.mono }}>next: {b.sub}</div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
            <button
              onClick={() => { if (currentIdx > 0) { setCurrentIdx(i => i - 1); setFlipped(false); } }}
              disabled={currentIdx === 0}
              style={{ padding: "10px 16px", borderRadius: 9, border: `1px solid ${BE.line}`, background: "transparent", color: BE.textDim, fontSize: 13, fontWeight: 500, cursor: currentIdx === 0 ? "not-allowed" : "pointer", opacity: currentIdx === 0 ? 0.4 : 1 }}
            >
              ← Prev
            </button>
            <button
              onClick={flip}
              style={{ flex: 1, padding: "11px 20px", borderRadius: 9, background: BE.accent, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", border: "none", transition: "all 0.15s" }}
            >
              Reveal answer · Space
            </button>
            <button
              onClick={() => { if (currentIdx < total - 1) { setCurrentIdx(i => i + 1); setFlipped(false); } }}
              disabled={currentIdx >= total - 1}
              style={{ padding: "10px 16px", borderRadius: 9, border: `1px solid ${BE.line}`, background: "transparent", color: BE.textDim, fontSize: 13, fontWeight: 500, cursor: currentIdx >= total - 1 ? "not-allowed" : "pointer", opacity: currentIdx >= total - 1 ? 0.4 : 1 }}
            >
              Skip →
            </button>
          </div>
        )}

        {/* Keyboard hints */}
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: BE.textMute, display: "flex", justifyContent: "center", gap: 6, alignItems: "center" }}>
          {flipped ? (
            GRADE_CONFIG.map((b, i) => (
              <span key={b.key}>
                <kbd style={{ fontFamily: BE.mono, padding: "1px 5px", border: `1px solid ${BE.line}`, borderRadius: 3 }}>{b.shortcut}</kbd>{" "}{b.label}
                {i < GRADE_CONFIG.length - 1 && <span style={{ margin: "0 4px", opacity: 0.3 }}>·</span>}
              </span>
            ))
          ) : (
            <><kbd style={{ fontFamily: BE.mono, padding: "1px 5px", border: `1px solid ${BE.line}`, borderRadius: 3 }}>Space</kbd> to reveal · <kbd style={{ fontFamily: BE.mono, padding: "1px 5px", border: `1px solid ${BE.line}`, borderRadius: 3 }}>←</kbd><kbd style={{ fontFamily: BE.mono, padding: "1px 5px", border: `1px solid ${BE.line}`, borderRadius: 3 }}>→</kbd> to navigate</>
          )}
        </div>
      </div>
    </div>
  );
}
