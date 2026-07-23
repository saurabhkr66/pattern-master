/**
 * verify_patterns.ts — READ ONLY.
 *
 * For every entry that seed_from_json.ts would seed, check that the target
 * Pattern (exam_type + branch + topic_name) already exists, and report its
 * current PYQ count. Creates/updates NOTHING. Run through the same tunnel the
 * seed uses to confirm no entry would silently spawn a new empty pattern.
 */
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';

config({ path: '.env', override: true });

const databaseUrl = process.env.DATABASE_URL!;
const driver = process.env.DB_DRIVER ?? 'neon-http';
const prisma = driver === 'standard'
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(databaseUrl, {}) });

// Keep in sync with FILE_TOPIC_MAP in seed_from_json.ts (dedup by pattern).
const PATTERNS = [
  'Some Basic Concepts of Chemistry',
  'Structure of Atom',
  'Classification of Elements and Periodicity in Properties',
  'Chemical Bonding and Molecular Structure',
  'Chemical Thermodynamics',
  'Equilibrium',
  'Redox Reactions',
  'Some P-block Elements',
  'Organic Chemistry: Some Basic Principles and Techniques',
  'Hydrocarbons',
];

async function main() {
  const host = (() => { try { return new URL(databaseUrl).host; } catch { return '(?)'; } })();
  console.log(`\n🔎 Verifying NEET Chemistry patterns on ${host} (driver=${driver})\n`);
  let missing = 0;
  for (const topic_name of PATTERNS) {
    const p = await prisma.pattern.findUnique({
      where: { pattern_identifier: { exam_type: 'NEET', branch: 'Common', topic_name } },
      select: { id: true, subject: true, _count: { select: { pyqs: true } } },
    });
    if (!p) {
      missing++;
      console.log(`❌ MISSING          | ${topic_name}`);
    } else {
      console.log(`✅ ${String(p._count.pyqs).padStart(4)} PYQs [${p.subject}] | ${topic_name}`);
    }
  }
  console.log(`\n${missing === 0 ? '✨ All patterns exist — safe to seed.' : `⚠️  ${missing} pattern(s) missing — seed WOULD create them.`}\n`);
}

main().catch((e) => { console.error('💥', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
