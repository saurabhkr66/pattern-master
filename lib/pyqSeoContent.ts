// lib/pyqSeoContent.ts
// Per-exam SEO copy for the /{examSlug}/pyq pages. Kept out of the page so
// the route stays lean, and written per exam so the templated pages don't
// read as near-duplicates of each other (/gate-cse/pyq vs /neet/pyq etc.).

import type { ExamType } from "@/lib/examConfigs";

export interface PyqFaq {
  q: string;
  a: string;
}

export interface PyqSeoCopy {
  /** "Why PYQs are the highest-ROI prep strategy" paragraphs */
  why: string[];
  /** Three-pass method shown under "What toppers do differently" */
  topperSteps: string[];
  /** "How to use this PYQ bank" paragraphs */
  howToUse: string[];
  faqs: PyqFaq[];
  /** Cross-exam PYQ pages with overlapping audiences */
  related: { href: string; label: string }[];
}

interface ExamFlavor {
  /** Who conducts the exam + repeat behaviour, woven into the "why" copy */
  repeatNote: string;
  /** Answer to the "how many years" FAQ */
  yearsAnswer: string;
  /** Answer to the "do questions repeat" FAQ */
  repeatAnswer: string;
  /** Answer to the negative-marking FAQ — must match EXAM_CONFIGS marking */
  markingAnswer: string;
  related: { href: string; label: string }[];
}

const FLAVORS: Record<ExamType, ExamFlavor> = {
  GATE: {
    repeatNote:
      "GATE is set by a rotating IIT/IISc committee, and while verbatim repeats are rare, the underlying patterns — the way a topic is converted into a 1-mark or 2-mark problem — recur year after year.",
    yearsAnswer:
      "At least the last 10 years of your branch's papers. Core subjects like Engineering Mathematics and General Aptitude overlap across branches, so those PYQs transfer too.",
    repeatAnswer:
      "Verbatim repeats are rare in GATE, but pattern repeats are constant: the same concept dressed in new numbers. Solving topic-wise PYQs teaches you to recognise the pattern, which is what actually earns marks in the hall.",
    markingAnswer:
      "Yes, for MCQs only: a 1-mark MCQ costs −⅓ and a 2-mark MCQ costs −⅔ when wrong. MSQ and NAT questions have no negative marking, which changes how aggressively you should attempt them.",
    related: [],
  },
  JEE_MAIN: {
    repeatNote:
      "NTA runs multiple shifts per session, which means dozens of real papers every year — and the chapter-wise weightage across those shifts is remarkably stable.",
    yearsAnswer:
      "The last 5–6 years cover every chapter that matters, and because NTA holds 10+ shifts per year since 2021, that's effectively 60+ real papers of practice.",
    repeatAnswer:
      "Across shifts, absolutely — the same concept is routinely re-asked with different values within the same session. Chapter-wise PYQ practice is the fastest way to see every variant NTA uses.",
    markingAnswer:
      "Yes: +4 for a correct MCQ and −1 for a wrong one. Numerical (NAT) questions carry +4 with no negative marking in our mock engine, so unattempted numericals are wasted opportunities.",
    related: [{ href: "/jee-advanced/pyq", label: "JEE Advanced previous year questions" }],
  },
  JEE_ADVANCED: {
    repeatNote:
      "JEE Advanced is famous for multi-concept problems, but even those are built from a finite set of building blocks the IITs have used for two decades.",
    yearsAnswer:
      "Solve at least 10 years. Advanced rewards depth over breadth — a single well-understood PYQ teaches more than five fresh problems of the same difficulty.",
    repeatAnswer:
      "Not verbatim — but the building blocks repeat. A rotational-dynamics setup from 2015 reappears inside a 2023 problem with an electromagnetism twist. PYQs are how you learn the blocks.",
    markingAnswer:
      "It varies by question type: single-correct MCQs are +3/−1, multi-correct (MSQ) and integer (NAT) questions are +4 with no negative in our paper pattern. Read each section's rules before attempting.",
    related: [{ href: "/jee-main/pyq", label: "JEE Main previous year questions" }],
  },
  NEET: {
    repeatNote:
      "NEET is NCERT-anchored, and NTA reuses concepts — sometimes near-verbatim lines from NCERT — at a higher rate than any other national exam.",
    yearsAnswer:
      "The last 10 years. NEET's chapter-wise weightage is highly stable (Human Physiology, Genetics and Organic Chemistry dominate), so older papers remain representative.",
    repeatAnswer:
      "Yes — NEET has the highest repeat rate among national entrance exams. Questions reappear with minor option shuffles, especially in Biology. Solving chapter-wise PYQs is close to seeing the actual paper early.",
    markingAnswer:
      "Yes: every question is an MCQ worth +4 if correct and −1 if wrong. With 200 questions in 3 hours 20 minutes, knowing when to skip is as important as knowing the answer.",
    related: [],
  },
  UGC_NET_P1: {
    repeatNote:
      "UGC NET runs twice a year, and Paper 1 (Teaching & Research Aptitude) recycles its question templates heavily across cycles.",
    yearsAnswer:
      "The last 5–6 cycles (about 3 years, since NET runs twice a year). Paper 1 templates change slowly, so recent cycles are the highest-value practice.",
    repeatAnswer:
      "Frequently — Paper 1 questions on research methodology, ICT and higher-education policy repeat across cycles with light rewording, and occasionally verbatim.",
    markingAnswer:
      "No. Every question is worth +2 and there is no negative marking, so you should attempt all 50 questions — an educated guess has strictly positive expected value.",
    related: [{ href: "/ugc-net-p2/pyq", label: "UGC NET Paper 2 previous year questions" }],
  },
  UGC_NET_P2: {
    repeatNote:
      "Paper 2 is subject-specific, and within each subject NTA draws from a stable syllabus — making topic-wise PYQs the most reliable map of what gets asked.",
    yearsAnswer:
      "The last 5–6 cycles of your subject. Combine them with Paper 1 PYQs, since both papers are attempted in the same sitting.",
    repeatAnswer:
      "Yes, within each subject — factual and theory questions repeat across cycles more often than in any entrance exam, which is why toppers treat PYQs as a primary source, not revision material.",
    markingAnswer:
      "No. All 100 questions are +2 with no negative marking — attempt everything, and use PYQs to train the recall speed that 2 hours for 100 questions demands.",
    related: [{ href: "/ugc-net-p1/pyq", label: "UGC NET Paper 1 previous year questions" }],
  },
};

export function getPyqSeoCopy(opts: {
  examType: ExamType;
  fullLabel: string;
  examLabel: string;
  unit: "chapter" | "topic";
  year: number;
}): PyqSeoCopy {
  const { examType, fullLabel, examLabel, unit, year } = opts;
  const flavor = FLAVORS[examType];
  const unitWise = `${unit}-wise`;
  const nextYear = year + 1;

  return {
    why: [
      `Previous year questions are the closest thing to insider information that ${examLabel} offers. ${flavor.repeatNote}`,
      `PYQs are also the only honest weightage data you have. Coaching material tells you what could be asked; ten years of real papers tell you what is asked, ${unit} by ${unit}, mark by mark. Before you spend a month on a low-yield ${unit}, the papers will tell you it isn't worth a week.`,
      `Every question in this bank is tagged to its ${unit} and pattern, with step-by-step solutions — so instead of scrolling a 200-page PDF, you drill exactly the ${unitWise} questions where you currently lose marks.`,
    ],
    topperSteps: [
      `First pass — untimed. Solve ${unitWise}, right after finishing a ${unit}. The goal is recognising how ${examLabel} frames that ${unit}, not speed.`,
      `Second pass — timed. Re-attempt full years as mock tests under the real clock and marking scheme. This is where exam temperament is built.`,
      `Third pass — mistakes only. In the final weeks before ${examLabel} ${nextYear}, re-solve only the questions you got wrong. This pass has the highest marks-per-hour of anything you can do.`,
    ],
    howToUse: [
      `Start with the ${unitWise} grid above: pick the ${unit} you studied most recently and clear its PYQs first. Every question shows a full solution, and wrong answers automatically flow into your Mistakes Room for spaced review.`,
      `Bookmark the questions that surprised you, track your accuracy per ${unit} on the dashboard, and once a subject feels stable, graduate to full-length papers under the timer. A free account keeps all of this progress synced.`,
    ],
    faqs: [
      {
        q: `Are PYQs enough to crack ${fullLabel}?`,
        a: `PYQs are necessary but not sufficient. They teach you what ${examLabel} actually asks and where the marks concentrate, but you still need concept-building first and mock tests after. The highest-scoring loop is: learn a ${unit} → solve its PYQs → fix mistakes → repeat.`,
      },
      {
        q: `How many years of ${examLabel} PYQs should I solve?`,
        a: flavor.yearsAnswer,
      },
      {
        q: `Do ${examLabel} questions repeat from previous years?`,
        a: flavor.repeatAnswer,
      },
      {
        q: `Is there negative marking in ${fullLabel}?`,
        a: flavor.markingAnswer,
      },
      {
        q: `Where can I get ${fullLabel} previous year questions with solutions for free?`,
        a: `Right here — every ${fullLabel} PYQ on BattleExam is free to solve online with detailed solutions, organised ${unitWise} and by year. Unlike a PDF download, you get instant checking, solution walkthroughs and mistake tracking.`,
      },
      {
        q: `Can I attempt ${examLabel} PYQs as a timed mock test?`,
        a: `Yes. Every full paper on this page has a mock-test mode with the real ${examLabel} interface, timer and marking scheme, followed by an accuracy, speed and weak-${unit} breakdown.`,
      },
    ],
    related: flavor.related,
  };
}
