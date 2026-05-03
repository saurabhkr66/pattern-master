/**
 * renumber_mocks.ts
 *
 * One-off script to fix mock_number for all seeded papers that ended up with
 * mock_number = 1 because they were seeded individually.
 *
 * Papers are renumbered in alphabetical title order within each exam_type+branch group.
 * This gives JEE Main papers the order: 2025 Jan ... → 2025 Apr ... → 2026 Jan ... → 2026 Apr ...
 *
 * HOW TO RUN
 * ──────────
 *   npx tsx prisma/renumber_mocks.ts
 *
 * Safe to re-run — idempotent.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n═══════════════════════════════════════');
  console.log('  Renumbering seeded mock papers');
  console.log('═══════════════════════════════════════\n');

  const all = await prisma.mockTestTemplate.findMany({
    where: { mode: 'seeded' },
    select: { id: true, title: true, exam_type: true, branch: true, mock_number: true },
    orderBy: { title: 'asc' },
  });

  // Group by exam_type + branch
  const groups = new Map<string, typeof all>();
  for (const row of all) {
    const key = `${row.exam_type}::${row.branch ?? '-'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  let updated = 0;
  for (const [key, papers] of groups) {
    console.log(`\n[${key}] — ${papers.length} papers`);
    for (let i = 0; i < papers.length; i++) {
      const newNumber = i + 1;
      const p = papers[i];
      if (p.mock_number !== newNumber) {
        await prisma.mockTestTemplate.update({
          where: { id: p.id },
          data: { mock_number: newNumber },
        });
        updated++;
        console.log(`  ${String(newNumber).padStart(2, '0')}. "${p.title}"  (was #${p.mock_number})`);
      } else {
        console.log(`  ${String(newNumber).padStart(2, '0')}. "${p.title}"  ✓ already correct`);
      }
    }
  }

  console.log(`\n✅ Done — updated ${updated} papers.\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
