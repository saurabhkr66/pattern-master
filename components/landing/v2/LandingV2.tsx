"use client";

import { useState } from "react";
import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";
import { I } from "./icons";
import {
  QUESTIONS,
  FEATURES,
  COVERAGE,
  FAQS,
  EXAM_CHIPS,
  FOOTER_TOPICS,
  type RichPart,
  type Difficulty,
} from "./data";
import "./landing.css";

/* ---------- render mixed text arrays: ["text", {hl}, {b}] ---------- */
function RichText({ parts }: { parts: RichPart[] | string }) {
  if (typeof parts === "string") return <>{parts}</>;
  return (
    <>
      {parts.map((p, i) => {
        if (typeof p === "string") return <span key={i}>{p}</span>;
        if ("hl" in p) return <span className="hl" key={i}>{p.hl}</span>;
        if ("b" in p) return <b key={i}>{p.b}</b>;
        return null;
      })}
    </>
  );
}

/* ---------- Live Practice demo (the hero visual) ---------- */
function LivePractice() {
  const [diff, setDiff] = useState<Difficulty>("medium");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  const [qNo, setQNo] = useState(3);
  const [flash, setFlash] = useState(0);

  const q = QUESTIONS[diff][idx];
  const answered = picked !== null;
  const isRight = answered && picked === q.correct;

  const choose = (k: string) => {
    if (answered) return;
    setPicked(k);
    setScore((s) => ({ ok: s.ok + (k === q.correct ? 1 : 0), total: s.total + 1 }));
  };

  const next = () => {
    const bank = QUESTIONS[diff];
    let n = idx;
    while (bank.length > 1 && n === idx) n = Math.floor(Math.random() * bank.length);
    setIdx(n);
    setPicked(null);
    setQNo((v) => (v >= 5 ? 1 : v + 1));
    setFlash((f) => f + 1);
  };

  const changeDiff = (d: Difficulty) => {
    if (d === diff) return;
    setDiff(d);
    setIdx(0);
    setPicked(null);
    setFlash((f) => f + 1);
  };

  return (
    <div className="lp-shell">
      <div className="lp-label"><span className="eyebrow muted">Live practice session</span></div>
      <div className="lp-card">
        <div className="lp-top">
          <div className="lp-topic"><span className="d" /> {q.topic}</div>
          <div className="diff-select">
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <button
                key={d}
                className={"diff-badge diff-" + d}
                onClick={() => changeDiff(d)}
                style={d === diff ? undefined : { opacity: 0.4, filter: "grayscale(.4)" }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className={"lp-body" + (flash ? " fresh-flash" : "")} key={flash}>
          <div className="pattern-box">
            <div className="lbl"><I.spark /> Core pattern</div>
            <p>{q.pattern}</p>
          </div>
          <div className="lp-q"><RichText parts={q.q} /></div>
          <div className="opts">
            {q.options.map((o) => {
              let cls = "opt";
              if (answered) {
                if (o.k === q.correct) cls += " correct";
                else if (o.k === picked) cls += " wrong";
                else cls += " dim";
              }
              return (
                <button key={o.k} className={cls} disabled={answered} onClick={() => choose(o.k)}>
                  <span className="key">{o.k}</span>
                  <span className="txt">{o.t}</span>
                  {answered && o.k === q.correct && (
                    <span className="res" style={{ color: "var(--emerald)" }}><I.check /></span>
                  )}
                  {answered && o.k === picked && o.k !== q.correct && (
                    <span className="res" style={{ color: "var(--rose)" }}><I.x /></span>
                  )}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className={"why" + (isRight ? "" : " bad")}>
              <div className="wt">
                {isRight ? <I.checkCircle /> : <I.xCircle />}
                {isRight ? "Correct — here's why" : "Not quite — here's why"}
              </div>
              <p>{q.why}</p>
            </div>
          )}
        </div>

        <div className="lp-foot">
          {answered ? (
            <button className="lp-next" onClick={next}><I.refresh /> Fresh question</button>
          ) : (
            <div className="lp-prog">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={"seg" + (i <= qNo ? " on" : "")} />
              ))}
            </div>
          )}
          <div className="lp-meta">Question {qNo} / 5</div>
        </div>
      </div>
      <div className="score-pill">
        <I.checkCircle /> {score.ok} / {score.total || 0} correct so far
      </div>
    </div>
  );
}

/* ---------- shared CTA: real Clerk sign-up modal ---------- */
function StartFree({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <SignUpButton mode="modal">
      <button type="button" className={className}>
        {children}
      </button>
    </SignUpButton>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="pill pill-amber"><span className="dot" /> Pattern-based · GATE · JEE · NEET · UGC NET</span>
            <h1 className="display">
              Stop memorising.<br />
              <span className="grad-text">Start understanding.</span>
            </h1>
            <p className="lead">
              BattleExam teaches the <b>one core pattern</b> behind each exam topic —
              then drills it with infinite, freshly generated questions until you genuinely own it.
            </p>
            <div className="exam-chips">
              {EXAM_CHIPS.map((c) => <span key={c} className="chip">{c}</span>)}
            </div>
            <div className="hero-cta">
              <StartFree className="btn btn-primary btn-lg">
                <I.bolt /> Start free — no card needed
              </StartFree>
              <a href="#coverage" className="btn btn-ghost btn-lg">See topics <I.arrow /></a>
            </div>
            <div className="trust-row">
              {["100% free to start", "Latest syllabus", "Instant explanations", "PYQs included"].map((t) => (
                <span className="trust" key={t}><I.check /> {t}</span>
              ))}
            </div>
          </div>

          {/* Hero visual — the animated live-practice demo. */}
          <LivePractice />
        </div>
      </div>
    </section>
  );
}

/* ---------- Stats bar ---------- */
function Stats() {
  const stats: { n: React.ReactNode; l: string }[] = [
    { n: "50+", l: "Topics covered" },
    { n: "6", l: "Exams covered" },
    { n: <span className="u">∞</span>, l: "Unique questions" },
    { n: <><span className="u">₹</span>0</>, l: "To start" },
  ];
  return (
    <section className="statsbar">
      <div className="wrap">
        <div className="stats">
          {stats.map((s, i) => (
            <div className="stat" key={i}>
              <div className="num">{s.n}</div>
              <div className="lbl">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works (feedback loop) ---------- */
function HowItWorks() {
  const steps = [
    { n: "01", t: "Answer", p: "Fresh questions calibrated to your level — each one tagged to a pattern, not just a topic." },
    { n: "02", t: "Understand", p: "Instant explanation, the reasoning steps, and a link to the short-note for that exact pattern." },
    { n: "03", t: "Fix the pattern", p: "Your next session leans into the patterns you're weakest on. Drill until each is mastered." },
  ];
  const nodes = [
    { c: "n0", icon: "target", tag: "Answer" },
    { c: "n1", icon: "brain", tag: "Understand" },
    { c: "n2", icon: "bars", tag: "Fix" },
    { c: "n3", icon: "refresh", tag: "Repeat" },
  ];
  return (
    <section className="section" id="how">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">The differentiator</span>
          <h2 className="h-sec">A feedback loop that gets<br /><span className="grad-text">sharper every session.</span></h2>
          <p className="lead muted">Other tools hand you a static bank and hope. BattleExam closes the loop — every wrong answer reshapes what you see next.</p>
        </div>
        <div className="loop-wrap">
          <div className="loop-stage">
            <div className="loop-ring" />
            <div className="loop-ring r2" />
            <div className="loop-core">
              <div className="lc-inner">
                <div><b>∞</b><span>Fresh</span></div>
              </div>
            </div>
            {nodes.map((nd) => {
              const IconC = I[nd.icon];
              return (
                <div className={"loop-node " + nd.c} key={nd.c}>
                  <span className="tag">{nd.tag}</span>
                  <IconC />
                </div>
              );
            })}
          </div>
          <div className="steps">
            {steps.map((s) => (
              <div className="step" key={s.n}>
                <span className="n">{s.n}</span>
                <div>
                  <h4>{s.t}</h4>
                  <p>{s.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Features ---------- */
function Features() {
  return (
    <section className="section" id="features">
      <div className="wrap">
        <div className="sec-head center">
          <span className="eyebrow">Everything in one loop</span>
          <h2 className="h-sec">Built to crack your exam —<br />not just clear it.</h2>
        </div>
        <div className="feat-grid">
          {FEATURES.map((f) => {
            const IconC = I[f.icon];
            return (
              <div className="feat" key={f.id} style={{ "--accent": f.accent, "--tint": f.tint } as React.CSSProperties}>
                <div className="feat-head">
                  <div className="ico"><IconC /></div>
                  <h3 className="h-card">{f.title}</h3>
                </div>
                <p>{f.body}</p>
                <div className="tagline"><I.spark /> {f.tag}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Mistakes Room ---------- */
function MistakesRoom() {
  const [flipped, setFlipped] = useState(false);
  const mistakes = [
    { c: "17", t: "B+ tree leaf capacity", p: "Miscount fan-out when key > pointer size", w: 88 },
    { c: "11", t: "Master Theorem case 2", p: "Miss the extended log-band split", w: 64 },
    { c: "9", t: "Functional dependency closure", p: "Stop computing X⁺ one attribute early", w: 52 },
    { c: "6", t: "TLB vs page-fault path", p: "Confuse presence with protection", w: 34 },
  ];
  return (
    <section className="section section-tight">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">The Mistakes Room</span>
          <h2 className="h-sec">See the gaps in<br /><span className="grad-text">your reasoning.</span></h2>
          <p className="lead muted">We group wrong answers by the pattern beneath them — then turn each one into a flashcard until it&apos;s locked in.</p>
        </div>
        <div className="mistakes">
          <div className="panel">
            <span className="eyebrow muted nodot" style={{ color: "var(--rose)" }}>Mistake log · pattern analysis</span>
            <p className="muted" style={{ fontSize: 15, margin: "12px 0 0" }}>
              4 patterns account for <b style={{ color: "var(--ink)" }}>43 of your last 50</b> wrong answers.
              Fix these and your accuracy jumps.
            </p>
            <div className="mistake-list">
              {mistakes.map((m, i) => (
                <div className="mistake" key={i}>
                  <div className="cnt"><b>{m.c}</b><span>WRONG</span></div>
                  <div className="mt">
                    <b>{m.t}</b>
                    <p>{m.p}</p>
                  </div>
                  <div className="bar"><i style={{ width: m.w + "%" }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel flash-panel">
            <span className="eyebrow muted nodot" style={{ color: "var(--emerald)" }}>Flashcard review</span>
            <p className="muted" style={{ fontSize: 15, margin: "12px 0 0" }}>
              Each missed pattern becomes a card. Tap to flip — review until it&apos;s automatic.
            </p>
            <div className={"flashcard" + (flipped ? " flipped" : "")} onClick={() => setFlipped((v) => !v)}>
              <div className="flash-inner">
                <div className="flash-face">
                  <div className="ftag">Pattern · DBMS</div>
                  <div className="fq">When is a B+ tree node&apos;s order n correct?</div>
                  <div className="flash-hint"><I.rotate /> Tap to reveal the pattern</div>
                </div>
                <div className="flash-face back">
                  <div className="ftag">✓ The atomic logic</div>
                  <div className="fq">Solve for the floor.</div>
                  <div className="fa">
                    Fit it to the block: <code>n·P + (n−1)·K ≤ B</code>, then take the
                    floor of n. The off-by-one on the last key is the trap.
                  </div>
                  <div className="flash-hint"><I.rotate /> Tap to flip back</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Coverage ---------- */
function Coverage() {
  const [active, setActive] = useState(COVERAGE[0].id);
  const cur = COVERAGE.find((d) => d.id === active)!;
  return (
    <section className="section" id="coverage">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Exam coverage</span>
          <h2 className="h-sec">One system. Every<br />exam you&apos;re chasing.</h2>
        </div>
        <div className="cov-tabs">
          {COVERAGE.map((d) => (
            <button key={d.id} className={"cov-tab" + (d.id === active ? " active" : "")} onClick={() => setActive(d.id)}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="cov-panel" key={active}>
          <div className="cov-head">
            <h3>{cur.title}</h3>
            <div className="meta">
              {cur.meta.map((m, i) => <span key={i}><b>·</b> {m}</span>)}
            </div>
          </div>
          <div className="topic-grid">
            {cur.topics.map(([name, pyq], i) => (
              <span className="topic" key={i}>{name} <span className="pyq">{pyq}</span></span>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <a href={cur.pyqHref} className="btn btn-ghost">
              Practice {cur.label} previous year questions <I.arrow />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="section" id="faq">
      <div className="wrap">
        <div className="sec-head center">
          <span className="eyebrow">Questions, answered</span>
          <h2 className="h-sec">Frequently asked questions</h2>
        </div>
        <div className="faq-list">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div className={"faq" + (isOpen ? " open" : "")} key={i}>
                <button className="faq-q" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}>
                  {f.q}
                  <span className="ic"><I.plus /></span>
                </button>
                <div className="faq-a" style={{ maxHeight: isOpen ? 320 : 0 }}>
                  <div className="inner">{f.a}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */
function FinalCTA() {
  return (
    <section className="section final">
      <div className="wrap">
        <div className="final-card">
          <span className="pill pill-amber"><I.flame /> Your 2026 / 2027 prep window is now</span>
          <h2 className="h-sec">Your rank is decided by<br /><span className="grad-text">how you practise.</span></h2>
          <p className="lead muted">Top rankers don&apos;t study more — they practise smarter. BattleExam gives you the same pattern-based system, free.</p>
          <div className="final-cta">
            <StartFree className="btn btn-primary btn-lg">
              <I.bolt /> Start practising free
            </StartFree>
            <a href="#coverage" className="btn btn-ghost btn-lg">See a topic first <I.arrow /></a>
          </div>
          <div className="trust-row">
            {["Free forever", "No spam", "Instant access", "No credit card"].map((t) => (
              <span className="trust" key={t}><I.check /> {t}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <a href="#top" className="brand">
              <svg className="brand-mark" viewBox="0 0 100 125" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <g transform="translate(0, 2)">
                  <path d="M 50 2 C 22 8 8 25 8 45 L 8 75 C 8 98 30 112 50 120 L 50 2 Z" fill="var(--ink)" />
                  <path d="M 50 2 C 78 8 92 25 92 45 L 92 75 C 92 98 70 112 50 120" fill="none" stroke="#FF8F00" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 50 12 L 38 48 L 45 66 L 32 66 L 32 72 L 44 72 L 44 94 L 36 102 L 50 108 Z" fill="var(--bg)" />
                  <path d="M 50 12 L 62 48 L 55 66 L 68 66 L 68 72 L 56 72 L 56 94 L 64 102 L 50 108 Z" fill="var(--ink)" />
                  <path d="M 50 40 A 4 4 0 0 0 50 48 Z" fill="var(--ink)" />
                  <rect x="49" y="22" width="1" height="18" fill="var(--ink)" />
                  <path d="M 50 40 A 4 4 0 0 1 50 48 Z" fill="var(--bg)" />
                  <rect x="50" y="22" width="1" height="18" fill="var(--bg)" />
                </g>
              </svg>
              <span className="brand-name">Battle<b>Exam</b></span>
            </a>
            <p>Pattern-based preparation for GATE (all 8 branches), JEE Main, JEE Advanced, NEET UG and UGC NET Paper 1 &amp; 2.</p>
          </div>
          <div className="foot-cols">
            <div className="foot-col">
              <h5>GATE CSE topics</h5>
              {FOOTER_TOPICS.slice(0, 5).map((t) => <a key={t} href="#coverage">{t}</a>)}
            </div>
            <div className="foot-col">
              <h5>More topics</h5>
              {FOOTER_TOPICS.slice(5).map((t) => <a key={t} href="#coverage">{t}</a>)}
            </div>
            <div className="foot-col">
              <h5>Previous year questions</h5>
              <Link href="/gate-cse/pyq">GATE CSE PYQs</Link>
              <Link href="/jee-main/pyq">JEE Main PYQs</Link>
              <Link href="/jee-advanced/pyq">JEE Advanced PYQs</Link>
              <Link href="/neet/pyq">NEET PYQs</Link>
              <Link href="/ugc-net-p1/pyq">UGC NET PYQs</Link>
            </div>
            <div className="foot-col">
              <h5>Platform</h5>
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
              <a href="#faq">FAQ</a>
              <Link href="/for-coachings">For coachings</Link>
            </div>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 BattleExam. Built for Indian exam aspirants.</span>
          <span>Stop memorising. Start understanding.</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Root ----------
   No landing-specific header: the app's global <Header> (from the root layout)
   stays in place and handles sign-in/sign-up + the light/dark toggle. Light mode
   is keyed off the app's <html data-theme="light"> (see landing.css), so this
   landing follows whatever theme the existing header sets. */
export default function LandingV2({ fontClassName = "" }: { fontClassName?: string }) {
  return (
    <div className={`be-root ${fontClassName}`}>
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <MistakesRoom />
      <Coverage />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
