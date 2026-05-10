/**
 * seed_mock_questions.ts
 *
 * Seeds whole exam papers directly as seeded MockTestTemplates.
 * Each paper name (title) becomes a separate mock paper in the UI.
 *
 * HOW TO ADD A PAPER
 * ───────────────────
 * Add an entry to the `papers` array below.
 *
 *   {
 *     title:     "NEET 2025",          ← unique name shown in UI
 *     exam_type: "NEET",               ← "GATE"|"JEE_MAIN"|"JEE_ADVANCED"|"NEET"
 *     branch:    null,                 ← null for JEE/NEET; "CSE"/"ECE"/… for GATE
 *     sections: [
 *       {
 *         name: "Physics",             ← must match section name in examConfigs.ts
 *         questions: [ ...paste here... ],
 *       },
 *       { name: "Chemistry", questions: [...] },
 *       ...
 *     ],
 *   },
 *
 * QUESTION SHAPE (same format as neet_2025.json / seed_pyqs.ts)
 * ───────────────────────────────────────────────────────────────
 *   {
 *     question_text:  "...",
 *     options:        ["A. ...", "B. ...", "C. ...", "D. ..."],  // [] for NAT
 *     correct_answer: "A",        // letter for MCQ/MSQ, number string for NAT
 *     explanation:    "...",
 *     year:           2025,
 *     marks:          4,          // 1|2 for GATE; 4 for JEE/NEET
 *     question_type:  "MCQ",      // "MCQ" | "MSQ" | "NAT"
 *     images:         [],         // [{index:1, filename:"path/img.webp"}] or []
 *   }
 *
 * OPTIONAL QUESTIONS (Section B)
 * ───────────────────────────────
 *   NEET   : per section — first 35 mandatory, last 15 optional (attempt any 10)
 *   JEE Main: per section — first 20 MCQ mandatory, last 10 NAT optional (attempt any 5)
 *   GATE   : all mandatory
 *
 * HOW TO RUN
 * ───────────
 *   npx tsx prisma/seed_mock_questions.ts
 *
 * Papers are upserted by title+exam_type+branch — safe to re-run.
 * mock_number is auto-assigned (1st paper per exam = #1, 2nd = #2 …).
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { getExamConfig, type ExamType } from '../lib/examConfigs';

const prisma = new PrismaClient();

/* ═══════════════════════════════════════════════════════════════════
   TYPE
═══════════════════════════════════════════════════════════════════ */
interface RawQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  year: number;
  marks: number;
  question_type: 'MCQ' | 'MSQ' | 'NAT';
  images?: { index: number; filename: string; type?: string }[];
  topic_name?: string;
  exam_type?: string;
}

interface PaperSection {
  name: string;    // must match ExamConfig section name
  questions: RawQuestion[];
}

interface Paper {
  title: string;
  exam_type: ExamType;
  branch: string | null;
  sections: PaperSection[];
}

/* ═══════════════════════════════════════════════════════════════════
   PAPERS  ← add your papers here
═══════════════════════════════════════════════════════════════════ */

const papers: Paper[] = [

  /* ──────────────────────────────────────────────────────────
     NEET 2025
     Physics   : 35 mandatory MCQ + 15 optional MCQ = 50 Qs
     Chemistry : 35 mandatory MCQ + 15 optional MCQ = 50 Qs
     Botany    : 35 mandatory MCQ + 15 optional MCQ = 50 Qs
     Zoology   : 35 mandatory MCQ + 15 optional MCQ = 50 Qs
     Total     : 200 Qs, 720 marks, 3h 20min
  ────────────────────────────────────────────────────────── */
  // {
  //   title: 'NEET 2025',
  //   exam_type: 'NEET',
  //   branch: null,
  //   sections: [
  //     {
  //       name: 'Physics',
  //       questions: []
  //     },
  //     {
  //       name: 'Chemistry',
  //       questions: []
  //     },
  //     {
  //       name: 'Biology',
  //       questions: []
  //     },
  //   ],
  // },

  /* ──────────────────────────────────────────────────────────
     NEET 2024
  ────────────────────────────────────────────────────────── */
  // {
  //   title: 'NEET 2024',
  //   exam_type: 'NEET',
  //   branch: null,
  //   sections: [
  //     { name: 'Physics', questions: [ /* paste here */] },
  //     { name: 'Chemistry', questions: [ /* paste here */] },
  //     { name: 'Biology', questions: [ /* paste here */] },
  //   ],
  // },

  /* ──────────────────────────────────────────────────────────
     JEE MAIN 2025 (Jan)
     Physics / Chemistry / Mathematics
     20 MCQ (mandatory) + 10 NAT (optional, attempt 5) per subject
     Total: 90 Qs, 300 marks, 3h
  ────────────────────────────────────────────────────────── */

 
  // {
  //   title: 'JEE Main 2025 April 8 shift 2',
  //   exam_type: 'JEE_MAIN',
  //   branch: null,
  //   sections: [
  //     {
  //       name: 'Physics',
  //       questions: []
  //     },
  //     {
  //       name: 'Chemistry',
  //       questions:[]
  //     },
  //     {
  //       name: 'Mathematics',
  //       questions: []
  //     },
  //   ],
  // },

  /* ──────────────────────────────────────────────────────────
     JEE ADVANCED 2025 Paper 1
     Physics / Chemistry / Mathematics
     18 Qs per subject (6 MCQ + 6 MSQ + 6 NAT)
     Total: 54 Qs, 186 marks, 3h
  ────────────────────────────────────────────────────────── */
  {
    title: 'JEE Advanced 2025 Paper 1',
    exam_type: 'JEE_ADVANCED',
    branch: null,
    sections: [
      { name: 'Physics', questions: [ /* paste here */] },
      { name: 'Chemistry', questions: [ /* paste here */] },
      { name: 'Mathematics', questions: [ /* paste here */] },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     GATE CSE 2025
     General Aptitude: 10 Qs (5×1M + 5×2M)
     CSE:              55 Qs (25×1M + 30×2M)
     Total: 65 Qs, 100 marks, 3h
  ────────────────────────────────────────────────────────── */
  {
    title: 'GATE CSE 2010 ',
    exam_type: 'GATE',
    branch: 'CSE',
    sections: [
      {
        name: 'General Aptitude',
        questions: [{
          "topic_name": "General Aptitude",
          "question_text": "Choose the most appropriate word from the options given below to complete the following sentence: His rather casual remarks on politics ________ his lack of seriousness about the subject.",
          "images": [],
          "options": [
            "A. masked",
            "B. belied",
            "C. betrayed",
            "D. suppressed"
          ],
          "correct_answer": "C",
          "explanation": "",
          "year": 0,
          "marks": 1,
          "exam_type": "GATE CSE",
          "question_type": "MCQ"
        },
          {
            "topic_name": "General Aptitude",
            "question_text": "Which of the following options is the closest in meaning to the word given below: Circuitous",
            "images": [],
            "options": [
              "A. cyclic",
              "B. indirect",
              "C. confusing",
              "D. crooked"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "General Aptitude",
            "question_text": "Choose the most appropriate word from the options given below to complete the following sentence: His rather casual remarks on politics ________ his lack of seriousness about the subject.",
            "images": [],
            "options": [
              "A. masked",
              "B. belied",
              "C. betrayed",
              "D. suppressed"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "General Aptitude",
            "question_text": "25 persons are in a room. 15 of them play hockey, 17 of them play football and 10 of them play both hockey and football. Then the number of persons playing neither hockey nor football is:",
            "images": [],
            "options": [
              "A. 2",
              "B. 17",
              "C. 13",
              "D. 3"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "General Aptitude",
            "question_text": "The question below consists of a pair of related words followed by four pairs of words. Select the pair that best expresses the relation in the original pair. Unemployed : Worker",
            "images": [],
            "options": [
              "A. fallow : land",
              "B. unaware : sleeper",
              "C. wit : jester",
              "D. renovated : house"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "General Aptitude",
            "question_text": "If 137+276=435 how much is 731+672?",
            "images": [],
            "options": [
              "A. 534",
              "B. 1403",
              "C. 1623",
              "D. 1513"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "General Aptitude",
            "question_text": "Hari(H), Gita(G), Irfan(I) and Saira(S) are siblings (i.e., brothers and sisters). All were born on 1st January. The age difference between any two successive siblings (that is born one after another) is less than three years. Given the following facts: i. Hari's age + Gita's age > Irfan's age + Saira's age ii. The age difference between Gita and Saira is one year. However Gita is not the oldest and Saira is not the youngest. iii. There are no twins. In what order they were born (oldest first)?",
            "images": [],
            "options": [
              "A. HSIG",
              "B. SGHI",
              "C. IGSH",
              "D. IHSG"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "General Aptitude",
            "question_text": "Modern warfare has changed from large scale clashes of armies to suppression of civilian populations. Chemical agents that do their work silently appear to be suited to such warfare; and regretfully, there exist people in military establishments who think that chemical agents are useful tools for their cause. Which of the following statements best sums up the meaning of the above passage:",
            "images": [],
            "options": [
              "A. Modern warfare has resulted in civil strife.",
              "B. Chemical agents are useful in modern warfare.",
              "C. Use of chemical agents in warfare would be undesirable.",
              "D. People in military establishments like to use chemical agents in war."
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "General Aptitude",
            "question_text": "5 skilled workers can build a wall in 20 days; 8 semi-skilled workers can build a wall in 25 days; 10 unskilled workers can build a wall in 30 days. If a team has 2 skilled, 6 semi-skilled and 5 unskilled workers, how long it will take to build the wall?",
            "images": [],
            "options": [
              "A. 20 days",
              "B. 18 days",
              "C. 16 days",
              "D. 15 days"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "General Aptitude",
            "question_text": "Given digits 2, 2, 3, 3, 3, 4, 4, 4, 4 how many distinct 4 digit numbers greater than 3000 can be formed?",
            "images": [],
            "options": [
              "A. 50",
              "B. 51",
              "C. 52",
              "D. 54"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          }]
      },
      {
        name: 'CSE',
        questions: [{
          "topic_name": "Discrete Mathematics",
          "question_text": "Let G=(V, E) be a graph. Define $\\xi (G)=\\sum_{d}i_{d}*d$ , where $i_{d}$ is the number of vertices of degree d in G. If S and T are two different trees with $\\xi (S)=\\xi (T)$ , then",
          "images": [],
          "options": [
            "A. |S|= 2|T|",
            "B. |S|=|T|-1",
            "C. |S|=|T|",
            "D. |S|=|T|+1"
          ],
          "correct_answer": "C",
          "explanation": "",
          "year": 0,
          "marks": 1,
          "exam_type": "GATE CSE",
          "question_type": "MCQ"
        },
          {
            "topic_name": "Engineering Mathematics",
            "question_text": "Newton-Raphson method is used to compute a root of the equation $x^{2} -13=0$ with 3.5 as the initial value. The approximation after one iteration is",
            "images": [],
            "options": [
              "A. 3.575",
              "B. 3.676",
              "C. 3.667",
              "D. 3.607"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Discrete Mathematics",
            "question_text": "What is the possible number of reflexive relations on a set of 5 elements?",
            "images": [],
            "options": [
              "A. $2^{10}$",
              "B. $2^{15}$",
              "C. $2^{20}$",
              "D. $2^{25}$"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          
          {
            "topic_name": "Computer Organization",
            "question_text": "The following are some events that occur after a device controller issues an interrupt while process L is under execution. (P) The processor pushes the process status of L onto the control stack. (Q) The processor finishes the execution of the current instruction. (R) The processor executes the interrupt service routine. (S) The processor pops the process status of L from the control stack. (T) The processor loads the new PC value based on the interrupt. Which one of the following is the correct order in which the events above occur?",
            "images": [],
            "options": [
              "A. QPTRS",
              "B. PTRSQ",
              "C. TRPQS",
              "D. QTPRS"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Operating System",
            "question_text": "Consider a process executing on an operating system that uses demand paging. The average time for a memory access in the system is M units if the corresponding memory page is available in memory, and D units if the memory access causes a page fault. It has been experimentally measured that the average time taken for a memory access in the process is X units. Which one of the following is the correct expression for the page fault rate experienced by the process?",
            "images": [],
            "options": [
              "A. (D - M) / (X - M)",
              "B. (X - M) / (D - M)",
              "C. (D - X) / (D - M)",
              "D. (X - M) / (D - X)"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Database Management System",
            "question_text": "In an Entity-Relationship (ER) model, suppose R is a many-to-one relationship from entity set E1 to entity set E2. Assume that E1 and E2 participate totally in R and that the cardinality of E1 is greater than the cardinality of E2. Which one of the following is true about R?",
            "images": [],
            "options": [
              "A. Every entity in E1 is associated with exactly one entity in E2.",
              "B. Some entity in E1 is associated with more than one entity in E2.",
              "C. Every entity in E2 is associated with exactly one entity in E1.",
              "D. Every entity in E2 is associated with at most one entity in E1."
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Database Management System",
            "question_text": "Consider the following two tables and four queries in SQL. Which one of the queries above is certain to have an output that is a superset of the outputs of the other three queries?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_consider-the-following-two-tables-a_img1.jpg"
              }
            ],
            "options": [
              "A. Query 1",
              "B. Query 2",
              "C. Query 3",
              "D. Query 4"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Discrete Mathematics",
            "question_text": "Consider the set S = {1, $\\omega ,\\omega ^{2}$ }, where $\\omega$ and $\\omega ^{2}$ are cube roots of unity. If * denotes the multiplication operation, the structure (S, *) forms",
            "images": [],
            "options": [
              "A. A group",
              "B. A ring",
              "C. An integral domain",
              "D. A field"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Engineering Mathematics",
            "question_text": "What is the value of $\\lim_{n\\rightarrow \\infty }(1-\\frac{1}{n})^{2n}$ ?",
            "images": [],
            "options": [
              "A. 0",
              "B. $e^{-2}$",
              "C. $e^{-1/2}$",
              "D. 1"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Digital Logic",
            "question_text": "The minterm expansion of f(P,Q,R)=PQ+QR'+PR' is",
            "images": [],
            "options": [
              "A. $m_{2}+m_{4}+m_{6}+m_{7}$",
              "B. $m_{0}+m_{1}+m_{3}+m_{5}$",
              "C. $m_{0}+m_{1}+m_{6}+m_{7}$",
              "D. $m_{2}+m_{3}+m_{4}+m_{5}$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Computer Organization",
            "question_text": "A main memory unit with a capacity of 4 megabytes is built using 1Mx1-bit DRAM chips. Each DRAM chip has 1K rows of cells with 1K cells in each row. The time taken for a single refresh operation is 100 nanoseconds. The time required to perform one refresh operation on all the cells in the memory unit is",
            "images": [],
            "options": [
              "A. 100 nanoseconds",
              "B. 100 * $2^{10}$ nanoseconds",
              "C. 100* $2^{20}$ nanoseconds",
              "D. 3200* $2^{20}$ nanoseconds"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Digital Logic",
            "question_text": "P is a 16-bit signed integer. The 2's complement representation of P is $(F87B)_{16}$ . The 2's complement representation of 8*P is",
            "images": [],
            "options": [
              "A. $(C3D8)_{16}$",
              "B. $(187B)_{16}$",
              "C. $(F878)_{16}$",
              "D. $(987B)_{16}$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Digital Logic",
            "question_text": "The Boolean expression for the output f of the multiplexer shown below is",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_the-boolean-expression-for-the-outp_img1.jpg"
              }
            ],
            "options": [
              "A. $\\overline{P\\bigoplus Q\\bigoplus R}$",
              "B. $P\\bigoplus Q\\bigoplus R$",
              "C. P+Q+R",
              "D. $\\overline{P+Q+R}$"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Data Structure",
            "question_text": "In a binary tree with n nodes, every node has an odd number of descendants. Every node is considered to be its own descendant. What is the number of nodes in the tree that have exactly one child?",
            "images": [],
            "options": [
              "A. 0",
              "B. 1",
              "C. (n-1)/2",
              "D. n-1"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "C Programming",
            "question_text": "What does the following program print? #include < stdio.h > void f (int *p, int * q) { p=q; *p=2; } int i= 0, j= 1; int main ( ){ f(&i, & j); printf( \"%d%d \\ n\", i,j); return 0; }",
            "images": [],
            "options": [
              "A. 2 2",
              "B. 2 1",
              "C. 0 1",
              "D. 0 2"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Algorithm",
            "question_text": "Two alternative packages A and B are available for processing a database having $10^{k}$ records. Package A requires 0.0001 $n^{2}$ time units and package B requires $10n \\log _{{10}} n$ time units to process n records. What is the smallest value of k for which package B will be preferred over A?",
            "images": [],
            "options": [
              "A. 12",
              "B. 10",
              "C. 6",
              "D. 5"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Compiler Design",
            "question_text": "Which data structure in a compiler is used for managing information about variables and their attributes?",
            "images": [],
            "options": [
              "A. Abstract syntax tree",
              "B. Symbol table",
              "C. Semantic stack",
              "D. Parse table"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Compiler Design",
            "question_text": "Which languages necessarily need heap allocation in the runtime environment?",
            "images": [],
            "options": [
              "A. Those that support recursion",
              "B. Those that use dynamic scoping",
              "C. Those that allow dynamic data structures",
              "D. Those that use global variables"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Computer Network",
            "question_text": "One of the header fields in an IP datagram is the Time to Live (TTL) field. Which of the following statements best explains the need for this field?",
            "images": [],
            "options": [
              "A. It can be used to prioritize packets",
              "B. It can be used to reduce delays",
              "C. It can be used to optimize throughput",
              "D. It can be used to prevent packet looping"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Computer Network",
            "question_text": "Which one of the following is not a client server application?",
            "images": [],
            "options": [
              "A. Internet chat",
              "B. Web browsing",
              "C. E-mail",
              "D. Ping"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Theory of Computation",
            "question_text": "Let L1 be a recursive language. Let L2 and L3 be languages that are recursively enumerable but not recursive. Which of the following statements is not necessarily true?",
            "images": [],
            "options": [
              "A. L2 - L1 is recursively enumerable",
              "B. L1 - L3 is recursively enumerable",
              "C. L2 $\\cup$ L1 is recursively enumerable",
              "D. L2 $\\cap$ L1 is recursively enumerable"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Data Structure",
            "question_text": "Consider a B+-tree in which the maximum number of keys in a node is 5. What is the minimum number of keys in any non-root node?",
            "images": [],
            "options": [
              "A. 1",
              "B. 2",
              "C. 3",
              "D. 4"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Database Management System",
            "question_text": "A relational schema for a train reservation database is given below What pids are returned by the following SQL query for the above instance of the tables? SELECT pid FROM Re servation WHERE class = 'AC' AND EXISTS (SELECT * FROM Passenger WHERE age > 65 AND Passenger.pid = Reservation.pid)",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_a-relational-schema-for-a-train-res_img1.jpg"
              }
            ],
            "options": [
              "A. 1,0",
              "B. 1,2",
              "C. 1,3",
              "D. 1,5"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Database Management System",
            "question_text": "Which of the following concurrency control protocols ensure both conflict serializability and freedom from deadlock? I. 2-phase locking II. Time-stamp ordering",
            "images": [],
            "options": [
              "A. I only",
              "B. II only",
              "C. Both I and II",
              "D. Neither I nor II"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Software Engg",
            "question_text": "The cyclomatic complexity of each of the modules A and B shown below is 10. What is the cyclomatic complexity of the sequential integration shown on the right hand side?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_the-cyclomatic-complexity-of-each-o_img1.jpg"
              }
            ],
            "options": [
              "A. 19",
              "B. 21",
              "C. 20",
              "D. 10"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Software Engg",
            "question_text": "What is the appropriate pairing of items in the two columns listing various activities encountered in a software life cycle?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_what-is-the-appropriate-pairing-of_img1.jpg"
              }
            ],
            "options": [
              "A. P-3, Q-2,R-4,S-1",
              "B. P-2, Q-3,R-1,S-4",
              "C. P-3, Q-2,R-1,S-4",
              "D. P-2, Q-3,R-4,S-1"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Operating System",
            "question_text": "Consider the methods used by processes P1 and P2 for accessing their critical sections whenever needed, as given below. The initial values of shared boolean variables S1 and S2 are randomly assigned. Which one of the following statements describes the properties achieved?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_consider-the-methods-used-by-proces_img1.jpg"
              }
            ],
            "options": [
              "A. Mutual exclusion but not progress",
              "B. Progress but not mutual exclusion",
              "C. Neither mutual exclusion nor progress",
              "D. Both mutual exclusion and progress"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Operating System",
            "question_text": "A system uses FIFO policy for page replacement. It has 4 page frames with no pages loaded to begin with. The system first accesses 100 distinct pages in some order and then accesses the same 100 pages but now in the reverse order. How many page faults will occur?",
            "images": [],
            "options": [
              "A. 196",
              "B. 192",
              "C. 197",
              "D. 195"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Operating System",
            "question_text": "Which of the following statements are true? I. Shortest remaining time first scheduling may cause starvation II. Preemptive scheduling may cause starvation III. Round robin is better than FCFS in terms of response time",
            "images": [],
            "options": [
              "A. I only",
              "B. I and III only",
              "C. II and III only",
              "D. I, II and III"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Discrete Mathematics",
            "question_text": "Consider a company that assembles computers. The probability of a faulty assembly of any computer is p. The company therefore subjects each computer to a testing process. This testing process gives the correct result for any computer with a probability of q. What is the probability of a computer being declared faulty?",
            "images": [],
            "options": [
              "A. pq + (1 - p) (1 - q)",
              "B. (1 - q)p",
              "C. (1 - p) q",
              "D. pq"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Discrete Mathematics",
            "question_text": "What is the probability that divisor of $10^{99}$ is a multiple of $10^{96}$ ?",
            "images": [],
            "options": [
              "A. $1/625$",
              "B. $4/625$",
              "C. $12/625$",
              "D. $16/625$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Discrete Mathematics",
            "question_text": "The degree sequence of a simple graph is the sequence of the degrees of the nodes in the graph in decreasing order. Which of the following sequences can not be the degree sequence of any graph? I. 7, 6, 5, 4, 4, 3, 2, 1 II. 6, 6, 6, 6, 3, 3, 2, 2 III. 7, 6, 6, 4, 4, 3, 2, 2 IV. 8, 7, 7, 6, 4, 2, 1, 1",
            "images": [],
            "options": [
              "A. I and II",
              "B. III and IV",
              "C. IV only",
              "D. II and IV"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Engineering Mathematics",
            "question_text": "Consider the following matrix $A=\\begin{bmatrix} 2 & 3\\\\ X&Y \\end{bmatrix}$ If the eigenvalues of A are 4 and 8, then",
            "images": [],
            "options": [
              "A. x = 4, y = 10",
              "B. x = 5, y = 8",
              "C. x = -3,y = 9",
              "D. x = -4, y = 10"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Discrete Mathematics",
            "question_text": "Suppose the predicate F(x,y,t) is used to represent the statement that person x can fool person y at time t. which one of the statements below expresses best the meaning of the formula $\\forall x \\exists y \\exists t(\\neg F (x, y, t))$ ?",
            "images": [],
            "options": [
              "A. Everyone can fool some person at some time",
              "B. No one can fool everyone all the time",
              "C. Everyone cannot fool some person all the time",
              "D. No one can fool some person at some time"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Digital Logic",
            "question_text": "What is the Boolean Algebra for the output f of the combinational logic circuit of NOR gates given below?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_what-is-the-boolean-algebra-for-the_img1.jpg"
              }
            ],
            "options": [
              "A. $\\overline{Q+R}$",
              "B. $\\overline{P+Q}$",
              "C. $\\overline{P+R}$",
              "D. $\\overline{P+Q+R}$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Digital Logic",
            "question_text": "In the sequential circuit shown below, if the initial value of the output $Q_{1}Q_{0}$ is 00, what are the next four values of $Q_{1}Q_{0}$ ?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_in-the-sequential-circuit-shown-bel_img1.jpg"
              }
            ],
            "options": [
              "A. 11,10,01,00",
              "B. 10,11,01,00",
              "C. 10,00,01,11",
              "D. 11,10,00,01"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Computer Organization",
            "question_text": "A 5-stage pipelined processor has Instruction Fetch (IF), Instruction Decode (ID), Operand Fetch (OF), Perform Operation (PO) and Write Operand (WO) stages. The IF, ID, OF and WO stages take 1 clock cycle each for any instruction. The PO stage takes 1 clock cycle for ADD and SUB instructions, 3 clock cycles for MUL instruction, and 6 clock cycles for DIV instruction respectively. Operand forwarding is used in the pipeline. What is the number of clock cycles needed to execute the following sequence of instructions?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_a-5stage-pipelined-processor-has-in_img1.jpg"
              }
            ],
            "options": [
              "A. 13",
              "B. 15",
              "C. 17",
              "D. 19"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Engineering Mathematics",
            "question_text": "The weight of a sequence $a_{0},a_{1},...,a_{n-1}$ of real numbers is defined as $a_{0}+a_{1}/2+...+a_{n-1}/2^{n-1}$ A subsequence of a sequence is obtained by deleting some elements from the sequence, keeping the order of the remaining elements the same. Let X denote the maximum possible weight of a subsequence of $a_{0},a_{1},...,a_{n-1}$ and Y the maximum possible weight of a subsequence of $a_{0},a_{1},...,a_{n-1}$ . Then X is equal to",
            "images": [],
            "options": [
              "A. max(Y, $a_{0}$ +Y)",
              "B. max(Y, $a_{0}$ +Y/2)",
              "C. max(Y, $a_{0}$ +2Y)",
              "D. $a_{0}$ +Y/2"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "C Programming",
            "question_text": "What is the value printed by the following C program? #include < stdio.h > int f(int * a, int n) { if(n<=0)return 0; else if(*a% 2 ==0) return *a+f(a+1,n-1); else return *a-f(a+1,n-1); } int main ( ) { int a[ ] {12, 7, 13, 4, 11, 6}; printf (\"%d\", f(a,6)); return 0; }",
            "images": [],
            "options": [
              "A. -9",
              "B. 5",
              "C. 15",
              "D. 19"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Data Structure",
            "question_text": "The following C function takes a simply-linked list as input argument. It modifies the list by moving the last element to the front of the list and returns the modified list. Some part of the code is left blank. typedef struct node { int value; struct node *next; } Node; Node *move_to_front(Node *head) { Node *p, *q; if ((head = = NULL: || (head->next = = NULL)) return head; q = NULL; p = head; while (p-> next !=NULL) { q=P; p=p->next; } _______________________________ return head; } Choose the correct alternative to replace the blank line.",
            "images": [],
            "options": [
              "A. q = NULL; p $\\rightarrow$ next = head; head = p;",
              "B. q $\\rightarrow$ next = NULL; head = p; p $\\rightarrow$ next = head;",
              "C. head = p; p $\\rightarrow$ next = q; q $\\rightarrow$ next = NULL;",
              "D. q $\\rightarrow$ next = NULL; p $\\rightarrow$ next = head; head = p;"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Compiler Design",
            "question_text": "The program below uses six temporary variables a, b, c, d, e, f. a =1 b= 10 c =20 d= a +b e= c +d f =c +e b= c+ e e =b +f d =5 +e return d +f Assuming that all operations take their operands from registers, what is the minimum number of registers needed to execute this program without spilling?",
            "images": [],
            "options": [
              "A. 2",
              "B. 3",
              "C. 4",
              "D. 6"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Compiler Design",
            "question_text": "The grammar S $\\rightarrow$ aSa|bS|c is",
            "images": [],
            "options": [
              "A. LL(1) but not LR(1)",
              "B. LR(1) but not LR(1)",
              "C. Both LL(1) and LR(1)",
              "D. Neither LL(1) nor LR(1)"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Theory of Computation",
            "question_text": "Let L = {w $\\in$ (0 + 1)*|w has even number of 1s}, i.e. L is the set of all bit strings with even number of 1s. Which one of the regular expressions below represents L?",
            "images": [],
            "options": [
              "A. (0 *10 *1) *",
              "B. 0 * (10 *10 *) *",
              "C. 0 * (10 *1) * 0 *",
              "D. 0 *1(10 *1) *10 *"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Theory of Computation",
            "question_text": "Consider the languages $L1=\\{0^{i}1^{j}\\;| \\; i\\neq j\\}$ . $L2=\\{0^{i}1^{j}\\;| \\; i=j\\}$ . $L3=\\{0^{i}1^{j}\\;| \\; i=2j+1\\}$ . $L4=\\{0^{i}1^{j}\\;| \\; i \\neq 2j\\}$ Which one of the following statements is true?",
            "images": [],
            "options": [
              "A. Only L2 is context free",
              "B. Only L2 and L3 are context free",
              "C. Only L1 and L3 are context free",
              "D. All are context free"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Theory of Computation",
            "question_text": "Let w be any string of length n in {0, 1}*. Let L be the set of all substrings of w. What is the minimum number of states in a non-deterministic finite automaton that accepts L?",
            "images": [],
            "options": [
              "A. n-1",
              "B. n",
              "C. n+1",
              "D. $2^{n-1}$"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Database Management System",
            "question_text": "Consider the following schedule for transactions T1, T2 and T3: Which one of the schedules below is the correct serialization of the above?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_consider-the-following-schedule-for_img1.jpg"
              }
            ],
            "options": [
              "A. T1 $\\rightarrow$ T3 $\\rightarrow$ T2",
              "B. T2 $\\rightarrow$ T1 $\\rightarrow$ T3",
              "C. T2 $\\rightarrow$ T3 $\\rightarrow$ T1",
              "D. T3 $\\rightarrow$ T1 $\\rightarrow$ T2"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Database Management System",
            "question_text": "The following functional dependencies hold for relations R(A, B, C) and S(B, D, E) B $\\rightarrow$ A, A $\\rightarrow$ C The relation R contains 200tuples and the relation S contains 100tuples. What is the maximum number of tuples possible in the natural join R $\\Join$ S?",
            "images": [],
            "options": [
              "A. 100",
              "B. 200",
              "C. 300",
              "D. 2000"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Software Engg",
            "question_text": "The following program is to be tested for statement coverage: begin if (a ==b) {S1; exit;} else if (c ==d) {S2;} else {S3; exit;} S4; end The test cases T1, T2, T3 and T4 given below are expressed in terms of the properties satisfied by the values of variables a, b, c and d. The exact values are not given. T1 : a, b, c and d are all equal T2 : a, b, c and d are all distinct T3 : a=b and c !=d T4 : a !=b and c=d Which of the test suites given below ensures coverage of statements S1, S2, S3 and S4?",
            "images": [],
            "options": [
              "A. T1, T2, T3",
              "B. T2, T4",
              "C. T3, T4",
              "D. T1, T2, T4"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Operating System",
            "question_text": "The following program consists of 3 concurrent processes and 3 binary semaphores. The semaphores are initialized as S0=1, S1=0, S2=0. How many times will process P0 print '0'? How many times will process P0 print '0'?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_the-following-program-consists-of-3_img1.jpg"
              }
            ],
            "options": [
              "A. At least twice",
              "B. Exactly twice",
              "C. Exactly thrice",
              "D. Exactly once"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Operating System",
            "question_text": "A system has n resources $R_{0},...R_{n-1}$ , and k processes $P_{0},...P_{k-1}$ . The implementation of the resource request logic of each process $P_{i}$ is as follows: if (i%2= = 0) { if (i < n) request [latex]R_{i}[/latex] ; if (i+2 < n)request [latex]R_{i+2}[/latex]; } else { if (i < n) request [latex]R_{n-i}[/latex]; if (i+2 < n)request [latex]R_{n-i-2}[/latex] ; } In which one of the following situations is a deadlock possible?",
            "images": [],
            "options": [
              "A. n = 40,k = 26",
              "B. n = 21,k = 12",
              "C. n = 20,k = 10",
              "D. n = 41,k = 19"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Computer Network",
            "question_text": "Suppose computers A and B have IP addresses 10.105.1.113 and 10.105.1.91 respectively and they both use the same net mask N. Which of the values of N given below should not be used if A and B should belong to the same network?",
            "images": [],
            "options": [
              "A. 255.255.255.0",
              "B. 255.255.255.128",
              "C. 255.255.255.192",
              "D. 255.255.255.224"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Computer Organization",
            "question_text": "A computer system has an L1 cache, an L2 cache, and a main memory unit connected as shown below. The block size in L1 cache is 4 words. The block size in L2 cache is 16 words. The memory access times are 2 nanoseconds. 20 nanoseconds and 200 nanoseconds for L1 cache, L2 cache and main memory unit respectively. When there is a miss in L1 cache and a hit in L2 cache, a block is transferred from L2 cache to L1 cache. What is the time taken for this transfer?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_a-computer-system-has-an-l1-cache-a_img1.jpg"
              }
            ],
            "options": [
              "A. 2 nanoseconds",
              "B. 20 nanoseconds",
              "C. 22 nanoseconds",
              "D. 88 nanoseconds"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Algorithm",
            "question_text": "Consider a complete undirected graph with vertex set {0, 1, 2, 3, 4}. Entry $W_{ij}$ in the matrix W below is the weight of the edge {i, j}. $\\begin{pmatrix} 0&1 & 8 & 1 &4 \\\\ 1& 0 & 12 & 4 & 9\\\\ 8 & 12 & 0 & 7 & 3\\\\ 1& 4& 7 & 0 &2 \\\\ 4& 9 & 3& 2 &0 \\end{pmatrix}$ What is the minimum possible weight of a spanning tree T in this graph such that vertex 0 is a leaf node in the tree T?",
            "images": [],
            "options": [
              "A. 7",
              "B. 8",
              "C. 9",
              "D. 10"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Data Structure",
            "question_text": "A hash table of length 10 uses open addressing with hash function h(k)=k mod 10, and linear probing. After inserting 6 values into an empty hash table, the table is as shown below Which one of the following choices gives a possible order in which the key values could have been inserted in the table?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_a-hash-table-of-length-10-uses-open_img1.jpg"
              }
            ],
            "options": [
              "A. 46, 42, 34, 52, 23, 33",
              "B. 34, 42, 23, 52, 33, 46",
              "C. 46, 34, 42, 23, 52, 33",
              "D. 42, 46, 33, 23, 34, 52"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Computer Network",
            "question_text": "Consider a network with 6 routers R1 to R6 connected with links having weights as shown in the following diagram All the routers use the distance vector based routing algorithm to update their routing tables. Each router starts with its routing table initialized to contain an entry for each neighbour with the weight of the respective connecting link. After all the routing tables stabilize, how many links in the network will never be used for carrying any data?",
            "images": [
              {
                "index": 1,
                "filename": "gate-2018/cse_consider-a-network-with-6-routers-r_img1.jpg"
              }
            ],
            "options": [
              "A. 4",
              "B. 3",
              "C. 2",
              "D. 1"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },]
      },
    ],
  },

];

/* ═══════════════════════════════════════════════════════════════════
   SEEDER  — no need to edit below this line
═══════════════════════════════════════════════════════════════════ */

const c = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

/**
 * Decide whether a question at position `idx` in a section is optional.
 *
 * Rules:
 *  - If the section has no optional config → always mandatory.
 *  - If total questions in the section ≤ mandatory threshold → all mandatory
 *    (covers the 180-question NEET case where Section B isn't included).
 *  - Otherwise the first `mandatoryCount` questions are mandatory and the
 *    remaining are optional (covers the 200-question case).
 */
function isOptionalQuestion(): boolean {
  return false;
}

function sectionMaxScore(
  _sectionConfig: ReturnType<typeof getExamConfig>['sections'][number],
  questions: RawQuestion[],
): number {
  return questions.reduce((s, q) => s + q.marks, 0);
}

async function main() {
  console.log(`\n${c.bright}${c.cyan}${'═'.repeat(62)}${c.reset}`);
  console.log(`${c.bright}🧪  Seeding Mock Papers into MockTestTemplate${c.reset}`);
  console.log(`${c.cyan}${'═'.repeat(62)}${c.reset}\n`);

  // Pre-populate numberTracker from DB so individual seeds get the correct next number
  const numberTracker = new Map<string, number>();
  const existingMaxes = await prisma.mockTestTemplate.groupBy({
    by: ['exam_type', 'branch'],
    where: { mode: 'seeded' },
    _max: { mock_number: true },
  });
  for (const row of existingMaxes) {
    const key = `${row.exam_type}::${row.branch ?? '-'}`;
    numberTracker.set(key, row._max.mock_number ?? 0);
  }

  let seededPapers = 0;
  let updatedPapers = 0;
  let skippedEmpty = 0;

  for (const paper of papers) {
    const totalQs = paper.sections.reduce((s, sec) => s + sec.questions.length, 0);

    if (totalQs === 0) {
      console.log(`${c.yellow}⚠  Skipping "${paper.title}" — no questions yet${c.reset}`);
      skippedEmpty++;
      continue;
    }

    const examKey = `${paper.exam_type}::${paper.branch ?? '-'}`;
    // mockNumber is only used for new papers; existing papers keep their DB value
    const mockNumber = (numberTracker.get(examKey) ?? 0) + 1;

    const config = getExamConfig(paper.exam_type, paper.branch ?? undefined);

    // Build the full question list with all metadata
    const allQuestions: any[] = [];

    for (let si = 0; si < paper.sections.length; si++) {
      const sec = paper.sections[si];

      // Find matching section config by name
      const secConfig = config.sections.find(
        (s) => s.name.toLowerCase() === sec.name.toLowerCase()
      );

      if (!secConfig) {
        console.warn(
          `  ${c.yellow}⚠  Section "${sec.name}" not found in examConfig for ${paper.exam_type} — using index ${si}${c.reset}`
        );
      }

      for (let qi = 0; qi < sec.questions.length; qi++) {
        const q = sec.questions[qi];
        const optional = isOptionalQuestion();

        allQuestions.push({
          id: randomUUID(),
          source: 'template',
          sectionIndex: si,
          sectionName: sec.name,
          isOptional: optional,
          question_text: q.question_text,
          options: q.options,
          question_type: q.question_type,
          marks: q.marks,
          year: q.year,
          subject: sec.name,
          topic: q.topic_name || "",
          images: q.images ?? [],
          // kept server-side for grading; stripped before sending to client
          correct_answer: q.correct_answer,
          explanation: q.explanation,
        });
      }
    }

    const maxScore = paper.sections.reduce((sum, sec) => {
      const secConfig = config.sections.find(
        (s) => s.name.toLowerCase() === sec.name.toLowerCase()
      );
      return sum + (secConfig ? sectionMaxScore(secConfig, sec.questions) : sec.questions.reduce((s, q) => s + q.marks, 0));
    }, 0);

    // Upsert by title + exam_type + branch
    const existing = await prisma.mockTestTemplate.findFirst({
      where: {
        title: paper.title,
        exam_type: paper.exam_type,
        branch: paper.branch,
        mode: 'seeded',
      },
      select: { id: true, mock_number: true },
    });

    if (existing) {
      // Keep existing mock_number — don't overwrite it (use renumber_mocks.ts to renumber)
      const existingMockNumber = existing.mock_number;
      // Keep tracker in sync so future papers in this run get the right next number
      const examKey = `${paper.exam_type}::${paper.branch ?? '-'}`;
      if (existingMockNumber > (numberTracker.get(examKey) ?? 0)) {
        numberTracker.set(examKey, existingMockNumber);
      }
      await prisma.mockTestTemplate.update({
        where: { id: existing.id },
        data: {
          total_questions: allQuestions.length,
          max_score: maxScore,
          duration_secs: config.durationSecs,
          sections: config.sections as any,
          questions: allQuestions,
        },
      });
      console.log(`${c.yellow}↩  Updated "${paper.title}"${c.reset}  (${allQuestions.length} Qs, mock #${existingMockNumber})`);
      updatedPapers++;
    } else {
      await prisma.mockTestTemplate.create({
        data: {
          exam_type: paper.exam_type,
          branch: paper.branch,
          mode: 'seeded',
          mock_number: mockNumber,
          title: paper.title,
          subjects: paper.sections.map((s) => s.name),
          total_questions: allQuestions.length,
          max_score: maxScore,
          duration_secs: config.durationSecs,
          sections: config.sections as any,
          questions: allQuestions,
        },
      });
      numberTracker.set(examKey, mockNumber);
      console.log(`${c.green}✅ Seeded  "${paper.title}"${c.reset}  (${allQuestions.length} Qs, mock #${mockNumber})`);
      seededPapers++;
    }
  }

  console.log(`\n${c.bright}${c.green}✨  Done!${c.reset}`);
  console.log(`   New papers     : ${c.bright}${seededPapers}${c.reset}`);
  console.log(`   Updated        : ${updatedPapers}`);
  console.log(`   Skipped empty  : ${skippedEmpty}`);
  console.log(`${c.cyan}${'═'.repeat(62)}${c.reset}\n`);
}

main()
  .catch((e) => { console.error('💥 FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
