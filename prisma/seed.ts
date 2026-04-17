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
      exam_type: 'SSC',
      branch: 'Quantitative Aptitude',
      subject: 'Time and Work',
      topic_name: 'Time and Work',
      atomic_logic: `Generate SSC-level questions covering Time and Work. Focus on:
1. Basic concepts of work, rate, and time.
2. Efficiency and combined work of multiple individuals.
3. Pipes and Cisterns problems.
4. Men-days concept and variations.
5. Alternating work patterns and complex scenarios.
Questions should involve numericals on work calculations, efficiency comparisons, and time estimations.`
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
