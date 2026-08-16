// Objective answer checking, shared by the mock-test submit route and DPP.
//
// Extracted verbatim from app/api/test/submit/route.ts, which re-imports these
// rather than keeping its own copies. Behaviour is deliberately unchanged — this
// grades live mock submissions, so any "improvement" here silently rescores real
// tests.
//
// Why DPP cannot use `scoreQuestion` from lib/resolveQuestions.ts instead: that
// one reads a separate `nat_tolerance` field and does
// `parseFloat(correct_answer)`. DPP encodes tolerance INSIDE correct_answer as a
// "lo:hi" range (see lib/dppAdapter.ts), so `parseFloat("9.75:9.85")` yields
// 9.75 with no tolerance and every toleranced NAT would grade wrong. `checkNat`
// below already understands the range form.

/**
 * NAT: exact string match, or containment in a "lo:hi" / "lo to hi" range.
 * The range form is how both PYQ answers and DPP tolerances are stored.
 */
export function checkNat(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer) return false;
  const ca = correctAnswer.trim();
  const val = parseFloat(userAnswer.trim());
  if (ca.includes(":") && !ca.toLowerCase().includes(" to ")) {
    const [minStr, maxStr] = ca.split(":");
    return !isNaN(val) && val >= parseFloat(minStr) && val <= parseFloat(maxStr);
  }
  if (/ to /i.test(ca)) {
    const [minStr, maxStr] = ca.split(/ to /i);
    return !isNaN(val) && val >= parseFloat(minStr) && val <= parseFloat(maxStr);
  }
  return userAnswer.trim() === ca;
}

/** MSQ: order- and separator-insensitive set equality over labels. */
export function checkMsq(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer) return false;
  const userSet = userAnswer.split(/[;,]/).map((s) => s.trim().toUpperCase()).filter(Boolean).sort();
  const correctSet = correctAnswer.split(/[;,]/).map((s) => s.trim().toUpperCase()).filter(Boolean).sort();
  return JSON.stringify(userSet) === JSON.stringify(correctSet);
}

/** MCQ: case-insensitive label equality. */
export function checkMcq(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer) return false;
  return userAnswer.trim().toUpperCase() === correctAnswer.trim().toUpperCase();
}

export function isAnswerCorrect(
  questionType: string,
  userAnswer: string,
  correctAnswer: string,
): boolean {
  if (questionType === "MCQ") return checkMcq(userAnswer, correctAnswer);
  if (questionType === "MSQ") return checkMsq(userAnswer, correctAnswer);
  if (questionType === "NAT") return checkNat(userAnswer, correctAnswer);
  return false;
}
