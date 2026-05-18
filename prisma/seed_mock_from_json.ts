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
import { createHash, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getExamConfig, type ExamType } from '../lib/examConfigs';

const prisma = new PrismaClient();

const SCRAPER_OUTPUT_DIR = path.resolve(__dirname, '../../exam-scraper/extractor');

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/**
 * Hash of the questions array that is INVARIANT to:
 *  - the random `id` field on each question (regenerated each run)
 *  - the `topic` field (preserved across runs via merge — should not trigger update)
 * Used to short-circuit re-seeds when nothing meaningful changed.
 */
function mockContentHash(allQuestions: any[]): string {
  const stripped = allQuestions.map(q => {
    const { id: _id, topic: _topic, ...rest } = q;
    return rest;
  });
  return sha256(JSON.stringify(stripped));
}

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
        const raw = loadJson(config.file);
        if (Array.isArray(raw)) {
          const gaQuestions = raw.filter(q => q.topic_name === "General Aptitude");
          const subjectQuestions = raw.filter(q => q.topic_name !== "General Aptitude");

          if (gaQuestions.length > 0) {
            paperData = {
              sections: [
                { name: "General Aptitude", questions: gaQuestions },
                { name: config.branch || "Subject", questions: subjectQuestions }
              ]
            };
          } else {
            paperData = {
              sections: [{ name: config.branch || "General", questions: raw }]
            };
          }
        } else {
          paperData = raw;
        }
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

      if (!paperData.sections) {
        throw new Error("Invalid JSON structure: missing 'sections' array");
      }

      const totalQs = paperData.sections.reduce((s, sec) => s + sec.questions.length, 0);
      if (totalQs === 0) {
        console.warn(`${c.yellow}⚠ Skipping "${config.title}" — No questions found in JSON(s).${c.reset}`);
        continue;
      }

      const examKey = `${config.exam_type}::${config.branch ?? '-'}`;
      const mockNumber = (numberTracker.get(examKey) ?? 0) + 1;
      const examConfig = getExamConfig(config.exam_type as ExamType, config.branch ?? undefined);

      // Tiny read: no questions blob. ~100 bytes/row instead of MBs.
      const existing = await prisma.mockTestTemplate.findFirst({
        where: {
          title: config.title,
          exam_type: config.exam_type,
          branch: config.branch,
          mode: 'seeded',
        },
        select: { id: true, mock_number: true, content_hash: true },
      });

      // Build the questions array from JSON. Topic is set from JSON for now; we'll
      // merge in any DB-side topic edits only if we determine an update is actually needed.
      const buildAllQuestions = (topicOverrides?: Map<string, string>): any[] => {
        const out: any[] = [];
        for (let si = 0; si < paperData.sections.length; si++) {
          const sec = paperData.sections[si];
          for (let qi = 0; qi < sec.questions.length; qi++) {
            const q = sec.questions[qi];
            const optional = isOptionalQuestion();
            const topic = topicOverrides?.get(q.question_text) ?? (q.topic_name || "");
            out.push({
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
              topic,
              images: q.images ?? [],
              correct_answer: q.correct_answer,
              explanation: q.explanation || "",
            });
          }
        }
        return out;
      };

      const provisionalQuestions = buildAllQuestions();
      const newHash = mockContentHash(provisionalQuestions);

      // Skip path: nothing changed in the source JSON, don't touch the DB.
      if (existing && existing.content_hash === newHash) {
        console.log(`${c.cyan}⚡ Skipped "${config.title}" — unchanged (mock #${existing.mock_number})${c.reset}`);
        continue;
      }

      const maxScore = paperData.sections.reduce((sum, sec) => {
        const secConfig = examConfig.sections.find(s => s.name.toLowerCase() === sec.name.toLowerCase());
        return sum + (secConfig ? sectionMaxScore(secConfig, sec.questions) : sec.questions.reduce((s, q) => s + (q.marks || 0), 0));
      }, 0);

      if (existing) {
        // Update path: content actually changed. Now (and only now) pull the existing
        // questions blob so we can preserve any manually-edited `topic` values.
        const existingFull = await prisma.mockTestTemplate.findUnique({
          where: { id: existing.id },
          select: { questions: true },
        });
        const topicOverrides = new Map<string, string>();
        if (existingFull && Array.isArray(existingFull.questions)) {
          for (const eq of existingFull.questions as any[]) {
            if (eq?.question_text && eq?.topic) topicOverrides.set(eq.question_text, eq.topic);
          }
        }
        const mergedQuestions = buildAllQuestions(topicOverrides);

        await prisma.mockTestTemplate.update({
          where: { id: existing.id },
          data: {
            subjects: paperData.sections.map(s => s.name),
            total_questions: mergedQuestions.length,
            max_score: maxScore,
            duration_secs: examConfig.durationSecs,
            sections: examConfig.sections as any,
            questions: mergedQuestions,
            content_hash: newHash,
          },
          select: { id: true },
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
            total_questions: provisionalQuestions.length,
            max_score: maxScore,
            duration_secs: examConfig.durationSecs,
            sections: examConfig.sections as any,
            questions: provisionalQuestions,
            content_hash: newHash,
          },
          select: { id: true },
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
