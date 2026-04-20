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
      subject: 'Electronic Devices and VLSI',
      topic_name: 'Semiconductor Physics',
      atomic_logic: `Generate GATE-level questions on Semiconductor Physics. Focus on:
1. Energy bands in intrinsic and extrinsic silicon.
2. Carrier transport: diffusion current, drift current, mobility, and resistivity.
3. Generation and recombination of carriers.
4. Poisson and continuity equations.
5. Hall Effect applications and numericals.`
    },
    {
      exam_type: 'GATE',
      branch: 'ECE',
      subject: 'Electronic Devices and VLSI',
      topic_name: 'PN Junction',
      atomic_logic: `Generate GATE-level questions on P-N Junctions. Focus on:
1. P-N junction characteristics and energy band diagrams.
2. Zener and Avalanche breakdown mechanisms.
3. Capacitance: Depletion and Diffusion capacitance.
4. I-V characteristics and small-signal models.
5. Numerical problems on built-in potential and depletion width.`
    },
    {
      exam_type: 'GATE',
      branch: 'ECE',
      subject: 'Electronic Devices and VLSI',
      topic_name: 'BJT and FET',
      atomic_logic: `Generate GATE-level questions on BJT and FET physics. Focus on:
1. BJT: Transistor action, gain parameters (alpha, beta), and Eber-Moll model.
2. JFET: Pinch-off voltage and ohmic/saturation region characteristics.
3. Impact of scaling and high-frequency effects in BJTs.
4. Biasing and transistor as an amplifier/switch.`
    },
    {
      exam_type: 'GATE',
      branch: 'ECE',
      subject: 'Electronic Devices and VLSI',
      topic_name: 'IC Basics and MOSFET',
      atomic_logic: `Generate GATE-level questions on IC Fabrication and MOSFETs. Focus on:
1. MOSFET: Threshold voltage, I-V characteristics, and NMOS/PMOS construction.
2. Non-ideal effects: Channel length modulation, Body effect, and Sub-threshold conduction.
3. CMOS inverter basics and CMOS logic construction.
4. IC Fabrication: Diffusion, Ion Implantation, Photolithography, and Etching basics.`
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
