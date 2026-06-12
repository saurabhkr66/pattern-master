import "server-only";
import { stripAnswers } from "@/lib/resolveQuestions";
import { optionPermutation, optionSeed } from "@/lib/coachingTestRuntime";
import {
  getResolvedTestQuestions,
  studentQuestionsFromBase,
  type CachedFullTest,
} from "@/lib/coachingQuestionCache";
import type { ExamConfig } from "@/lib/examConfigs";
import type { TestQuestion } from "@/components/test/testEngineTypes";

/**
 * Builds THIS student's paper (questions in engine shape + ExamConfig) from the
 * Redis-cached resolved set. Extracted from the student test page so the
 * pre-stage `paper` endpoint and any server render share one implementation —
 * the submit endpoint independently re-derives the same set/permutations for
 * grading, so display and grading must agree on this logic.
 *
 * Answer-free by construction (stripAnswers); safe to send to the client.
 */
export type StudentPaper = {
  questions: TestQuestion[];
  config: ExamConfig;
};

export async function buildStudentPaper(
  test: CachedFullTest,
  coachingId: string,
  studentId: string
): Promise<StudentPaper | null> {
  // Resolved set is cached in Redis per test; this student's paper (pool +
  // shuffle) is derived from it in memory — no per-student question DB read.
  const base = await getResolvedTestQuestions(test, coachingId);
  const resolved = studentQuestionsFromBase(base, test, studentId);
  if (resolved.length === 0) return null;
  const safe = resolved.map(stripAnswers);

  // Group the paper into sections by the question's subject (its section). Order
  // follows first-appearance; a single-subject paper collapses to one section
  // (the engine only shows section tabs when there's more than one).
  const sectionOrder: string[] = [];
  for (const q of safe) {
    const s = q.subject ?? "General";
    if (!sectionOrder.includes(s)) sectionOrder.push(s);
  }

  const engineQuestions: TestQuestion[] = safe.map((q) => {
    // Per-student option shuffle (MCQ only). The submit endpoint applies the
    // same permutation in reverse to grade — see optionPermutation.
    let options = q.options.length ? q.options : null;
    // Hindi options kept in the SAME order as English so the answer letter maps;
    // apply the identical per-student permutation to both.
    let optionsHi = q.options_hindi.length ? q.options_hindi : null;
    if (test.shuffle && q.question_type === "mcq" && options) {
      const perm = optionPermutation(optionSeed(studentId, test.id, q.id), options.length);
      options = perm.map((p) => options![p]);
      if (optionsHi && optionsHi.length === perm.length) {
        optionsHi = perm.map((p) => optionsHi![p]);
      }
    }
    const secName = q.subject ?? "General";
    return {
      id: q.id,
      source: "template" as const, // engine union is pyq|template; coaching maps to template
      sectionIndex: sectionOrder.indexOf(secName),
      sectionName: secName,
      isOptional: false,
      question_text: q.question_text,
      options,
      question_type:
        q.question_type === "nat"
          ? "NAT"
          : q.question_type === "msq"
            ? "MSQ"
            : q.question_type === "subjective"
              ? "SUBJECTIVE"
              : "MCQ",
      marks: q.marks,
      subject: q.subject ?? "General",
      topic: q.topic ?? undefined,
      images: q.images ?? null,
      question_text_hindi: q.question_text_hindi,
      options_hindi: optionsHi,
    };
  });

  const maxScore = engineQuestions.reduce((s, q) => s + q.marks, 0);

  const config: ExamConfig = {
    examType: "GATE",
    label: test.title,
    description: test.description ?? "",
    emoji: "📝",
    pyqUnit: "topic",
    hasBranches: false,
    durationSecs: test.duration_secs,
    totalQuestions: engineQuestions.length,
    maxScore,
    sections: sectionOrder.map((name) => {
      const secQs = engineQuestions.filter((q) => q.sectionName === name);
      return {
        name,
        subjects: null,
        totalQuestions: secQs.length,
        maxScore: secQs.reduce((s, q) => s + q.marks, 0),
        questionTypes: ["MCQ", "NAT"] as ("MCQ" | "MSQ" | "NAT")[],
        markDistribution: [],
        negativePerMark: 0,
      };
    }),
    themeColor: "#6366f1",
    instructions: [
      "Do not switch tabs or leave the page — switches are recorded.",
      "Your answers are submitted when you click Submit or when time runs out.",
    ],
  };

  return { questions: engineQuestions, config };
}
