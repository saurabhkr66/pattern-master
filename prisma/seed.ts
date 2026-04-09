import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Clear existing data (optional but helpful for fresh start)
  // Order matters because of foreign key constraints
  // await prisma.attempt.deleteMany();
  // await prisma.generatedQuestion.deleteMany();
  // await prisma.pattern.deleteMany();

  // 2. Define some GATE Computer Science patterns
  const patterns = [
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Digital Logic',
      topic_name: 'Logic Gates',
      atomic_logic: `Generate GATE-level questions covering binary, decimal, octal, hexadecimal conversions, 1's and 2's complement representation, overflow detection, and range of signed numbers. Include both conceptual and numerical problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Digital Logic',
      topic_name: 'Boolean Algebra',
      atomic_logic: `Generate GATE-level questions covering Boolean identities, De Morgan’s laws, simplification of expressions, canonical forms (SOP/POS), and equivalence transformations. Include tricky simplification and expression evaluation problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Digital Logic',
      topic_name: 'K-Map',
      atomic_logic: `Generate GATE-level questions covering Karnaugh Map simplification for 2, 3, and 4 variables, grouping rules, don’t-care conditions, and minimal SOP/POS forms. Include cases requiring optimal grouping and elimination of redundancy.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Digital Logic',
      topic_name: 'Combinational Circuits',
      atomic_logic: `Generate GATE-level questions covering multiplexers, demultiplexers, encoders, decoders, adders, subtractors, and comparators. Include logic design, truth tables, and minimum gate implementation problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Digital Logic',
      topic_name: 'Multiplexer & Decoder',
      atomic_logic: `Generate GATE-level questions focusing on implementation of Boolean functions using multiplexers and decoders, select line calculations, and conversion between different combinational circuits.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Digital Logic',
      topic_name: 'Sequential Circuits',
      atomic_logic: `Generate GATE-level questions covering state machines, state transition diagrams, memory elements, and differences between combinational and sequential circuits. Include conceptual and design-based questions.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Digital Logic',
      topic_name: 'Flip-Flops',
      atomic_logic: `Generate GATE-level questions covering SR, JK, D, and T flip-flops, characteristic equations, excitation tables, race conditions, and conversions between flip-flop types.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Digital Logic',
      topic_name: 'Counters & Registers',
      atomic_logic: `Generate GATE-level questions covering synchronous and asynchronous counters, shift registers, ring counters, Johnson counters, and timing/sequence analysis problems.`
    }
  ];

  for (const pattern of patterns) {
    const created = await prisma.pattern.upsert({
      where: {
        pattern_identifier: {
          exam_type: pattern.exam_type,
          branch: pattern.branch,
          topic_name: pattern.topic_name
        }
      },
      update: {},
      create: pattern,
    });
    console.log(`✅ Created pattern: ${created.topic_name}`);
  }

  console.log('✨ Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
