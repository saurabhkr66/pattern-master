export function buildQuestionPrompt(
    examType: string,
    subject: string,
    topicName: string,
    atomicLogic: string,
    difficultyLevel: string,
    recentQuestionsContext: string = "None"
): string {
    return `
You are an expert question setter for the ${examType} examination (e.g., GATE), known for creating conceptually deep and tricky questions.

Generate FIVE high-quality multiple-choice question.

SUBJECT: ${subject}
TOPIC: ${topicName}
CORE CONCEPT (Atomic Logic): ${atomicLogic}
DIFFICULTY: ${difficultyLevel}

STRICT REQUIREMENTS:

1. The question MUST strictly test ONLY the given atomic logic, but at a deep conceptual level.
2. The question should require multi-step reasoning, calculation, or conceptual deduction (not direct formula substitution).
3. Avoid storytelling. Use concise, technical, exam-style language similar to actual GATE papers.
4. Include realistic numerical values where appropriate (integers, fractions, or standard constants).
5. The difficulty must match ${difficultyLevel}:
   - EASY → single concept, direct reasoning
   - MEDIUM → 2-step reasoning
   - HARD → tricky, multi-step, conceptual traps

6. Options must:
   - Be very close to each other (to test precision)
   - Include common conceptual mistakes as distractors
   - Be non-obvious (avoid easy elimination)

7. Do NOT repeat patterns, numbers, or structures from:
   ${recentQuestionsContext}

8. Ensure the question is solvable and unambiguous.

OUTPUT FORMAT (STRICT JSON ARRAY, NO EXTRA TEXT):
[
  {
    "question_text": "string",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "A | B | C | D",
    "explanation": "Step-by-step clear explanation with reasoning"
  }
]

Return exactly 5 objects in the array. No markdown, no preamble.
`;
}