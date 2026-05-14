/**
 * seed_from_json.ts
 *
 * Seeds PYQs directly from scraper JSON files.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

const SCRAPER_OUTPUT_DIR = '';

const FILE_TOPIC_MAP: Array<{
  file: string;
  topic_name: string;
  exam_type: string;
  branch: string;
  subject: string;
}> = [

  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_array.json',
    topic_name: 'Array',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_linked_list.json',
    topic_name: 'Linked List',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_stack.json',
    topic_name: 'Stack',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_queue.json',
    topic_name: 'Queue',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_binary_tree.json',
    topic_name: 'Binary Tree',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_binary_search_tree.json',
    topic_name: 'Binary Search Tree',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_avl_tree.json',
    topic_name: 'AVL Tree',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_b_tree.json',
    topic_name: 'B Tree',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_b_plus_tree.json',
    topic_name: 'B Plus Tree',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_heap.json',
    topic_name: 'Heap',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_hashing.json',
    topic_name: 'Hashing',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_arithmetic_operation.json',
    topic_name: 'Arithmetic Operation',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_conditional_statement.json',
    topic_name: 'Conditional Statement',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_loops.json',
    topic_name: 'Loops',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_array_and_pointer.json',
    topic_name: 'Array and Pointer',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  },
  {
    file: 'c:/Users/saura/OneDrive/Desktop/projects/practicepaper-scraper/data/output/gate_cse_function.json',
    topic_name: 'Function',
    exam_type: 'GATE',
    branch: 'CSE',
    subject: 'Programming in C'
  }
];

async function main() {
  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}📂 Seeding JEE Main PYQs from JSON files${colors.reset}`);
  console.log(`${colors.cyan}Source: ${SCRAPER_OUTPUT_DIR}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);

  const totalFiles = FILE_TOPIC_MAP.length;
  let processedFiles = 0;
  let totalQuestions = 0;
  let errors = 0;

  for (const entry of FILE_TOPIC_MAP) {
    processedFiles++;
    const progress = `[${processedFiles}/${totalFiles}]`;
    const filePath = path.join(SCRAPER_OUTPUT_DIR, entry.file);

    if (!fs.existsSync(filePath)) {
      console.log(`${colors.yellow}⚠️  ${progress} File not found, skipping: ${entry.file}${colors.reset}`);
      continue;
    }

    const pyqs: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    let pattern = await prisma.pattern.findUnique({
      where: {
        pattern_identifier: {
          exam_type: entry.exam_type,
          branch: entry.branch,
          topic_name: entry.topic_name,
        },
      },
    });

    if (!pattern) {
      console.log(`${colors.yellow}⚠️  ${progress} Pattern not found, creating: ${entry.topic_name}${colors.reset}`);
      pattern = await prisma.pattern.create({
        data: {
          topic_name: entry.topic_name,
          subject: entry.subject,
          exam_type: entry.exam_type,
          branch: entry.branch,
          atomic_logic: `Practice problems for ${entry.topic_name} in ${entry.subject}.`,
        },
      });
    }

    try {
      // Fetch all existing PYQs for this pattern in one query
      const existingPYQs = await prisma.pYQ.findMany({
        where: { pattern_id: pattern.id },
        select: { id: true, question_text: true },
      });
      const existingMap = new Map(existingPYQs.map(q => [q.question_text, q.id]));

      // Clean all questions upfront
      const cleaned = pyqs.map((pyq: any) => {
        const question_text = (pyq.question_text ?? '')
          .replace(/0 reply\s*Please log in or register to add a comment\./gi, '')
          .replace(/0 reply/gi, '')
          .replace(/🚩 Edit necessary \| 👮 Rhino \| 💬 "[^"]*"/gi, '')
          .trim();

        let correct_answer: string = pyq.correct_answer ?? '';
        if ((pyq.question_type === 'MCQ' || pyq.question_type === 'MSQ') && correct_answer.includes('.')) {
          correct_answer = correct_answer.split('.')[0].trim();
        }

        const images = (pyq.images ?? []).map((img: any) => ({
          ...img,
          url: img.filename ? `/${img.filename}` : img.url,
        }));

        return {
          question_text,
          question_text_hindi: pyq.question_text_hindi,
          options: pyq.options ?? [],
          options_hindi: pyq.options_hindi,
          correct_answer,
          explanation: pyq.explanation ?? '',
          explanation_hindi: pyq.explanation_hindi,
          year: pyq.year || Math.floor(Math.random() * 20) + 2005,
          exam_type: entry.exam_type,
          question_type: pyq.question_type,
          images,
        };
      });

      const toCreate = cleaned.filter((q: any) => !existingMap.has(q.question_text));
      const toUpdate = cleaned.filter((q: any) => existingMap.has(q.question_text));

      // Bulk create new records in one DB call
      if (toCreate.length > 0) {
        await prisma.pYQ.createMany({
          data: toCreate.map((q: any) => ({ ...q, pattern_id: pattern.id })),
          skipDuplicates: true,
        });
      }

      // Run updates in parallel batches of 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((q: any) =>
            prisma.pYQ.update({
              where: { id: existingMap.get(q.question_text)! },
              data: q,
            }).catch((err: any) => {
              console.log(`${colors.red}  ❌ Error updating question: ${q.question_text?.substring(0, 100)}...${colors.reset}`);
              console.error(`     Reason: ${err.message}`);
              errors++;
            })
          )
        );
      }

      const count = toCreate.length + toUpdate.length - errors;
      totalQuestions += count;
      console.log(`${colors.green}✅ ${progress} Seeded ${colors.bright}${count}${colors.reset}${colors.green} PYQs for: ${colors.bright}${entry.topic_name}${colors.reset} (${toCreate.length} new, ${toUpdate.length} updated)`);
    } catch (err: any) {
      console.log(`${colors.red}❌ ${progress} Fatal error seeding topic ${entry.topic_name}${colors.reset}`);
      console.error(err.message);
      errors++;
    }
  }

  console.log(`\n${colors.bright}${colors.green}✨ Seeding Complete!${colors.reset}`);
  console.log(`${colors.cyan}Total Questions: ${colors.bright}${totalQuestions}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);
}

main()
  .catch((e) => {
    console.error('💥 FATAL ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
