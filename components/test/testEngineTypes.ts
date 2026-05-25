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

export type QStatus = "unseen" | "answered" | "skipped" | "review";

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
