// Mock Test — full 7-step flow
// Step 1 Exam picker → Step 2 Branch (conditional) → Step 3 Mode → Step 4A Seeded / 4B Random
// Step 5 Pre-test brief → Step 6 Test interface → Step 7 Submit & Analysis
// Each step is a self-contained screen rendered into a desktop chrome.

// ── Top wizard rail ───────────────────────────────────────
function MTRail({ step, branchSkipped }) {
  const all = [
    { n: 1, label: 'Exam' },
    { n: 2, label: 'Branch' },
    { n: 3, label: 'Mode' },
    { n: 4, label: 'Configure' },
    { n: 5, label: 'Brief' },
    { n: 6, label: 'Test' },
    { n: 7, label: 'Analysis' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '14px 24px', borderBottom: `1px solid ${BE.line}`, background: BE.bg }}>
      {all.map((s, i) => {
        const skipped = s.n === 2 && branchSkipped;
        const active = s.n === step;
        const done = s.n < step;
        const color = active ? BE.accent : done ? BE.good : skipped ? BE.textMute : BE.textDim;
        return (
          <React.Fragment key={s.n}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, opacity: skipped ? 0.4 : 1 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, fontSize: 11, fontWeight: 600,
                fontFamily: BE.mono, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? BE.accent : done ? BE.good + '22' : 'transparent',
                color: active ? '#fff' : color,
                border: `1px solid ${active || done ? color : BE.line}`,
              }}>{done ? '✓' : skipped ? '–' : s.n}</div>
              <span style={{ fontSize: 11.5, fontWeight: 500, color, letterSpacing: 0.02 }}>{s.label}</span>
            </div>
            {i < all.length - 1 && <div style={{ flex: 1, height: 1, background: BE.line, margin: '0 10px' }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function MTPage({ children, step, branchSkipped, maxWidth = 980 }) {
  return (
    <div className="be-screen" style={{ minHeight: '100%' }}>
      <BETopNav active="Mock Test" />
      <MTRail step={step} branchSkipped={branchSkipped} />
      <div style={{ maxWidth, margin: '0 auto', padding: '32px 32px 60px' }}>{children}</div>
    </div>
  );
}

function MTHeader({ eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{eyebrow}</div>
      <h1 style={{ fontFamily: BE.serif, fontWeight: 500, fontSize: 32, letterSpacing: -0.8, margin: '0 0 6px', lineHeight: 1.1 }}>{title}</h1>
      <div style={{ fontSize: 13.5, color: BE.textDim, lineHeight: 1.5, maxWidth: 600 }}>{sub}</div>
    </div>
  );
}

// ── Step 1 — Exam catalog ─────────────────────────────────
function MTStep1({ active = 'gate' }) {
  const cats = [
    { id: 'eng', label: 'Engineering', exams: [
      { id: 'gate', name: 'GATE', sub: 'Engineering · CS, ECE, ME…', mocks: 24, diff: 'Hard', students: '12.4k', branches: true },
      { id: 'jee',  name: 'JEE',  sub: 'Main · Advanced',          mocks: 32, diff: 'Hard', students: '38.2k', branches: true },
      { id: 'isro', name: 'ISRO Sci', sub: 'Scientist Engineer',   mocks: 8,  diff: 'Hard', students: '2.1k', branches: true },
    ]},
    { id: 'med', label: 'Medical', exams: [
      { id: 'neet', name: 'NEET', sub: 'Medical UG (Phy/Chem/Bio)', mocks: 28, diff: 'Hard', students: '54.7k', branches: false },
      { id: 'pgm',  name: 'NEET PG', sub: 'Postgraduate Medical',   mocks: 12, diff: 'Hard', students: '4.2k', branches: false },
    ]},
    { id: 'gov', label: 'Government', exams: [
      { id: 'upsc', name: 'UPSC', sub: 'Civil Services Prelims',   mocks: 16, diff: 'Hard',   students: '22.8k', branches: false },
      { id: 'ssc',  name: 'SSC',  sub: 'CGL · CHSL · MTS',          mocks: 20, diff: 'Medium', students: '18.1k', branches: true },
    ]},
    { id: 'mgmt', label: 'Management & Law', exams: [
      { id: 'cat',  name: 'CAT',  sub: 'MBA admission',             mocks: 14, diff: 'Hard',   students: '9.6k', branches: false },
      { id: 'clat', name: 'CLAT', sub: 'Law UG',                    mocks: 10, diff: 'Medium', students: '3.4k', branches: false },
      { id: 'sat',  name: 'SAT',  sub: 'College Board (US)',        mocks: 18, diff: 'Medium', students: '6.8k', branches: false },
    ]},
  ];
  return (
    <MTPage step={1}>
      <MTHeader eyebrow="Step 1 of 7" title="Pick your exam." sub="All exams ship with curated mock series and a random-paper generator. Pick yours, then we'll narrow down to your branch and mode." />

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: `1px solid ${BE.line}`, borderRadius: 9, background: BE.surface, marginBottom: 22, maxWidth: 460 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={BE.textDim} strokeWidth="1.6"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
        <span style={{ fontSize: 13, color: BE.textMute }}>Search 12 exams…</span>
      </div>

      {cats.map(cat => (
        <div key={cat.id} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>{cat.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {cat.exams.map(e => {
              const sel = e.id === active;
              return (
                <div key={e.id} style={{
                  border: `1px solid ${sel ? BE.accent : BE.line}`, borderRadius: 11,
                  padding: 14, background: sel ? `linear-gradient(135deg, ${BE.accent}10, transparent)` : BE.surface,
                  cursor: 'pointer', position: 'relative',
                }}>
                  {sel && <div style={{ position: 'absolute', top: 10, right: 10, width: 16, height: 16, borderRadius: 8, background: BE.accent, color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>}
                  <div style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 600, letterSpacing: -0.5, marginBottom: 2 }}>{e.name}</div>
                  <div style={{ fontSize: 11.5, color: BE.textDim, marginBottom: 12 }}>{e.sub}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: BE.textMute, paddingTop: 10, borderTop: `1px solid ${BE.line}` }}>
                    <div><span style={{ color: BE.text, fontFamily: BE.mono, fontSize: 12, fontWeight: 600 }}>{e.mocks}</span> mocks</div>
                    <div><span style={{ color: BE.text, fontFamily: BE.mono, fontSize: 12, fontWeight: 600 }}>{e.diff}</span></div>
                    <div><span style={{ color: BE.text, fontFamily: BE.mono, fontSize: 12, fontWeight: 600 }}>{e.students}</span> taking</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, paddingTop: 18, borderTop: `1px solid ${BE.line}` }}>
        <button className="be-btn be-btn-primary" style={{ padding: '9px 18px' }}>Continue to branch →</button>
      </div>
    </MTPage>
  );
}

// ── Step 2 — Branch picker (conditional) ──────────────────
function MTStep2() {
  const branches = [
    { id: 'cs', code: 'CS', name: 'Computer Science', n: '1.3k', sel: true },
    { id: 'ec', code: 'EC', name: 'Electronics & Comm', n: '1.1k' },
    { id: 'ee', code: 'EE', name: 'Electrical Engg', n: '980' },
    { id: 'me', code: 'ME', name: 'Mechanical Engg', n: '1.2k' },
    { id: 'ce', code: 'CE', name: 'Civil Engg', n: '870' },
    { id: 'da', code: 'DA', name: 'Data Science & AI', n: '440' },
  ];
  return (
    <MTPage step={2}>
      <MTHeader eyebrow="Step 2 of 7 · GATE" title="Which paper?" sub="Pick the branch you're appearing for. The mock series and question pool are scoped to it." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {branches.map(b => (
          <div key={b.id} style={{
            border: `1px solid ${b.sel ? BE.accent : BE.line}`, borderRadius: 10,
            padding: 14, background: b.sel ? `linear-gradient(135deg, ${BE.accent}10, transparent)` : BE.surface,
            cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: b.sel ? BE.accent : 'rgba(255,255,255,0.05)',
              color: b.sel ? '#fff' : BE.textDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: BE.mono, fontSize: 13, fontWeight: 700,
            }}>{b.code}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
              <div style={{ fontSize: 11, color: BE.textMute }}>{b.n} questions · 24 mocks</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: BE.textMute, fontStyle: 'italic', fontFamily: BE.serif }}>Tip · You can change branch later from your dashboard. Your mistake log stays per-branch.</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, paddingTop: 18, borderTop: `1px solid ${BE.line}` }}>
        <button className="be-btn">← Exam</button>
        <button className="be-btn be-btn-primary" style={{ padding: '9px 18px' }}>Continue to mode →</button>
      </div>
    </MTPage>
  );
}

// ── Step 3 — Mode picker ──────────────────────────────────
function MTStep3({ branchSkipped = false }) {
  return (
    <MTPage step={3} branchSkipped={branchSkipped}>
      <MTHeader eyebrow="Step 3 of 7" title="How do you want to take it?" sub="Two ways. Both score the same, but the question selection works differently." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Mode A */}
        <div style={{ border: `2px solid ${BE.accent}`, borderRadius: 14, padding: 22, background: `linear-gradient(135deg, ${BE.accent}10, transparent)`, cursor: 'pointer', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.1, padding: '3px 7px', borderRadius: 4, background: BE.accent, color: '#fff' }}>RECOMMENDED</div>
          <div style={{ width: 40, height: 40, borderRadius: 9, background: BE.accentSoft, color: BE.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
          </div>
          <div style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, marginBottom: 4 }}>Specialized Mock</div>
          <div style={{ fontSize: 13, color: BE.textDim, lineHeight: 1.5, marginBottom: 14 }}>A curated, fixed-set paper. Same exact questions every time you take Mock #N — just like the real exam booklet.</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: BE.text }}>
            <li>✓ Mirrors exam-day pattern exactly</li>
            <li>✓ Comparable scores across attempts</li>
            <li>✓ Leaderboard &amp; percentile rank</li>
          </ul>
        </div>
        {/* Mode B */}
        <div style={{ border: `1px solid ${BE.line}`, borderRadius: 14, padding: 22, background: BE.surface, cursor: 'pointer' }}>
          <div style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(255,255,255,0.05)', color: BE.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
          </div>
          <div style={{ fontFamily: BE.serif, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, marginBottom: 4 }}>Random Test</div>
          <div style={{ fontSize: 13, color: BE.textDim, lineHeight: 1.5, marginBottom: 14 }}>System generates a fresh paper from the bank. Tune difficulty, topics, length, and time. Great for daily drilling.</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: BE.text }}>
            <li>✓ Custom difficulty &amp; topic mix</li>
            <li>✓ Choose any time / length</li>
            <li>✓ No two papers ever the same</li>
          </ul>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, paddingTop: 18, borderTop: `1px solid ${BE.line}` }}>
        <button className="be-btn">← Branch</button>
        <button className="be-btn be-btn-primary" style={{ padding: '9px 18px' }}>Continue →</button>
      </div>
    </MTPage>
  );
}

// ── Step 4A — Seeded mock list ────────────────────────────
// Specialized = past-year papers. Opaque to system: no per-subject tagging,
// only the questions, the printed paper sections (e.g. GA + Subject) and the answer key.
function MTStep4A() {
  const mocks = [
    { n: 1,  year: 2024, set: 'Set 1', status: 'taken', score: '54.6 / 100', pct: '78th', date: 'Apr 08' },
    { n: 2,  year: 2024, set: 'Set 2', status: 'taken', score: '61.3 / 100', pct: '85th', date: 'Apr 14' },
    { n: 3,  year: 2023, set: 'Set 1', status: 'open' },
    { n: 4,  year: 2023, set: 'Set 2', status: 'open' },
    { n: 5,  year: 2022, set: 'Set 1', status: 'locked' },
    { n: 6,  year: 2022, set: 'Set 2', status: 'locked' },
    { n: 7,  year: 2021, set: 'Set 1', status: 'locked' },
    { n: 8,  year: 2021, set: 'Set 2', status: 'locked' },
  ];
  return (
    <MTPage step={4} maxWidth={1100}>
      <MTHeader eyebrow="Step 4 of 7 · Specialized" title="Pick a past paper." sub="Each mock is a real previous-year GATE paper. Same questions, same order, same printed sections — just the way it appeared on exam day." />

      {/* Constraint disclosure — sets expectations early */}
      <div style={{ display: 'flex', gap: 10, padding: 12, border: `1px solid ${BE.line}`, borderRadius: 10, background: BE.surface, marginBottom: 18 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={BE.textDim} strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5M8 11v.5"/></svg>
        <div style={{ fontSize: 12, color: BE.textDim, lineHeight: 1.5 }}>
          <span style={{ color: BE.text, fontWeight: 600 }}>Past papers don't carry subject tags.</span>{' '}
          You'll get full score, percentile, time analysis and right/wrong per question — but topic-wise breakdown isn't available. After the test you can hand-tag any wrong answer to feed your mistake log. For topic analytics, take a <span style={{ color: BE.accent, fontWeight: 500 }}>Random test</span> instead.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {mocks.map(m => {
          const taken = m.status === 'taken';
          const open = m.status === 'open';
          const locked = m.status === 'locked';
          return (
            <div key={m.n} style={{
              border: `1px solid ${open ? BE.accent : BE.line}`, borderRadius: 10, padding: 14,
              background: open ? `linear-gradient(135deg, ${BE.accent}10, transparent)` : BE.surface,
              opacity: locked ? 0.45 : 1, cursor: locked ? 'not-allowed' : 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontFamily: BE.mono, fontSize: 11, color: BE.textMute, letterSpacing: 0.06, textTransform: 'uppercase', fontWeight: 600 }}>Mock #{String(m.n).padStart(2,'0')}</div>
                {taken && <span style={{ fontSize: 9.5, color: BE.good, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 700 }}>● Done</span>}
                {open && <span style={{ fontSize: 9.5, color: BE.accent, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 700 }}>● Next</span>}
                {locked && <span style={{ fontSize: 11, color: BE.textMute }}>🔒</span>}
              </div>
              <div style={{ fontFamily: BE.serif, fontSize: 17, fontWeight: 600, letterSpacing: -0.3, marginBottom: 2 }}>GATE {m.year}</div>
              <div style={{ fontSize: 11, color: BE.textDim, marginBottom: 8 }}>{m.set} · CS</div>
              {taken && (
                <div style={{ paddingTop: 8, borderTop: `1px solid ${BE.line}` }}>
                  <div style={{ fontFamily: BE.mono, fontSize: 12, fontWeight: 600 }}>{m.score}</div>
                  <div style={{ fontSize: 10.5, color: BE.textMute }}>Percentile {m.pct} · {m.date}</div>
                </div>
              )}
              {open && (
                <div style={{ paddingTop: 8, borderTop: `1px solid ${BE.line}`, fontSize: 11, color: BE.textDim }}>
                  65 Q · 3h · 100 marks
                </div>
              )}
              {locked && (
                <div style={{ paddingTop: 8, borderTop: `1px solid ${BE.line}`, fontSize: 11, color: BE.textMute }}>Take Mock #{m.n - 1} first</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, paddingTop: 18, borderTop: `1px solid ${BE.line}` }}>
        <button className="be-btn">← Mode</button>
        <button className="be-btn be-btn-primary" style={{ padding: '9px 18px' }}>Continue with GATE 2023 (Set 1) →</button>
      </div>
    </MTPage>
  );
}

// ── Step 4B — Random config ───────────────────────────────
function MTStep4B() {
  const subjects = [
    { id: 'algo', name: 'Algorithms', w: 22 },
    { id: 'ds',   name: 'Data Structures', w: 18 },
    { id: 'os',   name: 'Operating Systems', w: 14 },
    { id: 'dbms', name: 'DBMS', w: 12 },
    { id: 'cn',   name: 'Computer Networks', w: 10 },
    { id: 'toc',  name: 'Theory of Computation', w: 8 },
    { id: 'comp', name: 'Compilers', w: 8 },
    { id: 'ca',   name: 'Computer Architecture', w: 8 },
  ];
  return (
    <MTPage step={4} maxWidth={1100}>
      <MTHeader eyebrow="Step 4 of 7 · Random" title="Configure the paper." sub="Tune the difficulty mix, topic weights, length and timer. We'll generate a fresh paper from your branch's bank." />

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18 }}>
        {/* Left column: difficulty + length + time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Difficulty split */}
          <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 16, background: BE.surface }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>Difficulty mix</div>
            <div style={{ fontSize: 11.5, color: BE.textDim, marginBottom: 12 }}>Drag to adjust. Total stays at 100%.</div>
            <div style={{ display: 'flex', height: 28, borderRadius: 7, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ flex: 30, background: BE.good + '99', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#000' }}>Easy 30%</div>
              <div style={{ flex: 50, background: BE.warn + '99', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#000' }}>Medium 50%</div>
              <div style={{ flex: 20, background: BE.bad + '99',  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff' }}>Hard 20%</div>
            </div>
            <div style={{ display: 'flex', gap: 6, fontSize: 10.5, color: BE.textMute }}>
              <span>Drag handles to adjust →</span>
            </div>
          </div>

          {/* Length & time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 14, background: BE.surface }}>
              <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600 }}>Total questions</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <div style={{ fontFamily: BE.serif, fontSize: 32, fontWeight: 600 }}>65</div>
                <div style={{ fontSize: 11, color: BE.textDim }}>15–100</div>
              </div>
              <div style={{ height: 4, background: BE.line, borderRadius: 2, marginTop: 10 }}>
                <div style={{ width: '60%', height: '100%', background: BE.accent, borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 14, background: BE.surface }}>
              <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600 }}>Time limit</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <div style={{ fontFamily: BE.serif, fontSize: 32, fontWeight: 600 }}>180</div>
                <div style={{ fontSize: 11, color: BE.textDim }}>min</div>
              </div>
              <div style={{ height: 4, background: BE.line, borderRadius: 2, marginTop: 10 }}>
                <div style={{ width: '75%', height: '100%', background: BE.accent, borderRadius: 2 }} />
              </div>
            </div>
          </div>

          {/* Negative marking, etc */}
          <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 14, background: BE.surface, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Negative marking</div>
              <div style={{ fontSize: 11, color: BE.textDim, marginTop: 1 }}>−⅓ for MCQs, none for MSQ/NAT (real GATE rules)</div>
            </div>
            <div style={{ width: 30, height: 18, borderRadius: 9, background: BE.accent, position: 'relative' }}>
              <div style={{ position: 'absolute', right: 2, top: 2, width: 14, height: 14, borderRadius: 7, background: '#fff' }} />
            </div>
          </div>
        </div>

        {/* Right column: topic weights */}
        <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 16, background: BE.surface }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Topic weights</div>
              <div style={{ fontSize: 11, color: BE.textDim }}>Per-subject share of the paper</div>
            </div>
            <span style={{ flex: 1 }} />
            <button className="be-btn" style={{ padding: '4px 8px', fontSize: 10.5 }}>Auto-balance</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subjects.map(s => (
              <div key={s.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                  <span>{s.name}</span>
                  <span style={{ fontFamily: BE.mono, color: BE.textDim }}>{s.w}%</span>
                </div>
                <div style={{ height: 4, background: BE.line, borderRadius: 2 }}>
                  <div style={{ width: `${s.w * 4}%`, height: '100%', background: BE.accent, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, paddingTop: 18, borderTop: `1px solid ${BE.line}` }}>
        <button className="be-btn">← Mode</button>
        <button className="be-btn be-btn-primary" style={{ padding: '9px 18px' }}>Generate paper →</button>
      </div>
    </MTPage>
  );
}

// ── Step 5 — Pre-test brief ───────────────────────────────
function MTStep5({ kind = 'specialized' }) {
  const isSpec = kind === 'specialized';
  return (
    <MTPage step={5}>
      <MTHeader
        eyebrow={isSpec ? 'Step 5 of 7 · Past paper' : 'Step 5 of 7 · Random test'}
        title="Read this. Then begin."
        sub={isSpec
          ? 'GATE 2023 (Set 1) · CS · Specialized series. Real previous-year paper — same questions and order as exam day.'
          : 'Custom paper · CS · Generated from your tagged bank. 65 Q · 3h · Subject-tagged so you\'ll get topic analytics on submit.'}
      />

      {/* Source row — only meaningful for specialized */}
      {isSpec && (
        <div style={{ display: 'flex', gap: 10, padding: '10px 12px', border: `1px solid ${BE.line}`, borderRadius: 9, background: BE.surface, marginBottom: 14, fontSize: 12, color: BE.textDim, alignItems: 'center' }}>
          <span style={{ fontFamily: BE.mono, fontSize: 10.5, color: BE.textMute, letterSpacing: 0.06, textTransform: 'uppercase', fontWeight: 600 }}>Source</span>
          <span style={{ width: 1, height: 14, background: BE.line }} />
          <span style={{ color: BE.text }}>Official GATE 2023 paper · Set 1</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: BE.textMute, fontStyle: 'italic', fontFamily: BE.serif }}>Topic-wise analytics not available · subject tags absent</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
        {/* Pattern + marks scheme */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 16, background: BE.surface }}>
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Exam pattern</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <BriefStat label="Questions" val="65" sub="MCQ + MSQ + NAT" />
              <BriefStat label="Total marks" val="100" />
              <BriefStat label="Time" val="3h" sub="180 minutes" />
              <BriefStat label="Sections" val="2" sub="GA + Subject" />
            </div>
          </div>
          <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 16, background: BE.surface }}>
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Marking scheme</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
              <MarkRow type="MCQ"  marks="+1 / +2" neg="−⅓ / −⅔" />
              <MarkRow type="MSQ"  marks="+1 / +2" neg="No partial / no penalty" />
              <MarkRow type="NAT"  marks="+1 / +2" neg="No penalty" />
            </div>
          </div>
          <div style={{ border: `1px solid ${BE.warn}33`, borderRadius: 11, padding: 14, background: `linear-gradient(135deg, ${BE.warn}08, transparent)` }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={BE.warn} strokeWidth="1.6" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="9" cy="9" r="7.5"/><path d="M9 5v4M9 12v.5"/></svg>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>Once you start, the timer cannot be paused.</div>
                <div style={{ fontSize: 11.5, color: BE.textDim, lineHeight: 1.5 }}>Refreshing the page is fine — your answers auto-save every 8 seconds. Closing the tab will not stop the clock.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 16, background: BE.surface }}>
          <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Instructions</div>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12, color: BE.text, lineHeight: 1.5 }}>
            {[
              'Use the question palette on the right to navigate freely between questions.',
              'Mark for review (yellow) to revisit questions you\'re unsure about.',
              'Bookmarked questions stay flagged across all your future practice.',
              'For NAT questions, type the numeric answer — no negative marking applies.',
              'A virtual calculator is available from the top toolbar (Ctrl+K).',
              'You can change answers any time before final submit.',
            ].map((t, i) => (
              <li key={i} style={{ display: 'flex', gap: 9 }}>
                <span style={{ fontFamily: BE.mono, fontSize: 10.5, color: BE.accent, fontWeight: 600, minWidth: 14 }}>{String(i+1).padStart(2,'0')}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Confirm */}
      <div style={{ marginTop: 16, padding: 14, border: `1px solid ${BE.line}`, borderRadius: 11, background: BE.surface, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${BE.accent}`, background: BE.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, flexShrink: 0 }}>✓</div>
        <div style={{ fontSize: 12.5, color: BE.text }}>I have read the instructions and agree to abide by them.</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, paddingTop: 18, borderTop: `1px solid ${BE.line}` }}>
        <button className="be-btn">← Back</button>
        <button className="be-btn be-btn-primary" style={{ padding: '11px 26px', fontSize: 14 }}>Begin Mock #03 →</button>
      </div>
    </MTPage>
  );
}
function BriefStat({ label, val, sub }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: 0.06, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: BE.serif, fontSize: 24, fontWeight: 600, letterSpacing: -0.4, marginTop: 2 }}>{val}</div>
      {sub && <div style={{ fontSize: 10.5, color: BE.textDim }}>{sub}</div>}
    </div>
  );
}
function MarkRow({ type, marks, neg }) {
  return (
    <div style={{ padding: 10, border: `1px solid ${BE.line}`, borderRadius: 7 }}>
      <div style={{ fontFamily: BE.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.06, color: BE.accent, marginBottom: 4 }}>{type}</div>
      <div style={{ fontSize: 11, color: BE.text, marginBottom: 1 }}>+ {marks}</div>
      <div style={{ fontSize: 10.5, color: BE.textMute }}>{neg}</div>
    </div>
  );
}

// ── Step 6 — Test interface ───────────────────────────────
function MTStep6() {
  const palette = Array.from({ length: 65 }, (_, i) => {
    const r = (i * 71) % 5;
    return r === 0 ? 'answered' : r === 1 ? 'review' : r === 2 ? 'visited' : r === 3 ? 'answered' : 'unvisited';
  });
  palette[14] = 'current';
  const opts = [
    { k: 'A', txt: 'O(n) — every element compared once', state: null },
    { k: 'B', txt: 'O(log n) — search space halves each step', state: 'selected' },
    { k: 'C', txt: 'O(n log n) — recursive partitioning', state: null },
    { k: 'D', txt: 'O(1) — direct lookup by index', state: null },
  ];
  return (
    <div className="be-screen" style={{ minHeight: '100%', background: BE.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Top exam bar */}
      <div style={{ height: 56, borderBottom: `1px solid ${BE.line}`, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 16, background: BE.surface }}>
        <div style={{ fontFamily: BE.serif, fontSize: 16, fontWeight: 600 }}>Mock #03 · GATE CS</div>
        <div style={{ display: 'flex', gap: 2, padding: 3, background: BE.bg, borderRadius: 7, border: `1px solid ${BE.line}` }}>
          {['General Aptitude', 'Subject (CS)'].map((s, i) => (
            <div key={s} style={{ padding: '4px 10px', fontSize: 11.5, borderRadius: 5, color: i === 1 ? BE.text : BE.textDim, background: i === 1 ? 'rgba(255,255,255,0.08)' : 'transparent', cursor: 'pointer', fontWeight: 500 }}>{s}</div>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button className="be-btn" style={{ padding: '5px 10px', fontSize: 11.5 }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: 4 }}><rect x="2" y="2" width="8" height="8" rx="1"/><path d="M4 5h4M4 7h4"/></svg>
          Calculator
        </button>
        <button className="be-btn" style={{ padding: '5px 10px', fontSize: 11.5 }}>Instructions</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: BE.bad + '15', border: `1px solid ${BE.bad}33`, borderRadius: 8 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={BE.bad} strokeWidth="1.6"><circle cx="6" cy="6" r="5"/><path d="M6 3v3l2 1"/></svg>
          <span style={{ fontFamily: BE.mono, fontSize: 13, fontWeight: 600, color: BE.bad }}>1:42:18</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: 0 }}>
        {/* Question pane */}
        <div style={{ padding: '22px 28px', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: BE.mono, fontSize: 12, color: BE.textDim }}>Q 15 / 65</span>
            <span style={{ fontSize: 11, padding: '3px 7px', borderRadius: 5, background: BE.accentSoft, color: BE.accent, fontWeight: 600, letterSpacing: 0.04, textTransform: 'uppercase' }}>MCQ · 2 marks</span>
            <span style={{ fontSize: 11, color: BE.textMute }}>−0.67 if wrong</span>
            <span style={{ flex: 1 }} />
            <button className="be-btn" style={{ padding: '4px 9px', fontSize: 11 }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill={BE.warn} stroke={BE.warn} strokeWidth="1" style={{ marginRight: 4 }}><path d="M3 1v10l3-2 3 2V1z"/></svg>
              Bookmark
            </button>
            <button className="be-btn" style={{ padding: '4px 9px', fontSize: 11, background: BE.warn + '18', borderColor: BE.warn + '55', color: BE.warn }}>Mark for review</button>
          </div>

          <div style={{ fontFamily: BE.serif, fontSize: 19, lineHeight: 1.55, color: BE.text, marginBottom: 22 }}>
            Consider a sorted array A of n distinct integers. Binary search is performed for a key that is guaranteed to be present. What is the worst-case time complexity?
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
            {opts.map(o => (
              <div key={o.k} style={{
                display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 9,
                border: `1px solid ${o.state === 'selected' ? BE.accent : BE.line}`,
                background: o.state === 'selected' ? BE.accentSoft : BE.surface,
                cursor: 'pointer',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: BE.mono, fontSize: 12, fontWeight: 700,
                  background: o.state === 'selected' ? BE.accent : 'rgba(255,255,255,0.05)',
                  color: o.state === 'selected' ? '#fff' : BE.textDim,
                }}>{o.k}</div>
                <div style={{ fontSize: 14, color: BE.text, paddingTop: 3 }}>{o.txt}</div>
              </div>
            ))}
          </div>

          {/* Bottom action bar */}
          <div style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${BE.line}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="be-btn">← Previous</button>
            <button className="be-btn">Clear response</button>
            <span style={{ flex: 1 }} />
            <button className="be-btn">Save &amp; mark for review</button>
            <button className="be-btn be-btn-primary" style={{ padding: '8px 16px' }}>Save &amp; next →</button>
          </div>
        </div>

        {/* Question palette */}
        <div style={{ borderLeft: `1px solid ${BE.line}`, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14, background: BE.surface, overflow: 'auto' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: BE.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>SK</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Siddharth K.</div>
                <div style={{ fontSize: 10.5, color: BE.textMute }}>Subject · CS</div>
              </div>
            </div>
          </div>

          {/* Counts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 11 }}>
            <PalCount n="22" l="Answered" c={BE.good} />
            <PalCount n="9"  l="Review" c={BE.warn} />
            <PalCount n="6"  l="Visited" c={BE.textDim} />
            <PalCount n="28" l="Not visited" c={BE.textMute} />
          </div>

          {/* Grid */}
          <div>
            <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>All questions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {palette.map((s, i) => (
                <div key={i} style={{
                  height: 28, borderRadius: 5, fontFamily: BE.mono, fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  background:
                    s === 'current' ? BE.accent :
                    s === 'answered' ? BE.good + '38' :
                    s === 'review' ? BE.warn + '38' :
                    s === 'visited' ? 'rgba(255,255,255,0.08)' :
                    'transparent',
                  border: `1px solid ${
                    s === 'current' ? BE.accent :
                    s === 'answered' ? BE.good + '88' :
                    s === 'review' ? BE.warn + '88' :
                    BE.line
                  }`,
                  color: s === 'current' ? '#fff' : s === 'answered' ? BE.good : s === 'review' ? BE.warn : BE.textDim,
                }}>{i + 1}</div>
              ))}
            </div>
          </div>

          <span style={{ flex: 1 }} />
          <button className="be-btn be-btn-primary" style={{ padding: '10px 12px', fontSize: 13, justifyContent: 'center', display: 'flex' }}>Submit test</button>
        </div>
      </div>
    </div>
  );
}
function PalCount({ n, l, c }) {
  return (
    <div style={{ padding: '6px 8px', border: `1px solid ${BE.line}`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: c }} />
      <span style={{ fontFamily: BE.mono, fontWeight: 600, fontSize: 12 }}>{n}</span>
      <span style={{ color: BE.textDim, fontSize: 10.5 }}>{l}</span>
    </div>
  );
}

// ── Step 7 — Submit & analysis (Random — full subject analytics) ──
function MTStep7Random() {
  return (
    <MTPage step={7} maxWidth={1200}>
      <MTHeader eyebrow="Step 7 of 7 · Random test · Submitted" title={<>Score · <em style={{ fontStyle: 'italic', color: BE.accent }}>62.3</em> / 100</>} sub="65 questions, custom mix · Better than your last random attempt by +7.6 marks. Topic-level analytics are available because this paper was generated from your tagged bank." />

      {/* Hero stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
        <AnaStat label="Score" val="62.3" unit="/100" tone={BE.accent} />
        <AnaStat label="Percentile" val="89th" sub="of 4,217 takers" />
        <AnaStat label="Accuracy" val="74%" sub="answered correctly" />
        <AnaStat label="Time used" val="2h 41m" sub="of 3h" />
        <AnaStat label="Rank" val="#463" sub="in your branch" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        {/* Section breakdown */}
        <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 16, background: BE.surface }}>
          <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Per-section performance</div>
          {[
            { name: 'General Aptitude', got: 13, total: 15, time: '18m', acc: 86 },
            { name: 'Algorithms',       got: 9, total: 12, time: '32m', acc: 75 },
            { name: 'Data Structures',  got: 7, total: 10, time: '24m', acc: 70 },
            { name: 'Operating Systems',got: 5, total: 8,  time: '19m', acc: 62 },
            { name: 'DBMS',             got: 4, total: 8,  time: '21m', acc: 50 },
            { name: 'Networks',         got: 6, total: 7,  time: '13m', acc: 85 },
            { name: 'Theory of Comp.',  got: 2, total: 5,  time: '14m', acc: 40 },
          ].map(r => {
            const tone = r.acc >= 80 ? BE.good : r.acc >= 60 ? BE.warn : BE.bad;
            return (
              <div key={r.name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>{r.name}</span>
                  <span style={{ display: 'flex', gap: 12, color: BE.textDim, fontFamily: BE.mono, fontSize: 11.5 }}>
                    <span>{r.got}/{r.total}</span>
                    <span>{r.time}</span>
                    <span style={{ color: tone, fontWeight: 600 }}>{r.acc}%</span>
                  </span>
                </div>
                <div style={{ height: 6, background: BE.line, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${r.acc}%`, height: '100%', background: tone }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparative + time chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 16, background: BE.surface }}>
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Vs. cohort</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <CompareRow label="You" val={62.3} max={100} c={BE.accent} />
              <CompareRow label="Topper" val={91.0} max={100} c={BE.good} />
              <CompareRow label="Top 10%" val={78.4} max={100} c={BE.text} />
              <CompareRow label="Average" val={48.7} max={100} c={BE.textDim} />
            </div>
          </div>
          <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 16, background: BE.surface, flex: 1 }}>
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Time per question</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
              {Array.from({ length: 32 }).map((_, i) => {
                const h = 18 + ((i * 53) % 60);
                const slow = h > 60;
                return <div key={i} style={{ flex: 1, height: h, borderRadius: 1, background: slow ? BE.bad + '88' : BE.accent + '88' }} />;
              })}
            </div>
            <div style={{ fontSize: 10.5, color: BE.textMute, marginTop: 6 }}><span style={{ color: BE.bad }}>■</span> 6 questions took &gt;3 min · drilled in mistake log</div>
          </div>
        </div>
      </div>

      {/* Per-question table preview */}
      <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, marginTop: 14, background: BE.surface, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${BE.line}` }}>
          <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600 }}>Question-wise breakdown · 65</div>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 2, background: BE.bg, padding: 2, borderRadius: 6, border: `1px solid ${BE.line}` }}>
            {['All', 'Wrong', 'Slow', 'Skipped'].map((x, i) => (
              <div key={x} style={{ padding: '3px 9px', fontSize: 11, borderRadius: 4, color: i === 0 ? BE.text : BE.textDim, background: i === 0 ? 'rgba(255,255,255,0.08)' : 'transparent', cursor: 'pointer' }}>{x}</div>
            ))}
          </div>
        </div>
        {[
          { n: 14, sec: 'DBMS', q: 'Secondary B+ tree of order 4 with\u2026', verdict: 'wrong', got: 'B', ans: 'C', t: '4m 12s', m: '\u22120.67' },
          { n: 22, sec: 'Algo', q: 'Backtracking pruning function is\u2026', verdict: 'correct', got: 'B', ans: 'B', t: '52s', m: '+2' },
          { n: 31, sec: 'OS',   q: 'SJF scheduling tie-break with\u2026',   verdict: 'wrong', got: 'A', ans: 'D', t: '3m 41s', m: '\u22120.33' },
          { n: 47, sec: 'TOC',  q: 'CFG to PDA conversion of\u2026',         verdict: 'skipped', got: '\u2014', ans: 'A', t: '\u2014', m: '0' },
        ].map(r => {
          const tone = r.verdict === 'correct' ? BE.good : r.verdict === 'wrong' ? BE.bad : BE.textMute;
          return (
            <div key={r.n} style={{ display: 'grid', gridTemplateColumns: '40px 80px 1fr 70px 70px 60px 70px', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: `1px solid ${BE.line}`, fontSize: 12 }}>
              <span style={{ fontFamily: BE.mono, color: BE.textDim }}>#{String(r.n).padStart(2,'0')}</span>
              <span style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: 0.06, textTransform: 'uppercase', fontWeight: 600 }}>{r.sec}</span>
              <span style={{ color: BE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.q}</span>
              <span style={{ fontFamily: BE.mono, fontSize: 11, color: tone, fontWeight: 600 }}>{r.verdict.toUpperCase()}</span>
              <span style={{ fontFamily: BE.mono, fontSize: 11, color: BE.textDim }}>{r.got} → {r.ans}</span>
              <span style={{ fontFamily: BE.mono, fontSize: 11, color: BE.textDim }}>{r.t}</span>
              <span style={{ fontFamily: BE.mono, fontSize: 11, fontWeight: 600, color: tone }}>{r.m}</span>
            </div>
          );
        })}
      </div>

      {/* Next actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
        {[
          { ic: '◆', t: 'Add 9 wrong questions to mistake log', s: 'Auto-grouped into 3 patterns', cta: 'Review patterns →' },
          { ic: '⏱', t: 'Drill 6 slow questions', s: 'Avg 3:41 · cohort 1:48', cta: 'Speed practice →' },
          { ic: '★', t: 'Take Mock #04', s: 'Unlocked · same series', cta: 'Start →' },
        ].map((a, i) => (
          <div key={i} style={{ border: `1px solid ${BE.line}`, borderRadius: 10, padding: 14, background: BE.surface, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: BE.accentSoft, color: BE.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>{a.ic}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.t}</div>
              <div style={{ fontSize: 11, color: BE.textDim, marginTop: 2 }}>{a.s}</div>
              <div style={{ marginTop: 8, fontSize: 11.5, color: BE.accent, fontWeight: 500, cursor: 'pointer' }}>{a.cta}</div>
            </div>
          </div>
        ))}
      </div>
    </MTPage>
  );
}
function AnaStat({ label, val, unit, sub, tone }) {
  return (
    <div style={{ border: `1px solid ${BE.line}`, borderRadius: 10, padding: 14, background: BE.surface }}>
      <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: 0.06, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <div style={{ fontFamily: BE.serif, fontSize: 28, fontWeight: 600, letterSpacing: -0.5, color: tone || BE.text }}>{val}</div>
        {unit && <div style={{ fontSize: 12, color: BE.textMute }}>{unit}</div>}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: BE.textDim, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}
function CompareRow({ label, val, max, c }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ fontFamily: BE.mono, color: c, fontWeight: 600 }}>{val.toFixed(1)}</span>
      </div>
      <div style={{ height: 5, background: BE.line, borderRadius: 3 }}>
        <div style={{ width: `${(val / max) * 100}%`, height: '100%', background: c, borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── Step 7 — Specialized variant ──────────────────────────
// Past papers: only paper-level structure (GA + Subject). No subject taxonomy
// because the question-set isn't tagged. Users can hand-tag wrong answers
// to feed their mistake log.
function MTStep7Specialized() {
  const wrongRows = [
    { n: 14, q: 'Consider a B+ tree of order 4 storing secondary indices on a relation of 10⁶ tuples…', got: 'B', ans: 'C', t: '4m 12s', m: '−0.67', tagged: null, sec: 'Subject' },
    { n: 22, q: 'A backtracking algorithm prunes the search space when the partial solution…', got: 'B', ans: 'B', t: '52s', m: '+2', verdict: 'correct', sec: 'Subject' },
    { n: 31, q: 'In SJF scheduling with the following arrival/burst times, average waiting time is…', got: 'A', ans: 'D', t: '3m 41s', m: '−0.33', tagged: 'Operating Systems', sec: 'Subject' },
    { n: 47, q: 'Convert the following context-free grammar to a pushdown automaton accepting by…', got: '—', ans: 'A', t: '—', m: '0', verdict: 'skipped', sec: 'Subject' },
    { n: 53, q: 'Two trains 120 m and 180 m long approach each other on parallel tracks at speeds…', got: 'A', ans: 'B', t: '2m 04s', m: '−0.33', tagged: null, sec: 'GA', tagOpen: true },
  ];
  const tagOptions = ['Algorithms', 'Data Structures', 'Operating Systems', 'DBMS', 'Networks', 'Theory of Computation', 'Compilers', 'Computer Architecture', 'General Aptitude', 'Discrete Math', 'Engineering Math'];

  return (
    <MTPage step={7} maxWidth={1200}>
      <MTHeader
        eyebrow="Step 7 of 7 · Past paper · Submitted"
        title={<>GATE 2023 (Set 1) · <em style={{ fontStyle: 'italic', color: BE.accent }}>62.3</em> / 100</>}
        sub="Past papers don't carry our subject tags, so topic-level analytics aren't shown. Hand-tag any wrong answer below to feed your mistake log and dashboard recommendations."
      />

      {/* Hero stats — same as Random */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
        <AnaStat label="Score" val="62.3" unit="/100" tone={BE.accent} />
        <AnaStat label="Percentile" val="89th" sub="of 4,217 takers" />
        <AnaStat label="Accuracy" val="74%" sub="answered correctly" />
        <AnaStat label="Time used" val="2h 41m" sub="of 3h" />
        <AnaStat label="Rank" val="#463" sub="in your branch" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        {/* Paper-level sections + locked subject card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 16, background: BE.surface }}>
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Paper sections</div>
            {[
              { name: 'General Aptitude', got: 13, total: 15, time: '18m', acc: 86, marks: '13 / 15' },
              { name: 'Subject (CS)',     got: 33, total: 50, time: '2h 23m', acc: 66, marks: '49.3 / 85' },
            ].map(r => {
              const tone = r.acc >= 80 ? BE.good : r.acc >= 60 ? BE.warn : BE.bad;
              return (
                <div key={r.name} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                    <span style={{ display: 'flex', gap: 14, color: BE.textDim, fontFamily: BE.mono, fontSize: 11.5 }}>
                      <span>{r.marks}</span>
                      <span>{r.got}/{r.total} Q</span>
                      <span>{r.time}</span>
                      <span style={{ color: tone, fontWeight: 600 }}>{r.acc}%</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: BE.line, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${r.acc}%`, height: '100%', background: tone }} />
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: BE.textMute, fontStyle: 'italic', fontFamily: BE.serif, paddingTop: 4 }}>
              Past papers print only these two divisions. We don't have finer subject metadata.
            </div>
          </div>

          {/* Subject-breakdown empty state */}
          <div style={{ border: `1px dashed ${BE.line}`, borderRadius: 11, padding: 16, background: 'transparent' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(255,255,255,0.04)', color: BE.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="10" height="10" rx="1.5"/><path d="M5 5l4 4M9 5l-4 4"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Topic-wise analytics unavailable</div>
                <div style={{ fontSize: 11.5, color: BE.textDim, lineHeight: 1.5, marginTop: 2 }}>This is a real past-year paper. The questions don't carry our subject tags, so we can't tell which topic each one belongs to. Want a topic breakdown? Take a <span style={{ color: BE.accent, fontWeight: 500 }}>Random test</span> — those are generated from your tagged bank.</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                  <button className="be-btn" style={{ padding: '5px 10px', fontSize: 11.5 }}>Take a Random test →</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparative + time chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 16, background: BE.surface }}>
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Vs. cohort (this paper)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <CompareRow label="You" val={62.3} max={100} c={BE.accent} />
              <CompareRow label="GATE 2023 cutoff" val={32.5} max={100} c={BE.warn} />
              <CompareRow label="Top 10% on platform" val={78.4} max={100} c={BE.good} />
              <CompareRow label="Cohort average" val={48.7} max={100} c={BE.textDim} />
            </div>
          </div>
          <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, padding: 16, background: BE.surface, flex: 1 }}>
            <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Time per question</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
              {Array.from({ length: 32 }).map((_, i) => {
                const h = 18 + ((i * 53) % 60);
                const slow = h > 60;
                return <div key={i} style={{ flex: 1, height: h, borderRadius: 1, background: slow ? BE.bad + '88' : BE.accent + '88' }} />;
              })}
            </div>
            <div style={{ fontSize: 10.5, color: BE.textMute, marginTop: 6 }}><span style={{ color: BE.bad }}>■</span> 6 questions took &gt;3 min</div>
          </div>
        </div>
      </div>

      {/* Per-question table — with manual tagging */}
      <div style={{ border: `1px solid ${BE.line}`, borderRadius: 11, marginTop: 14, background: BE.surface, overflow: 'visible' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${BE.line}` }}>
          <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600 }}>Question-wise breakdown · 65</div>
          <span style={{ flex: 1 }} />
          <div style={{ fontSize: 11, color: BE.textDim, marginRight: 10 }}>
            <span style={{ color: BE.warn, fontWeight: 600 }}>9 wrong</span> · <span style={{ color: BE.text }}>1 of 9 tagged</span>
          </div>
          <div style={{ display: 'flex', gap: 2, background: BE.bg, padding: 2, borderRadius: 6, border: `1px solid ${BE.line}` }}>
            {['All', 'Wrong', 'Slow', 'Skipped', 'Untagged'].map((x, i) => (
              <div key={x} style={{ padding: '3px 9px', fontSize: 11, borderRadius: 4, color: i === 1 ? BE.text : BE.textDim, background: i === 1 ? 'rgba(255,255,255,0.08)' : 'transparent', cursor: 'pointer' }}>{x}</div>
            ))}
          </div>
        </div>

        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 60px 1fr 70px 70px 70px 60px 170px', alignItems: 'center', gap: 12, padding: '8px 14px', borderBottom: `1px solid ${BE.line}`, fontSize: 10, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600 }}>
          <span>Q#</span><span>Section</span><span>Question</span><span>Result</span><span>Your → Ans</span><span>Time</span><span>Marks</span><span>Subject (you tag)</span>
        </div>

        {wrongRows.map((r, idx) => {
          const verdict = r.verdict || (r.got === '—' ? 'skipped' : r.got === r.ans ? 'correct' : 'wrong');
          const tone = verdict === 'correct' ? BE.good : verdict === 'wrong' ? BE.bad : BE.textMute;
          return (
            <div key={r.n} style={{ display: 'grid', gridTemplateColumns: '40px 60px 1fr 70px 70px 70px 60px 170px', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: idx === 0 ? 'none' : `1px solid ${BE.line}`, fontSize: 12, position: 'relative' }}>
              <span style={{ fontFamily: BE.mono, color: BE.textDim }}>#{String(r.n).padStart(2,'0')}</span>
              <span style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: 0.06, textTransform: 'uppercase', fontWeight: 600 }}>{r.sec}</span>
              <span style={{ color: BE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.q}</span>
              <span style={{ fontFamily: BE.mono, fontSize: 11, color: tone, fontWeight: 600 }}>{verdict.toUpperCase()}</span>
              <span style={{ fontFamily: BE.mono, fontSize: 11, color: BE.textDim }}>{r.got} → {r.ans}</span>
              <span style={{ fontFamily: BE.mono, fontSize: 11, color: BE.textDim }}>{r.t}</span>
              <span style={{ fontFamily: BE.mono, fontSize: 11, fontWeight: 600, color: tone }}>{r.m}</span>
              {/* Subject cell */}
              <div style={{ position: 'relative' }}>
                {verdict === 'correct' ? (
                  <span style={{ fontSize: 11, color: BE.textMute, fontStyle: 'italic' }}>—</span>
                ) : r.tagged ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 7px 3px 8px', borderRadius: 4, background: BE.accentSoft, color: BE.accent, fontSize: 11, fontWeight: 500 }}>
                    {r.tagged}
                    <span style={{ color: BE.accent, opacity: 0.6, cursor: 'pointer', fontSize: 12 }}>×</span>
                  </span>
                ) : (
                  <button style={{ padding: '4px 9px', fontSize: 11, fontWeight: 500, background: r.tagOpen ? BE.accent : 'transparent', color: r.tagOpen ? '#fff' : BE.accent, border: `1px solid ${r.tagOpen ? BE.accent : BE.accent + '66'}`, borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>+ Tag subject</button>
                )}
                {/* Open dropdown for one row */}
                {r.tagOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 220, background: BE.surface, border: `1px solid ${BE.lineHi}`, borderRadius: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.4)', zIndex: 5, padding: 6 }}>
                    <div style={{ padding: '6px 8px', fontSize: 10.5, color: BE.textMute, letterSpacing: 0.06, textTransform: 'uppercase', fontWeight: 600 }}>Pick a subject</div>
                    {tagOptions.map((opt, i) => (
                      <div key={opt} style={{
                        padding: '6px 8px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
                        background: i === 8 ? BE.accentSoft : 'transparent',
                        color: i === 8 ? BE.accent : BE.text, fontWeight: i === 8 ? 600 : 400,
                      }}>{opt}{i === 8 && <span style={{ float: 'right', fontSize: 10 }}>↵</span>}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ padding: '11px 14px', borderTop: `1px solid ${BE.line}`, fontSize: 11.5, color: BE.textDim, textAlign: 'center' }}>
          + 60 more questions · <span className="be-link">expand all</span>
        </div>
      </div>

      {/* Next actions — specialized flavor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
        {[
          { ic: '◆', t: 'Tag your 8 untagged wrongs', s: 'Untagged answers don\'t reach the mistake log', cta: 'Tag now →', tone: BE.warn },
          { ic: '⏱', t: 'Drill 6 slow questions', s: 'Avg 3:41 · cohort 1:48', cta: 'Speed practice →' },
          { ic: '★', t: 'Try GATE 2023 Set 2', s: 'Same year, different paper', cta: 'Start →' },
        ].map((a, i) => (
          <div key={i} style={{ border: `1px solid ${a.tone || BE.line}`, borderRadius: 10, padding: 14, background: a.tone ? `linear-gradient(135deg, ${a.tone}10, transparent)` : BE.surface, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: (a.tone || BE.accent) + '20', color: a.tone || BE.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>{a.ic}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.t}</div>
              <div style={{ fontSize: 11, color: BE.textDim, marginTop: 2 }}>{a.s}</div>
              <div style={{ marginTop: 8, fontSize: 11.5, color: a.tone || BE.accent, fontWeight: 500, cursor: 'pointer' }}>{a.cta}</div>
            </div>
          </div>
        ))}
      </div>
    </MTPage>
  );
}
