import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const patterns = [
    // ── Analog Circuits (8 Topics matching JSON Files) ───────────────────────
    {
      exam_type: 'GATE',
      branch: 'ECE',
      subject: 'Analog Circuits',
      topic_name: 'Diode Applications',
      atomic_logic: `Generate GATE-level questions on Diode Applications. Focus on:
1. Rectifiers: Half-wave, Full-wave, and Bridge rectifiers.
2. Clipping and Clamping circuits.
3. Zener diode voltage regulators.`
    },
    {
      exam_type: 'GATE',
      branch: 'ECE',
      subject: 'Analog Circuits',
      topic_name: 'BJT Analysis and Biasing',
      atomic_logic: `Generate GATE-level questions on BJT Analysis. Focus on:
1. Biasing and Stability: Fixed bias, Collector to base bias, and Self-bias.
2. Small signal analysis: h-parameter and r_e models.
3. Common Emitter, Common Base, and Common Collector configurations.`
    },
    {
      exam_type: 'GATE',
      branch: 'ECE',
      subject: 'Analog Circuits',
      topic_name: 'FET and MOSFET Analysis',
      atomic_logic: `Generate GATE-level questions on FET/MOSFET Analysis. Focus on:
1. Biasing of JFET and MOSFET.
2. Small signal analysis and CS, CD, CG configurations.
3. CMOS inverter and switching characteristics.`
    },
    {
      exam_type: 'GATE',
      branch: 'ECE',
      subject: 'Analog Circuits',
      topic_name: 'Frequency Response of Amplifiers',
      atomic_logic: `Generate GATE-level questions on Frequency Response. Focus on:
1. Low and High frequency response of BJT/MOSFET amplifiers.
2. Miller effect and Cascode amplifiers.
3. Gain-bandwidth product.`
    },
    {
      exam_type: 'GATE',
      branch: 'ECE',
      subject: 'Analog Circuits',
      topic_name: 'Feedback Amplifiers',
      atomic_logic: `Generate GATE-level questions on Feedback Amplifiers. Focus on:
1. Feedback topologies: Voltage-series, Voltage-shunt, Current-series, Current-shunt.
2. Effect of feedback on Gain, Bandwidth, and Impedance.`
    },
    {
      exam_type: 'GATE',
      branch: 'ECE',
      subject: 'Analog Circuits',
      topic_name: 'Operational Amplifiers (Op-Amps)',
      atomic_logic: `Generate GATE-level questions on Op-Amps. Focus on:
1. Ideal Op-Amp characteristics and Virtual ground.
2. Applications: Inverting/Non-inverting amplifiers, Summing, Differentiator, Integrator.
3. Precision rectifiers, Log/Antilog amplifiers, and Active filters.`
    },
    {
      exam_type: 'GATE',
      branch: 'ECE',
      subject: 'Analog Circuits',
      topic_name: 'Oscillator Circuits',
      atomic_logic: `Generate GATE-level questions on Oscillators. Focus on:
1. Barkhausen criterion.
2. RC Phase shift, Wein Bridge, Hartley, Colpitts, and Crystal oscillators.`
    },
    {
      exam_type: 'GATE',
      branch: 'ECE',
      subject: 'Analog Circuits',
      topic_name: 'Multivibrators and 555 Timer',
      atomic_logic: `Generate GATE-level questions on Multivibrators and 555 Timer. Focus on:
1. Astable, Monostable, and Bistable multivibrators.
2. 555 Timer applications and Duty cycle calculations.`
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
