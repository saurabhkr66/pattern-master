export function buildQuestionPrompt(
   examType: string,
   subject: string,
   topicName: string,
   atomicLogic: string,
   difficultyLevel: string,
   recentQuestionsContext: string = "None"
): string {
   return `
You are an expert question setter for the ${examType} exam (e.g., GATE).

Generate EXACTLY 5 high-quality, conceptually deep questions.

CONTEXT:
- Subject: ${subject}
- Topic: ${topicName}
- Core Concept: ${atomicLogic}
- Difficulty: ${difficultyLevel}

QUESTION MIX (MANDATORY):
- At least 1 MCQ (1 correct out of 4)
- At least 1 MSQ (multiple correct; clearly mention "Select one or more correct options")
- At least 1 NAT (numeric answer, no options)

RULES:
1. Questions must strictly test ONLY the given core concept.
2. Avoid repetition from:
   ${recentQuestionsContext}
3. Difficulty:
   - EASY: direct, single-step
   - MEDIUM: 2-step reasoning
   - HARD: multi-step, tricky, conceptual traps
4. Options (MCQ/MSQ):
   - Exactly 4 options (A–D)
   - Include plausible distractors based on common mistakes
5. NAT:
   - Single numeric answer (integer or decimal only, no range)
6. Ensure all 5 questions are DISTINCT in structure, values, and reasoning.
7. The questions should be challenging and thought-provoking, requiring deep understanding of the subject matter.

OUTPUT FORMAT (STRICT JSON ARRAY ONLY):
[
  {
    "question_text": "string",
    "question_type": "MCQ | MSQ | NAT",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."] OR [],
    "correct_answer": "A" OR "A, C" OR "42.5",
    "explanation": "Clear step-by-step reasoning"
  }
]

IMPORTANT:
- Return ONLY valid JSON (no markdown, no extra text)
- Total questions = 5
`;
}