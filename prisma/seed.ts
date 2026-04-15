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
      subject: 'Electromagnetics',
      topic_name: 'Waveguides',
      atomic_logic: `Generate GATE-level questions covering Rectangular and Circular Waveguides. Focus on:
1. Cut-off frequency and wavelength for TE and TM modes (Dominant mode TE10).
2. Phase velocity, Group velocity, and Wave impedance in waveguides.
3. Mode analysis: identifying valid/invalid modes, degeneracy, and field distributions.
4. Power flow and attenuation in waveguides.
5. Parallel plate waveguides and TEM mode characteristics.
Questions should involve numericals on cutoff calculations, mode identification, and theoretical properties of guided waves.`
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
