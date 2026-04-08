import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

/**
 * Normalizes text and generates a SHA-256 hash.
 * Embedded directly to avoid relative path resolution issues during seeding.
 */
function generateSemanticHash(text: string): string {
  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalizedText).digest('hex');
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding bulk questions...');

  const questionData = [
    {
      pattern: {
        exam_type: 'GATE',
        branch: 'CSE',
        topic_name: "Divide and Conquer",
      },
      questions: [
        {
          question_text: "Consider the recurrence T(n) = 2T(n/2) + n. What is the time complexity?",
          options: [
            "A. O(n)",
            "B. O(n log n)",
            "C. O(n^2)",
            "D. O(log n)"
          ],
          correct_answer: "B",
          explanation: "Using Master Theorem: a=2, b=2, f(n)=n → case 2 ⇒ T(n)=O(n log n).",
          difficulty_level: "Easy"
        },
        {
          question_text: "Which of the following algorithms uses the Divide and Conquer paradigm?",
          options: [
            "A. Dijkstra’s Algorithm",
            "B. Merge Sort",
            "C. Prim’s Algorithm",
            "D. BFS"
          ],
          correct_answer: "B",
          explanation: "Merge Sort divides the array and recursively sorts subarrays before merging.",
          difficulty_level: "Easy"
        },
        {
          question_text: "The worst-case time complexity of Quick Sort is:",
          options: [
            "A. O(n log n)",
            "B. O(n)",
            "C. O(n^2)",
            "D. O(log n)"
          ],
          correct_answer: "C",
          explanation: "Worst case occurs when pivot divides array unevenly, leading to T(n)=T(n−1)+n ⇒ O(n^2).",
          difficulty_level: "Easy"
        },
        {
          question_text: "Which recurrence represents Merge Sort?",
          options: [
            "A. T(n) = T(n-1) + n",
            "B. T(n) = 2T(n/2) + n",
            "C. T(n) = T(n/2) + n",
            "D. T(n) = nT(n/2)"
          ],
          correct_answer: "B",
          explanation: "Merge sort divides into two halves and merges in linear time.",
          difficulty_level: "Medium"
        },
        {
          question_text: "What is the time complexity of Binary Search using Divide and Conquer?",
          options: [
            "A. O(n)",
            "B. O(log n)",
            "C. O(n log n)",
            "D. O(1)"
          ],
          correct_answer: "B",
          explanation: "Binary search halves the problem each time ⇒ O(log n).",
          difficulty_level: "Medium"
        },
        {
          question_text: "Consider T(n) = 3T(n/2) + n. Using Master Theorem, what is the complexity?",
          options: [
            "A. O(n)",
            "B. O(n log n)",
            "C. O(n^log₂3)",
            "D. O(n^2)"
          ],
          correct_answer: "C",
          explanation: "a=3, b=2 ⇒ n^(log₂3) dominates ⇒ T(n)=O(n^log₂3).",
          difficulty_level: "Medium"
        },
        {
          question_text: "Which of the following problems is NOT typically solved using Divide and Conquer?",
          options: [
            "A. Merge Sort",
            "B. Binary Search",
            "C. Matrix Multiplication (Strassen)",
            "D. Breadth First Search"
          ],
          correct_answer: "D",
          explanation: "BFS is a graph traversal algorithm, not divide and conquer.",
          difficulty_level: "Medium"
        },
        {
          question_text: "Consider T(n) = 2T(n/2) + n log n. What is the complexity?",
          options: [
            "A. O(n log n)",
            "B. O(n log^2 n)",
            "C. O(n^2)",
            "D. O(log n)"
          ],
          correct_answer: "B",
          explanation: "Using Master Theorem case 2 extension ⇒ T(n)=O(n log^2 n).",
          difficulty_level: "Hard"
        },
        {
          question_text: "In Divide and Conquer, the 'combine' step refers to:",
          options: [
            "A. Splitting the problem",
            "B. Solving subproblems",
            "C. Merging results of subproblems",
            "D. Eliminating recursion"
          ],
          correct_answer: "C",
          explanation: "Combine step merges the solutions of subproblems.",
          difficulty_level: "Easy"
        },
        {
          question_text: "What is the recurrence for worst-case Quick Sort when pivot is smallest element?",
          options: [
            "A. T(n)=2T(n/2)+n",
            "B. T(n)=T(n-1)+n",
            "C. T(n)=T(n/2)+n",
            "D. T(n)=nT(n/2)"
          ],
          correct_answer: "B",
          explanation: "Worst case splits into n-1 and 0 ⇒ T(n)=T(n-1)+n.",
          difficulty_level: "Hard"
        },
        {
          question_text: "Strassen’s Matrix Multiplication reduces complexity from O(n^3) to:",
          options: [
            "A. O(n^2)",
            "B. O(n^2.81)",
            "C. O(n log n)",
            "D. O(n^3 log n)"
          ],
          correct_answer: "B",
          explanation: "Strassen reduces multiplication count ⇒ O(n^2.81).",
          difficulty_level: "Hard"
        },
        {
          question_text: "Which case of Master Theorem applies when f(n) = Θ(n^log_b a)?",
          options: [
            "A. Case 1",
            "B. Case 2",
            "C. Case 3",
            "D. None"
          ],
          correct_answer: "B",
          explanation: "Case 2 applies when f(n)=Θ(n^log_b a), giving T(n)=Θ(n^log_b a log n).",
          difficulty_level: "Hard"
        }
      ]
    }
  ];

  for (const item of questionData) {
    // 1. Find the pattern first
    const pattern = await prisma.pattern.findUnique({
      where: {
        pattern_identifier: {
          exam_type: item.pattern.exam_type,
          branch: item.pattern.branch,
          topic_name: item.pattern.topic_name
        }
      }
    });

    if (!pattern) {
      console.warn(`⚠️ Pattern not found for: ${item.pattern.topic_name}. Skipping questions.`);
      continue;
    }

    console.log(`📝 Seeding ${item.questions.length} questions for topic: ${pattern.topic_name}`);

    for (const q of item.questions) {
      // Calculate hash automatically if not provided
      const hash = generateSemanticHash(q.question_text);
      
      await prisma.generatedQuestion.upsert({
        where: { semantic_hash: hash },
        update: {
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty_level: q.difficulty_level,
          pattern_id: pattern.id
        },
        create: {
          ...q,
          semantic_hash: hash,
          pattern_id: pattern.id
        }
      });
    }
  }

  console.log('✨ Question seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding questions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
