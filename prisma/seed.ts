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
      subject: 'Computer Organization & Architecture',
      topic_name: 'Basic Computer Organization',
      atomic_logic: `Generate GATE-level questions covering functional units of a computer, instruction execution cycle, register organization, bus structure, and basic performance metrics. Include conceptual and flow-based questions.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
      topic_name: 'Number Representation',
      atomic_logic: `Generate GATE-level questions covering number systems (binary, octal, hexadecimal), signed representations (1's complement, 2's complement), floating-point representation (IEEE 754), and overflow detection. Include numerical problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
      topic_name: 'Boolean Algebra & Logic Gates',
      atomic_logic: `Generate GATE-level questions covering logic gates, Boolean algebra, minimization techniques, and implementation of logic circuits. Include expression simplification and circuit design problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
      topic_name: 'Combinational Circuits',
      atomic_logic: `Generate GATE-level questions covering adders, subtractors, multiplexers, decoders, encoders, comparators, and ALU design. Include truth table and logic design problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
      topic_name: 'Sequential Circuits',
      atomic_logic: `Generate GATE-level questions covering flip-flops, registers, counters, timing diagrams, and state machines. Include sequence analysis and design problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
      topic_name: 'Instruction Set Architecture (ISA)',
      atomic_logic: `Generate GATE-level questions covering instruction formats, addressing modes, instruction types, and instruction execution. Include effective address calculation problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
      topic_name: 'CPU Organization',
      atomic_logic: `Generate GATE-level questions covering data path, control unit (hardwired vs microprogrammed), micro-operations, and instruction pipelining basics. Include conceptual and diagram-based questions.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
      topic_name: 'Pipelining',
      atomic_logic: `Generate GATE-level questions covering pipeline stages, hazards (data, control, structural), pipeline performance, speedup, and stalling. Include numerical problems on CPI and speedup.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
      topic_name: 'Memory Organization',
      atomic_logic: `Generate GATE-level questions covering memory hierarchy, cache memory (mapping techniques, replacement policies), main memory, and associative memory. Include cache hit/miss and effective memory access time problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
      topic_name: 'Virtual Memory',
      atomic_logic: `Generate GATE-level questions covering paging, segmentation, page replacement algorithms (FIFO, LRU, Optimal), TLB, and address translation. Include numerical problems on page faults.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
      topic_name: 'Input-Output Organization',
      atomic_logic: `Generate GATE-level questions covering I/O techniques (programmed, interrupt-driven, DMA), I/O interfaces, and data transfer methods. Include conceptual and flow-based questions.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Organization & Architecture',
      topic_name: 'Performance & Parallelism',
      atomic_logic: `Generate GATE-level questions covering performance metrics (CPI, MIPS), Amdahl’s Law, instruction-level parallelism, and basic concepts of parallel architectures. Include numerical problems.`
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
