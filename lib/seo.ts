// lib/seo.ts
// Utilities for generating SEO metadata from question data

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
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const logo = `${url}/logo.png`; // Placeholder for actual logo

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        "name": name,
        "url": url,
        "logo": {
          "@type": "ImageObject",
          "url": logo,
          "width": 512,
          "height": 512
        },
        "sameAs": [
          "https://twitter.com/battleexam", // Placeholders
          "https://github.com/battleexam"
        ]
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        "url": url,
        "name": name,
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
 * Build schema.org JSON-LD for a single question.
 * Enhanced for GEO with publisher, citation and deeper metadata.
 */
export function buildQuestionSchema(q: {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  subject: string;
  year: number;
  questionType: string;
  url: string;
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

  return {
    "@context": "https://schema.org/",
    "@type": "Quiz",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": q.url
    },
    "name": `${q.subject} ${q.year > 2000 ? q.year : ""} GATE Practice Question`,
    "description": `Solve this ${q.subject} question from GATE ${q.year}. Master patterns with AI-guided explanations and instant feedback on BattleExam.`,
    "educationalLevel": "Graduate",
    "learningResourceType": "Practice problem",
    "publisher": publisher,
    "provider": publisher,
    "author": publisher,
    "about": {
      "@type": "EducationalOccupationalProgram",
      "name": `GATE Computer Science – ${q.subject}`,
      "educationalCredentialAwarded": "GATE Score"
    },
    "hasPart": [
      {
        "@type": "Question",
        "eduQuestionType": typeMap[q.questionType] ?? q.questionType,
        "learningResourceType": "Practice problem",
        "text": cleanTextForMeta(q.questionText, 1000),
        "suggestedAnswer": q.questionType === "NAT"
          ? [{ "@type": "Answer", "text": q.correctAnswer, "isCorrect": true }]
          : suggestedAnswer,
        ...(q.explanation
          ? {
              "acceptedAnswer": {
                "@type": "Answer",
                "text": cleanTextForMeta(q.explanation, 1000),
                "isCorrect": true,
              },
            }
          : {}),
        "citation": q.year > 2000 ? `GATE ${q.year} - CSE` : undefined,
      },
    ],
  };
}

/**
 * Generate an SEO-friendly URL for a specific question.
 */
export function getQuestionUrl(q: {
  id: string;
  prefix: "pyq" | "gq" | "spyq";
  subject: string;
  topicName: string;
  examType?: string;
}) {
  const exam = (q.examType || "gate").toLowerCase();
  const examSlug = `${toSlug(exam)}-cse`;
  const subjectSlug = toSlug(q.subject || "general");
  const topicSlug = toSlug(q.topicName || "topic");
  return `/${examSlug}/${subjectSlug}/${topicSlug}/${q.prefix}-${q.id}`;
}
