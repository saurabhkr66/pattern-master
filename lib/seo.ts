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
 * Build schema.org JSON-LD for a single question.
 * Answers are included so crawlers understand structure, but `isCorrect` lets
 * them know which is right (good for "Practice problems" rich results).
 */
export function buildQuestionSchema(q: {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  subject: string;
  year: number;
  questionType: string;
}) {
  const typeMap: Record<string, string> = {
    MCQ: "Multiple choice",
    MSQ: "Multiple select",
    NAT: "Numerical answer",
  };

  const suggestedAnswer = q.options.map((opt) => {
    // options are like "A. Some text" or "A) Some text"
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
    "name": `GATE ${q.subject} ${q.year} Question`,
    "description": cleanTextForMeta(q.questionText),
    "educationalLevel": "Graduate",
    "learningResourceType": "Practice problem",
    "about": {
      "@type": "EducationalOccupationalProgram",
      "name": `GATE CSE – ${q.subject}`,
    },
    "hasPart": [
      {
        "@type": "Question",
        "eduQuestionType": typeMap[q.questionType] ?? q.questionType,
        "learningResourceType": "Practice problem",
        "text": cleanTextForMeta(q.questionText, 500),
        "suggestedAnswer": q.questionType === "NAT"
          ? [{ "@type": "Answer", "text": q.correctAnswer, "isCorrect": true }]
          : suggestedAnswer,
        ...(q.explanation
          ? {
              "acceptedAnswer": {
                "@type": "Answer",
                "text": cleanTextForMeta(q.explanation, 500),
                "isCorrect": true,
              },
            }
          : {}),
      },
    ],
  };
}
