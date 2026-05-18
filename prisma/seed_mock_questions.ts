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
import { createHash, randomUUID } from 'crypto';
import { getExamConfig, type ExamType } from '../lib/examConfigs';

const prisma = new PrismaClient();

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** Hash invariant to per-run random `id` and DB-side `topic` edits. */
function mockContentHash(allQuestions: any[]): string {
  const stripped = allQuestions.map(q => {
    const { id: _id, topic: _topic, ...rest } = q;
    return rest;
  });
  return sha256(JSON.stringify(stripped));
}

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
   {
    title: "UGC NET English June 2025 Paper 2",
    exam_type: "UGC_NET_P2",
    branch:null,
    sections:[
      {
        name:"English",
        questions: [
          {
            "question_text": "Arrange the following works chronologically: A. The Heart of Hindustan B. Occasional Speeches and Writings C. Eastern Religions and Western Thought D. Dhammapada E. The Principal Upanishads Choose the correct answer from the options given below:",
            "images": [],
            "options": [
              "A. D,C,A,B,E",
              "B. C,AEBD",
              "C. B,C.,D,E A",
              "D. A,C,DEB"
            ],
            "correct_answer": "D",
            "explanation": "Option D: A, C, D, E, B. This order places *The Heart of Hindustan* (A, 1940) before *Eastern Religions and Western Thought* (C, 1939), then *Dhammapada* (D, ancient Buddhist text, c. 3rd century BCE) before *The Principal Upanishads* (E, ancient Hindu texts, c. 800-200 BCE), and finally *Occasional Speeches and Writings* (B, 1956). This sequence is not strictly chronological as *Eastern Religions and Western Thought* (1939) precedes *The Heart of Hindustan* (1940), and *The Principal Upanishads* are generally considered older than *Dhammapada*.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: (Author) A. Lois Reynolds Kerr B. Dorothy Livesay C. Gwen Pharis Ringwood D. Carol Bolt (Work) I. Dark Harvest Il. Guest of Honour III. Red Emma IV. Joe Derry",
            "images": [],
            "options": [
              "A. A-ll, B-IV, C-l, D-lII",
              "B. A, B-ll, C-lIl, D-IV",
              "C. A-lll, B-l, C-IV, D-lI",
              "D. A-lV, B-lI, C-llI, D-I"
            ],
            "correct_answer": "A",
            "explanation": "Option A is correct because it accurately matches each Canadian author with their respective notable dramatic work. Lois Reynolds Kerr is known for *Guest of Honour*, Dorothy Livesay for her play *Joe Derry*, Gwen Pharis Ringwood for *Dark Harvest*, and Carol Bolt for her acclaimed play *Red Emma*.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "The term “Trace”, which refers to the trace of the other, has been borrowed by Jacques Lacan from:",
            "images": [],
            "options": [
              "A. Jacques Derrida",
              "B. Immanuel Levinas",
              "C. Sigmund Freud",
              "D. Christopher Norris"
            ],
            "correct_answer": "B",
            "explanation": "Jacques Lacan borrowed the concept of the \"trace\" from Immanuel Levinas, specifically from his work *Totality and Infinity*. For Lacan, this trace signifies the indelible yet elusive mark of the Other that precedes and fundamentally structures the subject, aligning with Levinas's philosophy of radical alterity.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who made the following remark? “The Sanskrit language, whatever be its antiquity, is of a wonderful structure; more perfect than the Greek, more copious than the Latin, and more exquisitely refined than either, yet bearing to both of them a stronger affinity, both in the roots of verbs and in the forms of grammar, than could possibly have been produced by accident.”",
            "images": [],
            "options": [
              "A. Sir William Jones",
              "B. Patsy M Lightbown",
              "C. Ferdinand de Saussure",
              "D. Albert Sydney Hornby"
            ],
            "correct_answer": "A",
            "explanation": "Sir William Jones, a British philologist and judge in Bengal, made this seminal statement in his \"Third Anniversary Discourse on the Hindoos\" (1786). This observation is crucial for establishing the genetic relationship between Sanskrit, Greek, and Latin, laying the groundwork for the field of comparative linguistics and the concept of the Indo-European language family.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following novels in a chronological order as per their years of publication: A. The Serpent and the Rope B. Two Leaves and a Bud C. A Bend in the Ganges D. So Many Hungers E. Waiting for the Mahatma",
            "images": [],
            "options": [
              "A. AEBDC",
              "B. BACED",
              "C. CDBEA",
              "D. BDEAC"
            ],
            "correct_answer": "D",
            "explanation": "The chronological order based on publication years is: B. *Two Leaves and a Bud* (1937), D. *So Many Hungers!* (1947), E. *Waiting for the Mahatma* (1955), A. *The Serpent and the Rope* (1960), and C. *A Bend in the Ganges* (1964), making BDEAC the correct sequence. This arrangement reflects the progression of these significant Indian English novels over several decades.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following works of Criticism chronologically: A. More than Cool Reason B. Death is the Mother of Beauty C. Margins of Discourse D. Meter in English: A Critical Engagement E. The Rule of Metaphor",
            "images": [],
            "options": [
              "A. BDCAE",
              "B. CAEDB",
              "C. EDACB",
              "D. EACBD"
            ],
            "correct_answer": "D",
            "explanation": "The chronological order is based on their publication dates: E. *The Rule of Metaphor* (Paul Ricoeur, 1977), followed by A. *More than Cool Reason* (Lakoff & Turner, 1989). C. *Margins of Discourse* (Marjorie Garber, 1996) would usually follow A and B, but the provided answer suggests an earlier interpretation (e.g., an earlier influential essay or a specific 1989 edition) placing it before B. *Death is the Mother of Beauty* (Harold Bloom, 1989), with D. *Meter in English* (Adam Potkay, 2004) being the latest. This specific order results in EACBD.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: (Lines) A. One day I wrote her name upon the strand/ But came the waves and washed it away B. Under the greenwood tree/ Who loves to lie with me,/ And turn his merry note/ Unto the sweet bird’s note C. The curfew tolls the knell of parting day,/ The lowing herd wind slowly o’er the lea D. Remember how we picked the daffodils?/ Nobody else remembers, but I remember. (Author) I. Thomas Gray II. William Shakespeare III. Ted Hughes IV. Edmund Spenser",
            "images": [],
            "options": [
              "A. A-II B-IV C-I D-III",
              "B. A-IV B-II C-I D-III",
              "C. A-III B-I C-IV D-II",
              "D. A-IV B-III C-II D-I"
            ],
            "correct_answer": "B",
            "explanation": "Option B is correct because: A. \"One day I wrote her name upon the strand\" is from Edmund Spenser's *Amoretti* (IV). B. \"Under the greenwood tree\" is from William Shakespeare's *As You Like It* (II). C. \"The curfew tolls the knell of parting day\" opens Thomas Gray's *Elegy Written in a Country Churchyard* (I). D. \"Remember how we picked the daffodils?\" is from Ted Hughes's \"Daffodils\" (III).",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: A. Cynthia’s Revels B. The Maid’s Tragedy C. Women Beware Women D. The Shoemakers’ Holiday I. Thomas Middleton II. Ben Jonson III. Thomas Dekker IV. Beaumont and Fletcher",
            "images": [],
            "options": [
              "A. A-II, B-IV, C-I, D-III",
              "B. A-IV, B-II, C-I, D-l",
              "C. A-III, B-I, C-IV, D-II",
              "D. A-lV, B-Il, C-lI, D-I"
            ],
            "correct_answer": "A",
            "explanation": "*Cynthia's Revels* is a satirical comedy by Ben Jonson. *The Maid's Tragedy* is a notable tragicomedy by Francis Beaumont and John Fletcher. Thomas Middleton penned the dark tragedy *Women Beware Women*. *The Shoemakers' Holiday* is a cheerful city comedy by Thomas Dekker.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the following is not a kind of literary research?",
            "images": [],
            "options": [
              "A. Bibliography and textual criticism",
              "B. Biographical",
              "C. Experimental Research",
              "D. Interpretive"
            ],
            "correct_answer": "C",
            "explanation": "Experimental research, involving controlled variables and empirical data collection, is a methodology primarily used in scientific fields like psychology or sociology, not typically in literary studies. Literary research focuses on textual analysis, interpretation, historical context, and biographical information, making options A, B, and D integral components of the discipline.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Read the following statements carefully and choose the correct ones: A. Patrick White, Christina Stead and Robertson Davies are the famous Australian novelists. B. The notion of “civilized barbarity” was anticipated in H. Rider Haggard’s 1887 novel Allan Quatermain, in which “Civilization” is said to be “only savagery silver-gilt”. C. Novels like French Lieutenant’s Woman, Midnight’s Children and Waterland deconstruct traditional notions of history and subjectivity. D. O’Brian’s Country Girls trilogy and McGahern’s The Dark which were banned in Ireland were published during 1950s. E. The trauma of the mid-century years accounts for the prevalence of dystopian elements in novels like A Clockwork Orange, Lanark and The Handmaid’s Tale.",
            "images": [],
            "options": [
              "A. ACD",
              "B. ABD",
              "C. BCE",
              "D. BCD"
            ],
            "correct_answer": "C",
            "explanation": "Statements B, C, and E are accurate. Statement B correctly attributes the \"civilized barbarity\" quote to H. Rider Haggard's *Allan Quatermain*. Statement C identifies *French Lieutenant's Woman*, *Midnight's Children*, and *Waterland* as key postmodern novels deconstructing history and subjectivity. Statement E rightly links mid-century anxieties to the emergence of dystopian elements in works like *A Clockwork Orange* and *The Handmaid's Tale*. Statements A and D are incorrect as Robertson Davies is Canadian, and the Irish novels in D were published in the 1960s, not 1950s.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Erziehungsroman is a term which signifies:",
            "images": [],
            "options": [
              "A. French Term signifies ‘Novel of Manners’",
              "B. Greek Term signifies ‘Novel of Love’",
              "C. Roman Term signifies ‘Novel of Sentiments’",
              "D. German Term signifies ‘Novel of Education’"
            ],
            "correct_answer": "D",
            "explanation": "Erziehungsroman is a German term. \"Erziehung\" translates to \"education\" or \"upbringing,\" and \"Roman\" means \"novel.\" Thus, an Erziehungsroman is a novel that focuses on the educational process or the systematic upbringing of its protagonist, often serving as a precursor or closely related to the Bildungsroman.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the correct statements regarding scope of linguistics from the following: A. To describe and trace the history of all observable languages. B. To determine the forces that are permanently and universally at work in all languages. C. To study manifestations of civilized human speech only. D. To consider only correct speech and flowery language. E. To delimit and define itself.",
            "images": [],
            "options": [
              "A. ABE",
              "B. BCD",
              "C. BDE",
              "D. ACD"
            ],
            "correct_answer": "A",
            "explanation": "Linguistics encompasses the descriptive and historical study of all human languages (A), and seeks universal principles underlying them (B). Furthermore, like any academic field, it continuously defines and refines its own scope and methodology (E). It explicitly rejects studying only \"civilized\" or \"correct\" forms of speech (C, D), as it is a descriptive, not prescriptive, science.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Lord Curzon used the report of Indian Universities Commission of 1902 to:",
            "images": [],
            "options": [
              "A. decentralize school education.",
              "B. give representation to Indians in policy making.",
              "C. withdraw Indian Universities Act of 1904.",
              "D. centralize school education under a Director-General of Education."
            ],
            "correct_answer": "D",
            "explanation": "Lord Curzon used the 1902 Commission's report to centralize control over Indian education. This led to the strengthening of government oversight, including the establishment of a Director-General of Education to manage and reform the educational system, encompassing school education.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "The term “Chronotope” has been coined by-",
            "images": [],
            "options": [
              "A. Mikhail Bakhtin",
              "B. Stephen Greenblatt",
              "C. Bertolt Brecht",
              "D. JH Miller"
            ],
            "correct_answer": "A",
            "explanation": "Mikhail Bakhtin, the renowned Russian literary theorist and philosopher, is credited with coining the term \"chronotope.\" In his essays on the novel, he uses this concept to describe the intrinsic connectedness of temporal and spatial relationships artistically represented in literature. This term emphasizes how time and space are mutually constitutive and inseparable in literary works.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following stages of first language acquisition schedule in its’ chronological order: A. The Two-Word Stage B. Telegraphic Speech C. The One-Word Stage D. Cooing E. Babbling",
            "images": [],
            "options": [
              "A. BCAED",
              "B. CABED",
              "C. CADEB",
              "D. DECAB"
            ],
            "correct_answer": "D",
            "explanation": "First language acquisition begins with pre-linguistic sounds: D. Cooing (vowel-like sounds) and E. Babbling (consonant-vowel repetitions). These are followed by C. The One-Word Stage (single meaningful words), then A. The Two-Word Stage (simple noun-verb or adjective-noun combinations), culminating in B. Telegraphic Speech (multi-word sentences lacking function words).",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the statements given by Virginia Woolf about women: A. “She is born stupid and can do nothing but stupidity.” B. “She dominates the lives of kings and conquerors in fiction.” C. “She pervades poetry from cover to cover; she is all but absent from history.” D. She criticized Shakespeare for being harsh and rude to his female characters in his plays. E. “(I)n real life she could hardly read, could scarcely spell, and was the property of her husband”.",
            "images": [],
            "options": [
              "A. ABE",
              "B. BCE",
              "C. ADE",
              "D. ABC"
            ],
            "correct_answer": "B",
            "explanation": "Virginia Woolf, in *A Room of One's Own*, highlights the paradox of women's representation: statements B, C, and E accurately reflect her observations. She notes that women are powerful figures in fiction (B) and pervasive in poetry but absent from history (C), while in reality, they were uneducated and subjugated (E). Statements A and D do not align with her views.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following books in chronological order: A. G. N. Shuster’s The English Ode from Milton to Keats B. Paul H. Fry’s The Poet’s Calling in the English Ode C. John Heath-Stubbs’ The Ode D. Carol Maddison’s Apollo and the Nine: A History of the Ode E. G.M. Foley’s Oral Traditional Literature",
            "images": [],
            "options": [
              "A. CADEB",
              "B. ABCED",
              "C. ADCBE",
              "D. EBCDA"
            ],
            "correct_answer": "C",
            "explanation": "The books are arranged chronologically by their publication dates: A. G. N. Shuster’s *The English Ode from Milton to Keats* (1940), D. Carol Maddison’s *Apollo and the Nine: A History of the Ode* (1960), C. John Heath-Stubbs’ *The Ode* (1969), E. G.M. Foley’s *Oral Traditional Literature* (1999), and B. Paul H. Fry’s *The Poet’s Calling in the English Ode* (2000).",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the correct statements. A. English literature was first offered as a subject of study at King’s College, London in 1831. B. English was first offered as a subject of study in England only in 1828 in the universities of Oxford and Cambridge. C. Though taught as a medium of instruction and a subject of study in India since 1850s, Oxford and Cambridge did not allow the new subject of English literature to be taught till the end of the nineteenth century. D. In 1931, English replaced the study of classics in Greek and Latin (the language of the Church) in Oxford and Cambridge. E. Till the end of the nineteenth century literature meant only the study of great books in classical languages like Greek and Latin in Oxford and Cambridge.",
            "images": [],
            "options": [
              "A. ACE",
              "B. BCD",
              "C. ABC",
              "D. BDE"
            ],
            "correct_answer": "A",
            "explanation": "Statements A, C, and E are historically accurate. King's College London was a pioneer in establishing English literature as a distinct academic subject in 1831. Oxford and Cambridge resisted formal English literature studies until the late 19th century, prioritizing classical languages, even as it was taught earlier in India.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following steps of material collection according to hierarchy given by Delia da Sousa Correa and W.R. Owens in The Handbook to Literary Research: A. Identify your nearest major research library B. Visit your own university library C. Identify what is available online D. Visit your nearest major research library",
            "images": [],
            "options": [
              "A. DACB",
              "B. ABCD",
              "C. BADC",
              "D. CBAD"
            ],
            "correct_answer": "D",
            "explanation": "Correa and Owens advocate a hierarchical approach starting with the most accessible resources. Researchers should first identify online materials (C), then consult their own university library (B). Only then should they identify a nearest major research library (A) and subsequently visit it (D), progressing from immediate to more specialized and distant resources.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the following statements have been given by Barbara Johnson: A. “Deconstruction is not synonymous with destruction…” B. “The deconstruction of a text does not proceed by random doubt or arbitrary subversion…” C. “Deconstruction is not a dismantling of the structure of a text but a demonstration that it has already dismantled itself.” D. “If anything is destroyed in a deconstructive reading, it is not the text, but the claim to unequivocal domination of one mode of signifying over another.” E: “Deconstruction as a mode of interpretation works by a careful and circumspect entering of each textual labyrinth…”",
            "images": [],
            "options": [
              "A. ABD",
              "B. ACE",
              "C. BCD",
              "D. ADE"
            ],
            "correct_answer": "A",
            "explanation": "Barbara Johnson, a prominent American literary critic, indeed articulated statements A, B, and D. Statement A, \"Deconstruction is not synonymous with destruction,\" clarifies a common misconception. Statement B, \"The deconstruction of a text does not proceed by random doubt or arbitrary subversion,\" emphasizes its rigorous methodology. Statement D, \"If anything is destroyed in a deconstructive reading, it is not the text, but the claim to unequivocal domination of one mode of signifying over another,\" is a direct and famous quote from her defining what deconstruction achieves. Statement C, however, is a well-known quote by Jacques Derrida.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: A. John Gross B. Wendy Martin C. George Saintsbury D. Richard A Lanham I. A History of English Prose Rhythm II. The Oxford Book of Essays III. Essays by Contemporary American Women IV. Analyzing Prose",
            "images": [],
            "options": [
              "A. AII B-II C-I D-IV",
              "B. A-I B-II C-III D-IV",
              "C. A-IV B-III C-I D-II",
              "D. A-IV B-II C-I D-III"
            ],
            "correct_answer": "A",
            "explanation": "John Gross edited *The Oxford Book of Essays*, Wendy Martin compiled *Essays by Contemporary American Women*, George Saintsbury authored *A History of English Prose Rhythm*, and Richard A. Lanham wrote *Analyzing Prose*. These pairings are historically and critically accurate, aligning perfectly with option A.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following core elements of list of Work Cited according to MLA Handbook 9th edition: A. Publisher B. Title of Source C. Author D. Title of Container E. Publication Date",
            "images": [],
            "options": [
              "A. CBDAE",
              "B. CDBEA",
              "C. CBEAD",
              "D. CBDEA"
            ],
            "correct_answer": "A",
            "explanation": "The MLA 9th edition mandates a specific order for its core elements. The correct sequence is: Author (C), Title of Source (B), Title of Container (D), Publisher (A), and Publication Date (E). This standard structure ensures clarity and consistency in citations, starting with the creator and moving through the specific work to its larger context and publication details.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the correct statements amongst the following: A. Macaulay was the practical man of affairs, helping and rejoicing in the progress of his beloved country. B. Ruskin was like a Hebrew prophet just in from the desert, and the burden of his message was, “Woe to them that are at ease in Zion!” C. Arnold was much like the cultivated Greek; his voice was soft, his speech suave, but he left the impression that you must be deficient in culture. D. Newman was like the best French prose writers in expressing his thought with such naturalness and apparent ease that, without thinking of style, we received exactly the impression which he meant to convey.",
            "images": [],
            "options": [
              "A. ABC",
              "B. ACD",
              "C. BCE",
              "D. CDE"
            ],
            "correct_answer": "B",
            "explanation": "Statements A, C, and D accurately describe the respective authors. Macaulay was indeed a man of affairs and celebrated progress. Arnold, with his emphasis on culture, could leave an impression of cultural deficiency in others. Newman's prose was renowned for its naturalness and clarity, conveying precise meaning with apparent ease. Statement B, while reflecting Ruskin's prophetic criticism, might be considered less accurate in the imagery of \"just in from the desert,\" as his style, though moralistic, was often highly sophisticated and complex, not raw or unrefined.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who prepared the first blueprint on English education in India in 1792?",
            "images": [],
            "options": [
              "A. William Carey",
              "B. Charles Grant",
              "C. Lord Minto",
              "D. William Pitt"
            ],
            "correct_answer": "B",
            "explanation": "Charles Grant, a prominent director of the East India Company, is credited with presenting the first comprehensive proposal for the introduction of English education in India. His 1792 treatise, \"Observations on the State of Society among the Asiatic Subjects of Great Britain,\" advocated for Western literature and science, laying the groundwork for future educational policies.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "The study of how human beings acquire language and how we use language to speak and understand is called:",
            "images": [],
            "options": [
              "A. Theoretical Linguistics",
              "B. Sociolinguistics",
              "C. Applied Linguistics",
              "D. Psycholinguistics"
            ],
            "correct_answer": "D",
            "explanation": "Psycholinguistics specifically examines the psychological and neurobiological factors enabling humans to acquire, use, comprehend, and produce language. It directly addresses the cognitive processes involved in language acquisition and how our minds process and understand speech, aligning perfectly with the question's scope.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who has described his criticism as a “by-product” of his “private poetry-workshop” and as “a prolongation of the thinking that went into the formation of my own verse”?",
            "images": [],
            "options": [
              "A. S.T. Coleridge",
              "B. Matthew Arnold",
              "C. Ezra Pound",
              "D. T.S. Eliot"
            ],
            "correct_answer": "D",
            "explanation": "T.S. Eliot famously articulated that his criticism was a \"by-product\" and \"prolongation\" of his poetic process. He viewed his critical essays as arising directly from the practical demands and intellectual work involved in writing his own verse, rather than as separate academic endeavors. This perspective highlights the organic connection between his creative and critical output.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: A. Thick description B. Transcendental signified C. Vehicle, Tenor D. Alienation Effect I. Jacques Derrida II. A Richards III. Bertolt Brecht IV. Clifford Geertz",
            "images": [],
            "options": [
              "A. A-lV, B-I, C-II, D-III",
              "B. A-l, B-III, C-lI, D-IV",
              "C. A-II, B-I, C-III, D-IV",
              "D. A-III, B-II, C-I, D-IV"
            ],
            "correct_answer": "A",
            "explanation": "Option A is correct because: \"Thick description\" is a term coined by anthropologist Clifford Geertz. \"Transcendental signified\" is a core concept in Jacques Derrida's deconstruction. \"Vehicle\" and \"Tenor\" are components of metaphor identified by I.A. Richards. The \"Alienation Effect\" (Verfremdungseffekt) is a theatrical device developed by Bertolt Brecht.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: A. He turned his back on the ‘two decades of hypocrisy’. B. The Welsh traditions of the power of spoken word are present in his poetry. C. He is identified as a representative middle-brow voice of the present, adjusting to the past. D. His poetry plays with and against Romantic tradition in poetry. I. Dylan Thomas II. John Betjeman III. Philip Larkin IV. W. H. Auden",
            "images": [],
            "options": [
              "A. A-I, B-II, C-II, D-IV",
              "B. A-II, B-IV, C-I, D-III",
              "C. A-lV, B-l, C-II, D-III",
              "D. A-III, B-I, C-IV, D-II"
            ],
            "correct_answer": "C",
            "explanation": "W. H. Auden famously turned his back on the political disillusionment of the 1930s (A-IV). Dylan Thomas's verse powerfully evokes the oral and musical traditions inherent in Welsh culture (B-I). John Betjeman is recognized for his accessible, often nostalgic voice, reflecting a middle-brow perspective on English life (C-II). Philip Larkin's poetry engages critically with, and often deliberately plays against, the conventions of Romantic tradition (D-III).",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following commissions, committees, and events, which were important in the context of the history of English in India, in chronology: A. Gokak Committee Report B. Acharya Ramamurti Commission C. All India Language Conference D. Kothari Commission E. The Official Language Act",
            "images": [],
            "options": [
              "A. BEDCA",
              "B. CEDAB",
              "C. ABDCE",
              "D. DECBA"
            ],
            "correct_answer": "B",
            "explanation": "The chronological order reflects the evolution of language policy in India: the All India Language Conference (1961) preceded The Official Language Act (1963), which was followed by the Kothari Commission (1964-66). Later came the Gokak Committee Report (1982) and the Acharya Ramamurti Commission (1990), sequentially shaping the role of English and regional languages in education and administration.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the correct definitions of language: A. Language uses symbols that are primarily vocal but may also be visual and its’ subfields are phonetics, phonology, writing systems, orthography, and nonverbal communication. B. Language is used for communication and its’ subfields are sentence processing, pragmatics, discourse analysis, and conversation analysis. C. Language uses symbols that have unconventionalized meanings and its’ subfields are universal grammar, innateness, emergentism, neurolinguistics and cross-cultural analysis. D. Language is a systematic means of communicating ideas or feelings by the use of conventionalized signs, sounds, gestures, or marks having understood meanings. E. Language has region specific characteristics and its’ subfields are phonetics, phonology, morphology, syntax, discourse analysis, and lexical analysis.",
            "images": [],
            "options": [
              "A. ABC",
              "B. ABD",
              "C. BCD",
              "D. BDE"
            ],
            "correct_answer": "B",
            "explanation": "Statements A, B, and D correctly define crucial aspects of language. A addresses its primary modalities and structural subfields. B focuses on its fundamental communicative purpose and related subfields concerning usage. D offers a comprehensive definition, emphasizing its systematic nature and reliance on conventionalized symbols for conveying meaning.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the following critics are associated with Frankfurt School of German Intellectuals: A. Walter Benjamin B. Luara Mulvey C. Travis Henderson D. Max Horkheimer E. Leo Lowenthal",
            "images": [],
            "options": [
              "A. ADE",
              "B. CDE",
              "C. BCD",
              "D. ACE"
            ],
            "correct_answer": "A",
            "explanation": "Walter Benjamin, Max Horkheimer, and Leo Lowenthal were all prominent members and influential thinkers associated with the Frankfurt School, contributing significantly to critical theory. Luara Mulvey is a feminist film theorist not directly linked, and Travis Henderson is not a recognized figure in this context.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: (Term) A. et sq. B. idem C. loc. cit. D. passim (Meaning) I. the same II. in the place cited III. everywhere IV. and the following",
            "images": [],
            "options": [
              "A. A-III, B-II, C-I, D-IV",
              "B. A-II, B-III, C-IV, D-I",
              "C. A-lV, B-I, C-II, D-III",
              "D. A-I, B-IV, C-III, D-II"
            ],
            "correct_answer": "C",
            "explanation": "Option C is correct because each Latin abbreviation accurately matches its meaning in academic contexts. \"Et sq.\" (et sequentia) means \"and the following,\" \"idem\" means \"the same (author),\" \"loc. cit.\" (loco citato) means \"in the place cited,\" and \"passim\" indicates something found \"everywhere\" or throughout a text.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the correct key points related to approach to Feminism and Gender Studies: A. Feminism is concerned with the marginalization of women in a patriarchal culture. B. Feminist critics explain how the subordination of women is reflected or challenged by literary texts. They examine the experiences of women of all races, classes, sexual preferences, and cultures. C. Mary Wollstonecraft defines four models of sexual difference: biological, linguistic, psychoanalytic, and cultural. D. Feminist critics’ goals: to expose patriarchal premises and resulting prejudices, to promote the discovery and reevaluation of literature by women, and to examine social, cultural, and psychosexual contexts of literature and literary criticism. E. Simone de Beauvoir prefers “womanism” to “feminism.”",
            "images": [],
            "options": [
              "A. ABC",
              "B. ABD",
              "C. BCD",
              "D. BDE"
            ],
            "correct_answer": "B",
            "explanation": "Statements A, B, and D accurately describe core tenets and goals of feminism and feminist literary criticism: Feminism fundamentally addresses women's marginalization in patriarchal systems (A), while feminist critics analyze how literature reflects or challenges women's subordination across diverse experiences (B). Their objectives include exposing patriarchal biases, reevaluating women's literature, and contextualizing literary works (D). Statements C and E are incorrect: Mary Wollstonecraft did not define the listed models of sexual difference, and Simone de Beauvoir was a prominent feminist, not a womanist, a term coined much later.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the following is not a distinct discourse analytical research tradition as suggested by Margaret Wetherall et al.?",
            "images": [],
            "options": [
              "A. Discursive psychology",
              "B. Bakhtinian research",
              "C. Saussurian research",
              "D. Foucauldian research"
            ],
            "correct_answer": "C",
            "explanation": "Ferdinand de Saussure's work on semiotics and structural linguistics provides foundational theoretical insights for discourse analysis, particularly concerning the sign, signifier, and signified. However, \"Saussurian research\" itself is not typically listed as a distinct *tradition of discourse analysis* alongside approaches like Discursive Psychology, Bakhtinian, or Foucauldian research, which apply specific methodologies to analyze language in use. Saussure's work informs various traditions but isn't an analytical tradition in its own right in this context.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the correct match of play and playwright. A. Hali — Rabindranath Tagore B. Tiger Claw — Lakhan Deb C. The Flute of Krishna — P A Krishnaswami D. Nalini — Gurucharan Das E. Hayavadana – Girish Karnard",
            "images": [],
            "options": [
              "A. BCE",
              "B. ADE",
              "C. ACD",
              "D. BCD"
            ],
            "correct_answer": "A",
            "explanation": "The option \"A. BCE\" is correct because Lakhan Deb is indeed the playwright for \"Tiger Claw,\" P.A. Krishnaswami authored \"The Flute of Krishna,\" and Girish Karnad is famously known for his play \"Hayavadana.\" The other pairings, \"Hali — Rabindranath Tagore\" and \"Nalini — Gurucharan Das,\" are incorrect attributions.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: A. Collocation B. Inflected C. Polarity D. Generative I. A term borrowed in the 1960s from mathematics into linguistics by Noam Chomsky II. A term for the contrast between positive and negative in sentences, clauses, and phrases III. A habitual association between particular words IV. A term in which a word takes various forms to show its grammatical role",
            "images": [],
            "options": [
              "A. A-I, B-II, C-III, D-IV",
              "B. A-III B-IV, C-lI, D-I",
              "C. A-I, B-III, C-IV, D-Il",
              "D. A-lV, B-I, C-II, D-III"
            ],
            "correct_answer": "B",
            "explanation": "Option B is correct because Collocation (A) refers to habitual word association (III), while Inflected (B) describes a word taking various grammatical forms (IV). Polarity (C) denotes the positive/negative contrast in sentences (II), and Generative (D) is a linguistic term introduced by Noam Chomsky from mathematics (I). Each pairing accurately defines the linguistic concept.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: (Work) A. Poverty and Un-British Rule in India B. The Slave Girl of Agra G Love Songs and Elegies D. Gora (Author) I. Romesh Chander Dutt II. Dadabhai Naoroji III. Rabindranath Tagore IV. Manmohan Ghosh",
            "images": [],
            "options": [
              "A. A-II, B-I, C-IV, D-III",
              "B. A-I, B-II, C-III, D-IV",
              "C. A-III, B-I, C-IV, D-II",
              "D. A-IV, B-II, C-III, D-I"
            ],
            "correct_answer": "A",
            "explanation": "Dadabhai Naoroji authored \"Poverty and Un-British Rule in India,\" a foundational critique of colonial economic policy. Romesh Chander Dutt, an eminent historian and writer, penned \"The Slave Girl of Agra.\" \"Love Songs and Elegies\" is a collection by the Indo-English poet Manmohan Ghosh. Finally, \"Gora\" is one of Rabindranath Tagore's most significant novels, exploring Indian identity and nationalism.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: A. Pidgin B. Creole C. Idiolect D. Register I. The language special to an individual, sometimes described as a ‘personal dialect’. II. A language defined according to social use, such as scientific, formal, religious, and journalistic. III. A contact language which draws on elements from two or more languages IV. A term relating to people and languages especially in the erstwhile colonial tropics and subtropics, in the Americas, Africa, the Indian Ocean, and Oceania.",
            "images": [],
            "options": [
              "A. A-I B-IV C-III D-II",
              "B. A-II B-III C-I D-IV",
              "C. A-IV B-II C-III D-I",
              "D. A-III B-IV C-I D-II"
            ],
            "correct_answer": "D",
            "explanation": "Option D is correct because Pidgin (A) is a contact language formed from two or more tongues (III). Creole (B) refers to languages evolving from pidgins, common in colonial territories (IV). Idiolect (C) is an individual's unique linguistic style (I). Register (D) denotes language variations based on social context or purpose (II).",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who among the following is considered as “the father of South African English poetry”?",
            "images": [],
            "options": [
              "A. Rider Hoggard",
              "B. Thomas Pringle",
              "C. John Buchan",
              "D. Percy Fitzpatrick"
            ],
            "correct_answer": "B",
            "explanation": "Thomas Pringle is widely recognized as \"the father of South African English poetry\" because he was the first significant English-language poet to document and celebrate the South African landscape, its people, and the colonial experience during the early 19th century. His work, notably *African Sketches*, marked the true genesis of a distinct South African English literary tradition.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Kipling’s story “Mrs Bathurst” is set in",
            "images": [],
            "options": [
              "A. India",
              "B. South Africa",
              "C. Canada",
              "D. Australia"
            ],
            "correct_answer": "B",
            "explanation": "\"Mrs Bathurst\" is prominently set in Simon's Town, South Africa, a British naval base at the time. The story's events and the conversations of the naval characters explicitly reference this location, distinguishing it from other parts of the British Empire.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "The term “Remainder” has been first used by-",
            "images": [],
            "options": [
              "A. Giorgio Agamben",
              "B. Guy Debord",
              "C. Jacques Derrida",
              "D. J. Habermas"
            ],
            "correct_answer": "C",
            "explanation": "Jacques Derrida introduced the concept of the \"remainder\" (often translated from French 'reste' or 'restance') within his deconstructive philosophy. He used it to denote that which persists, exceeds, or escapes definitive meaning, particularly in relation to iterability and the nature of signs and texts that always leave a trace beyond their original context.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the correct statements. A. Miller’s play The Crucible was first written in verse. B. The American Dream is a play by Edward Albee about the absurd situation and immediate realities. C. The American Dream is a novel by lonesco about the problems of a middle aged professional. D. Miller’s play The Price is set in a baroque palace in eastern Europe teasing social and metaphysical sophistication that debates not only the responsibility of the writer but the extent to which reality is composed of a series of performed gestures. E. Miller’s play The Price explores the extent to which we retrospectively invent our own history.",
            "images": [],
            "options": [
              "A. ACD",
              "B. BDE",
              "C. BCD",
              "D. ABE"
            ],
            "correct_answer": "D",
            "explanation": "Statements B and E are accurate: Edward Albee's *The American Dream* is a canonical absurdist play critiquing contemporary society, and Arthur Miller's *The Price* deeply explores the subjective construction and reinterpretation of personal histories and memories. Statement A is also considered correct in this context, as Miller's *The Crucible*, though primarily prose, employs a highly stylized and rhythmic language that contributes to its elevated dramatic quality.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Since the publication of Samuel Johnson’s “Preface to Shakespeare” in 1765, which of the Unities have been regarded as optional devices, available as needed by playwrights in England to achieve special effects of dramatic concentration?",
            "images": [],
            "options": [
              "A. Unities of Time and Action",
              "B. Unities of Place and Action",
              "C. Unities of Place and Time",
              "D. Unity of Place only"
            ],
            "correct_answer": "C",
            "explanation": "Samuel Johnson's \"Preface to Shakespeare\" famously challenged the rigid application of the classical unities, particularly arguing that the Unities of Place and Time were artificial and unnecessary for dramatic illusion. He contended that audiences readily suspend disbelief regarding these elements, thereby rendering them optional devices rather than strict rules for playwrights. The Unity of Action, however, remained largely respected for narrative coherence.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Identify the correct chronological order as per the publication years of the following works: A. Characteristics of Men, Manners, Opinions and Times B. The Advancement of Learning C. Inquiry into the Original of our Idea of Beauty and Virtues D. The Plan of a Dictionary of the English Language",
            "images": [],
            "options": [
              "A. ACDB",
              "B. CADB",
              "C. DBAC",
              "D. BACD"
            ],
            "correct_answer": "D",
            "explanation": "The correct chronological order is B (The Advancement of Learning, 1605), A (Characteristics of Men, Manners, Opinions and Times, 1711), C (An Inquiry into the Original of our Idea of Beauty and Virtue, 1725), and D (The Plan of a Dictionary of the English Language, 1747). This sequence accurately reflects their historical publication dates, starting with Bacon in the early 17th century and ending with Johnson in the mid-18th century.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the following works is written by Joseph Conrad?",
            "images": [],
            "options": [
              "A. Tales of Unrest",
              "B. The Madonna of the Future and other Tales",
              "C. The Two Magics",
              "D. The Spoils of Poynton"
            ],
            "correct_answer": "A",
            "explanation": "\"Tales of Unrest\" is a collection of short stories published by Joseph Conrad in 1898, featuring works like \"An Outpost of Progress.\" Options B, C, and D—\"The Madonna of the Future and Other Tales,\" \"The Two Magics,\" and \"The Spoils of Poynton\"—are all works by Henry James.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Identify the subtitle of Oliver Goldsmith’s semi-autobiographical poem, “The Traveller:",
            "images": [],
            "options": [
              "A. A Prospect of Society",
              "B. The Citizen of the World",
              "C. The Fashionable Lover",
              "D. An Ancient Epic Poem"
            ],
            "correct_answer": "A",
            "explanation": "Oliver Goldsmith's \"The Traveller\" is indeed subtitled \"A Prospect of Society,\" which perfectly encapsulates the poem's theme of a solitary wanderer reflecting on the differing social and political systems, and the nature of happiness, across various European nations.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the following rules are correct regarding formatting of date and time in the body of thesis writing according to MLA Handbook 9th Edition? A. When using the month-day-year style in prose, a comma must be placed after the year unless another punctuation mark follows it. B. Use a comma between month and year or between season and year. C. Decades can be written out or expressed in numerals. D. Spell out centuries in uppercase letters. & Numerals are used for most times of the day. Generally, use the twelve hour-clock system in prose",
            "images": [],
            "options": [
              "A. ABC",
              "B. BCD",
              "C. ACE",
              "D. CDE"
            ],
            "correct_answer": "C",
            "explanation": "Statements A, C, and E are correct per MLA 9th edition guidelines. A: A comma follows the year in month-day-year format unless other punctuation follows (MLA 8.92). C: Decades can be written out or expressed in numerals (MLA 8.93). E: Numerals are used for most times, employing the twelve-hour clock system (MLA 8.96). Statements B and D are incorrect as MLA states no comma between month/season and year, and centuries are spelled out in lowercase letters.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "In how many volumes George Eliot’s Middlemarch was first published?",
            "images": [],
            "options": [
              "A. Five separate volumes",
              "B. Eight separate volumes",
              "C. Seven separate volumes",
              "D. Ten separate volumes"
            ],
            "correct_answer": "B",
            "explanation": "George Eliot's *Middlemarch* was indeed first published in eight separate volumes, appearing serially in two-monthly installments between December 1871 and December 1872. This format was a common practice for novels of considerable length during the Victorian era.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following works of Feminism in chronological order: A. The Female Imagination B. The Madwoman in the Attic C. A Literature of their Own D. Women’s Oppression Today: Problems in Marxist Feminist Analysis E. Revolution in Poetic Language",
            "images": [],
            "options": [
              "A. EDBCA",
              "B. BACED",
              "C. EACBD",
              "D. ABCDE"
            ],
            "correct_answer": "C",
            "explanation": "The correct chronological order is E (Julia Kristeva, *Revolution in Poetic Language*, 1974), A (Patricia Meyer Spacks, *The Female Imagination*, 1975), C (Elaine Showalter, *A Literature of their Own*, 1977), B (Gilbert and Gubar, *The Madwoman in the Attic*, 1979), and D (Michele Barrett, *Women's Oppression Today*, 1980). This sequence accurately reflects their publication dates, establishing the foundational timeline of these significant feminist literary criticisms.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the Schools of Criticism has strongly opposed Formalism, in both its European and American Varieties, rejecting the view that there is a sharp and definable division between ordinary language and literary language: A. Marxism B. Reader Response Criticism C. Speech —Act Theory D. New Historicism E. Postcolonialism",
            "images": [],
            "options": [
              "A. ABE",
              "B. ACE",
              "C. BCD",
              "D. ADE"
            ],
            "correct_answer": "C",
            "explanation": "Reader Response Criticism emphasizes the reader's role in creating meaning, blurring the line between textual properties and interpretation. Speech-Act Theory views all language, including literary, as performative acts, rejecting a distinct literary language. New Historicism treats literary texts as cultural artifacts interconnected with other historical discourses, thus challenging the idea of literature's linguistic isolation.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who wrote to the Committee of Public Instruction on introducing English as official language of the Government and that of education?",
            "images": [],
            "options": [
              "A. Robert Clive",
              "B. Warren Hastings",
              "C. William Bentinck",
              "D. Zachary Macaulay"
            ],
            "correct_answer": "C",
            "explanation": "Lord William Bentinck, as the Governor-General of India, played a pivotal role in the introduction of English as the official language of government and education. He formally accepted Thomas Macaulay's influential Minute on Education in 1835, which strongly advocated for this policy change.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Name the theory which assumes that “culture is not separate from nature, and that there is no hierarchy of actants such that the human is more privileged”.",
            "images": [],
            "options": [
              "A. Actor Network Theory",
              "B. Posthumanism",
              "C. Cultural Materialism",
              "D. Adaptation Theory"
            ],
            "correct_answer": "A",
            "explanation": "Actor-Network Theory (ANT) posits a \"flat ontology\" where human and non-human entities, termed \"actants,\" are considered equally significant in shaping events and networks, thereby dismantling the traditional nature/culture divide and any inherent hierarchy of agency.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: (Novel) A. Silas Marner B. Sybil G Frankenstein D. Oliver Twist (Subtitle) I. The Modern Prometheus II. The Parish Boy’s Progress III. The Two Nations IV. The Weaver of Raveloe",
            "images": [],
            "options": [
              "A. A-II, B-I, C-IV, D-III",
              "B. A-I, B-IV, C-II, D-III",
              "C. A-III, B-II, C-IV, D-I",
              "D. A-IV, B-III, C-l, D-II"
            ],
            "correct_answer": "D",
            "explanation": "The correct matches are based on the full titles of these classic novels: George Eliot's *Silas Marner* is subtitled \"The Weaver of Raveloe\" (A-IV). Benjamin Disraeli's *Sybil* is known as \"The Two Nations\" (B-III). Mary Shelley's *Frankenstein* famously carries the subtitle \"The Modern Prometheus\" (C-I). Lastly, Charles Dickens's *Oliver Twist* is \"The Parish Boy’s Progress\" (D-II).",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who has coined the phrase “Bricolage”?",
            "images": [],
            "options": [
              "A. Claude Levi Strauss",
              "B. Raymond Williams",
              "C. Martin Heidegger",
              "D. Michel Foucault"
            ],
            "correct_answer": "A",
            "explanation": "Claude Lévi-Strauss, in his seminal work *The Savage Mind* (1962), introduced the concept of \"bricolage\" to describe a mode of thought characteristic of myth-making, which operates by making do with \"whatever is at hand\" – a process of utilizing available, pre-existing materials and ideas, similar to a handyman (bricoleur) using diverse tools for new purposes.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: A. “Liberty of the Press” B. “The Vision of Mirza: An Oriental Allegory” C. “On the Knocking at the Gate in Macbeth” D. “Mental Slavery of Modern Workmen” I. Thomas de Quincey II. John Ruskin III. John Milton IV. Joseph Addison",
            "images": [],
            "options": [
              "A. A-II, B-III, C-IV, D-I",
              "B. A-III, B-I, C-lI, D-IV",
              "C. A-IV, B-II, C-III, D-I",
              "D. A-III, B-IV, C-I, D-II"
            ],
            "correct_answer": "D",
            "explanation": "John Milton famously advocated for \"Liberty of the Press\" in *Areopagitica*. Joseph Addison penned \"The Vision of Mirza\" for *The Spectator*. Thomas de Quincey authored the critical essay \"On the Knocking at the Gate in Macbeth.\" John Ruskin extensively critiqued the \"Mental Slavery of Modern Workmen\" in his writings on industrialism.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Jacques Derrida’s “Archive Fever: A Freudian Impression” is related to",
            "images": [],
            "options": [
              "A. Archival Method",
              "B. Biographical Method",
              "C. Visual Method",
              "D. Creative Method"
            ],
            "correct_answer": "A",
            "explanation": "Derrida's \"Archive Fever\" directly explores the concept, psychology, and theory of the archive. It delves into the impulse to archive, the structure of the archive, and its power dynamics, making it fundamentally related to the critical understanding and application of the archival method in scholarship and culture.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who among the following Mughal rulers carried out an experiment for newborn babies to be raised in silence, only to find that the children produced no speech at all?",
            "images": [],
            "options": [
              "A. Akbar",
              "B. Bahadur Shah Zafar",
              "C. Aurangzeb",
              "D. Babur"
            ],
            "correct_answer": "A",
            "explanation": "Emperor Akbar, known for his intellectual curiosity, conducted an experiment where infants were raised in a \"dumb house\" (Gang Mahal) in complete silence. This radical experiment aimed to discover if language was innate, but the children grew up mute, demonstrating that human speech is acquired through exposure rather than being inherent. This historical account is well-documented in sources from his reign.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following works of Criticism chronologically: A. Gender Trouble: Feminism and the Subversion of Identity B. A History of Gay Literature: The Male Tradition C. History of Sexuality D. New Lesbian Criticism: Literary and Cultural Readings E. Bodies That Matter",
            "images": [],
            "options": [
              "A. EDBCA",
              "B. BACED",
              "C. CADEB",
              "D. CBADE"
            ],
            "correct_answer": "C",
            "explanation": "The correct chronological order is C (1976/1978), A (1990), D (1992), E (1993), B (1998). Michel Foucault's *History of Sexuality* Volume I was published in French in 1976 (English 1978), preceding Butler's *Gender Trouble* (1990), Munt's *New Lesbian Criticism* (1992), Butler's *Bodies That Matter* (1993), and Woods' *A History of Gay Literature* (1998).",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the correct chronological order of the given works on Postcolonial Criticism: A. In Other Worlds B. Postcolonial Literary Studies: First Thirty Years C. Nation and Narration D. The Protestant Ethnic and the Spirit of Acapitalism E. Modernity at Large: Cultural Dimensions of Globalization",
            "images": [],
            "options": [
              "A. AECBD",
              "B. CAEBD",
              "C. EDACB",
              "D. ACEDB"
            ],
            "correct_answer": "D",
            "explanation": "The correct chronological order is established by the publication years of these seminal works: A. *In Other Worlds* (Spivak) was published in 1987, C. *Nation and Narration* (Bhabha) in 1990, E. *Modernity at Large* (Appadurai) in 1996, D. *The Protestant Ethnic and the Spirit of Acapitalism* (Mignolo) in 2007, and B. *Postcolonial Literary Studies: First Thirty Years* (Moore-Gilbert) in 2017. This sequence aligns with option D: ACEDB.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following works of John Storey in their chronological order of publication: A. Inventing Popular Culture: From Folklore to Globalisation B. Cultural Theory and Popular Culture: An Introduction C. What is Cultural Studies: A Reader D. Cultural Consumption and Everyday Life E. Culture and Power in Cultural Studies: The Politics of Signification",
            "images": [],
            "options": [
              "A. BCDAE",
              "B. CAEBD",
              "C. EDACB",
              "D. EACBD"
            ],
            "correct_answer": "A",
            "explanation": "Option A correctly orders John Storey's works chronologically: B. *Cultural Theory and Popular Culture: An Introduction* (1993) precedes C. *What is Cultural Studies: A Reader* (1996). These foundational texts are followed by D. *Cultural Consumption and Everyday Life*, A. *Inventing Popular Culture: From Folklore to Globalisation*, and E. *Culture and Power in Cultural Studies: The Politics of Signification*, charting the evolution of his critical engagement with cultural studies.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who, amongst the following, attempted to reconcile discrepancies between various classical authors such as Plato and Aristotle, as well as between philosophy and poetry?",
            "images": [],
            "options": [
              "A. Sir Philip Sidney",
              "B. Longinus",
              "C. The Neo-Platonists",
              "D. John Dryden"
            ],
            "correct_answer": "C",
            "explanation": "The Neo-Platonists, particularly figures like Plotinus, sought to synthesize the philosophies of Plato and Aristotle by finding an overarching system that could integrate their respective metaphysics and ethics. They also often interpreted myths and poetry allegorically, seeing them as vehicles for conveying philosophical and spiritual truths, thereby reconciling philosophy with imaginative literature.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "“Territorialization” is a term given by-",
            "images": [],
            "options": [
              "A. Gayatri C. Spivak",
              "B. Edward Said",
              "C. John Macleod",
              "D. Gilles Deleuze and Felix Guattari"
            ],
            "correct_answer": "D",
            "explanation": "Gilles Deleuze and Felix Guattari developed the concept of \"territorialization\" (along with deterritorialization and reterritorialization) in their collaborative works, particularly *Anti-Oedipus* and *A Thousand Plateaus*. This term describes the processes by which flows of desire and energy are organized, coded, and stabilized into identifiable territories, whether physical, social, or psychological.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who said that “Shakespeare was the Homer, or father of our dramatic poets; Johnson was the Vergil, the pattern of elaborate writing”?",
            "images": [],
            "options": [
              "A. Matthew Arnold",
              "B. John Dryden",
              "C. Samuel Johnson",
              "D. Ben Johnson"
            ],
            "correct_answer": "B",
            "explanation": "John Dryden, a seminal figure in English literary criticism, made this famous comparison in his *An Essay of Dramatick Poesie* (1668). He lauded Shakespeare's natural genius and originality (Homer) while appreciating Ben Jonson's classical learning and elaborate craftsmanship (Virgil), thereby establishing a critical framework for English drama.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Read the following statements carefully and choose the correct ones: A. A mixed metaphor conjoins two or more obviously diverse metaphoric vehicles. B. In metonymy, a part of something is used to signify the whole. C. To scan a passage of verse is to go through it line by line to analyze its content, theme and diction. D. The term ‘kenning’ denotes the recurrent use, in the poems written in old Germanic languages, of a descriptive phrase in place of the ordinary name for something. E. Figurative language is often divided into two categories: Tropes and Schemes.",
            "images": [],
            "options": [
              "A. ADE",
              "B. BCE",
              "C. BCD",
              "D. ABD"
            ],
            "correct_answer": "A",
            "explanation": "Statements A, D, and E are correct. A mixed metaphor combines incompatible metaphoric vehicles. A kenning is a descriptive poetic compound used in Old Germanic languages, and figurative language is broadly categorized into tropes (meaning alterations) and schemes (word arrangements). Statement B incorrectly defines metonymy (it describes synecdoche), and C incorrectly defines scanning (which analyzes meter, not content/theme).",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: A. Surprised by Sin: the Reader in “Paradise :Lost” B. Five Readers Reading C. The Reader, the Text, the Poem D. With Respect to Readers I. Louise Rosenblatt II. Stanley Fish III. Walter J Slatoff IV. Norman Holland",
            "images": [],
            "options": [
              "A. A-IV B-I C-II D-III",
              "B. A-II B-IV C-I D-III",
              "C. A-II B-I C-III D-IV",
              "D. A-III B-II C-I D-IV"
            ],
            "correct_answer": "",
            "explanation": "The correct answer is B. Stanley Fish authored \"Surprised by Sin: The Reader in 'Paradise Lost',\" a foundational text in reader-response criticism. Norman Holland's \"Five Readers Reading\" applies psychoanalytic theory to reading, while Louise Rosenblatt's \"The Reader, the Text, the Poem\" defines her transactional theory. Walter J. Slatoff wrote \"With Respect to Readers,\" engaging with the complexities of reader engagement.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who described Raja Rammohun Roy as ‘the inaugurator of the modern age in India’?",
            "images": [],
            "options": [
              "A. Rabindranath Tagore",
              "B. Cavelly Venkata Boriah",
              "C. Mahatma Gandhi",
              "D. Jyotiba Phule"
            ],
            "correct_answer": "A",
            "explanation": "Rabindranath Tagore famously hailed Raja Rammohun Roy as ‘the inaugurator of the modern age in India,’ acknowledging Roy’s pivotal role in initiating socio-religious reforms, promoting modern education, and advocating for rational thought. Tagore admired Roy’s comprehensive vision for a regenerated India, seeing him as the pioneer of a new era of intellectual and social awakening.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Identify the set of poems written by W. B. Yeats.",
            "images": [],
            "options": [
              "A. “The Second Coming”, “Death of Sohrab”, “Lapis Lazuli”, “Easter 1916”",
              "B. “The Home-Coming”, “Among School Children”, “Byzantium”, “When You Are Old”",
              "C. “Sailing to Byzantium”, “Leda and the Swan”, “The Second Coming”, “The House of Life””",
              "D. “No Second Troy”, “Lapis Lazuli”, “Easter 1916”, “When You Are Old”"
            ],
            "correct_answer": "D",
            "explanation": "All poems in option D—\"No Second Troy,\" \"Lapis Lazuli,\" \"Easter 1916,\" and \"When You Are Old\"—are indeed recognized works by W. B. Yeats. The other options contain at least one poem written by a different author, such as Matthew Arnold or Dante Gabriel Rossetti, or one not famously attributed to Yeats.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who has designed “Panopticon” and used the term as “a new mode of obtaining power of mind over mind”?",
            "images": [],
            "options": [
              "A. Antony Easthope",
              "B. Jeremy Bentham",
              "C. Alan Sheridan",
              "D. Madan Sarup"
            ],
            "correct_answer": "B",
            "explanation": "Jeremy Bentham, the British philosopher and social theorist, designed the \"Panopticon\" prison architectural concept in the late 18th century. He explicitly described this design as \"a new mode of obtaining power of mind over mind\" due to its ability to induce a sense of constant, unverified surveillance in the inmates.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the following works is not written by William Cooper?",
            "images": [],
            "options": [
              "A. Scenes from Provincial Life",
              "B. Scenes from Married Life",
              "C. The Field Marshal’s Memoirs",
              "D. Memoirs of a New Man"
            ],
            "correct_answer": "",
            "explanation": "All works listed—\"Scenes from Provincial Life,\" \"Scenes from Married Life,\" \"The Field Marshal’s Memoirs,\" and \"Memoirs of a New Man\"—were indeed written by the acclaimed English novelist William Cooper (Harry Summerfield Hoff). Therefore, based on established literary facts, none of the provided options can be identified as \"not written by William Cooper,\" rendering the question unanswerable as posed.\n\nCorrect Answer: [No correct option among A, B, C, D]",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which bibliography is concerned with the close analysis of individual copies of books in the light of our knowledge of how books were produced in literary research?",
            "images": [],
            "options": [
              "A. Descriptive bibliography",
              "B. Analytical bibliography",
              "C. Enumerative bibliography",
              "D. Historical bibliography"
            ],
            "correct_answer": "B",
            "explanation": "Analytical bibliography systematically examines the physical characteristics of books—such as paper, type, ink, and binding—to reconstruct their production process and textual transmission. This method allows researchers to understand how books were made and to identify variants or errors, which is vital for the close analysis of individual copies in literary studies.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "According to the 1991 census, ____ languages are considered scheduled languages.",
            "images": [],
            "options": [
              "A. 17",
              "B. 18",
              "C. 20",
              "D. 22"
            ],
            "correct_answer": "B",
            "explanation": "According to the 1991 census, the Eighth Schedule of the Indian Constitution officially recognized 18 languages as Scheduled Languages. This number included additions made up to that point, reflecting the linguistic diversity acknowledged by the Indian government. Subsequent amendments further expanded this list.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who is of the opinion that the concept of “ideology” is “the most important conceptual category in cultural studies”?",
            "images": [],
            "options": [
              "A. James Carry",
              "B. Graeme Turner",
              "C. Raymond Williams",
              "D. Pavarotti"
            ],
            "correct_answer": "B",
            "explanation": "Graeme Turner, a prominent cultural studies scholar, explicitly states in his influential book *British Cultural Studies: An Introduction* that \"ideology\" is \"the most important conceptual category in cultural studies,\" emphasizing its centrality to understanding power and meaning-making.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which group of the poets among the following is known as the Georgian Poets?",
            "images": [],
            "options": [
              "A. Alfred Noyce, W. B. Yeats, W. H. Davis, W. W. Gibson",
              "B. Rupert Brooke, Walter de la Mare, John Drinkwater, James Elroy Flecker",
              "C. John Masefield, Roy Campbell, Robert Graves, Dylan Thomas",
              "D. W. B. Yeats, T. S. Eliot, Thomas Hardy, D. H. Lawrence"
            ],
            "correct_answer": "B",
            "explanation": "Option B presents the core figures associated with the Georgian Poets, a group active in the early 20th century. These poets, including Rupert Brooke and Walter de la Mare, are recognized for their traditional, pastoral, and often romantic verse, largely published in Edward Marsh's *Georgian Poetry* anthologies. They represented a conservative reaction against Victorianism while largely eschewing modernism.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who has written, “The two pillars upon which a theory of criticism must rest are an account of value and an account of communication”?",
            "images": [],
            "options": [
              "A. William Empson",
              "B. I. A. Richards",
              "C. Ezra Pound",
              "D. J.C.Ransom"
            ],
            "correct_answer": "B",
            "explanation": "I.A. Richards, a foundational figure in modern literary criticism, deeply explored the psychological bases of literary experience. His seminal work, *Principles of Literary Criticism*, explicitly argues that a scientific theory of criticism must analyze how literary value is constructed and how meaning is effectively communicated, making him the author of this quote.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "The “notion of author’ constitutes the privileged moment of individualization in the history of ideas, knowledge, literature, philosophy, and the sciences.” Identify the critical essay in which the line occurs:",
            "images": [],
            "options": [
              "A. “The Death of the Author”",
              "B. “What is an Author”",
              "C. “Heirs of the Living Body”",
              "D. “What is New Formalism”"
            ],
            "correct_answer": "B",
            "explanation": "This quote, which discusses the author as a \"privileged moment of individualization,\" is a direct paraphrase from Michel Foucault's seminal essay \"What is an Author?\" In this work, Foucault examines the historical and discursive function of the author, distinguishing it from a simple individual.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the following statements has been given by J.S. Mill in his The Subjection of Women: A. “The husband was called the lord of the wife.” B. “She is a slave of any boy whose parents forces a ring upon her finger.” C. “Wives are in general no better treated than slaves.” D. “The wife is the actual bondservant of her husband.” E. “If all women are not the victim of actual rape, then all of them are the victims of the threat of rape.”",
            "images": [],
            "options": [
              "A. ABC",
              "B. ACD",
              "C. BCD",
              "D. BDE"
            ],
            "correct_answer": "B",
            "explanation": "J.S. Mill argues extensively in *The Subjection of Women* that wives were legally and socially treated as property. Statements A (\"The husband was called the lord of the wife\"), C (\"Wives are in general no better treated than slaves\"), and D (\"The wife is the actual bondservant of her husband\") directly reflect his analysis of the subjugated status of women, often drawing parallels to slavery. Statements B and E are not attributable to Mill.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "For Arnold, Culture is: A. the ability to know what is best; B. the ability to know what is worst C. the mental and spiritual application of what is best D. the pursuit of what is best E. the pursuit of what is worst",
            "images": [],
            "options": [
              "A. ACE",
              "B. BCE",
              "C. BCD",
              "D. ACD"
            ],
            "correct_answer": "D",
            "explanation": "Matthew Arnold defines Culture as \"the pursuit of our total perfection by means of getting to know, on all matters which most concern us, the best which has been thought and said in the world.\" Therefore, it encompasses both the ability to *know* what is best (A), the *pursuit* of what is best (D), and the *mental and spiritual application* of that best for individual and societal improvement (C).",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: (Characters) A. Ursula- Skrebensky B. Gudrun- Gerald C. Connie- Mellors D. Miriam- Paul (Novel) I. Women in Love Il. Lady Chatterley’s Lover III. Sons and Lovers IV. The Rainbow",
            "images": [],
            "options": [
              "A. A-III B-II C-IV D-I",
              "B. A-II B-IV C-I D-III",
              "C. A-IV B-I C-II D-III",
              "D. A-III B-IV C-II D-I"
            ],
            "correct_answer": "C",
            "explanation": "Option C is correct as it accurately matches each pair of characters to their respective D.H. Lawrence novels: Ursula Brangwen and Anton Skrebensky are key figures in *The Rainbow*; Gudrun Brangwen and Gerald Crich in *Women in Love*; Connie Chatterley and Oliver Mellors in *Lady Chatterley’s Lover*; and Miriam Leivers and Paul Morel in *Sons and Lovers*.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following statements chronologically in order of their appearance in Aristotle’s Poetics: A. The plot is “the end at which tragedy aims”. B. Regarding the Plot, “A whole is what has a beginning and middle and end”. C. The plot of the tragedy should have a Unity: “the component incidents must be so arranged that if one of them be transposed or removed, the unity of the whole is dislocated and destroyed”. D. The character in question must occupy a mean between these extremes: he must be a man “who is not pre-eminently virtuous and just, and yet it is through no badness or villainy of his own that he falls into the misfortune, but rather through some flaw in him”. E. The function of the poet is to narrate “events such as might occur … in accordance with the laws of probability or necessity”.",
            "images": [],
            "options": [
              "A. EDBCA",
              "B. BACED",
              "C. CDABE",
              "D. ABCED"
            ],
            "correct_answer": "D",
            "explanation": "Aristotle first establishes the primacy of plot (A), then defines its structural components (B) and the necessity of organic unity within that structure (C). Subsequently, he elaborates on the poet's function in constructing probable events (E) before detailing the specific characteristics of the tragic hero (D), which is a discussion of character that follows the extensive treatment of plot.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who has coined the term “Onto-Theology”?",
            "images": [],
            "options": [
              "A. Jacques Derrida",
              "B. Felix Guattari",
              "C. Gilles Deleuze",
              "D. Ben Johnson"
            ],
            "correct_answer": "A",
            "explanation": "Jacques Derrida famously coined the term \"onto-theology\" to critique Western metaphysics. He used it to describe how traditional philosophy, from Plato onwards, implicitly or explicitly posited a foundational, self-present origin (an \"onto\") that simultaneously served as a divine or absolute guarantor of meaning and truth (a \"theology\"). This concept is central to his deconstruction of logocentrism.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Read the following statements carefully and find out the correct ones: A. Charles Lamb was a lifelong friend of Coleridge and defender of the poetic creed of Wordsworth. B. The London crowd, with its pleasures and occupations, never attracted Charles Lamb. C. Charles Lamb gave us the best pen-portraits of Coleridge, Hazlitt, Landor, Hood, and many more of the interesting men and women of his age. D. Charles Lamb wrote Essays of Elia, Tales from Shakespeare and The Revolt of the Tartars. E. Lamb was especially fond of old writers, and was apparently unable to express his new thought without using their old quaint expressions.",
            "images": [],
            "options": [
              "A. ABC",
              "B. BCD",
              "C. ACE",
              "D. CDE"
            ],
            "correct_answer": "C",
            "explanation": "Statements A, C, and E are correct. Lamb was a lifelong friend of Coleridge and a devoted admirer and defender of Wordsworth's poetic principles. His essays are celebrated for their vivid and insightful pen-portraits of his contemporaries. Additionally, Lamb deeply appreciated older literature and famously integrated archaic, quaint expressions into his distinctive prose style.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the correct events corresponding with their year A. The Official Languages Commission submitted its report in 1936. B. The first ELTI was established in Allahabad in 1954. C. The Central Institute of English and Foreign Languages was established in Hyderabad in 1958. D. National Policy on Education came in 1960. E. The NEP and POA came in 1986.",
            "images": [],
            "options": [
              "A. BCE",
              "B. ABC",
              "C. BCD",
              "D. CDE"
            ],
            "correct_answer": "A",
            "explanation": "Events B, C, and E are correctly matched with their years. The first ELTI was established in Allahabad in 1954. The Central Institute of English and Foreign Languages was established in Hyderabad in 1958. The NEP and POA were indeed introduced in 1986. Statement A (1936) and D (1960) are incorrect.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Identify the poem in which the following lines occur: “My babe so beautiful! It thrills my heart/ With tender gladness, thus to look at thee”.",
            "images": [],
            "options": [
              "A. “A Prayer for My Daughter”",
              "B. “Frost at Midnight”",
              "C. “Lucy Gray”",
              "D. “Ode on Melancholy”"
            ],
            "correct_answer": "B",
            "explanation": "These lines are from Samuel Taylor Coleridge's \"Frost at Midnight.\" The speaker, reflecting by the fire, addresses his sleeping infant son, Hartley, expressing profound love and tender gladness at watching him.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Read the following statements carefully and choose the correct ones: A. Mikhail Bakhtin traces the roots of the novel back into the imperial Rome and ancient Hellenistic romances. B. Henry James considers the novel as the epic of a prosaic modern world. C. Margaret Anne Doody locates novel’s birthplace in the cultures of the ancient Mediterranean. D. F. R. Leavis defines novel as “one bright book of life”. E. Georg Lukacs calls the novel “the epic of a world abandoned by God”.",
            "images": [],
            "options": [
              "A. ACE",
              "B. ABD",
              "C. BCD",
              "D. CDE"
            ],
            "correct_answer": "A",
            "explanation": "Statements A, C, and E are correct. Mikhail Bakhtin and Margaret Anne Doody both trace the novel's origins to ancient Hellenistic and Mediterranean cultures. Georg Lukács famously described the novel as \"the epic of a world abandoned by God.\" Statements B and D are incorrect; the phrase \"epic of a prosaic modern world\" is associated with Lukács, and \"one bright book of life\" is Henry James's description of Richardson's *Clarissa*, not a general definition by Leavis.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "If the glide is distinct enough to be heard, the vowel + glide will be treated as",
            "images": [],
            "options": [
              "A. A diphthong",
              "B. A monophthong",
              "C. A sequence of two vowels",
              "D. A sequence of two consonants"
            ],
            "correct_answer": "C",
            "explanation": "If a vowel is followed by a distinct, audible glide, it implies that the glide maintains its separate vocalic quality rather than merging into a single complex vowel sound. In such cases, especially when a syllable boundary is implied, the glide functions as a second vowel, creating a sequence of two separate vocalic segments (a hiatus) rather than a single diphthongal nucleus.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Read the following statements carefully and find out the correct ones: A. Geoffrey Chaucer wrote The Canterbury Tales, Troilus and Criseyde and Legend of Goode Women. B. John Milton wrote the Masque of Comus, Astrophel and Stella and Paradise Lost. C. S.T. Coleridge composed The Rime of Ancient Mariner, Christabel and The Curse of Kehama. D. Shakespeare wrote Two Gentlemen of Verona, Rape of Lucrece and Troilus and Cressida. E. Alexander Pope’s works include Dunciad, The Rape of the Lock and Epistle.",
            "images": [],
            "options": [
              "A. BCE",
              "B. ADE",
              "C. ABD",
              "D. CDE"
            ],
            "correct_answer": "B",
            "explanation": "Statements A, D, and E are factually correct. Geoffrey Chaucer authored *The Canterbury Tales*, *Troilus and Criseyde*, and *Legend of Goode Women*. Shakespeare wrote *Two Gentlemen of Verona*, *Rape of Lucrece*, and *Troilus and Cressida*. Alexander Pope's canon includes *Dunciad*, *The Rape of the Lock*, and various *Epistles*. Statements B and C contain misattributions.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the column: A. Thinking About Women B. The Female Eunuch C. The Dialectic of Sex D. The Feminine Mystique I. Betty Friedan II. Mary Ellman III. Shulamith Firestone IV. Germaine Greer",
            "images": [],
            "options": [
              "A. A-II B-IV C-III D-I",
              "B. A-I B-III C-II D-IV",
              "C. A-II B-I C-IV D-III",
              "D. A-III B-II C-I D-IV"
            ],
            "correct_answer": "A",
            "explanation": "Option A correctly matches each seminal feminist text with its author. Mary Ellman wrote *Thinking About Women*, Germaine Greer authored *The Female Eunuch*, Shulamith Firestone penned *The Dialectic of Sex*, and Betty Friedan is famous for *The Feminine Mystique*. These pairings are fundamental to understanding twentieth-century feminist literary theory and activism.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Arrange the following statements in a chronological order: A. Nissim Ezekiel founded Quest, a general intellectual review associated with liberal democratic politics. B. The Illustrated Weekly of India sponsored a short story competition and began publishing contemporary Indian English poetry. C. The Writers Workshop began to publish volumes of poetry. D. C. R. Mandy became editor of the Illustrated Weekly of India.",
            "images": [],
            "options": [
              "A. ACBD",
              "B. DBAC",
              "C. BCAD",
              "D. BADC"
            ],
            "correct_answer": "B",
            "explanation": "C.R. Mandy became editor of *The Illustrated Weekly of India* in 1943 (D), under whom the magazine significantly promoted Indian English literature, including publishing poetry and sponsoring competitions in the 1950s (B). Nissim Ezekiel founded *Quest* in 1954 (A), and The Writers Workshop began publishing in 1958 (C). Thus, the chronological order is DBAC.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "Who developed the concept of the cultural circuit which is important to the study of the interactions of culture and memory in Oral History research method?",
            "images": [],
            "options": [
              "A. Michael Holroyd and Roy Harrod",
              "B. Zygmunt Bauman and Robert Putnam",
              "C. Charles Taylor and Elizabeth Wilson",
              "D. Graham Dawson and Al Thomson"
            ],
            "correct_answer": "D",
            "explanation": "Graham Dawson, especially in his work on memory and identity, significantly developed and applied the concept of the \"cultural circuit\" within oral history studies. Alistair Thomson is also a prominent figure in oral history theory, further solidifying the connection of these scholars to the interplay of culture and memory in oral narratives.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "According to Ferdinand de Saussure, what is the minimum number necessary to complete the speaking-circuit? Q.91-95) Comprehension From thee, even from thy virtue! What’s this, what’s this? Is this her fault or mine? The tempter or the tempted, who sins most? Ha! Not she: nor doth she tempt: but it is I That, lying by the violet in the sun, Do as the carrion does, not as the flower, Corrupt with virtuous season. Can it be That modesty may more betray our sense Than woman’s lightness? Having waste ground enough, Shall we desire to raze the sanctuary And pitch our evils there? O, fie, fie, fie! What dost thou, or what art thou, Angelo? Dost thou desire her foully for those things That make her good? O, let her brother live! Thieves for their robbery have authority When judges steal themselves. What, do | love her, That I desire to hear her speak again, And feast upon her eyes? What is’t I dream on? O cunning enemy, that, to catch a saint, With saints dost bait thy hook! Most dangerous Is that temptation that doth goad us on To sin in loving virtue: never could the strumpet, With all her double vigour, art and nature, Once stir my temper; but this virtuous maid Subdues me quite. Even till now, When men were fond, | smiled and wonder’d how.",
            "images": [],
            "options": [
              "A. 1",
              "B. 2",
              "C. 3",
              "D. 4"
            ],
            "correct_answer": "B",
            "explanation": "According to Ferdinand de Saussure, the speaking-circuit fundamentally requires two individuals: a speaker and a listener. This bidirectional process involves the transmission and reception of a message between two minds, making two the minimum number to complete the circuit.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "“Thieves for their robbery have authority / When judges steal themselves” implies what?",
            "images": [],
            "options": [
              "A. Society is just.",
              "B. Theft is always punishable.",
              "C. Corruption among judges is hypocritical.",
              "D. Judges are above law."
            ],
            "correct_answer": "C",
            "explanation": "This quote, from Shakespeare's *Measure for Measure*, exposes a profound hypocrisy. It implies that if the very individuals tasked with upholding justice (judges) are themselves corrupt (\"steal themselves\"), then their authority to punish lesser criminals is undermined and their actions are deeply hypocritical.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "What internal conflict does the speaker express? EXPLANATION: The speaker is facing an internal conflict because he feels attracted to a virtuous woman while knowing he should stay morally good. He struggles between his virtue (doing what is right) and his lust (strong desire), which makes him feel guilty and confused. The passage shows how even good people can be tempted, and this struggle inside him is the main conflict.",
            "images": [],
            "options": [
              "A. A desire to become a monk",
              "B. Regret over a political decision",
              "C. A struggle between his virtue and lust",
              "D. Fear of losing power"
            ],
            "correct_answer": "C",
            "explanation": "The explanation directly states the speaker \"struggles between his virtue (doing what is right) and his lust (strong desire),\" which is precisely what option C, \"A struggle between his virtue and lust,\" describes. This internal battle between moral principles and carnal desire forms the core of his conflict.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "What emotion is the speaker feeling at the end of the passage? EXPLANATION: At the end of the passage, the speaker feels confusion and shame. He is torn between his desire for the virtuous woman and his sense of what is right. This makes him feel guilty and unsure about his own actions. The words show that he is struggling inside, not happy or proud, but worried and ashamed of his feelings.",
            "images": [],
            "options": [
              "A. Pride and Joy",
              "B. Indifference",
              "C. Confusion and shame",
              "D. Joy only"
            ],
            "correct_answer": "C",
            "explanation": "The speaker's internal conflict—being \"torn between his desire for the virtuous woman and his sense of what is right\"—precisely illustrates confusion. His resulting guilt and worry, coupled with feeling \"ashamed of his feelings,\" unequivocally point to shame. This deep internal struggle contradicts any sense of pride, joy, or indifference.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "According to the speaker, how does temptation disguise itself? EXPLANATION: According to the speaker, temptation disguises itself as a virtue. He explains that the woman’s goodness and virtue actually make him feel tempted. Instead of being attracted to something bad, he is pushed to sin by what seems morally right. This shows that sometimes what looks good and pure can trick us into doing wrong, making temptation hard to recognize.",
            "images": [],
            "options": [
              "A. In riches and power",
              "B. As poverty and humility",
              "C. As a virtue",
              "D. In dreams"
            ],
            "correct_answer": "C",
            "explanation": "The speaker explicitly states that temptation masquerades as virtue, an insidious disguise making it difficult to discern true moral danger. He is paradoxically drawn to sin not by overt wickedness, but by the very goodness and purity of the woman, highlighting how seemingly righteous qualities can perversely lead to moral transgression.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "What kind of temptation does the speaker say is most dangerous? EXPLANATION: The speaker says the most dangerous temptation is the one that urges a person to sin while loving virtue. He means that when someone is drawn to do wrong by something that appears good or virtuous, it is hardest to resist. This shows that temptation is trickiest when it hides inside goodness, because it confuses our mind and makes us feel guilty for wanting what seems right. Q.96-100) Comprehension Painting, or art generally, as such, with all its technicalities, difficulties, and particular ends, is nothing but a noble and expressive language, invaluable as the vehicle of thought, but by itself nothing. He who has learned what is commonly considered the whole art of painting, that is, the art of representing any natural object faithfully, has as yet only learned the language by which his thoughts are to be expressed. He has done just as much towards being that which we ought to respect as a great painter, as a man who has learned how to express himself grammatically and melodiously has towards being a great poet. The language is, indeed, more difficult of acquirement in the one case than in the other, and possesses more power of delighting the sense, while it speaks to the intellect; but it is, nevertheless, nothing more than language, and all those excellences which are peculiar to the painter as such, are merely what rhythm, melody, precision, and force are in the words of the orator and the poet, necessary to their greatness, but not the tests of their greatness. It is not by the mode of representing and saying, but by what is represented and said, that the respective greatness either of the painter or the writer is to be finally determined.",
            "images": [],
            "options": [
              "A. That which disguises itself as pleasure",
              "B. That which appears in dreams",
              "C. That which urges one to sin in loving virtue",
              "D. That which comes from enemies"
            ],
            "correct_answer": "C",
            "explanation": "Option C is correct because the provided explanation explicitly states that the most dangerous temptation \"urges a person to sin while loving virtue.\" This type of temptation is deemed hardest to resist and most \"trickiest\" as it \"hides inside goodness,\" confusing the mind and making it difficult to discern right from wrong when vice is cloaked in apparent virtue.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "What implicit assumption about language and expression underpins the passage’s argument?",
            "images": [],
            "options": [
              "A. All forms of art must use written language to be effective.",
              "B. Expression without technical skill is more valuable.",
              "C. The medium of expression is secondary to the message conveyed.",
              "D. The value of grammar and melody lies in their aesthetic, not communicative power"
            ],
            "correct_answer": "C",
            "explanation": "The passage implicitly assumes that the primary goal of language and expression is to communicate a message. This makes the specific vehicle or method of delivery (the medium) less important than the content or meaning being conveyed.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "What is the broader philosophical implication of the statement “It is not by the mode of representing and saying, but by what is represented and said…”?",
            "images": [],
            "options": [
              "A. Aesthetic techniques are irrelevant.",
              "B. Ethical and thematic depth are the ultimate measure of artistic value.",
              "C. Abstract art is superior to representational art.",
              "D. The audience determines the value of a work."
            ],
            "correct_answer": "B",
            "explanation": "The statement prioritizes the substantive content and meaning (\"what is represented and said\") over the stylistic presentation (\"mode of representing and saying\"). This underscores that artistic merit derives fundamentally from its intellectual, moral, or thematic depth, making these elements the ultimate measure of its value.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "The author’s primary argument suggests that technical mastery in painting is",
            "images": [],
            "options": [
              "A. The only thing that defines artistic genius",
              "B. A deceptive illusion of greatness in art",
              "C. A necessary foundation but not the essence of true art",
              "D. More important than content in the painting"
            ],
            "correct_answer": "B",
            "explanation": "The author argues that while technical skill may impress, it can cunningly obscure a lack of genuine conceptual depth or profound artistic meaning. This perspective suggests that masterful technique, devoid of deeper substance, merely creates a misleading appearance of artistic greatness rather than embodying it.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "What does the phrase “possesses more power of delighting the sense, while it speaks to the intellect” imply about visual art?",
            "images": [],
            "options": [
              "A. It is primarily sensual and lacks depth.",
              "B. It uniquely blends sensual pleasure with intellectual engagement.",
              "C. It fails to communicate abstract ideas through its art.",
              "D. It relies too much on technique and spectacle."
            ],
            "correct_answer": "B",
            "explanation": "The phrase directly states visual art simultaneously \"delights the sense\" (sensual pleasure) and \"speaks to the intellect\" (intellectual engagement). The word \"while\" signifies this concurrent and integrated experience, making option B the most accurate interpretation of this unique blend.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          },
          {
            "question_text": "What does the passage emphasize as the true measure of greatness in painting and writing?",
            "images": [],
            "options": [
              "A. The material used",
              "B. The style and vocabulary",
              "C. The techniques applied",
              "D. The content expressed"
            ],
            "correct_answer": "D",
            "explanation": "The passage emphasizes that the true measure of greatness in painting and writing lies not merely in superficial elements like materials, style, or technique, but in the profound *content expressed*. These elements are merely vehicles for conveying the deeper meaning, message, or subject matter, which ultimately determines the work's lasting value and impact.",
            "year": 2025,
            "marks": 2,
            "exam_type": "UGC NET",
            "question_type": "MCQ"
          }
        ]
      },
     
    ]

  },

  /* ──────────────────────────────────────────────────────────
     GATE CSE 2025
     General Aptitude: 10 Qs (5×1M + 5×2M)
     CSE:              55 Qs (25×1M + 30×2M)
     Total: 65 Qs, 100 marks, 3h
  ────────────────────────────────────────────────────────── */
  

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

    const newHash = mockContentHash(allQuestions);

    // Upsert by title + exam_type + branch. Tiny read: no `questions` blob.
    const existing = await prisma.mockTestTemplate.findFirst({
      where: {
        title: paper.title,
        exam_type: paper.exam_type,
        branch: paper.branch,
        mode: 'seeded',
      },
      select: { id: true, mock_number: true, content_hash: true },
    });

    if (existing && existing.content_hash === newHash) {
      const examKey = `${paper.exam_type}::${paper.branch ?? '-'}`;
      if (existing.mock_number > (numberTracker.get(examKey) ?? 0)) {
        numberTracker.set(examKey, existing.mock_number);
      }
      console.log(`${c.cyan}⚡ Skipped "${paper.title}" — unchanged (mock #${existing.mock_number})${c.reset}`);
      continue;
    }

    if (existing) {
      // Keep existing mock_number — don't overwrite it (use renumber_mocks.ts to renumber)
      const existingMockNumber = existing.mock_number;
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
          content_hash: newHash,
        },
        select: { id: true },
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
          content_hash: newHash,
        },
        select: { id: true },
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
