/**
 * seed_from_json.ts
 *
 * Seeds PYQs directly from scraper JSON files.
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function normalizeText(s: string): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function questionIdHash(question_text: string): string {
  return sha256(normalizeText(question_text));
}

function questionContentHash(q: {
  question_text: string;
  question_text_hindi?: string | null;
  options: unknown;
  options_hindi?: unknown;
  correct_answer: string;
  explanation: string;
  explanation_hindi?: string | null;
  year: number;
  question_type: string;
  images: unknown;
}): string {
  const canonical = JSON.stringify([
    normalizeText(q.question_text),
    normalizeText(q.question_text_hindi ?? ''),
    q.options ?? [],
    q.options_hindi ?? null,
    q.correct_answer ?? '',
    q.explanation ?? '',
    normalizeText(q.explanation_hindi ?? ''),
    q.year ?? 0,
    q.question_type ?? 'MCQ',
    q.images ?? [],
  ]);
  return sha256(canonical);
}

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
    
    // ── GATE CSE → Computer Organization & Architecture ─────────────────────
    // Restoring PYQs that were lost when the ISRO exam was deleted (cascade
    // removed COA-subject rows across exam_types, not just ISRO).
    {
      file: 'scratch/jeemains/gate_cse_pipeline_processor.json',
      topic_name: 'Pipeline Processor',
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
    },
    {
      file: 'scratch/jeemains/gate_cse_cache_memory.json',
      topic_name: 'Cache Memory',
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
    },
    {
      file: 'scratch/jeemains/gate_cse_alu_data_path_and_control_unit.json',
      topic_name: 'ALU Data Path and Control Unit',
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
    },
    {
      file: 'scratch/jeemains/gate_cse_machine_instruction.json',
      topic_name: 'Machine Instruction',
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
    },
    {
      file: 'scratch/jeemains/gate_cse_memory_chip_design.json',
      topic_name: 'Memory Chip Design',
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
    },
    {
      file: 'scratch/jeemains/gate_cse_secondary_storage.json',
      topic_name: 'Secondary Storage',
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
    },
    {
      file: 'scratch/jeemains/gate_cse_io_interface.json',
      topic_name: 'IO Interface',
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
    },
    {
      file: 'scratch/jeemains/gate_cse_interrupt.json',
      topic_name: 'Interrupt',
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
    },
    {
      file: 'scratch/jeemains/gate_cse_addressing_modes.json',
      topic_name: 'Addressing Modes',
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
    },
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
      // Tiny aggregate read to decide if backfill is needed for this pattern.
      const missingHashCount = await prisma.pYQ.count({
        where: { pattern_id: pattern.id, question_hash: null },
      });

      // On the first run after migration we need question_text once, to match
      // pre-existing rows and backfill their hashes. After that we only fetch hashes.
      const existing = missingHashCount > 0
        ? await prisma.pYQ.findMany({
          where: { pattern_id: pattern.id },
          select: { id: true, question_text: true, question_hash: true, content_hash: true },
        })
        : await prisma.pYQ.findMany({
          where: { pattern_id: pattern.id },
          select: { id: true, question_hash: true, content_hash: true },
        });

      const byHash = new Map<string, { id: string; content_hash: string | null }>();
      const byText = new Map<string, { id: string; content_hash: string | null }>();
      for (const r of existing as any[]) {
        if (r.question_hash) byHash.set(r.question_hash, { id: r.id, content_hash: r.content_hash });
        if (r.question_text) byText.set(r.question_text, { id: r.id, content_hash: r.content_hash });
      }

      // Clean all questions upfront and compute hashes
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

        const row = {
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

        return {
          ...row,
          question_hash: questionIdHash(question_text),
          content_hash: questionContentHash(row),
        };
      });

      const toCreate: typeof cleaned = [];
      const toUpdate: Array<typeof cleaned[number] & { _existing_id: string }> = [];
      let skippedUnchanged = 0;

      for (const q of cleaned) {
        const existing = byHash.get(q.question_hash) ?? byText.get(q.question_text);
        if (!existing) {
          toCreate.push(q);
        } else if (existing.content_hash !== q.content_hash) {
          toUpdate.push({ ...q, _existing_id: existing.id });
        } else {
          skippedUnchanged++;
        }
      }

      // Bulk create new records in one DB call
      if (toCreate.length > 0) {
        await prisma.pYQ.createMany({
          data: toCreate.map(q => ({ ...q, pattern_id: pattern.id })),
          skipDuplicates: true,
        });
      }

      // Updates: only changed rows. select:{id:true} prevents echoing the heavy row back.
      const BATCH_SIZE = 50;
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(q => {
            const { _existing_id, ...data } = q;
            return prisma.pYQ.update({
              where: { id: _existing_id },
              data,
              select: { id: true },
            }).catch((err: any) => {
              console.log(`${colors.red}  ❌ Error updating question: ${q.question_text?.substring(0, 100)}...${colors.reset}`);
              console.error(`     Reason: ${err.message}`);
              errors++;
            });
          })
        );
      }

      const count = toCreate.length + toUpdate.length - errors;
      totalQuestions += count;
      console.log(`${colors.green}✅ ${progress} ${colors.bright}${entry.topic_name}${colors.reset}${colors.green}: ${toCreate.length} new, ${toUpdate.length} updated, ${colors.cyan}${skippedUnchanged} unchanged${colors.reset}`);
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
