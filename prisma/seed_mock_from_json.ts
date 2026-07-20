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
 * Hash of the questions array, INVARIANT only to the random `id` field (which is
 * regenerated each run). `topic` IS part of the hash so a re-tagged topic re-seeds
 * the mock — topics are authored in the source JSON now (see json-topics-neet.ts),
 * so the JSON is the source of truth and its changes must propagate.
 * Used to short-circuit re-seeds when nothing meaningful changed.
 */
// Bump SEED_VERSION whenever the seeder's question shape changes in a way that
// requires re-writing existing rows even though the source JSON is unchanged.
// v2: align sectionIndex with examConfig (GA at 0, Subject at 1).
// v3: `topic` now counts in the hash (was excluded) + JSON topic is authoritative,
//     so re-tagging + re-seeding updates instead of skipping.
const SEED_VERSION = "v3";
function mockContentHash(allQuestions: any[]): string {
  const stripped = allQuestions.map(q => {
    const { id: _id, ...rest } = q;
    return rest;
  });
  return sha256(SEED_VERSION + ":" + JSON.stringify(stripped));
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

          // Always emit GA at index 0 and Subject at index 1 to match the
          // canonical examConfig.sections layout for GATE. If we omit the GA
          // section when it's empty, subject questions get sectionIndex 0,
          // which the test engine then renders under the GA tab.
          paperData = {
            sections: [
              { name: "General Aptitude", questions: gaQuestions },
              { name: config.branch || "Subject", questions: subjectQuestions },
            ],
          };
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

      // Build the questions array from JSON. `topic` comes straight from the source
      // JSON (authored by json-topics-neet.ts) — it is the source of truth, so a
      // re-tag re-seeds the mock rather than being preserved from the old DB row.
      const buildAllQuestions = (): any[] => {
        const out: any[] = [];
        for (let si = 0; si < paperData.sections.length; si++) {
          const sec = paperData.sections[si];
          for (let qi = 0; qi < sec.questions.length; qi++) {
            const q = sec.questions[qi];
            const optional = isOptionalQuestion();
            const topic = q.topic_name || "";
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
        // Update path: content (incl. topic) changed. The JSON is authoritative, so
        // we overwrite with the freshly-built questions — no merge from the old row.
        await prisma.mockTestTemplate.update({
          where: { id: existing.id },
          data: {
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
