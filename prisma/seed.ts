import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const patterns = [
    // ── Analog Electronics (6 Topics matching EE JSON Files) ──────────────────
    {
      exam_type: 'GATE',
      branch: 'EE',
      subject: 'Analog Electronics',
      topic_name: 'Diodes and their Applications',
      atomic_logic: `Generate GATE-level questions on Diode circuits. Focus on:
1. Diode characteristics and models (Ideal, Practical).
2. Rectifiers (Half-wave, Full-wave, Bridge) and Filter circuits.
3. Clipping and Clamping circuits, Zener diode as voltage regulator.`
    },
    {
      exam_type: 'GATE',
      branch: 'EE',
      subject: 'Analog Electronics',
      topic_name: 'BJT, FET and their Biasing Circuits',
      atomic_logic: `Generate GATE-level questions on Transistor Biasing. Focus on:
1. BJT and FET (JFET/MOSFET) characteristics and regions of operation.
2. Biasing techniques: Fixed bias, Voltage divider bias, and Collector-to-base bias.
3. Stability factor and Thermal runaway basics.`
    },
    {
      exam_type: 'GATE',
      branch: 'EE',
      subject: 'Analog Electronics',
      topic_name: 'Small Signal Analysis',
      atomic_logic: `Generate GATE-level questions on Transistor amplifiers. Focus on:
1. Hybrid-pi and h-parameter models for BJT.
2. Small signal analysis of CE, CB, and CC configurations.
3. FET amplifiers (CS, CD) and Frequency response basics.`
    },
    {
      exam_type: 'GATE',
      branch: 'EE',
      subject: 'Analog Electronics',
      topic_name: 'Operational Amplifiers',
      atomic_logic: `Generate GATE-level questions on Op-Amp circuits. Focus on:
1. Ideal Op-Amp characteristics and Virtual ground concept.
2. Inverting/Non-inverting amplifiers, Summing/Differential amplifiers.
3. Integrators, Differentiators, and active filters.`
    },
    {
      exam_type: 'GATE',
      branch: 'EE',
      subject: 'Analog Electronics',
      topic_name: 'Oscillators and Feedback Amplifiers',
      atomic_logic: `Generate GATE-level questions on Feedback and Oscillators. Focus on:
1. Negative feedback: Types (Voltage/Current, Series/Shunt) and their effects.
2. Positive feedback and Barkhausen criterion for oscillations.
3. RC Phase shift, Wien bridge, Hartley, and Colpitts oscillators.`
    },
    {
      exam_type: 'GATE',
      branch: 'EE',
      subject: 'Analog Electronics',
      topic_name: 'Miscellaneous',
      atomic_logic: `Generate GATE-level questions on advanced Analog topics. Focus on:
1. 555 Timer applications (Astable/Monostable).
2. Voltage regulators (IC 78xx/79xx) and Power amplifiers (Class A, B, AB).
3. Specialized circuits like Logarithmic amplifiers and peak detectors.`
    },
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
      update: {
        subject: pattern.subject,
        atomic_logic: pattern.atomic_logic
      },
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
