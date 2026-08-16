import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sortStoredOptions } from "@/lib/dppOptions";

// Loads a released DPP for PRACTICE mode — answer key included.
//
// ⚠️ Deliberately a separate module from lib/dppPaper.ts, not a flag on it.
// getDppPaper's entire guarantee is that correct_answer/explanation never enter
// the process on the Test path; a `withAnswers: boolean` parameter would put the
// leak one typo away and make that guarantee unreviewable. Two loaders means the
// Test path structurally cannot serve answers, and this one obviously does.
//
// Practice mode reveals each answer as you go, so the key MUST reach the client
// — PracticeButton grades locally (evaluateAnswer) with no server round-trip.
// That is the same contract the existing practice feed and PYQ mode already
// have; DPP is not a new exposure. It does mean a student can read the answers
// here and then take the same sheet as a scored Test, which the challenge loop
// cannot detect. Accepted: the mode picker offers both openly, and a DPP is a
// learning sheet, not an invigilated exam.

/** One question in the shape PracticeButton's family expects. Note `options` is
 *  the FLAT label-prefixed form ("A. newton") — the charAt(0) contract, NOT the
 *  index-based form TestEngine needs. */
export type DppPracticeQuestion = {
  id: string;
  question_text: string;
  question_text_hindi: string | null;
  options: string[];
  options_hindi: string[] | null;
  correct_answer: string;
  explanation: string;
  explanation_hindi: string | null;
  question_type: string;
  difficulty_level: string | null;
  marks: number;
  images: unknown;
  /** Marks this row as belonging to no gradeable table. PracticeButton keys its
   *  persistence guards off this — see the note in that file. Mirrors the
   *  existing `_isPyq` / `_isSubjectPyq` / `isMock` discriminators. */
  _isDpp: true;
};

export type DppPractice = {
  dppId: string;
  name: string;
  patternId: string;
  topicName: string;
  subject: string;
  questions: DppPracticeQuestion[];
};

async function loadDppPractice(dppId: string): Promise<DppPractice | null> {
  const dpp = await prisma.dpp.findFirst({
    where: { id: dppId, is_public: true, status: "ready" },
    select: {
      id: true,
      name: true,
      pattern_id: true,
      pattern: { select: { topic_name: true, subject: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          question_text: true,
          question_text_hindi: true,
          options: true,
          options_hindi: true,
          correct_answer: true,
          explanation: true,
          explanation_hindi: true,
          question_type: true,
          difficulty_level: true,
          marks: true,
          images: true,
        },
      },
    },
  });

  if (!dpp || dpp.questions.length === 0) return null;

  const questions: DppPracticeQuestion[] = dpp.questions.map((q) => {
    const options = sortStoredOptions(q.options);

    // Hindi options are matched to English by LABEL, never by position — the
    // translation pass can reorder or drop one, and a positional pairing would
    // silently attach the wrong text to a letter. On any mismatch Hindi is
    // dropped: English is strictly better than a misaligned translation. Same
    // rule as lib/dppPaper.ts and lib/dppAdapter.ts.
    const rawHi = Array.isArray(q.options_hindi) ? q.options_hindi : [];
    let optionsHindi: string[] | null = null;
    if (rawHi.length === options.length && options.length > 0) {
      const hi = sortStoredOptions(rawHi);
      const letter = (s: string) => s.trim().charAt(0).toUpperCase();
      if (hi.every((s, i) => letter(s) === letter(options[i]))) optionsHindi = hi;
    }

    return {
      id: q.id,
      question_text: q.question_text,
      question_text_hindi: q.question_text_hindi,
      options,
      options_hindi: optionsHindi,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      explanation_hindi: q.explanation_hindi,
      question_type: q.question_type,
      difficulty_level: q.difficulty_level,
      marks: q.marks,
      images: q.images ?? null,
      _isDpp: true as const,
    };
  });

  return {
    dppId: dpp.id,
    name: dpp.name,
    patternId: dpp.pattern_id,
    topicName: dpp.pattern.topic_name,
    subject: dpp.pattern.subject,
    questions,
  };
}

/** Cached alongside the Test paper: content is immutable for a released DPP, and
 *  the admin edit routes already bust `dpp-<id>` on every mutation. */
export const getDppPractice = (dppId: string) =>
  unstable_cache(() => loadDppPractice(dppId), ["dpp-practice", dppId], {
    revalidate: 86400,
    tags: ["dpp", `dpp-${dppId}`],
  })();

/**
 * Has this student already submitted a scored run of this DPP?
 *
 * THE gate on practice mode, and the reason practice is safe to offer at all.
 * Practice ships the answer key to the browser, so reaching it before a scored
 * attempt would let anyone read the answers and then take the "timed test" —
 * silently making every DppRun score, and therefore the whole challenge loop,
 * meaningless. After a submission there is nothing left to protect: the result
 * page already shows every answer and explanation.
 *
 * Deliberately uncached. It is per-user, it flips the instant a run is
 * submitted, and it is a security boundary — a stale `true` would open the leak
 * this exists to close. The (dpp_id, user_id) lookup is served by the
 * `[user_id, submitted_at]` index.
 */
export async function hasSubmittedRun(dppId: string, userId: string): Promise<boolean> {
  const run = await prisma.dppRun.findFirst({
    where: { dpp_id: dppId, user_id: userId, status: "submitted" },
    select: { id: true },
  });
  return run !== null;
}
