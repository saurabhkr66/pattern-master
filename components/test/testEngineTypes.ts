export interface TestQuestion {
  id: string;
  source: "pyq" | "template";
  sectionIndex: number;
  sectionName: string;
  isOptional: boolean;
  question_text: string;
  options: string[] | null;
  question_type: "MCQ" | "MSQ" | "NAT";
  marks: number;
  year?: number;
  subject: string;
  topic?: string;
  images?: { index: number; filename: string }[] | null;
}

export interface SubmitAnswer {
  questionId: string;
  source: "pyq" | "template";
  sectionIndex: number;
  isOptional: boolean;
  questionType: string;
  marks: number;
  userAnswer: string | null;
  subject: string;
  timeSpentSecs: number;
}

// GATE 5-state model:
//  unseen         → Not Visited (no entry)
//  skipped        → Visited but Not Answered
//  answered       → Answered (no flag)
//  review         → Marked for Review, NOT answered
//  answeredReview → Answered AND Marked for Review (counted for evaluation)
export type QStatus = "unseen" | "answered" | "skipped" | "review" | "answeredReview";

export interface DraftState {
  mcqAnswers?: Record<string, string>;
  msqAnswers?: Record<string, string[]>;
  natValues?: Record<string, string>;
  statuses?: Record<string, string>;
  markedReview?: string[];
  timeSpentMap?: Record<string, number>;
  currentQId?: string;
  activeSectionIdx?: number;
}

export const optionLetters = ["A", "B", "C", "D", "E", "F"];

export function sectionQuestions(questions: TestQuestion[], sectionIdx: number) {
  return questions.filter((q) => q.sectionIndex === sectionIdx);
}
