export type ExamType = "GATE" | "JEE_MAIN" | "JEE_ADVANCED" | "NEET" | "UGC_NET_P1" | "UGC_NET_P2";
// SUBJECTIVE is coaching-test only (photo answers); consumer exams never use it.
export type QType = "MCQ" | "MSQ" | "NAT" | "SUBJECTIVE";

export interface MarkBand {
  marks: number;
  count: number;
  type?: QType; // force this type for this band
}

export interface SectionConfig {
  name: string;
  // subjects to query; null = all subjects for the branch (GATE subject section)
  subjects: string[] | null;
  totalQuestions: number;
  maxScore: number;
  questionTypes: QType[];
  markDistribution: MarkBand[];
  // negative marking fraction applied per mark value (MCQ only)
  negativePerMark: number;
}

export interface ExamConfig {
  examType: ExamType;
  label: string;
  description: string;
  emoji: string;
  // SEO wording for PYQ surfaces: JEE/NEET searchers say "chapter-wise",
  // GATE/UGC NET searchers say "topic-wise".
  pyqUnit: "chapter" | "topic";
  hasBranches: boolean;
  branches?: { id: string; label: string }[];
  durationSecs: number;
  totalQuestions: number;
  maxScore: number;
  sections: SectionConfig[];
  themeColor: string;
  instructions: string[];
}

function gateSubjectSection(branch: string): SectionConfig {
  return {
    name: branch,
    subjects: null, // will query all questions for this branch
    totalQuestions: 55,
    maxScore: 85,
    questionTypes: ["MCQ", "MSQ", "NAT"],
    markDistribution: [
      { marks: 1, count: 25 },
      { marks: 2, count: 30 },
    ],
    negativePerMark: 1 / 3,
  };
}

const GATE_GA_SECTION: SectionConfig = {
  name: "General Aptitude",
  subjects: ["General Aptitude"],
  totalQuestions: 10,
  maxScore: 15,
  questionTypes: ["MCQ", "MSQ", "NAT"],
  markDistribution: [
    { marks: 1, count: 5 },
    { marks: 2, count: 5 },
  ],
  negativePerMark: 1 / 3,
};

const JEE_SUBJECT_SECTION = (name: string, subjects: string[]): SectionConfig => ({
  name,
  subjects,
  totalQuestions: 30,
  maxScore: 120,
  questionTypes: ["MCQ", "NAT"],
  markDistribution: [
    { marks: 4, count: 20, type: "MCQ" },
    { marks: 4, count: 10, type: "NAT" },
  ],
  negativePerMark: 0.25, // -1 on 4-mark MCQ; NAT has no negative
});

const ADV_SUBJECT_SECTION = (name: string, subjects: string[]): SectionConfig => ({
  name,
  subjects,
  totalQuestions: 18,
  maxScore: 62,
  questionTypes: ["MCQ", "MSQ", "NAT"],
  markDistribution: [
    { marks: 3, count: 6, type: "MCQ" }, // single correct -1
    { marks: 4, count: 6, type: "MSQ" }, // multi-correct 0 wrong
    { marks: 4, count: 6, type: "NAT" }, // integer 0 wrong
  ],
  negativePerMark: 1 / 3, // -1 for 3-mark MCQ only
});

const NEET_SUBJECT_SECTION = (name: string, subjects: string[]): SectionConfig => ({
  name,
  subjects,
  totalQuestions: 50,
  maxScore: 200,
  questionTypes: ["MCQ"],
  markDistribution: [
    { marks: 4, count: 35 },
    { marks: 4, count: 15 },
  ],
  negativePerMark: 0.25,
});

export const GATE_BRANCHES = [
  { id: "CSE", label: "CS / IT" },
  { id: "ECE", label: "Electronics & Comm." },
  { id: "EE", label: "Electrical Engg." },
  { id: "ME", label: "Mechanical Engg." },
  { id: "CE", label: "Civil Engg." },
  { id: "IN", label: "Instrumentation" },
  { id: "CH", label: "Chemical Engg." },
  { id: "BT", label: "Biotechnology" },
  { id: "PI", label: "Production & Industrial" },
] as const;

export const EXAM_CONFIGS: ExamConfig[] = [
  {
    examType: "GATE",
    label: "GATE",
    description: "Graduate Aptitude Test in Engineering",
    emoji: "🎓",
    pyqUnit: "topic",
    hasBranches: true,
    branches: GATE_BRANCHES as unknown as { id: string; label: string }[],
    durationSecs: 10800,
    totalQuestions: 65,
    maxScore: 100,
    // sections built dynamically per branch; this is CSE default
    sections: [GATE_GA_SECTION, gateSubjectSection("CSE")],
    themeColor: "#6366f1",
    instructions: [
      "65 questions — 10 General Aptitude + 55 Subject",
      "MCQ: +marks correct, −⅓ per mark wrong",
      "MSQ & NAT: +marks correct, 0 negative",
      "Duration: 3 hours",
    ],
  },
  {
    examType: "JEE_MAIN",
    label: "JEE Main",
    description: "Joint Entrance Examination (Main)",
    emoji: "⚡",
    pyqUnit: "chapter",
    hasBranches: false,
    durationSecs: 10800,
    totalQuestions: 90,
    maxScore: 360,
    sections: [
      JEE_SUBJECT_SECTION("Physics", ["Physics"]),
      JEE_SUBJECT_SECTION("Chemistry", ["Chemistry"]),
      JEE_SUBJECT_SECTION("Mathematics", ["Mathematics", "Maths"]),
    ],
    themeColor: "#f59e0b",
    instructions: [
      "90 questions — 30 each in Physics, Chemistry, Mathematics",
      "Section A (20 MCQ): +4 correct, −1 wrong",
      "Section B (10 NAT): +4 correct, 0 wrong — attempt any 5",
      "Duration: 3 hours",
    ],
  },
  {
    examType: "JEE_ADVANCED",
    label: "JEE Advanced",
    description: "Joint Entrance Examination (Advanced)",
    emoji: "🔬",
    pyqUnit: "chapter",
    hasBranches: false,
    durationSecs: 10800,
    totalQuestions: 54,
    maxScore: 186,
    sections: [
      ADV_SUBJECT_SECTION("Physics", ["Physics"]),
      ADV_SUBJECT_SECTION("Chemistry", ["Chemistry"]),
      ADV_SUBJECT_SECTION("Mathematics", ["Mathematics", "Maths"]),
    ],
    themeColor: "#ef4444",
    instructions: [
      "54 questions — 18 each in Physics, Chemistry, Mathematics",
      "MCQ (single): +3 correct, −1 wrong",
      "MSQ (multiple): +4 correct, 0 wrong",
      "Integer (NAT): +4 correct, 0 wrong",
      "Duration: 3 hours (Paper 1)",
    ],
  },
  {
    examType: "NEET",
    label: "NEET UG",
    description: "National Eligibility cum Entrance Test (UG)",
    emoji: "🧬",
    pyqUnit: "chapter",
    hasBranches: false,
    durationSecs: 12000, // 3h 20min
    totalQuestions: 200,
    maxScore: 800,
    sections: [
      NEET_SUBJECT_SECTION("Physics", ["Physics"]),
      NEET_SUBJECT_SECTION("Chemistry", ["Chemistry"]),
      // Biology = Botany + Zoology combined (100 Qs, 360 marks)
      {
        name: "Biology",
        subjects: ["Biology", "Botany", "Zoology"],
        totalQuestions: 100,
        maxScore: 400,
        questionTypes: ["MCQ"],
        markDistribution: [
          { marks: 4, count: 70 },
          { marks: 4, count: 30 },
        ],
        negativePerMark: 0.25,
      },
    ],
    themeColor: "#22c55e",
    instructions: [
      "200 questions — Physics (50), Chemistry (50), Biology (100)",
      "Section A: 35 mandatory MCQs per subject (70 for Biology)",
      "Section B: attempt any 10 per subject (20 for Biology)",
      "All MCQ: +4 correct, −1 wrong",
      "Duration: 3 hours 20 minutes",
    ],
  },
  {
    examType: "UGC_NET_P1",
    label: "UGC NET Paper 1",
    description: "General Paper on Teaching and Research Aptitude",
    emoji: "📚",
    pyqUnit: "topic",
    hasBranches: false,
    durationSecs: 3600, // 1 hour
    totalQuestions: 50,
    maxScore: 100,
    sections: [
      {
        name: "General Paper",
        subjects: ["General Paper"],
        totalQuestions: 50,
        maxScore: 100,
        questionTypes: ["MCQ"],
        markDistribution: [{ marks: 2, count: 50 }],
        negativePerMark: 0,
      },
    ],
    themeColor: "#0284c7",
    instructions: [
      "50 questions",
      "All questions are compulsory",
      "Correct Answer: +2 marks",
      "No negative marking",
      "Duration: 1 hour",
    ],
  },
  {
    examType: "UGC_NET_P2",
    label: "UGC NET Paper 2",
    description: "Subject Specific Paper",
    emoji: "📖",
    pyqUnit: "topic",
    hasBranches: false,
    durationSecs: 7200, // 2 hours
    totalQuestions: 100,
    maxScore: 200,
    sections: [
      {
        name: "Subject Paper",
        subjects: ["English", "Economics", "History"], // Add more as needed
        totalQuestions: 100,
        maxScore: 200,
        questionTypes: ["MCQ"],
        markDistribution: [{ marks: 2, count: 100 }],
        negativePerMark: 0,
      },
    ],
    themeColor: "#0f766e",
    instructions: [
      "100 questions",
      "All questions are compulsory",
      "Correct Answer: +2 marks",
      "No negative marking",
      "Duration: 2 hours",
    ],
  },
];

/* ─────────────── Random test sizing ─────────────── */

/**
 * Random tests are user-sized. The cap scales with how many subjects the user
 * filtered to — one subject is a focused drill, more subjects need more room to
 * cover each — with a hard ceiling so a GATE branch (10+ subjects) can't ask for
 * a paper longer than the real exam. No filter means "all subjects" → ceiling.
 */
export const RANDOM_MIN_QUESTIONS = 1;
export const RANDOM_MAX_QUESTIONS = 60;
export const SECS_PER_QUESTION = 120;

export function randomQuestionCap(subjectCount: number): number {
  if (subjectCount <= 0) return RANDOM_MAX_QUESTIONS;
  return Math.min(30 + (subjectCount - 1) * 10, RANDOM_MAX_QUESTIONS);
}

export function clampRandomCount(count: number, subjectCount: number): number {
  const cap = randomQuestionCap(subjectCount);
  if (!Number.isFinite(count)) return cap;
  return Math.max(RANDOM_MIN_QUESTIONS, Math.min(Math.floor(count), cap));
}

/** 2 minutes per question, always — a 40-question paper really is 80 minutes. */
export function randomDurationSecs(count: number): number {
  return count * SECS_PER_QUESTION;
}

/**
 * Split `total` across `weights` proportionally. Uses largest-remainder so the
 * parts sum to exactly `total` — plain rounding would miss the target on small
 * papers (7 questions over 3 equal sections rounds to 6 or 9).
 */
function largestRemainder(weights: number[], total: number): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w * total) / sum);
  const parts = exact.map((e) => Math.floor(e));
  let left = total - parts.reduce((s, p) => s + p, 0);
  const byFraction = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; left > 0 && byFraction.length > 0; k++, left--) {
    parts[byFraction[k % byFraction.length].i]++;
  }
  return parts;
}

/**
 * Shrink a full-length exam config down to `count` questions, keeping the real
 * exam's subject proportions and mark bands. Sections that round down to zero
 * are dropped entirely, so a 2-question paper doesn't render empty section tabs.
 *
 * Server and client both derive from this, so the generated paper, the timer,
 * and the section palette can't disagree.
 */
export function scaleExamConfig(config: ExamConfig, count: number): ExamConfig {
  const target = Math.max(RANDOM_MIN_QUESTIONS, Math.min(Math.floor(count), RANDOM_MAX_QUESTIONS));
  const perSection = largestRemainder(config.sections.map((s) => s.totalQuestions), target);

  const sections: SectionConfig[] = [];
  config.sections.forEach((sec, i) => {
    const n = perSection[i];
    if (n <= 0) return;
    const perBand = largestRemainder(sec.markDistribution.map((b) => b.count), n);
    const markDistribution = sec.markDistribution
      .map((b, bi) => ({ ...b, count: perBand[bi] }))
      .filter((b) => b.count > 0);
    const maxScore = markDistribution.length > 0
      ? markDistribution.reduce((s, b) => s + b.marks * b.count, 0)
      : Math.round((sec.maxScore * n) / Math.max(1, sec.totalQuestions));
    sections.push({ ...sec, totalQuestions: n, maxScore, markDistribution });
  });

  return {
    ...config,
    sections,
    totalQuestions: target,
    maxScore: sections.reduce((s, sec) => s + sec.maxScore, 0),
    durationSecs: randomDurationSecs(target),
  };
}

export function getExamConfig(examType: ExamType, branch?: string): ExamConfig {
  const base = EXAM_CONFIGS.find((e) => e.examType === examType)!;
  if (examType === "GATE" && branch) {
    return {
      ...base,
      sections: [GATE_GA_SECTION, gateSubjectSection(branch)],
    };
  }
  return base;
}

export function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function fmtTimer(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
