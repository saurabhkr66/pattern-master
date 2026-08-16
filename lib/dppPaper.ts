import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ExamConfig } from "@/lib/examConfigs";
import type { TestQuestion } from "@/components/test/testEngineTypes";
import { orderedOptions, dppDurationSecs } from "@/lib/dppOptions";

// Builds a DPP paper in TestEngine shape, answer-free.
//
// Modelled on lib/coachingPaper.ts, whose header states the contract that
// matters most here: "display and grading must agree on this logic." For DPP
// that agreement is not automatic — the option normalisation that guarantees it
// lives in lib/dppOptions.ts (kept out of this server-only module so it stays
// unit-testable, and because the grader needs the same functions).
export {
  orderedOptions,
  engineLetterToLabel,
  engineAnswerToStored,
  dppDurationSecs,
} from "@/lib/dppOptions";

export type DppPaper = {
  dppId: string;
  name: string;
  topicName: string;
  subject: string;
  questions: TestQuestion[];
  /** Per-question label arrays, keyed by question id. SERVER ONLY — never sent
   *  to the client; the grader needs it to invert the engine's letters. */
  labelsByQuestion: Record<string, string[]>;
  config: ExamConfig;
  maxScore: number;
};

/**
 * Load a released DPP as an answer-free paper.
 *
 * The Prisma `select` omits correct_answer / explanation / blind_answer /
 * verify_answer — selection IS the strip, so the answer key never enters the
 * process on this path. Returns null when the DPP is missing or not released.
 */
async function loadDppPaper(dppId: string): Promise<DppPaper | null> {
  const dpp = await prisma.dpp.findFirst({
    where: { id: dppId, is_public: true, status: "ready" },
    select: {
      id: true,
      name: true,
      pattern: { select: { topic_name: true, subject: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          question_text: true,
          question_text_hindi: true,
          options: true,
          options_hindi: true,
          question_type: true,
          marks: true,
          images: true,
        },
      },
    },
  });

  if (!dpp || dpp.questions.length === 0) return null;

  const topicName = dpp.pattern.topic_name;
  const subject = dpp.pattern.subject;
  const labelsByQuestion: Record<string, string[]> = {};

  const questions: TestQuestion[] = dpp.questions.map((q) => {
    const { options, labels } = orderedOptions(q.options);
    labelsByQuestion[q.id] = labels;

    // Hindi options are aligned to the SAME permutation as English by matching
    // labels — never by position, because the two arrays can differ in order.
    // On any mismatch Hindi is dropped rather than misaligned: showing English
    // is strictly better than attaching the wrong text to a letter.
    let optionsHindi: string[] | null = null;
    const rawHi = Array.isArray(q.options_hindi) ? (q.options_hindi as unknown[]) : [];
    if (rawHi.length === labels.length && labels.length > 0) {
      const hi = orderedOptions(rawHi);
      if (hi.labels.length === labels.length && hi.labels.every((l, i) => l === labels[i])) {
        optionsHindi = hi.options;
      }
    }

    return {
      id: q.id,
      source: "dpp",
      sectionIndex: 0,
      sectionName: topicName,
      isOptional: false,
      question_text: q.question_text,
      options: options.length ? options : null,
      question_type: q.question_type as TestQuestion["question_type"],
      marks: q.marks,
      subject,
      topic: topicName,
      images: (q.images as TestQuestion["images"]) ?? null,
      question_text_hindi: q.question_text_hindi,
      options_hindi: optionsHindi,
    };
  });

  const maxScore = questions.reduce((s, q) => s + q.marks, 0);

  const config: ExamConfig = {
    examType: "GATE",
    label: `${dpp.name} · ${topicName}`,
    description: "",
    emoji: "⚡",
    pyqUnit: "topic",
    hasBranches: false,
    durationSecs: dppDurationSecs(questions.length),
    totalQuestions: questions.length,
    maxScore,
    sections: [
      {
        name: topicName,
        subjects: null,
        totalQuestions: questions.length,
        maxScore,
        questionTypes: ["MCQ", "MSQ", "NAT"] as ("MCQ" | "MSQ" | "NAT")[],
        markDistribution: [],
        // No negative marking on a DPP — there is no exam config behind it, and
        // negative marks on a short quiz produce demoralising scores.
        negativePerMark: 0,
      },
    ],
    themeColor: "#ff8f00",
    instructions: [
      "Answer all questions. There is no negative marking.",
      "Your answers are submitted when you click Submit or when time runs out.",
    ],
  };

  return {
    dppId: dpp.id,
    name: dpp.name,
    topicName,
    subject,
    questions,
    labelsByQuestion,
    config,
    maxScore,
  };
}

/** Cached paper. Content is immutable for a released DPP; the admin edit routes
 *  bust `dpp-<id>` when a sheet changes. */
export const getDppPaper = (dppId: string) =>
  unstable_cache(() => loadDppPaper(dppId), ["dpp-paper", dppId], {
    revalidate: 86400,
    tags: ["dpp", `dpp-${dppId}`],
  })();
