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
  {
    title: 'NEET 2025',
    exam_type: 'NEET',
    branch: null,
    sections: [
      {
        name: 'Physics',
        questions: []
      },
      {
        name: 'Chemistry',
        questions: []
      },
      {
        name: 'Biology',
        questions: []
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     NEET 2024
  ────────────────────────────────────────────────────────── */
  {
    title: 'NEET 2024',
    exam_type: 'NEET',
    branch: null,
    sections: [
      { name: 'Physics', questions: [ /* paste here */] },
      { name: 'Chemistry', questions: [ /* paste here */] },
      { name: 'Biology', questions: [ /* paste here */] },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     JEE MAIN 2025 (Jan)
     Physics / Chemistry / Mathematics
     20 MCQ (mandatory) + 10 NAT (optional, attempt 5) per subject
     Total: 90 Qs, 300 marks, 3h
  ────────────────────────────────────────────────────────── */

 
  {
    title: 'JEE Main 2025 April 8 shift 2',
    exam_type: 'JEE_MAIN',
    branch: null,
    sections: [
      {
        name: 'Physics',
        questions: []
      },
      {
        name: 'Chemistry',
        questions:[]
      },
      {
        name: 'Mathematics',
        questions: []
      },
    ],
  },

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
    title: 'GATE CSE 2019',
    exam_type: 'GATE',
    branch: 'CSE',
    sections: [
      {
        name: 'General Aptitude',
        questions:[
          {
            "topic_name": "General Aptitude",
            "question_text": "The expenditure on the project __________ as follows: equipment Rs.20 lakhs, salaries Rs.12 lakhs, and contingency Rs.3 lakhs.",
            "images": [],
            "options": [
              "A. break down",
              "B. break",
              "C. breaks down",
              "D. breaks"
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
            "question_text": "The search engine's business model ____ around the fulcrum of trust.",
            "images": [],
            "options": [
              "A. revolves",
              "B. plays",
              "C. sinks",
              "D. bursts"
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
            "question_text": "Two cars at the same time from the same location and go in the same direction. The speed of the first car is 50 km/h and the speed of the second car is 60 km/h. The number of hours it takes for the distance between the two cars to be 20 km is _____.",
            "images": [],
            "options": [
              "A. 1",
              "B. 2",
              "C. 3",
              "D. 6"
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
            "question_text": "Ten friends planned to share equally the cost of buying a gift for their teacher. When two of them decided not to contribute, each of the other friends had to pay Rs. 150 more. The cost of the gift was Rs. ___",
            "images": [],
            "options": [
              "A. 666",
              "B. 3000",
              "C. 6000",
              "D. 12000"
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
            "question_text": "A court is to a judge as _________ is to a teacher.",
            "images": [],
            "options": [
              "A. a student",
              "B. a punishment",
              "C. a syllabus",
              "D. a school"
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
            "question_text": "The police arrested four criminals - P, Q, R and S. The criminals knew each other. They made the following statements: P says \"Q committed the crime.\" Q says \"S committed the crime.\" R says \" I did not do it.\" S says \"What Q said about me is false\". Assume only one of the arrested four committed the crime and only one of the statements made above is true. Who committed the crime?",
            "images": [],
            "options": [
              "A. P",
              "B. R",
              "C. S",
              "D. Q"
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
            "question_text": "In the given diagram, teachers are represented in the triangle, researchers in the circle and administrators in the rectangle. Out of the total number of the people, the percentage of administrators shall be in the range of _______",
            "images": [
              {
                "index": 1,
                "filename": "gate-cse/cse_in-the-given-diagram-teachers-are-r_img1.jpg"
              }
            ],
            "options": [
              "A. 0 to 15",
              "B. 16 to 30",
              "C. 31 to 45",
              "D. 46 to 60"
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
            "question_text": "\"A recent High Court judgement has sought to dispel the idea of begging as a disease - which leads to its stigmatization and criminalization - and to regard it as a symptom. The underlying disease is the failure of the state to protect citizens who fall through the social security net.\" Which one of the following statements can be inferred from the given passage?",
            "images": [],
            "options": [
              "A. Beggars are lazy people who beg because they are unwilling to work",
              "B. Beggars are created because of the lack of social welfare schemes",
              "C. Begging is an offence that has to be dealt with firmly",
              "D. Begging has to be banned because it adversely affects the welfare of the state"
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
            "question_text": "In a college, there are three student clubs, 60 students are only in the Drama club, 80 students are only in the Dance club, 30 students are only in Maths club, 40 students are in both Drama and Dance clubs, 12 students are in both Dance and Maths clubs, 7 students are in both Drama and Maths clubs, and 2 students are in all clubs. If 75% of the students in the college are not in any of these clubs, then the total number of students in the college is _____.",
            "images": [],
            "options": [
              "A. 1000",
              "B. 975",
              "C. 900",
              "D. 225"
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
            "question_text": "Three of the five students are allocated to a hostel put in special requests to the warden, Given the floor plan of the vacant rooms, select the allocation plan that will accommodate all their requests. Request by X: Due to pollen allergy, I want to avoid a wing next to the garden. Request by Y: I want to live as far from the washrooms as possible, since I am very mich sensitive to smell. Request by Z: I believe in Vaastu and so I want to stay in South-West wing. The shaded rooms are already occupied. WR is washroom",
            "images": [
              {
                "index": 1,
                "filename": "gate-cse/cse_three-of-the-five-students-are-allo_img1.jpg"
              }
            ],
            "options": [
              "A. A",
              "B. B",
              "C. C",
              "D. D"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          }
        ]
      },
      {
        name: 'CSE',
        questions:[
          {
            "topic_name": "Computer Organization",
            "question_text": "A certain processor uses a fully associative cache of size 16 kB, The cache block size is 16 bytes. Assume that the main memory is byte addressable and uses a 32-bit address. How many bits are required for the Tag and the Index fields respectively in the addresses generated by the processor?",
            "images": [],
            "options": [
              "A. 24 bits and 0 bits",
              "B. 28 bits and 4 bits",
              "C. 24 bits and 4 bits",
              "D. 28 bits and 0 bits"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Computer Organization",
            "question_text": "The chip select logic for a certain DRAM chip in a memory system design is shown below. Assume that the memory system has 16 address lines denoted by $A_{15} \\; to \\; A_0$ . What is the range of address (in hexadecimal) of the memory system that can get enabled by the chip select (CS) signal?",
            "images": [
              {
                "index": 1,
                "filename": "gate-cse/cse_the-chip-select-logic-for-a-certain_img1.jpg"
              }
            ],
            "options": [
              "A. C800 to CFFF",
              "B. CA00 to CAFF",
              "C. C800 to C8FF",
              "D. DA00 to DFFF"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Compiler Design",
            "question_text": "Which one of the following kinds of derivation is used by LR parsers?",
            "images": [],
            "options": [
              "A. Leftmost",
              "B. Leftmost in reverse",
              "C. Rightmost",
              "D. Rightmost in reverse"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Digital Logic",
            "question_text": "In 16-bit 2's complement representation, the decimal number -28 is:",
            "images": [],
            "options": [
              "A. 1111 1111 0001 1100",
              "B. 0000 0000 1110 0100",
              "C. 1111 1111 1110 0100",
              "D. 1000 0000 1110 0100"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Discrete Mathematics",
            "question_text": "Let $U=\\{1,2,,...n\\}$ . Let $A=\\{(x,X)|x\\in X,X\\subseteq U\\}$ . Consider the following two statements on |A|. I. $|A|=n2^{n-1}$ II. $|A|=\\sum_{k=1}^{n}k\\binom{n}{k}$ Which of the above statements is/are TRUE?",
            "images": [],
            "options": [
              "A. Only I",
              "B. Only II",
              "C. Both I and II",
              "D. Neither I nor II"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Digital Logic",
            "question_text": "Which one of the following is NOT a valid identity?",
            "images": [],
            "options": [
              "A. $(x\\oplus y)\\oplus z=x\\oplus (y\\oplus z)$",
              "B. $(x+ y)\\oplus z=x\\oplus (y+z)$",
              "C. $x\\oplus y=x+y, \\; if \\; xy=0$",
              "D. $x\\oplus y=(xy+x'y')'$"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Theory of Computation",
            "question_text": "If L is a regular language over $\\Sigma =\\{a,b\\}$ , which one of the following languages is NOT regular ?",
            "images": [],
            "options": [
              "A. $L\\cdot L^R=\\{xy|x \\in L,y^R \\in L\\}$",
              "B. $\\{ww^R|w \\in L\\}$",
              "C. Prifix(L)={ $x \\in \\Sigma ^*|\\exists y \\in \\Sigma ^*$ such that $xy \\in L$ }",
              "D. Suffix(L)={ $y \\in \\Sigma ^*|\\exists x \\in \\Sigma ^*$ such that $xy \\in L$ }"
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
            "question_text": "Consider Z = X - Y where X, Y and Z are all in sign-magnitude form. X and Y are each represented in n bits. To avoid overflow, the representation of Z would require a minimum of:",
            "images": [],
            "options": [
              "A. n bits",
              "B. n-1 bits",
              "C. n+1 bits",
              "D. n+2 bits"
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
            "question_text": "Let X be a square matrix. Consider the following two statements on X. I. X is invertible II. Determinant of X is non-zero Which one of the following is TRUE?",
            "images": [],
            "options": [
              "A. I implies II; II does not imply I",
              "B. II implies I; I does not imply II",
              "C. I does not imply II; II does not imply I",
              "D. I and II are equivalent statements"
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
            "question_text": "Let G be an arbitrary group. Consider the following relations on G: R1: $\\forall a,b \\in G, aR_1b$ if and only if $\\exists g \\in G$ such that $a=g^{-1}bg$ R2: $\\forall a,b \\in G, aR_2b$ if and only if $a=b^{-1}$ Which of the above is/are equivalence relation/relations?",
            "images": [],
            "options": [
              "A. R1 and R2",
              "B. R1 only",
              "C. R2 only",
              "D. Neither R1 nor R2"
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
            "question_text": "Consider the following two statements about database transaction schedules: I. Strict two-phase locking protocol generates conflict serializable schedules that are also recoverable. II. Timestamp-ordering concurrency control protocol with Thomas' Write Rule can generate view serializable schedules that are not conflict serializable. Which of the above statements is/are TRUE?",
            "images": [],
            "options": [
              "A. I only",
              "B. II only",
              "C. Both I and II",
              "D. Neither I nor II"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Discrete Mathematics",
            "question_text": "Let G be an undirected complete graph on n vertices, where n $\\gt$ 2. Then, the number of different Hamiltonian cycles in G is equal to",
            "images": [],
            "options": [
              "A. n!",
              "B. (n-1)!",
              "C. 1",
              "D. $\\frac{(n-1)!}{2}$"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Engineering Mathematics",
            "question_text": "Compute $\\lim_{x \\to 3}\\frac{x^4-81}{2x^2-5x-3}$",
            "images": [],
            "options": [
              "A. 1",
              "B. 53/12",
              "C. 108/7",
              "D. Limit does not exist"
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
            "question_text": "Which one of the following statements is NOT correct about the $B^+$ tree data structure used for creating an index of a relational database table?",
            "images": [],
            "options": [
              "A. $B^+$ Tree is a height-balanced tree",
              "B. Non-leaf nodes have pointers to data records",
              "C. Key values in each node are kept in sorted order",
              "D. Each leaf node has a pointer to the next leaf node"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Theory of Computation",
            "question_text": "For $\\Sigma =\\{a,b\\}$ , let us consider the regular language $L=\\{x|x=a^{2+3k} \\; or \\; x=b^{10+12k}, k\\geq 0\\}$ . Which one of the following can be a pumping length (the constant guaranteed by the pumping lemma) for L?",
            "images": [],
            "options": [
              "A. 3",
              "B. 5",
              "C. 9",
              "D. 24"
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
            "question_text": "Which of the following protocol pairs can be used to send and retrieve e-mails (in that order)?",
            "images": [],
            "options": [
              "A. IMAP POP3",
              "B. SMTP, POP3",
              "C. SMTP, MIME",
              "D. IMAP, SMTP"
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
            "question_text": "The following C program is executed on a Unix / Linux system: #include < unistd.h > int main() { int i; for (i = 0; i < 10; i++) if (i % 2 == 0) fork(); return 0; } The total number of child process created is __________ .",
            "images": [],
            "options": [],
            "correct_answer": "31",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "C Programming",
            "question_text": "Consider the following C program: #include int jumble(int x, int y) { x = 2 * x + y; return x; } int main() { int x = 2, y = 5; y = jumble(y, x); x = jumble(y, x); printf(\"%dn\", x); return 0; } The value printed by program is __________ .",
            "images": [],
            "options": [],
            "correct_answer": "26",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Compiler Design",
            "question_text": "Consider the following given grammar: S -> Aa A -> BD B -> b| ε D -> d| ε Let a, b, d and $ be indexed as follows: Compute the FOLLOW set of the non-terminal B and write the index values for the symbols in the FOLLOW set in the descending order. (For example, if the FOLLOW set is {a, b, d, $}, then the answer should be 3210). Answer:_____",
            "images": [
              {
                "index": 1,
                "filename": "gate-cse/cse_consider-the-following-given-gramma_img1.jpg"
              }
            ],
            "options": [],
            "correct_answer": "31",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Algorithm",
            "question_text": "An array of 25 distinct elements is to be sorted using quicksort. Assume that the pivot element is chosen uniformly at random. The probability that the pivot element gets placed in the worst possible location in the first round of partitioning (rounded off to 2 decimal places) is _________.",
            "images": [],
            "options": [],
            "correct_answer": "0.08",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Engineering Mathematics",
            "question_text": "The value of $3^{51} \\;mod \\;5$ is _____",
            "images": [],
            "options": [],
            "correct_answer": "2",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Discrete Mathematics",
            "question_text": "Two numbers are chosen independently and uniformly at random from the set {1, 2, ..., 13}. The probability (rounded off to 3 decimal places) that their 4-bit (unsigned) binary representations have the same most significant bit is ___________",
            "images": [],
            "options": [],
            "correct_answer": "0.502 to 0.504",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Operating System",
            "question_text": "Consider three concurrent processes P1, P2 and P3 as shown below, which access a shared variable D that has been initialized to 100. The process are executed on a uniprocessor system running a time-shared operating system. If the minimum and maximum possible values of D after the three processes have completed execution are X and Y respectively, then the value of Y-X is __________.",
            "images": [
              {
                "index": 1,
                "filename": "gate-cse/cse_consider-three-concurrent-processes_img1.jpg"
              }
            ],
            "options": [],
            "correct_answer": "80",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "C Programming",
            "question_text": "Consider the following C program: #include < stdio.h > int main(){ int arr[] = {1,2,3,4,5,6,7,8,9,0,1,2,5}, *ip = arr + 4; printf(\"%dn\", ip[1]); return 0; } The number that will be displayed on execution of the program is _________ .",
            "images": [],
            "options": [],
            "correct_answer": "6",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Algorithm",
            "question_text": "Consider a sequence of 14 elements: A = [-5, -10, 6, 3, -1, -2, 13, 4, -9, -1, 4, 12, -3, 0]. The sequence sum $S(i,j)=\\sum_{k=i}^{j}A[k]$ . Determine the maximum of S(i,j), where $0 \\leq i \\leq j \\lt 14$ . (Divide and conquer approach may be used). Answer:______",
            "images": [],
            "options": [],
            "correct_answer": "29",
            "explanation": "",
            "year": 0,
            "marks": 1,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "C Programming",
            "question_text": "Consider the following C program: void convert(int n) { if (n<0) printf(\"%d\",n); else { convert(n/2); printf(\"%d\",n%2); } } Which one of the following will happen when the function convert is called with any positive integer n as argument?",
            "images": [],
            "options": [
              "A. It will print the binary representation of n and terminate.",
              "B. It will print the binary representation of n in the reverse order and terminate.",
              "C. It will print the binary representation of n but will not terminate.",
              "D. It will not print anything and will not terminate."
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "C Programming",
            "question_text": "Consider the following C program: #include < stdio.h > int r(){ int static num=7; return num--; } int main() { for(r();r();r()) { printf(\"%d \",r()); }; return 0; } Which one of the following values will be displayed on execution of the programs?",
            "images": [],
            "options": [
              "A. 41",
              "B. 52",
              "C. 63",
              "D. 630"
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
            "question_text": "Consider three machines M, N and P with IP addresses 100.10.5.2, 100.10.5.5 and 100.10.5.6 respectively. The subnet mask is set to 255.255.255.252 for all the three machines. Which one of the following is true?",
            "images": [],
            "options": [
              "A. M, N and P all belong to the same subnet",
              "B. Only M and N belong to the same subnet",
              "C. Only N and P belong to the same subnet",
              "D. M, N, and P belong to three different subnets"
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
            "question_text": "Suppose that in an IP-over-Ethernet network, a machine X wishes to find the MAC address of another machine Y in its subnet. Which one of the following techniques can be used for this?",
            "images": [],
            "options": [
              "A. X sends an ARP request packet to the local gateway's IP address which then finds the MAC address of Y and sends to X",
              "B. X sends an ARP request packet to the local gateway's MAC address which then finds the MAC address of Y and sends to X",
              "C. X sends an ARP request packet with broadcast MAC address in its local subnet",
              "D. X sends an ARP request packet with broadcast IP address in its local subnet"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Digital Logic",
            "question_text": "Consider three 4-variable functions $f_1,f_2 \\; and \\; f_3$ , which are expressed in sum-of-minterms $f_1=\\Sigma (0,2,5,8,14)$ $f_2=\\Sigma (2,3,6,8,14,15)$ $f_3=\\Sigma (2,7,11,14)$ For the following circuit with one AND gate and one XOR gate, the output function f can be expressed as:",
            "images": [
              {
                "index": 1,
                "filename": "gate-cse/cse_consider-three-4variable-functions_img1.jpg"
              }
            ],
            "options": [
              "A. $\\Sigma (7,8,11)$",
              "B. $\\Sigma (2,7,8,11,14)$",
              "C. $\\Sigma (2,14)$",
              "D. $\\Sigma (0,2,3,5,6,7,8,11,14,15)$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Theory of Computation",
            "question_text": "Which one of the following languages over $\\Sigma =\\{a,b\\}$ is NOT context-free?",
            "images": [],
            "options": [
              "A. $\\{ww^R|w \\in \\{a,b\\}^*\\}$",
              "B. $\\{wa^nb^nw^R|w \\in \\{a,b\\}^*,n\\geq 0\\}$",
              "C. $\\{wa^nw^Rb^n|w \\in \\{a,b\\}^*,n\\geq 0\\}$",
              "D. $\\{a^nb^i|i \\in \\{n,3n,5n\\},n\\geq 0\\}$"
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
            "question_text": "Let the set of functional dependencies $F=\\{QR\\rightarrow S,R\\rightarrow P,S\\rightarrow Q\\}$ hold on a relation schema X = (PQRS). X is not in BCNF. Suppose X is decomposed into two schemas Y and Z where Y = (PR) and Z = (QRS). Consider the two statements given below: I. Both Y and Z are in BCNF II. Decomposition of X into Y and Z is dependency preserving and lossless. Which of the above statements is/are correct?",
            "images": [],
            "options": [
              "A. Both I and II",
              "B. I only",
              "C. II only",
              "D. Neither I nor II"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Operating System",
            "question_text": "Assume that in a certain computer, the virtual addresses are 64 bits long and the physical addresses are 48 bits long. The memory is word addressable. The page size is 8kB and the word size is 4 bytes. The Translation Look-aside Buffer (TLB) in the address translation path has 128 valid entries. At most how many distinct virtual addresses can be translated without any TLB miss?",
            "images": [],
            "options": [
              "A. $16 \\times 2^{10}$",
              "B. $256 \\times 2^{10}$",
              "C. $4 \\times 2^{20}$",
              "D. $8 \\times 2^{20}$"
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
            "question_text": "Consider the following sets: S1: Set of all recursively enumerable languages over the alphabet {0, 1}. S2: Set of all syntactically valid C programs. S3: Set of all languages over the alphabet {0, 1}. S4: Set of all non-regular languages over the alphabet {0, 1}. Which of the above sets are uncountable?",
            "images": [],
            "options": [
              "A. S1 and S2",
              "B. S3 and S4",
              "C. S2 and S3",
              "D. S1 and S4"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Discrete Mathematics",
            "question_text": "Consider the first order predicate formula: $\\forall x[\\forall z\\; z|x\\Rightarrow ((z=x)\\vee (z=1))\\Rightarrow$ $\\exists w(w> x)\\wedge (\\forall z \\; z|w\\Rightarrow ((w=z)\\vee (z=1)))]$ Here 'a|b' denotes that 'a divides b', where a and b are integers. Consider the following sets: S1: {1, 2, 3, ..., 100} S2: Set of all positive integers S3: Set of all integers Which of the above sets satisfy $\\varphi$ ?",
            "images": [],
            "options": [
              "A. S1 and S2",
              "B. S1 and S3",
              "C. S2 and S3",
              "D. S1,S2 and S3"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Compiler Design",
            "question_text": "Consider the following grammar and the semantic actions to support the inherited type declaration attributes. Let $X_1,X_2,X_3,X_4,X_5 \\; and \\; X_6$ be the placeholders for the non-terminals D, T, L or $L_1$ in the following table: Which one of the following are the appropriate choices for $X_1,X_2,X_3 \\; and \\; X_4$ ?",
            "images": [
              {
                "index": 1,
                "filename": "gate-cse/cse_consider-the-following-grammar-and_img1.jpg"
              }
            ],
            "options": [
              "A. $X_1=L,X_2=T,X_3=L_1,X_4=L$",
              "B. $X_1=T,X_2=L,X_3=L_1,X_4=T$",
              "C. $X_1=L,X_2=L,X_3=L_1,X_4=T$",
              "D. $X_1=T,X_2=L,X_3=T,X_4=L_1$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Algorithm",
            "question_text": "There are n unsorted arrays: $A_1,A_2,...,A_n$ . Assume that n is odd. Each of $A_1,A_2,...,A_n$ contains n distinct elements. There are no common elements between any two arrays. The worst-case Asymptotic Notation of computing the median of the medians of $A_1,A_2,...,A_n$ is ________ .",
            "images": [],
            "options": [
              "A. $O(n)$",
              "B. $O(n \\log n)$",
              "C. $O(n^2)$",
              "D. $\\Omega(n^2 \\log n)$"
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
            "question_text": "Let G be any connection, weighted, undirected graph: I. G has a unique minimum spanning tree if no two edges of G have the same weight. II. G has a unique minimum spanning tree if, for every cut of G, there is a unique minimum weight edge crossing the cut. Which of the above two statements is/are TRUE?",
            "images": [],
            "options": [
              "A. I only",
              "B. II only",
              "C. Both I and II",
              "D. Neither I nor II"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Operating System",
            "question_text": "Consider the following snapshot of a system running n concurrent processes. Process $i$ is holding $X_i$ instances of a resource R, $1\\leq i\\leq n$ . Assume that all instances of R are currently in use. Further, for all $i$ , process $i$ can place a request for at most $Y_i$ additional instances of R while holding the $X_i$ instances it already has. Of the n processes, there are exactly two processes p and q such that $Y_p=Y_q=0$ . Which one of the following conditions guarantees that no other process apart from p and q can complete execution?",
            "images": [],
            "options": [
              "A. $X_p+X_q \\lt Min \\{Y_k|1\\leq k\\leq n,k\\neq p,k\\neq q\\}$",
              "B. $X_p+X_q \\lt Max \\{Y_k|1\\leq k\\leq n,k\\neq p,k\\neq q\\}$",
              "C. $Min(X_p,X_q)\\geq Min \\{Y_k|1\\leq k\\leq n,k\\neq p,k\\neq q\\}$",
              "D. $Min(X_p,X_q)\\leq Max \\{Y_k|1\\leq k\\leq n,k\\neq p,k\\neq q\\}$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "MCQ"
          },
          {
            "topic_name": "Data Structure",
            "question_text": "Consider the following statements: I. The smallest element in a max-heap is always at a leaf node. II. The second largest element in a max-heap is always a child of the root node. III. A max-heap can be constructed from a binary search tree in $\\Theta (n)$ time. IV. A binary search tree can be constructed from a max-heap in $\\Theta (n)$ time. Which of the above statements is/are TRUE?",
            "images": [],
            "options": [
              "A. I, II and III",
              "B. I, II and IV",
              "C. I, III and IV",
              "D. II, III and IV"
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
            "question_text": "Consider the following four processes with arrival times (in milliseconds) and their length of CPU burst (in milliseconds) as shown below: These processes are run on a single processor using preemptive Shortest Remaining Time First scheduling algorithm. If the average waiting time of the processes is 1 millisecond, then the value of Z is __________.",
            "images": [
              {
                "index": 1,
                "filename": "gate-cse/cse_consider-the-following-four-process_img1.jpg"
              }
            ],
            "options": [],
            "correct_answer": "2",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Operating System",
            "question_text": "The index node (inode) of a Unix-like file system has 12 direct, one single-indirect and one double-indirect pointer The disk block size is 4 kB and the disk block addresses 32-bits long. The maximum possible file size is (rounded off to 1 decimal place) __________ GB.",
            "images": [],
            "options": [],
            "correct_answer": "4 to 4.1",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Compiler Design",
            "question_text": "Consider the augmented grammar given below: $S'\\rightarrow S$ $S \\rightarrow \\lt L \\gt |id$ $L \\rightarrow L,S|S$ Let $I_0=CLOSURE(\\{[S'\\rightarrow \\cdot S]\\})$ . The number of items in the set $GOTO(I_0,\\lt)$ is __________.",
            "images": [],
            "options": [],
            "correct_answer": "5",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Engineering Mathematics",
            "question_text": "Consider the following matrix: $\\begin{bmatrix} 1 & 2 & 4 & 8\\\\ 1& 3 & 9 &27 \\\\ 1 & 4 & 16 &64 \\\\ 1 & 5 & 25 &125 \\end{bmatrix}$ The absolute value of the product of Eigenvalues of R is _________ .",
            "images": [],
            "options": [],
            "correct_answer": "12",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Computer Organization",
            "question_text": "A certain processor deploys a single-level cache. The cache block size is 8 words and the word size is 4 bytes. The memory system uses a 60-MHz clock. To service a cache-miss, the memory controller first takes 1 cycle to accept the starting address of the block, it then takes 3 cycles to fetch all the eight words of the block, and finally transmits the words of the requested block at the rate of 1 word per cycle. The maximum bandwidth for the memory system when the program running on the processor issues a series of read operations is _________ $\\times 10^6$ bytes/sec.",
            "images": [],
            "options": [],
            "correct_answer": "160",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Data Structure",
            "question_text": "Let T be a full binary tree with 8 leaves. (A full binary tree has every level full.) Suppose two leaves a and b of T are chosen uniformly and independently at random. The expected value of the distance between a and b in T (i.e., the number of edges in the unique path between a and b) is (rounded off to 2 decimal places) ___________ .",
            "images": [],
            "options": [],
            "correct_answer": "4.25",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Discrete Mathematics",
            "question_text": "Suppose Y is distributed uniformly in the open interval (1,6). The probability that the polynomial $3x^2+6xY+3Y+6$ has only real roots is (rounded off to 1 decimal place) _________.",
            "images": [],
            "options": [],
            "correct_answer": "0.8",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Theory of Computation",
            "question_text": "Let $\\Sigma$ be the set of all bijections from {1,...,5} to {1,...,5}, where $id$ denotes the identity function, i.e. $id(j)=j,\\forall j$ . Let $\\circ$ denote composition on functions. For a string $x = x_1x_2 ... x_n \\in \\Sigma ^n, n \\geq 0$ , let $\\pi(x) = x_1\\circ x_2\\circ ... \\circ x_n$ . Consider the language $L = \\{x \\in \\Sigma ^* | \\pi(x) = id\\}$ . The minimum number of states in any DFA accepting L is _________ .",
            "images": [],
            "options": [],
            "correct_answer": "120",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Computer Network",
            "question_text": "Consider that 15 machines need to be connected in a LAN using 8-port Ethernet switches. Assume that these switches do not have any separate up link ports. The minimum number of switches needed is ___________.",
            "images": [],
            "options": [],
            "correct_answer": "3",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Digital Logic",
            "question_text": "What is the minimum number of 2-input NOR gates required to implement 4-variable function expressed in sum-of-minterms from as $f = \\Sigma (0, 2, 5, 7, 8, 10, 13, 15)$ ? Assume that all the inputs and their complements are available. Answer ________ .",
            "images": [],
            "options": [],
            "correct_answer": "3",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Database Management System",
            "question_text": "A relational database contains two tables Student and Performance as shown below: The primary key of the Student table is Roll_no. For the Performance table, the columns Roll_no. and Subject_code together from the primary key. Consider the SQL query given below: SELECT S.Student_name, sum(P.Marks) FROM Student S, Performance P WHERE P.Marks > 84 GROUP BY S.Student_name; The number of rows returned by the above SQL query is _________ .",
            "images": [
              {
                "index": 1,
                "filename": "gate-cse/cse_a-relational-database-contains-two_img1.jpg"
              }
            ],
            "options": [],
            "correct_answer": "5",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "C programming",
            "question_text": "Consider the following C program: #include < stdio.h > int main() { float sum = 0.0, j = 1.0, i = 2.0; while (i / j > 0.0625) { j = j + j; sum = sum + i/j; printf(\"%f \\n\", sum); } return 0; } The number of times variable sum will be printed When the above program is executed is _________ .",
            "images": [],
            "options": [],
            "correct_answer": "5",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "C programming",
            "question_text": "Consider the following C program: #include < stdio.h > int main() { int a[] = {2, 4, 6, 8, 10}; int i, sum = 0, *b = a + 4; for (i = 0; i < 5; i++ ) sum = sum + (*b - i) - *(b - i); printf(\"%dn\", sum); return 0; } The output of above C program is __________ . Note: This was Numerical Type question.",
            "images": [],
            "options": [],
            "correct_answer": "10",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Computer Network",
            "question_text": "In an RSA cryptosystem, the value of the public modulus parameter n is 3007. If it is also is known that $\\phi(n)=2880$ , where $\\phi()$ denotes Euler's Totient Function, then the prime factors of n which is greater than 50 is _________ .",
            "images": [],
            "options": [],
            "correct_answer": "97",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
          {
            "topic_name": "Database Management System",
            "question_text": "Consider the following relation P(X, Y, Z), Q(X, Y, T) and R(Y, V): How many tuples will be returned by the following relational algebra query? Answer:______",
            "images": [
              {
                "index": 1,
                "filename": "gate-cse/cse_consider-the-following-relation-px_img1.jpg"
              },
              {
                "index": 2,
                "filename": "gate-cse/cse_consider-the-following-relation-px_img2.jpg"
              }
            ],
            "options": [],
            "correct_answer": "1",
            "explanation": "",
            "year": 0,
            "marks": 2,
            "exam_type": "GATE CSE",
            "question_type": "NAT"
          },
        ]
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
function isOptionalQuestion(
  sectionConfig: ReturnType<typeof getExamConfig>['sections'][number],
  idx: number,
  totalInSection: number,
): boolean {
  if (!sectionConfig.optional) return false;
  const mandatoryCount = sectionConfig.totalQuestions - sectionConfig.optional.poolSize;
  // Not enough questions to have an optional pool → treat all as mandatory
  if (totalInSection <= mandatoryCount) return false;
  return idx >= mandatoryCount;
}

/**
 * Compute the max achievable score for a section given the actual questions seeded.
 *
 * - Mandatory questions always contribute their full marks.
 * - Optional questions contribute marks × countSize (the max a student can score).
 * - If fewer questions than the mandatory threshold → all count as mandatory.
 */
function sectionMaxScore(
  sectionConfig: ReturnType<typeof getExamConfig>['sections'][number],
  questions: RawQuestion[],
): number {
  if (!sectionConfig.optional) {
    return questions.reduce((s, q) => s + q.marks, 0);
  }

  const mandatoryCount = sectionConfig.totalQuestions - sectionConfig.optional.poolSize;
  const allMandatory = questions.length <= mandatoryCount;

  if (allMandatory) {
    return questions.reduce((s, q) => s + q.marks, 0);
  }

  const mandatoryQs = questions.slice(0, mandatoryCount);
  const optionalQs = questions.slice(mandatoryCount);
  const avgOptMark = optionalQs.length > 0
    ? optionalQs.reduce((s, q) => s + q.marks, 0) / optionalQs.length
    : 0;

  return (
    mandatoryQs.reduce((s, q) => s + q.marks, 0) +
    Math.round(avgOptMark * sectionConfig.optional.countSize)
  );
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
        const optional = secConfig ? isOptionalQuestion(secConfig, qi, sec.questions.length) : false;

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
