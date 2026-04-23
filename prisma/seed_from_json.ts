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

const SCRAPER_OUTPUT_DIR = path.resolve(
  __dirname,
  '../../exam-scraper/practicepaper-scraper/data/output'
);

const FILE_TOPIC_MAP: Array<{
  file: string;
  topic_name: string;
  exam_type: string;
  branch: string;
}> = [
  {
    file: 'gate_ec_diodes_applications.json',
    topic_name: 'Diode Applications',
    exam_type: 'GATE',
    branch: 'ECE',
  },
  {
    file: 'gate_ec_bjt_analysis.json',
    topic_name: 'BJT Analysis and Biasing',
    exam_type: 'GATE',
    branch: 'ECE',
  },
  {
    file: 'gate_ec_fet_and_mosfet_analysis.json',
    topic_name: 'FET and MOSFET Analysis',
    exam_type: 'GATE',
    branch: 'ECE',
  },
  {
    file: 'gate_ec_frequency_response_of_amplifier.json',
    topic_name: 'Frequency Response of Amplifiers',
    exam_type: 'GATE',
    branch: 'ECE',
  },
  {
    file: 'gate_ec_feedback_amplifiers.json',
    topic_name: 'Feedback Amplifiers',
    exam_type: 'GATE',
    branch: 'ECE',
  },
  {
    file: 'gate_ec_operational_amplifiers.json',
    topic_name: 'Operational Amplifiers (Op-Amps)',
    exam_type: 'GATE',
    branch: 'ECE',
  },
  {
    file: 'gate_ec_oscillator_circuits.json',
    topic_name: 'Oscillator Circuits',
    exam_type: 'GATE',
    branch: 'ECE',
  },
  {
    file: 'gate_ec_multivibrators_and_555_timer.json',
    topic_name: 'Multivibrators and 555 Timer',
    exam_type: 'GATE',
    branch: 'ECE',
  },
];

async function main() {
  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}📂 Seeding Analog Circuits PYQs from JSON files${colors.reset}`);
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
          subject: 'Analog Circuits',
          exam_type: entry.exam_type,
          branch: entry.branch,
          atomic_logic: `Practice problems for ${entry.topic_name}`,
        },
      });
    }

    try {
      let count = 0;
      for (const pyq of pyqs) {
        const cleanQuestionText = (pyq.question_text ?? '')
          .replace(/0 reply\s*Please log in or register to add a comment\./gi, '')
          .replace(/0 reply/gi, '')
          .replace(/🚩 Edit necessary \| 👮 Rhino \| 💬 "[^"]*"/gi, '')
          .trim();

        let cleanCorrectAnswer: string = pyq.correct_answer ?? '';
        if ((pyq.question_type === 'MCQ' || pyq.question_type === 'MSQ') && cleanCorrectAnswer.includes('.')) {
          cleanCorrectAnswer = cleanCorrectAnswer.split('.')[0].trim();
        }

        const cleanImages = (pyq.images ?? []).map((img: any) => ({
          ...img,
          url: img.filename ? `/${img.filename}` : img.url,
        }));

        await prisma.pYQ.upsert({
          where: {
            pyq_identifier: {
              pattern_id: pattern.id,
              question_text: cleanQuestionText,
            },
          },
          update: {
            question_text_hindi:  pyq.question_text_hindi,
            options:              pyq.options ?? [],
            options_hindi:        pyq.options_hindi,
            correct_answer:       cleanCorrectAnswer,
            explanation:          pyq.explanation ?? '',
            explanation_hindi:    pyq.explanation_hindi,
            year:                 pyq.year || Math.floor(Math.random() * 26) + 2000,
            exam_type:            entry.exam_type,
            question_type:        pyq.question_type,
            images:               cleanImages,
          },
          create: {
            pattern: { connect: { id: pattern.id } },
            question_text:       cleanQuestionText,
            question_text_hindi: pyq.question_text_hindi,
            options:             pyq.options ?? [],
            options_hindi:       pyq.options_hindi,
            correct_answer:      cleanCorrectAnswer,
            explanation:         pyq.explanation ?? '',
            explanation_hindi:   pyq.explanation_hindi,
            year:                pyq.year || Math.floor(Math.random() * 26) + 2000,
            exam_type:           entry.exam_type,
            question_type:       pyq.question_type,
            images:              cleanImages,
          },
        });
        count++;
        totalQuestions++;
      }
      console.log(`${colors.green}✅ ${progress} Seeded ${colors.bright}${count}${colors.reset}${colors.green} PYQs for: ${colors.bright}${entry.topic_name}${colors.reset}`);
    } catch (err: any) {
      console.log(`${colors.red}❌ ${progress} Error seeding ${entry.topic_name}${colors.reset}`);
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
