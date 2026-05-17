// lib/seo.ts
// Utilities for generating SEO metadata from question data

import { EXAM_CONFIGS, type ExamType } from "@/lib/examConfigs";

// Number of questions per page on the topic SEO surface. Shared so the
// per-question redirect can compute which page hosts a given question.
export const TOPIC_PAGE_SIZE = 20;

/**
 * Strips LaTeX delimiters, markdown formatting and truncates to a clean description.
 */
export function cleanTextForMeta(raw: string, maxLen = 160): string {
  return raw
    // Remove block LaTeX: \[ ... \] and $$ ... $$
    .replace(/\\\[[\s\S]*?\\\]/g, "[equation]")
    .replace(/\$\$[\s\S]*?\$\$/g, "[equation]")
    // Remove inline LaTeX: \( ... \) and $ ... $
    .replace(/\\\([\s\S]*?\\\)/g, " ")
    .replace(/\$[^$]+?\$/g, " ")
    // Remove backslash commands like \text{}, \frac{}, etc.
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    // Remove HTML tags
    .replace(/<[^>]+>/g, " ")
    // Remove noise phrases from seed data
    .replace(/0 reply Please log in or register to add a comment\./g, "")
    // Normalise whitespace
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/**
 * Derive a URL-safe slug from a topic/subject name.
 */
export function toSlug(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Exam slug / label canonicalisation ─────────────────────────────────────
// EXAM_CONFIGS is the single source of truth.
// • Exams with branches (GATE)     → slug = "{examType}-{branch}"  e.g. "gate-cse"
// • Exams without branches         → slug = "{examType}"           e.g. "jee-main", "neet"

export interface ExamSeoInfo {
  examType: ExamType;
  branch: string | null;       // e.g. "CSE", or null for branchless exams
  examLabel: string;           // e.g. "GATE", "JEE Main", "NEET"
  branchLabel: string | null;  // e.g. "CSE", or null
  fullLabel: string;           // e.g. "GATE CSE", "JEE Main", "NEET UG"
  slug: string;                // URL slug e.g. "gate-cse", "jee-main"
  level: "Graduate" | "Postgraduate" | "Undergraduate";
}

function examLevel(examType: ExamType): ExamSeoInfo["level"] {
  switch (examType) {
    case "GATE":
    case "UGC_NET_P1":
    case "UGC_NET_P2":
      return "Graduate";
    case "JEE_MAIN":
    case "JEE_ADVANCED":
    case "NEET":
      return "Undergraduate";
    default:
      return "Graduate";
  }
}

/**
 * "Common" is treated as the absence of a branch for URL purposes — a
 * Pattern with branch="Common" lives at /jee-main, not /jee-main-common.
 * The DB still stores "Common"; the slug just hides it.
 */
export function isCommonBranch(branch: string | null | undefined): boolean {
  return !!branch && toSlug(branch) === "common";
}

/** Build the URL slug for an exam+branch combo from raw DB values. */
export function buildExamSlug(examType: string, branch: string | null | undefined): string {
  const examSlug = toSlug(examType);
  if (!branch || isCommonBranch(branch)) return examSlug;
  return `${examSlug}-${toSlug(branch)}`;
}

/**
 * Build a Prisma `where` fragment that matches a Pattern row's branch column
 * against a URL-resolved branch value. The branch column is non-nullable, so
 * branchless exams (JEE Main, NEET, etc.) store "Common" — which is what we
 * match when the URL has no branch slug.
 */
export function branchWhereClause(branch: string | null | undefined) {
  const target = !branch || isCommonBranch(branch) ? "Common" : branch;
  return { branch: { equals: target, mode: "insensitive" as const } };
}

/**
 * Parse a URL slug like "gate-cse" / "jee-main" / "ugc-net-p1" back to its
 * exam config. Returns null if the slug doesn't match any known exam.
 *
 * Falls back tolerantly: if the slug starts with a known exam prefix followed
 * by `-…`, the remainder is treated as a branch even when the config marks the
 * exam as branchless. This handles legacy DB rows like `JEE_MAIN` + `Common`
 * which produce `/jee-main-common/...` URLs that the strict matcher would
 * otherwise 404.
 */
export function parseExamSlug(slug: string): ExamSeoInfo | null {
  const norm = slug.toLowerCase();

  // 1. Exact match against branchless exams.
  for (const cfg of EXAM_CONFIGS) {
    if (!cfg.hasBranches && norm === toSlug(cfg.examType)) {
      return {
        examType: cfg.examType,
        branch: null,
        examLabel: cfg.label,
        branchLabel: null,
        fullLabel: cfg.label,
        slug: norm,
        level: examLevel(cfg.examType),
      };
    }
  }

  // 2. Exact match against configured branch combos (e.g. gate-cse).
  for (const cfg of EXAM_CONFIGS) {
    if (cfg.hasBranches && cfg.branches) {
      const examSlug = toSlug(cfg.examType);
      for (const br of cfg.branches) {
        if (norm === `${examSlug}-${toSlug(br.id)}`) {
          return {
            examType: cfg.examType,
            branch: br.id,
            examLabel: cfg.label,
            branchLabel: br.id, // "CSE" reads better in SEO than "CS / IT"
            fullLabel: `${cfg.label} ${br.id}`,
            slug: norm,
            level: examLevel(cfg.examType),
          };
        }
      }
    }
  }

  // 3. Tolerant fallback for legacy data: longest matching exam prefix wins.
  // Prefer longer prefixes so "ugc-net-p1-foo" matches UGC_NET_P1 over a
  // hypothetical UGC_NET.
  const candidates = EXAM_CONFIGS
    .map((cfg) => ({ cfg, examSlug: toSlug(cfg.examType) }))
    .sort((a, b) => b.examSlug.length - a.examSlug.length);

  for (const { cfg, examSlug } of candidates) {
    if (norm.startsWith(`${examSlug}-`)) {
      const branchSlug = norm.slice(examSlug.length + 1);
      const branchLabel = branchSlug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        examType: cfg.examType,
        branch: branchLabel,
        examLabel: cfg.label,
        branchLabel,
        fullLabel: `${cfg.label} ${branchLabel}`,
        slug: norm,
        level: examLevel(cfg.examType),
      };
    }
  }

  return null;
}

/**
 * All exam labels for use in copy. Reads from EXAM_CONFIGS so adding a new
 * exam there automatically updates root metadata, manifest, and schema.
 */
export function listExamLabels(): string[] {
  return EXAM_CONFIGS.map((c) => c.label);
}

/**
 * Comma-joined exam labels with an "&" before the last item.
 *   ["GATE", "JEE Main", "NEET"] → "GATE, JEE Main & NEET"
 */
export function joinExamLabels(items: string[] = listExamLabels()): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} & ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
}

/**
 * Normalise raw DB values (exam_type / branch) into a consistent SEO object.
 * Tolerant to legacy values that don't match EXAM_CONFIGS exactly — falls back
 * to a best-effort label.
 */
export function getExamSeoInfo(examType: string, branch: string | null | undefined): ExamSeoInfo {
  const slug = buildExamSlug(examType, branch);
  const parsed = parseExamSlug(slug);
  if (parsed) return parsed;

  // Fallback: legacy / unknown exam_type values. Don't 500 — render sensibly.
  const upper = (examType || "").toUpperCase().replace(/_/g, " ");
  return {
    examType: (examType || "GATE") as ExamType,
    branch: branch || null,
    examLabel: upper || "Exam",
    branchLabel: branch || null,
    fullLabel: branch ? `${upper} ${branch}` : upper,
    slug,
    level: "Graduate",
  };
}

/**
 * Build schema.org JSON-LD for Breadcrumbs.
 */
export function buildBreadcrumbSchema(items: { name: string; item: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((it, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": it.name,
      "item": it.item,
    })),
  };
}

/**
 * Build global Organization and WebSite schema.
 */
export function buildOrganizationSchema() {
  const name = "BattleExam";
  const url = "https://battleexam.com";
  const logo = `${url}/icon.png`;
  const examList = joinExamLabels();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        "name": name,
        "alternateName": "BattleExam – Engineering & Medical Entrance Prep",
        "url": url,
        "logo": {
          "@type": "ImageObject",
          "@id": `${url}/#logo`,
          "url": logo,
          "width": 512,
          "height": 512,
          "caption": "BattleExam"
        },
        "image": { "@id": `${url}/#logo` },
        "description": `AI-powered pattern-based exam preparation platform for ${examList}. Free to start.`,
        "foundingDate": "2024",
        "areaServed": {
          "@type": "Country",
          "name": "India"
        },
        "audience": {
          "@type": "EducationalAudience",
          "educationalRole": "student"
        },
        "knowsAbout": listExamLabels(),
        "sameAs": [
          "https://twitter.com/battleexam"
        ]
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        "url": url,
        "name": name,
        "description": `Pattern-based ${examList} preparation with AI-generated questions and previous year questions.`,
        "inLanguage": "en-IN",
        "publisher": { "@id": `${url}/#organization` },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${url}/practice?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };
}

/**
 * Build schema.org JSON-LD for a subject hub page (e.g., /gate-cse/algorithms).
 */
export function buildSubjectPageSchema(opts: {
  exam: ExamSeoInfo;
  subjectLabel: string;
  canonical: string;
  description: string;
  topicCount: number;
  questionCount: number;
  year: number;
}) {
  const programName = opts.exam.branchLabel
    ? `${opts.exam.examLabel} ${opts.exam.branchLabel} – ${opts.subjectLabel}`
    : `${opts.exam.examLabel} – ${opts.subjectLabel}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": opts.canonical,
    "name": `${opts.exam.fullLabel} ${opts.subjectLabel} Practice Questions`,
    "description": opts.description,
    "url": opts.canonical,
    "inLanguage": "en-IN",
    "isPartOf": { "@id": "https://battleexam.com/#website" },
    "about": {
      "@type": "EducationalOccupationalProgram",
      "name": programName,
      "educationalCredentialAwarded": `${opts.exam.examLabel} Score`,
      "provider": { "@type": "Organization", "name": "BattleExam", "url": "https://battleexam.com" }
    },
    "educationalLevel": opts.exam.level,
    "numberOfItems": opts.questionCount,
  };
}

/**
 * Build schema.org JSON-LD for a single question.
 * Enhanced for GEO with publisher, citation and deeper metadata.
 */
export function buildQuestionSchema(q: {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  subject: string;
  topicName?: string;
  year: number;
  questionType: string;
  url: string;
  exam: ExamSeoInfo;
}) {
  const typeMap: Record<string, string> = {
    MCQ: "Multiple choice",
    MSQ: "Multiple select",
    NAT: "Numerical answer",
  };

  const publisher = {
    "@type": "Organization",
    "name": "BattleExam",
    "url": "https://battleexam.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://battleexam.com/logo.png"
    }
  };

  const suggestedAnswer = q.options.map((opt) => {
    const letter = opt.trim().match(/^([A-Z])[.)]/)?.[1] ?? "";
    const isCorrect = q.correctAnswer.split(";").includes(letter);
    return {
      "@type": "Answer",
      "text": opt,
      "isCorrect": isCorrect,
    };
  });

  const yearLabel = q.year > 2000 ? ` ${q.year}` : "";
  const examFull = q.exam.fullLabel;
  const programName = q.exam.branchLabel
    ? `${q.exam.examLabel} ${q.exam.branchLabel} – ${q.subject}`
    : `${q.exam.examLabel} – ${q.subject}`;

  // Google flags `acceptedAnswer` with empty/missing `text` as invalid. The
  // explanation can survive a truthiness check but disappear after LaTeX/HTML
  // stripping (pure-equation explanations), so always check the cleaned form.
  // Same for the question text on `hasPart[Question]`.
  const questionTextClean = cleanTextForMeta(q.questionText, 1000);
  const explanationClean = q.explanation ? cleanTextForMeta(q.explanation, 1000) : "";
  const acceptedAnswerText = explanationClean
    || (q.questionType === "NAT" ? q.correctAnswer : "")
    || q.options.find((opt) => {
      const letter = opt.trim().match(/^([A-Z])[.)]/)?.[1] ?? "";
      return q.correctAnswer.split(";").includes(letter);
    })
    || "";

  return {
    "@context": "https://schema.org/",
    "@type": "Quiz",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": q.url
    },
    "name": `${examFull}${yearLabel} ${q.subject}${q.topicName && q.topicName !== q.subject ? ` – ${q.topicName}` : ""} Practice Question`,
    "description": `Solve this ${examFull}${yearLabel} ${q.subject} question${q.topicName ? ` on ${q.topicName}` : ""}. Master patterns with AI-guided explanations and instant feedback on BattleExam.`,
    "educationalLevel": q.exam.level,
    "learningResourceType": "Practice problem",
    "publisher": publisher,
    "provider": publisher,
    "author": publisher,
    "about": {
      "@type": "EducationalOccupationalProgram",
      "name": programName,
      "educationalCredentialAwarded": `${q.exam.examLabel} Score`
    },
    "hasPart": [
      {
        "@type": "Question",
        "eduQuestionType": typeMap[q.questionType] ?? q.questionType,
        "learningResourceType": "Practice problem",
        "text": questionTextClean || q.questionText.slice(0, 1000),
        "suggestedAnswer": q.questionType === "NAT"
          ? [{ "@type": "Answer", "text": q.correctAnswer, "isCorrect": true }]
          : suggestedAnswer,
        ...(acceptedAnswerText
          ? {
              "acceptedAnswer": {
                "@type": "Answer",
                "text": acceptedAnswerText,
                "isCorrect": true,
              },
            }
          : {}),
        "citation": q.year > 2000 ? `${examFull} ${q.year}` : undefined,
      },
    ],
  };
}

/**
 * Generate an SEO-friendly URL for a specific question.
 * `branch` should come from the question's pattern (e.g. "CSE" for GATE,
 * null/undefined for branchless exams like JEE Main / NEET / UGC NET).
 */
export function getQuestionUrl(q: {
  id: string;
  prefix: "pyq" | "gq" | "spyq";
  subject: string;
  topicName: string;
  examType?: string;
  branch?: string | null;
}) {
  const examSlug = buildExamSlug(q.examType || "GATE", q.branch);
  const subjectSlug = toSlug(q.subject || "general");
  const topicSlug = toSlug(q.topicName || "topic");
  return `/${examSlug}/${subjectSlug}/${topicSlug}/${q.prefix}-${q.id}`;
}
