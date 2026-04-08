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
    },
    {
      pattern: {
        exam_type: 'GATE',
        branch: 'CSE',
        topic_name: "Backtracking",
      },
      questions: [
        {
          question_text: "Which of the following best describes the Backtracking technique?",
          options: [
            "A. Build solution incrementally, abandon a path as soon as it violates constraints",
            "B. Divide the problem into subproblems and combine results",
            "C. Greedily pick the locally optimal choice at each step",
            "D. Store results of overlapping subproblems to avoid recomputation"
          ],
          correct_answer: "A",
          explanation: "Backtracking incrementally builds candidates and abandons (backtracks) as soon as a partial candidate cannot lead to a valid solution.",
          difficulty_level: "Easy"
        },
        {
          question_text: "The N-Queens problem asks to place N queens on an N×N board such that no two queens attack each other. Which paradigm is most naturally used?",
          options: [
            "A. Dynamic Programming",
            "B. Greedy",
            "C. Backtracking",
            "D. Divide and Conquer"
          ],
          correct_answer: "C",
          explanation: "N-Queens places queens row by row and backtracks when a conflict is detected, making it a classic backtracking problem.",
          difficulty_level: "Easy"
        },
        {
          question_text: "In backtracking, a node in the state-space tree is called a 'dead end' when:",
          options: [
            "A. It has no children",
            "B. It leads to a valid solution",
            "C. All its children violate the constraints (bounding function fails)",
            "D. It is at the maximum depth"
          ],
          correct_answer: "C",
          explanation: "A dead end (or non-promising node) is one where the bounding function determines no valid solution can exist in its subtree.",
          difficulty_level: "Easy"
        },
        {
          question_text: "Which data structure is implicitly used by a recursive backtracking algorithm?",
          options: [
            "A. Queue",
            "B. Stack",
            "C. Heap",
            "D. Hash Table"
          ],
          correct_answer: "B",
          explanation: "Recursive calls use the call stack implicitly; backtracking unwinds this stack when a dead end is reached.",
          difficulty_level: "Easy"
        },
        {
          question_text: "What is the worst-case time complexity of solving the N-Queens problem using backtracking?",
          options: [
            "A. O(N!)",
            "B. O(N^2)",
            "C. O(2^N)",
            "D. O(N log N)"
          ],
          correct_answer: "A",
          explanation: "In the worst case, N queens are placed across N rows with N, N-1, N-2, ... choices respectively, giving O(N!) node explorations.",
          difficulty_level: "Medium"
        },
        {
          question_text: "The Subset Sum problem with backtracking on a set of N elements has a state-space tree with how many leaf nodes in the worst case?",
          options: [
            "A. N",
            "B. N^2",
            "C. 2^N",
            "D. N!"
          ],
          correct_answer: "C",
          explanation: "Each element is either included or excluded, yielding 2^N possible subsets as leaf nodes.",
          difficulty_level: "Medium"
        },
        {
          question_text: "In the graph coloring problem with m colors and n vertices using backtracking, what is the worst-case time complexity?",
          options: [
            "A. O(m^n)",
            "B. O(n^m)",
            "C. O(m × n)",
            "D. O(n!)"
          ],
          correct_answer: "A",
          explanation: "At each of the n vertices, up to m color choices exist, giving a state-space tree of size O(m^n).",
          difficulty_level: "Medium"
        },
        {
          question_text: "Which of the following is NOT a standard application of backtracking?",
          options: [
            "A. Solving Sudoku",
            "B. Hamiltonian Cycle problem",
            "C. Shortest path in a weighted graph",
            "D. Generating all permutations of a string"
          ],
          correct_answer: "C",
          explanation: "Shortest path in a weighted graph is solved by Dijkstra's or Bellman-Ford (greedy/DP). The others are classic backtracking problems.",
          difficulty_level: "Medium"
        },
        {
          question_text: "In backtracking, the function that determines whether a partial solution can possibly be extended to a complete valid solution is called:",
          options: [
            "A. Objective function",
            "B. Bounding function (pruning condition)",
            "C. Heuristic function",
            "D. Cost function"
          ],
          correct_answer: "B",
          explanation: "The bounding (or pruning) function checks feasibility of a partial candidate; if it fails, the subtree is pruned.",
          difficulty_level: "Medium"
        },
        {
          question_text: "Consider a backtracking solution for generating all permutations of n distinct elements. How many nodes does the state-space tree contain?",
          options: [
            "A. n!",
            "B. n × n!",
            "C. Σ(k=0 to n) n!/(n-k)!",
            "D. 2^n"
          ],
          correct_answer: "C",
          explanation: "The state-space tree has levels 0 to n. Level k has n!/(n-k)! nodes (partial permutations of length k). Summing all levels gives Σ n!/(n-k)!.",
          difficulty_level: "Hard"
        },
        {
          question_text: "In the Hamiltonian Cycle problem solved via backtracking on a graph with n vertices, the worst-case number of partial paths explored is:",
          options: [
            "A. O(n!)",
            "B. O(2^n)",
            "C. O(n^2)",
            "D. O(n × 2^n)"
          ],
          correct_answer: "A",
          explanation: "Without effective pruning, each vertex is tried in each position giving (n-1)! cycles ⇒ O(n!) worst case.",
          difficulty_level: "Hard"
        },
        {
          question_text: "Which pruning strategy in backtracking for the 0/1 Knapsack problem cuts branches where the remaining items cannot improve the current best solution even if added fractionally?",
          options: [
            "A. Forward checking",
            "B. Arc consistency",
            "C. Upper bound pruning (using fractional relaxation)",
            "D. Constraint propagation"
          ],
          correct_answer: "C",
          explanation: "By computing an upper bound via fractional knapsack relaxation on remaining items, branches where this bound ≤ current best are pruned, significantly reducing the search space.",
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
