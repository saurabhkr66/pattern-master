// Shared shape of a subjective answer inside TestAttempt.answers (JSON).
// Imported by both client (test engine, review panel) and server (finalize,
// grading worker, result builder) — keep this file dependency-free.
//
// Objective answers stay plain strings in the answers JSON; subjective answers
// are this object. `image_keys` holds R2 object KEYS (never URLs) — readers
// presign a GET per request, so photos stay private.
//
// Final-marks precedence (implemented in lib/coachingScore.ts):
//   manual_override                      if set
//   gemini_marks                         if !flagged && confidence ∈ {high, medium}
//   0 + pending                          otherwise (flagged | low | ungraded)

export type SubjectiveConfidence = "high" | "medium" | "low";

/** One entry in the grading audit trail — logged whenever marks change. */
export interface GradeHistoryEntry {
  from: number | null; // previous marks (null = first grade / ungraded)
  to: number;          // new marks awarded
  by: string;          // who: admin id / "ai" / "revert"
  at: string;          // ISO timestamp
}

export interface SubjectiveAnswerEntry {
  type: "subjective";
  /** R2 object keys (max 3 photos), in page order. */
  image_keys: string[];
  /** AI-awarded marks, clamped to [0, question marks]. null = not yet graded. */
  gemini_marks: number | null;
  gemini_feedback: string | null;
  gemini_confidence: SubjectiveConfidence | null;
  /**
   * Model answer Gemini wrote itself because none was found in the question's
   * source (the answer-key PDF). null = a real model answer existed, so grading
   * used that instead.
   */
  generated_model_answer: string | null;
  /** Grading failed (image fetch / Gemini error) — needs teacher / retry. */
  flagged: boolean;
  /** Teacher's final marks — always wins over gemini_marks. */
  manual_override: number | null;
  /** Who graded manually (coaching admin email/id); null = AI only. */
  graded_by: string | null;
  /** ISO timestamp of the manual grade. */
  graded_at: string | null;
  /** Tokens the AI grading call used (for the super-admin cost view). Optional —
   *  absent on entries graded before token accounting, or graded manually. */
  gemini_input_tokens?: number | null;
  gemini_output_tokens?: number | null;
  gemini_thinking_tokens?: number | null;
  /** Audit trail: logged whenever marks change (teacher override, revert, AI grade). */
  grade_history?: GradeHistoryEntry[];
}

export const MAX_SUBJECTIVE_PHOTOS = 3;

export function isSubjectiveEntry(v: unknown): v is SubjectiveAnswerEntry {
  return (
    !!v &&
    typeof v === "object" &&
    (v as { type?: unknown }).type === "subjective" &&
    Array.isArray((v as { image_keys?: unknown }).image_keys)
  );
}

/** Blank entry for a freshly submitted answer (photos uploaded, not yet graded). */
export function newSubjectiveEntry(imageKeys: string[]): SubjectiveAnswerEntry {
  return {
    type: "subjective",
    image_keys: imageKeys,
    gemini_marks: null,
    gemini_feedback: null,
    gemini_confidence: null,
    generated_model_answer: null,
    flagged: false,
    manual_override: null,
    graded_by: null,
    graded_at: null,
  };
}
