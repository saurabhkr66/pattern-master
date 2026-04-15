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
      branch: 'ECE',
      subject: 'Network Theory',
      topic_name: 'Network Graphs',
      atomic_logic: `Generate GATE-level questions covering Network Graphs, including properties of Network Graphs, types of Network Graphs, Barkhausen criterion, stability analysis.`
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
