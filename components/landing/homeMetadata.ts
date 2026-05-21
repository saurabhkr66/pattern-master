import type { Metadata } from "next";
import { joinExamLabels, listExamLabels } from "@/lib/seo";

export const HOME_EXAM_COPY = joinExamLabels();
export const HOME_EXAM_LIST = listExamLabels();

const HOME_TITLE = `BattleExam – Pattern-Based ${HOME_EXAM_COPY} Practice & Mock Tests`;
const HOME_DESC = `Master ${HOME_EXAM_COPY} with AI-generated pattern-based questions, previous year questions (PYQs) and full-length mock tests. Adaptive difficulty, instant explanations. Free to start.`;
const HOME_OG_DESC = `Practice ${HOME_EXAM_COPY} with AI questions tailored to each topic's core logic. Adaptive difficulty, instant explanations, PYQs included. Free.`;

export const homeMetadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESC,
  keywords: [
    "GATE preparation",
    "GATE CSE preparation",
    "GATE ECE preparation",
    "GATE EE preparation",
    "GATE ME preparation",
    "GATE CE preparation",
    "GATE practice questions",
    "GATE PYQ",
    "GATE previous year questions",
    "GATE 2026 preparation",
    "GATE 2027 preparation",
    "GATE mock test",
    "JEE Main preparation",
    "JEE Main practice questions",
    "JEE Main PYQ",
    "JEE Main mock test",
    "JEE Advanced preparation",
    "JEE Advanced PYQ",
    "NEET UG preparation",
    "NEET practice questions",
    "NEET PYQ",
    "NEET mock test",
    "UGC NET Paper 1 preparation",
    "UGC NET Paper 2 preparation",
    "UGC NET PYQ",
    "pattern based learning",
    "AI generated questions",
    "online mock tests India",
    "engineering entrance exam preparation India",
    "medical entrance exam preparation India",
  ],
  openGraph: {
    title: HOME_TITLE,
    description: HOME_OG_DESC,
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "https://battleexam.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: `BattleExam – Pattern-Based ${HOME_EXAM_COPY} Preparation`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: `Practice ${HOME_EXAM_COPY} with AI questions tailored to each topic's core logic. Free.`,
    images: ["https://battleexam.com/opengraph-image"],
  },
  alternates: { canonical: "https://battleexam.com" },
};

const PROVIDER = { "@type": "Organization", name: "BattleExam", url: "https://battleexam.com" };

export const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "BattleExam",
  description: `Pattern-based exam preparation platform for ${HOME_EXAM_COPY}`,
  url: "https://battleexam.com",
  knowsAbout: HOME_EXAM_LIST,
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Exam Preparation Programs",
    itemListElement: [
      {
        "@type": "Course",
        name: "GATE CSE Preparation",
        courseCode: "GATE-CSE",
        url: "https://battleexam.com/gate-cse",
        description: "Pattern-based GATE Computer Science preparation: algorithms, data structures, OS, DBMS, networks, theory of computation and more.",
        provider: PROVIDER,
      },
      {
        "@type": "Course",
        name: "JEE Main Preparation",
        courseCode: "JEE-MAIN",
        url: "https://battleexam.com/jee-main",
        description: "Physics, Chemistry and Mathematics practice for JEE Main with AI-generated questions and full-length mock tests.",
        provider: PROVIDER,
      },
      {
        "@type": "Course",
        name: "JEE Advanced Preparation",
        courseCode: "JEE-ADVANCED",
        url: "https://battleexam.com/jee-advanced",
        description: "Pattern-based JEE Advanced practice covering MCQ, MSQ and Integer-type questions across Physics, Chemistry, Mathematics.",
        provider: PROVIDER,
      },
      {
        "@type": "Course",
        name: "NEET UG Preparation",
        courseCode: "NEET-UG",
        url: "https://battleexam.com/neet",
        description: "NEET UG Physics, Chemistry and Biology practice with previous year questions and full-length mocks.",
        provider: PROVIDER,
      },
      {
        "@type": "Course",
        name: "UGC NET Paper 1 Preparation",
        courseCode: "UGC-NET-P1",
        url: "https://battleexam.com/ugc-net-p1",
        description: "General Paper on Teaching and Research Aptitude practice for UGC NET Paper 1.",
        provider: PROVIDER,
      },
      {
        "@type": "Course",
        name: "UGC NET Paper 2 Preparation",
        courseCode: "UGC-NET-P2",
        url: "https://battleexam.com/ugc-net-p2",
        description: "Subject-specific UGC NET Paper 2 practice across supported subjects.",
        provider: PROVIDER,
      },
    ],
  },
};

export const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "BattleExam",
  operatingSystem: "Web, Android, iOS",
  applicationCategory: "EducationApplication",
  applicationSubCategory: "Exam Preparation",
  url: "https://battleexam.com",
  description: `AI-powered pattern-based exam preparation platform for ${HOME_EXAM_COPY}. Practice with adaptive-difficulty questions, access previous year papers, and track your progress.`,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
    description: "Free core practice. No credit card required.",
  },
  featureList: [
    "AI-generated pattern-based questions",
    `Previous Year Questions (PYQs) for ${HOME_EXAM_COPY}`,
    "Full-length mock tests with real exam interface",
    "Adaptive difficulty: Easy, Medium, Hard",
    "Instant explanations and step-by-step solutions",
    "Progress tracking and accuracy analytics",
    "Mistake review and flashcard mode",
    `Covers ${HOME_EXAM_COPY}`,
  ],
  screenshot: "https://battleexam.com/opengraph-image",
  inLanguage: "en-IN",
  audience: {
    "@type": "EducationalAudience",
    educationalRole: "student",
    audienceType: `Students preparing for ${HOME_EXAM_COPY}`,
  },
};

export const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How is BattleExam different from other GATE preparation platforms?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "BattleExam generates questions based on the specific atomic logic of each GATE topic — not recycled question banks. Every question targets the exact thinking pattern GATE examiners test, so practice is always relevant and non-repetitive.",
      },
    },
    {
      "@type": "Question",
      name: "Which exams and subjects does BattleExam cover?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `BattleExam covers ${HOME_EXAM_COPY}. GATE preparation is supported across all branches (CSE, ECE, EE, ME, CE, IN, CH, BT). JEE Main and JEE Advanced cover Physics, Chemistry and Mathematics; NEET UG adds Biology. UGC NET Paper 1 (general aptitude) and Paper 2 (subject-specific) are also supported.`,
      },
    },
    {
      "@type": "Question",
      name: "Is BattleExam free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Create an account and start practicing immediately — no credit card required. The core practice, PYQs, and progress tracking are completely free.",
      },
    },
    {
      "@type": "Question",
      name: "Does BattleExam have previous year questions (PYQs)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Yes. BattleExam includes PYQ banks for ${HOME_EXAM_COPY}, organised by subject, topic and year. Every previous year question is tagged to the exact pattern it tests, so you can study PYQs in context rather than in isolation.`,
      },
    },
    {
      "@type": "Question",
      name: "How does BattleExam generate questions without repeating them?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every generated question gets a semantic fingerprint. If an identical question already exists in the database, it is skipped — guaranteeing a growing bank of unique, non-repetitive questions.",
      },
    },
    {
      "@type": "Question",
      name: "What is pattern-based learning for GATE?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every GATE question tests one core idea — for example, every Merge Sort question ultimately tests how divide-and-conquer recurrences resolve. Pattern-based learning identifies that core idea (the atomic logic) and drills it with varied questions until you own it — instead of memorising individual questions.",
      },
    },
    {
      "@type": "Question",
      name: "Does BattleExam have full-length mock tests?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Yes. BattleExam provides full-length mock tests with the real exam interface, timing, and marking schemes for ${HOME_EXAM_COPY}. Mocks include instant scoring, detailed performance analysis and per-question explanations.`,
      },
    },
    {
      "@type": "Question",
      name: "What difficulty levels are available?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "BattleExam offers Easy, Medium, and Hard difficulty modes. Hard mode questions are calibrated to AIR-100 level — genuinely challenging, not artificially inflated. You control the difficulty slider at any time.",
      },
    },
  ],
};

export const FAQS = [
  {
    q: "How is BattleExam different from other GATE platforms?",
    a: "Most platforms recycle the same question bank. BattleExam generates fresh questions every time, each targeting the specific atomic logic of the topic — the exact thinking pattern GATE examiners test.",
  },
  {
    q: "Which exams and branches are covered?",
    a: `BattleExam covers ${HOME_EXAM_COPY}. GATE is supported across all 8 branches (CSE, ECE, EE, ME, CE, IN, CH, BT). JEE Main and JEE Advanced cover Physics, Chemistry and Mathematics; NEET UG adds Biology. UGC NET Paper 1 (teaching & research aptitude) and Paper 2 (subject-specific) are also live.`,
  },
  {
    q: "Is it free?",
    a: "Yes. Create an account and start practicing immediately — no credit card, no trial limits.",
  },
  {
    q: "How does BattleExam generate questions without repeating them?",
    a: "Every generated question gets a semantic fingerprint. If an identical question already exists in the database, it's skipped — guaranteeing a growing bank of unique questions.",
  },
  {
    q: "What is 'atomic logic' in a topic?",
    a: "Every GATE question on 'Merge Sort' ultimately tests one thing: how divide-and-conquer recurrences work. That's the atomic logic. Practicing around that core makes you exam-ready faster than reading chapters.",
  },
];
