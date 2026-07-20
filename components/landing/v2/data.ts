/* BattleExam landing content — ported from the design prototype.
   NOTE: Coverage topic counts (e.g. "240+") are placeholder figures from the
   design and should be replaced with real numbers before relying on them. */

export type RichPart = string | { hl: string } | { b: string };
export type Option = { k: string; t: string };

export type Question = {
  topic: string;
  pattern: string;
  q: RichPart[];
  options: Option[];
  correct: string;
  why: string;
};

export type Difficulty = "easy" | "medium" | "hard";

export const QUESTIONS: Record<Difficulty, Question[]> = {
  easy: [
    {
      topic: "Data Structures · Arrays",
      pattern: "Random access = base address + index × element-size — a single arithmetic step, no traversal.",
      q: ["Accessing ", { hl: "a[i]" }, " in an array of n elements takes how long?"],
      options: [
        { k: "A", t: "O(n)" },
        { k: "B", t: "O(log n)" },
        { k: "C", t: "O(1)" },
        { k: "D", t: "O(n log n)" },
      ],
      correct: "C",
      why: "The address is computed directly as base + i × size, so it never depends on n. That's why arrays beat linked lists for indexed reads.",
    },
    {
      topic: "Operating Systems · Memory",
      pattern: "A page fault is about presence, not protection — the page is valid but simply not in RAM yet.",
      q: ["A ", { hl: "page fault" }, " occurs when a referenced page is…"],
      options: [
        { k: "A", t: "valid but not in physical memory" },
        { k: "B", t: "outside the process address space" },
        { k: "C", t: "marked read-only" },
        { k: "D", t: "already in the TLB" },
      ],
      correct: "A",
      why: "The page exists in the process's logical space but isn't loaded in a frame, so the OS fetches it from disk. An invalid reference instead raises a segmentation fault.",
    },
    {
      topic: "DBMS · SQL",
      pattern: "Aggregate-with-grouping: filtering on an aggregate must use HAVING, never WHERE.",
      q: ["To filter ", { hl: "groups" }, " by an aggregate result, you use…"],
      options: [
        { k: "A", t: "WHERE" },
        { k: "B", t: "HAVING" },
        { k: "C", t: "ORDER BY" },
        { k: "D", t: "DISTINCT" },
      ],
      correct: "B",
      why: "WHERE filters rows before grouping and can't see aggregates. HAVING runs after GROUP BY, so it can test COUNT, SUM, AVG and friends.",
    },
  ],
  medium: [
    {
      topic: "Algorithms · Merge Sort",
      pattern: "Divide-and-conquer recurrence: cost = 2 sub-problems of n/2 + a linear merge.",
      q: ["What is the recurrence relation for ", { hl: "Merge Sort" }, " on n elements?"],
      options: [
        { k: "A", t: "T(n) = T(n/2) + O(1)" },
        { k: "B", t: "T(n) = 2T(n/2) + O(n)" },
        { k: "C", t: "T(n) = T(n−1) + O(n)" },
        { k: "D", t: "T(n) = 4T(n/4) + O(n²)" },
      ],
      correct: "B",
      why: "Merge Sort splits into 2 sub-problems of size n/2 (→ 2T(n/2)) and merges in O(n), giving O(n log n) overall by the Master Theorem.",
    },
    {
      topic: "DBMS · Normalisation",
      pattern: "BCNF test: for every non-trivial FD X→Y, the left side X must be a superkey.",
      q: ["A relation is in ", { hl: "BCNF" }, " if for every non-trivial FD X→Y, X is a…"],
      options: [
        { k: "A", t: "candidate key only" },
        { k: "B", t: "prime attribute" },
        { k: "C", t: "superkey" },
        { k: "D", t: "foreign key" },
      ],
      correct: "C",
      why: "BCNF requires the determinant of every non-trivial dependency to be a superkey. 3NF relaxes this when Y is a prime attribute — which is the exact line examiners test.",
    },
    {
      topic: "Operating Systems · Concurrency",
      pattern: "Deadlock needs all four Coffman conditions at once — break any one and it can't form.",
      q: ["Which is ", { hl: "NOT" }, " a necessary condition for deadlock?"],
      options: [
        { k: "A", t: "Mutual exclusion" },
        { k: "B", t: "Hold and wait" },
        { k: "C", t: "Preemption" },
        { k: "D", t: "Circular wait" },
      ],
      correct: "C",
      why: "Deadlock requires NO preemption. The four conditions are mutual exclusion, hold-and-wait, no preemption and circular wait — option C names the opposite of one.",
    },
  ],
  hard: [
    {
      topic: "DBMS · B+ Tree Indexing",
      pattern: "Order from a disk block: solve (n−1)·key + n·pointer ≤ block size for the max n.",
      q: ["A B+ tree node fits in a 1 KB block; keys are 10 B, pointers 8 B. Max ", { hl: "order n" }, "?"],
      options: [
        { k: "A", t: "n = 50" },
        { k: "B", t: "n = 56" },
        { k: "C", t: "n = 63" },
        { k: "D", t: "n = 64" },
      ],
      correct: "B",
      why: "Need n·8 + (n−1)·10 ≤ 1024 → 18n − 10 ≤ 1024 → n ≤ 57.4. Taking the floor gives n = 56. Off-by-one here is the classic Hard-mode trap.",
    },
    {
      topic: "Algorithms · Master Theorem",
      pattern: "Compare n^(log_b a) against f(n); the larger side decides the asymptotic class.",
      q: ["For ", { hl: "T(n) = 2T(n/2) + n log n" }, ", the solution is…"],
      options: [
        { k: "A", t: "O(n log n)" },
        { k: "B", t: "O(n log² n)" },
        { k: "C", t: "O(n²)" },
        { k: "D", t: "O(n log log n)" },
      ],
      correct: "B",
      why: "Here n^(log_b a) = n, and f(n) = n log n sits in the extended case-2 band. The result is O(n·log²n) — the squared log is the detail that separates ranks.",
    },
    {
      topic: "Theory of Computation · Pumping",
      pattern: "Use the pumping lemma contrapositive: find one string that can't be pumped to prove non-regularity.",
      q: ["The language ", { hl: "{ aⁿbⁿ | n ≥ 0 }" }, " is…"],
      options: [
        { k: "A", t: "regular" },
        { k: "B", t: "context-free but not regular" },
        { k: "C", t: "context-sensitive only" },
        { k: "D", t: "not a language" },
      ],
      correct: "B",
      why: "It fails the pumping lemma for regular languages (you can't keep a's and b's balanced), but a single-stack PDA accepts it — so it's context-free, not regular.",
    },
  ],
};

export const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

export type Feature = {
  id: string;
  icon: string;
  accent: string;
  tint: string;
  title: string;
  body: string;
  tag: string;
};

export const FEATURES: Feature[] = [
  {
    id: "pattern",
    icon: "brain",
    accent: "var(--amber-bright)",
    tint: "rgba(245,158,11,.18)",
    title: "Pattern-first learning",
    body: "We don't dump questions at you. We teach the one mental model each exam topic tests — the atomic logic — then reinforce it with targeted drills.",
    tag: "The core differentiator",
  },
  {
    id: "infinite",
    icon: "bolt",
    accent: "var(--amber-bright)",
    tint: "rgba(245,158,11,.18)",
    title: "Infinite fresh questions",
    body: "Every session is new. Questions are AI-generated on the spot with distractors that mirror real exam misdirection — nothing repeats, nothing is memorised.",
    tag: "Never the same paper twice",
  },
  {
    id: "adaptive",
    icon: "sliders",
    accent: "var(--rose)",
    tint: "rgba(244,63,94,.18)",
    title: "Adaptive Easy → Hard",
    body: "Build confidence on Easy, then push to Hard when you're ready. Hard mode is genuinely top-rank level — calibrated to real scoring, never artificially inflated.",
    tag: "Hard = top-rank calibre",
  },
  {
    id: "mistakes",
    icon: "cards",
    accent: "var(--emerald)",
    tint: "rgba(16,185,129,.18)",
    title: "The Mistakes Room",
    body: "Wrong answers don't vanish. They flow into a flashcard-style review that targets your exact weak patterns until each one is locked in.",
    tag: "Review what you missed",
  },
  {
    id: "pyq",
    icon: "archive",
    accent: "var(--amber-bright)",
    tint: "rgba(245,158,11,.18)",
    title: "Real PYQ bank",
    body: "Actual Previous-Year Questions tagged by topic and year, so you can cross-check your practice against how the exam has really framed each pattern.",
    tag: "Tagged by topic & year",
  },
  {
    id: "mock",
    icon: "timer",
    accent: "var(--emerald)",
    tint: "rgba(16,185,129,.18)",
    title: "Full-length mock tests",
    body: "Sit the real exam interface — same layout, same timer, same pressure — then get an instant breakdown of accuracy, speed and weak patterns.",
    tag: "Real interface · instant analysis",
  },
];

export type CoverageTab = {
  id: string;
  label: string;
  title: string;
  meta: string[];
  topics: [string, string][];
  // PYQ landing page for this exam — keyword-anchored internal link for SEO
  pyqHref: string;
};

export const COVERAGE: CoverageTab[] = [
  {
    id: "gate",
    label: "GATE",
    title: "GATE — all 8 branches",
    meta: ["8 branches", "50+ topics", "PYQs 2010 → 2025"],
    pyqHref: "/gate-cse/pyq",
    topics: [
      ["Algorithms", "240+"], ["Data Structures", "180+"], ["Operating Systems", "160+"],
      ["DBMS", "150+"], ["Computer Networks", "140+"], ["Theory of Computation", "120+"],
      ["Compiler Design", "90+"], ["Digital Logic", "110+"], ["Computer Organisation", "130+"],
      ["Discrete Maths", "200+"], ["Engineering Maths", "170+"], ["Aptitude", "140+"],
    ],
  },
  {
    id: "jee-main",
    label: "JEE Main",
    title: "JEE Main — PCM",
    meta: ["3 subjects", "Class XI + XII", "Pattern-tagged"],
    pyqHref: "/jee-main/pyq",
    topics: [
      ["Mechanics", "210+"], ["Electrostatics", "150+"], ["Modern Physics", "120+"],
      ["Organic Chemistry", "190+"], ["Physical Chemistry", "170+"], ["Inorganic Chemistry", "140+"],
      ["Calculus", "200+"], ["Coordinate Geometry", "130+"], ["Algebra", "160+"],
    ],
  },
  {
    id: "jee-adv",
    label: "JEE Advanced",
    title: "JEE Advanced — top-rank tier",
    meta: ["Multi-concept", "Hard-mode default", "Real exam timing"],
    pyqHref: "/jee-advanced/pyq",
    topics: [
      ["Rotational Dynamics", "Hard"], ["Thermodynamics", "Hard"], ["Electromagnetism", "Hard"],
      ["Reaction Mechanisms", "Hard"], ["Equilibrium", "Hard"], ["Coordination Chem.", "Hard"],
      ["Definite Integrals", "Hard"], ["Vectors & 3D", "Hard"], ["Probability", "Hard"],
    ],
  },
  {
    id: "neet",
    label: "NEET",
    title: "NEET UG — Biology-heavy",
    meta: ["Bio · Phy · Chem", "NCERT-aligned", "PYQs included"],
    pyqHref: "/neet/pyq",
    topics: [
      ["Human Physiology", "220+"], ["Genetics", "160+"], ["Ecology", "130+"],
      ["Cell Biology", "150+"], ["Plant Physiology", "140+"], ["Mechanics", "120+"],
      ["Organic Chemistry", "170+"], ["Biomolecules", "110+"], ["Evolution", "90+"],
    ],
  },
  {
    id: "ugc",
    label: "UGC NET",
    title: "UGC NET — Paper 1 & 2",
    meta: ["Teaching aptitude", "Research method", "Subject paper"],
    pyqHref: "/ugc-net-p1/pyq",
    topics: [
      ["Teaching Aptitude", "120+"], ["Research Aptitude", "110+"], ["Logical Reasoning", "140+"],
      ["Data Interpretation", "100+"], ["Comm. & ICT", "90+"], ["Higher Education", "80+"],
      ["People & Environment", "70+"], ["Reading Comprehension", "95+"],
    ],
  },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "How is BattleExam different from other platforms?",
    a: "You get three things in one place: 15+ years of real previous-year questions (PYQs), full-length mock tests with the actual exam interface and marking, and a pattern engine that generates fresh questions around each topic's atomic logic. So you practise real papers and unlimited variations of them — instead of grinding a single recycled question bank.",
  },
  {
    q: "Does BattleExam have PYQs and mock tests?",
    a: "Yes — both are core features, not add-ons. There are 15+ years of previous-year questions, browsable by subject, topic and year with step-by-step solutions, plus full-length mock tests that replicate each exam's real interface, timer and marking scheme. Every PYQ is tagged to the pattern it tests, so you study papers in context.",
  },
  {
    q: "How do I know the questions and answers are correct?",
    a: "PYQs are real questions from official past papers with their official answer keys — committee-vetted by definition, just re-organised by topic and year. AI-generated practice questions additionally pass an automated answer-review that re-solves each one and flags any disagreement with the stored answer for human correction. And every question has a one-tap 'Report an issue' button — reported questions go to a review queue and get fixed, so errors are corrected rather than silently drilled.",
  },
  {
    q: "Which exams and branches are covered?",
    a: "GATE across all 8 branches, JEE Main, JEE Advanced, NEET UG, and UGC NET Paper 1 & Paper 2. Every topic is tagged to its pattern and backed by 15+ years of real previous-year questions and full-length mocks.",
  },
  {
    q: "Is it really free?",
    a: "Yes — core pattern practice is free to start with no credit card and no trial limit. You can begin a live session in about 30 seconds. We'll always keep the practice loop accessible.",
  },
  {
    q: "How do you generate questions without repeating them?",
    a: "Each topic is broken down into its underlying pattern — the atomic logic. Our engine composes new questions around that pattern with exam-grade distractors, so the surface changes every session while the concept stays rigorously consistent.",
  },
  {
    q: "What exactly is the 'atomic logic' of a topic?",
    a: "It's the single reusable idea a question is really testing — e.g. 'a page fault is about presence, not protection,' or 'BCNF needs the determinant to be a superkey.' Learn that, and every variation of the question becomes solvable.",
  },
  {
    q: "Is Hard mode genuinely difficult?",
    a: "Yes. Hard is calibrated to real top-rank scoring patterns — multi-step, trap-heavy, and unforgiving. It is not an artificially inflated 'expert' label. If you can clear Hard consistently, you're competing for the top of the list.",
  },
];

export const EXAM_CHIPS = ["GATE", "JEE Main", "JEE Advanced", "NEET", "UGC NET"];

export type FeatureItem = {
  icon: string;
  title: string;
  desc: string;
};

export type FeatureCategory = {
  id: string;
  icon: string;
  accent: string;
  label: string;
  features: FeatureItem[];
};

export const FEATURES_FULL: FeatureCategory[] = [
  {
    id: "practice",
    icon: "target",
    accent: "var(--amber-bright)",
    label: "Practice & Learning",
    features: [
      { icon: "brain", title: "Pattern-first learning", desc: "Each topic is distilled to one core pattern — the atomic logic — so you learn to solve, not memorise." },
      { icon: "bolt", title: "AI-generated fresh questions", desc: "Every session is unique. Questions are generated on the spot with exam-grade distractors — nothing repeats." },
      { icon: "sliders", title: "Adaptive Easy → Hard", desc: "Three difficulty tiers calibrated to real exam scoring. Hard mode is genuinely top-rank level." },
      { icon: "bulb", title: "Instant explanations", desc: "Step-by-step AI explanations on every question — understand why the answer is right, not just what it is." },
      { icon: "grid", title: "Subject & topic browser", desc: "Browse every subject, drill into topics, see question counts and PYQs at a glance." },
    ],
  },
  {
    id: "papers",
    icon: "archive",
    accent: "var(--amber)",
    label: "Exam Papers & Mocks",
    features: [
      { icon: "archive", title: "15+ years of PYQs", desc: "Real previous-year questions tagged by topic, year and difficulty — with official solutions." },
      { icon: "timer", title: "Full-length mock tests", desc: "Sit the real exam interface — same layout, timer, marking scheme. GATE, JEE, NEET, UGC NET." },
      { icon: "chart", title: "Deep performance analysis", desc: "Score donut, marks gained vs lost, accuracy %, per-question pacing chart, section-wise topic drilldown and auto-generated insights — all instant." },
      { icon: "trophy", title: "Live leaderboard", desc: "Real-time rankings powered by WebSockets. See who's taking the test now, score distribution histogram, and your rank among all test-takers." },
      { icon: "sliders", title: "Section & topic breakdown", desc: "Drill into each section: accuracy bars, marks, time per topic, and targeted recommendations for weak areas below 50%." },
      { icon: "layers", title: "Multi-exam coverage", desc: "GATE (all 8 branches), JEE Main, JEE Advanced, NEET UG and UGC NET Paper 1 & 2." },
    ],
  },
  {
    id: "review",
    icon: "cards",
    accent: "var(--rose)",
    label: "Smart Review System",
    features: [
      { icon: "xCircle", title: "Mistake log & pattern analysis", desc: "Wrong answers grouped by root pattern — fix the cause, not the symptom." },
      { icon: "rotate", title: "Flashcard review (SRS)", desc: "Each missed pattern becomes a spaced-repetition card. Review until it's automatic." },
      { icon: "bookmark", title: "Bookmarks", desc: "Save any question for later — one tap to bookmark, one tap to revisit." },
      { icon: "alert", title: "Critical review queue", desc: "Your recent wrong answers surfaced on the dashboard, ready to re-solve immediately." },
    ],
  },
  {
    id: "dashboard",
    icon: "bars",
    accent: "var(--emerald)",
    label: "Your Dashboard",
    features: [
      { icon: "bars", title: "Personalised stats", desc: "Track total attempted, accuracy %, current streak and uncorrected mistakes — all in one view." },
      { icon: "heatmap", title: "26-week mastery wall", desc: "A GitHub-style heatmap showing your daily progress over the last 6 months." },
      { icon: "target", title: "Weak topic detection", desc: "AI identifies your weakest pattern and suggests a focused drill to close the gap." },
      { icon: "share", title: "Shareable progress card", desc: "Generate a public OG-image scorecard and share your prep stats on socials." },
    ],
  },
  {
    id: "platform",
    icon: "spark",
    accent: "var(--amber-bright)",
    label: "Platform",
    features: [
      { icon: "moon", title: "Dark & light theme", desc: "Full theme support. Study at night without blinding yourself — or switch to light for daytime." },
      { icon: "mobile", title: "Mobile-ready", desc: "Fully responsive web app that works on any device. Also available as a native Android app." },
      { icon: "flag", title: "Question reporting", desc: "Found an error? One tap to report — questions go to a review queue and get fixed." },
    ],
  },
];

export const FOOTER_TOPICS = [
  "Algorithms", "Data Structures", "Operating Systems", "DBMS",
  "Computer Networks", "Theory of Computation", "Compiler Design",
  "Digital Logic", "Computer Organisation", "Discrete Mathematics",
];
