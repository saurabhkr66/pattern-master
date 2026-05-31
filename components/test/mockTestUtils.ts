import type { ExamConfig, ExamType, QType } from "@/lib/examConfigs";
import type { ResultData } from "@/components/test/TestAnalysis";

type SectionAcc = {
  name: string; score: number; max: number; correct: number; total: number; timeSpentSecs: number;
  topics: Record<string, { topic: string; score: number; max: number; correct: number; total: number; timeSpentSecs: number }>;
};
type SubjectAcc = { subject: string; score: number; max: number; correct: number; total: number; timeSpentSecs: number };

export function buildResultData(
  breakdown: any[],
  scores: { score: number; maxScore: number; correctCount: number; wrongCount: number; skippedCount: number; timeTakenSecs: number },
  meta: { examType?: string; mockTestId?: string | null },
): ResultData {
  const sectionMap: Record<string, SectionAcc> = {};
  const subjectMap: Record<string, SubjectAcc> = {};

  for (const q of breakdown) {
    const secName = q.sectionName || "Section";
    if (!sectionMap[secName]) sectionMap[secName] = { name: secName, score: 0, max: 0, correct: 0, total: 0, timeSpentSecs: 0, topics: {} };
    const sec = sectionMap[secName];
    sec.max += q.marks; sec.total += 1;
    sec.timeSpentSecs += q.timeSpentSecs || 0;
    if (q.isCorrect) { sec.score += q.marks; sec.correct += 1; }

    const topName = q.topic || "Uncategorized";
    if (!sec.topics[topName]) sec.topics[topName] = { topic: topName, score: 0, max: 0, correct: 0, total: 0, timeSpentSecs: 0 };
    const top = sec.topics[topName];
    top.max += q.marks; top.total += 1;
    top.timeSpentSecs += q.timeSpentSecs || 0;
    if (q.isCorrect) { top.score += q.marks; top.correct += 1; }

    const subName = q.subject || "General";
    if (!subjectMap[subName]) subjectMap[subName] = { subject: subName, score: 0, max: 0, correct: 0, total: 0, timeSpentSecs: 0 };
    const sub = subjectMap[subName];
    sub.max += q.marks; sub.total += 1;
    sub.timeSpentSecs += q.timeSpentSecs || 0;
    if (q.isCorrect) { sub.score += q.marks; sub.correct += 1; }
  }

  const accuracy = (scores.correctCount + scores.wrongCount) > 0
    ? (scores.correctCount / (scores.correctCount + scores.wrongCount)) * 100 : 0;

  return {
    examType: meta.examType as ExamType | undefined,
    mockTestId: meta.mockTestId ?? null,
    score: scores.score, maxScore: scores.maxScore, accuracy,
    timeTakenSecs: scores.timeTakenSecs,
    attempted: scores.correctCount + scores.wrongCount,
    correct: scores.correctCount, incorrect: scores.wrongCount, unattempted: scores.skippedCount,
    sectionBreakdown: Object.values(sectionMap).map(s => ({
      name: s.name, score: s.score, max: s.max, correct: s.correct, total: s.total, timeSpentSecs: s.timeSpentSecs,
      accuracy: s.total > 0 ? (s.correct / s.total) * 100 : 0,
      topics: Object.values(s.topics).map(t => ({
        topic: t.topic, score: t.score, max: t.max, correct: t.correct, total: t.total, timeSpentSecs: t.timeSpentSecs,
        accuracy: t.total > 0 ? (t.correct / t.total) * 100 : 0,
      })),
    })),
    subjectBreakdown: Object.values(subjectMap).map(sub => ({
      subject: sub.subject, score: sub.score, max: sub.max, correct: sub.correct, total: sub.total, timeSpentSecs: sub.timeSpentSecs,
      accuracy: sub.total > 0 ? (sub.correct / sub.total) * 100 : 0,
    })),
    questions: breakdown.map((q: any) => ({
      id: q.questionId, question_text: q.questionText, options: q.options,
      question_type: q.questionType, correct_answer: q.correctAnswer,
      user_answer: q.userAnswer, is_correct: q.isCorrect,
      marks: q.marks, awarded: typeof q.awardedMarks === "number" ? q.awardedMarks : undefined,
      subject: q.subject || "General", topic: q.topic || undefined, explanation: q.explanation,
      timeSpentSecs: q.timeSpentSecs || 0,
    })),
  };
}

export function fmtNeg(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n - 1 / 3) < 0.01) return "−⅓";
  if (Math.abs(n - 2 / 3) < 0.01) return "−⅔";
  if (Math.abs(n - 1 / 2) < 0.01) return "−½";
  if (Math.abs(n - Math.round(n)) < 0.01) return `−${Math.round(n)}`;
  return `−${n.toFixed(2).replace(/\.?0+$/, "")}`;
}

export function getMarkingRows(
  config: ExamConfig,
  examType: ExamType | null,
): { type: QType; marks: string; neg: string }[] {
  const typeMarks: Record<string, Set<number>> = {};
  for (const sec of config.sections) {
    for (const band of sec.markDistribution) {
      const types = band.type ? [band.type] : sec.questionTypes;
      for (const t of types) {
        if (!typeMarks[t]) typeMarks[t] = new Set();
        typeMarks[t].add(band.marks);
      }
    }
  }
  const negFrac = config.sections[0]?.negativePerMark ?? 0;
  const isAdv = examType === "JEE_ADVANCED";
  const order: QType[] = ["MCQ", "MSQ", "NAT"];
  const rows: { type: QType; marks: string; neg: string }[] = [];
  for (const t of order) {
    const set = typeMarks[t];
    if (!set || set.size === 0) continue;
    const marks = [...set].sort((a, b) => a - b);
    const marksStr = marks.map((m) => `+${m}`).join(" / ");
    let negStr: string;
    if (t === "MCQ") {
      negStr = negFrac === 0 ? "No negative" : marks.map((m) => fmtNeg(m * negFrac)).join(" / ");
    } else if (t === "MSQ") {
      negStr = isAdv ? "Partial credit · 0 wrong" : "All-or-nothing · 0 wrong";
    } else {
      negStr = "0 wrong";
    }
    rows.push({ type: t, marks: marksStr, neg: negStr });
  }
  return rows;
}
