/**
 * rename_patterns.ts
 *
 * Fix mis-cased topic_name on patterns that were already seeded.
 * Run on the VPS (DB_DRIVER=standard) — uses updateMany, which the Neon HTTP
 * adapter does NOT support.
 *
 *   --dry   preview only, no writes
 *
 * For each rename:
 *   - if the target (correct-cased) pattern does NOT exist  -> rename in place
 *   - if it DOES exist (duplicate)                          -> move PYQs over,
 *                                                             then delete the
 *                                                             now-empty old one
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';

config({ path: '.env', override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const driver = process.env.DB_DRIVER ?? 'neon-http';
const prisma = driver === 'standard'
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(databaseUrl, {}) });

const isDry = process.argv.includes('--dry');

const EXAM_TYPE = 'JEE_MAIN';
const BRANCH = 'Common';

const RENAMES: Array<{ from: string; to: string }> = [
  { from: 'Chemical kinetics',        to: 'Chemical Kinetics' },
  { from: 'd and f block elements',   to: 'd and f Block Elements' },
];

async function findPattern(topic_name: string) {
  return prisma.pattern.findUnique({
    where: { pattern_identifier: { exam_type: EXAM_TYPE, branch: BRANCH, topic_name } },
  });
}

async function main() {
  const dbHost = (() => { try { return new URL(databaseUrl!).host; } catch { return '(unparseable)'; } })();
  console.log(`\nDB_DRIVER=${driver}  🎯 Target DB: ${dbHost}${isDry ? '  [DRY RUN]' : ''}\n`);

  for (const { from, to } of RENAMES) {
    const oldP = await findPattern(from);
    if (!oldP) {
      console.log(`• "${from}" — not found, nothing to do.`);
      continue;
    }
    const oldCount = await prisma.pYQ.count({ where: { pattern_id: oldP.id } });
    const newP = await findPattern(to);

    if (!newP) {
      console.log(`• Rename "${from}" -> "${to}"  (${oldCount} PYQs, pattern ${oldP.id})`);
      if (!isDry) {
        await prisma.pattern.update({ where: { id: oldP.id }, data: { topic_name: to } });
      }
    } else {
      const newCount = await prisma.pYQ.count({ where: { pattern_id: newP.id } });
      console.log(`• Merge "${from}" (${oldCount} PYQs) INTO existing "${to}" (${newCount} PYQs); then delete old.`);
      if (!isDry) {
        const moved = await prisma.pYQ.updateMany({
          where: { pattern_id: oldP.id },
          data: { pattern_id: newP.id },
        });
        await prisma.pattern.delete({ where: { id: oldP.id } });
        console.log(`    moved ${moved.count} PYQs, deleted old pattern ${oldP.id}`);
      }
    }
  }

  console.log(isDry ? '\n[DRY RUN] no changes written.' : '\n✅ Done.');
}

main()
  .catch((e) => { console.error('💥', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
