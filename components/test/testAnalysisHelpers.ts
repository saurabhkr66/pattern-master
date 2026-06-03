export interface ResultData {
  examType?: string;
  mockTestId?: string | null;
  score: number;
  maxScore: number;
  accuracy: number;
  timeTakenSecs: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  sectionBreakdown?: {
    name: string; score: number; max: number; correct: number; total: number;
    wrong?: number; skipped?: number;
    accuracy: number; timeSpentSecs: number;
    topics: { topic: string; score: number; max: number; correct: number; total: number; accuracy: number; timeSpentSecs: number; }[];
  }[];
  subjectBreakdown: {
    subject: string; score: number; max: number; correct: number; total: number; accuracy: number; timeSpentSecs: number;
  }[];
  questions: {
    id: string; question_text: string; options: string[] | null; question_type: string;
    correct_answer: string; user_answer: string | null; is_correct: boolean | null;
    marks: number; awarded?: number; subject: string; topic?: string; explanation?: string; timeSpentSecs: number;
  }[];
}

export function shortAns(answer: string | null, type: string): string {
  if (!answer) return "—";
  if (type === "NAT") return answer;
  if (type === "MSQ") return answer.split(";").map(l => l.trim().toUpperCase()).join(", ");
  return answer.trim().toUpperCase();
}

export function fmtTime(secs: number): string {
  if (!secs || secs < 0) return "0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Strip LaTeX and HTML tags so question preview is plain text
export function plainPreview(text: string): string {
  return (text || "")
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$[^$\n]*?\$/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const COL_STYLE = "3rem 5rem 1fr 6rem 8rem 5rem 4rem 9rem";
