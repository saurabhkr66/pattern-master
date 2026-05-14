/**
 * seed_mock_from_json.ts
 * 
 * Seeds MockTestTemplates from external JSON files.
 * This is a dynamic version of seed_mock_questions.ts.
 * 
 * HOW TO USE:
 * 1. Add an entry to the `PAPER_CONFIGS` array below.
 * 2. Specify the JSON file path (relative to SCRAPER_OUTPUT_DIR).
 * 3. Run: npx tsx prisma/seed_mock_from_json.ts
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getExamConfig, type ExamType } from '../lib/examConfigs';

const prisma = new PrismaClient();

const SCRAPER_OUTPUT_DIR = path.resolve(__dirname, '../../exam-scraper/extractor');

/* ═══════════════════════════════════════════════════════════════════
   TYPES
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
  subject?: string;
}

import { PAPER_CONFIGS } from './mock_seed_data';

/* ═══════════════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════════════ */

const c = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

function isOptionalQuestion(): boolean {
  return false;
}

function sectionMaxScore(
  _sectionConfig: ReturnType<typeof getExamConfig>['sections'][number],
  questions: RawQuestion[],
): number {
  return questions.reduce((s, q) => s + (q.marks || 0), 0);
}

function loadJson(fileName: string): any {
  const filePath = path.isAbsolute(fileName) ? fileName : path.join(SCRAPER_OUTPUT_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════ */

async function main() {
  console.log(`\n${c.bright}${c.cyan}${'═'.repeat(62)}${c.reset}`);
  console.log(`${c.bright}🧪  Seeding Mock Papers from JSON Files${c.reset}`);
  console.log(`${c.cyan}${'═'.repeat(62)}${c.reset}\n`);

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

  let seededCount = 0;
  let updatedCount = 0;

  for (const config of PAPER_CONFIGS) {
    try {
      let paperData: { sections: { name: string; questions: RawQuestion[] }[] };

      if (config.file) {
        // Single file mode
        paperData = loadJson(config.file);
      } else if (config.sections) {
        // Multi-file mode
        paperData = {
          sections: config.sections.map(s => ({
            name: s.name,
            questions: loadJson(s.file)
          }))
        };
      } else {
        console.warn(`${c.yellow}⚠ Skipping "${config.title}" — No file or sections specified.${c.reset}`);
        continue;
      }

      const totalQs = paperData.sections.reduce((s, sec) => s + sec.questions.length, 0);
      if (totalQs === 0) {
        console.warn(`${c.yellow}⚠ Skipping "${config.title}" — No questions found in JSON(s).${c.reset}`);
        continue;
      }

      const examKey = `${config.exam_type}::${config.branch ?? '-'}`;
      const mockNumber = (numberTracker.get(examKey) ?? 0) + 1;
      const examConfig = getExamConfig(config.exam_type as ExamType, config.branch ?? undefined);

      const existing = await prisma.mockTestTemplate.findFirst({
        where: {
          title: config.title,
          exam_type: config.exam_type,
          branch: config.branch,
          mode: 'seeded',
        },
        select: { id: true, mock_number: true, questions: true },
      });

      const allQuestions: any[] = [];
      for (let si = 0; si < paperData.sections.length; si++) {
        const sec = paperData.sections[si];

        for (let qi = 0; qi < sec.questions.length; qi++) {
          const q = sec.questions[qi];
          const optional = isOptionalQuestion();

          let topic = q.topic_name || "";
          if (existing && Array.isArray(existing.questions)) {
            const eq = (existing.questions as any[]).find((e: any) =>
              e.question_text === q.question_text
            );
            if (eq && eq.topic) {
              topic = eq.topic;
            }
          }

          allQuestions.push({
            id: randomUUID(),
            source: 'template',
            sectionIndex: si,
            sectionName: sec.name,
            isOptional: optional,
            question_text: q.question_text,
            options: q.options || [],
            question_type: q.question_type || 'MCQ',
            marks: q.marks || 0,
            year: q.year || 0,
            subject: sec.name,
            topic: topic,
            images: q.images ?? [],
            correct_answer: q.correct_answer,
            explanation: q.explanation || "",
          });
        }
      }

      const maxScore = paperData.sections.reduce((sum, sec) => {
        const secConfig = examConfig.sections.find(s => s.name.toLowerCase() === sec.name.toLowerCase());
        return sum + (secConfig ? sectionMaxScore(secConfig, sec.questions) : sec.questions.reduce((s, q) => s + (q.marks || 0), 0));
      }, 0);

      if (existing) {
        await prisma.mockTestTemplate.update({
          where: { id: existing.id },
          data: {
            total_questions: allQuestions.length,
            max_score: maxScore,
            duration_secs: examConfig.durationSecs,
            sections: examConfig.sections as any,
            questions: allQuestions,
          },
        });
        console.log(`${c.yellow}↩ Updated "${config.title}"${c.reset} (mock #${existing.mock_number})`);
        updatedCount++;
      } else {
        await prisma.mockTestTemplate.create({
          data: {
            exam_type: config.exam_type,
            branch: config.branch,
            mode: 'seeded',
            mock_number: mockNumber,
            title: config.title,
            subjects: paperData.sections.map(s => s.name),
            total_questions: allQuestions.length,
            max_score: maxScore,
            duration_secs: examConfig.durationSecs,
            sections: examConfig.sections as any,
            questions: allQuestions,
          },
        });
        numberTracker.set(examKey, mockNumber);
        console.log(`${c.green}✅ Seeded  "${config.title}"${c.reset} (mock #${mockNumber})`);
        seededCount++;
      }

    } catch (err: any) {
      console.error(`${c.red}❌ Error processing "${config.title}": ${err.message}${c.reset}`);
    }
  }

  console.log(`\n${c.bright}${c.green}✨ Done!${c.reset}`);
  console.log(`   Seeded: ${seededCount}, Updated: ${updatedCount}`);
  console.log(`${c.cyan}${'═'.repeat(62)}${c.reset}\n`);
}

main()
  .catch(e => { console.error('💥 FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
