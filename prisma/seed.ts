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
      subject: 'Compiler Design',
      topic_name: 'Runtime Environment',
      atomic_logic: `Generate GATE-level questions covering activation records, stack allocation, heap allocation, parameter passing mechanisms, symbol table organization, and runtime storage management. Include conceptual and diagram-based questions.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Compiler Design',
      topic_name: 'Lexical Analysis',
      atomic_logic: `Generate GATE-level questions covering tokens, lexemes, regular expressions, finite automata (DFA/NFA), lexical errors, and token recognition. Include conversion and identification problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Compiler Design',
      topic_name: 'Syntax Analysis',
      atomic_logic: `Generate GATE-level questions covering parsing techniques, context-free grammars, ambiguity, parse trees, derivations, and grammar transformations. Include conceptual and derivation-based questions.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Compiler Design',
      topic_name: 'Semantic Analysis',
      atomic_logic: `Generate GATE-level questions covering syntax-directed translation, attribute grammars (S-attributed, L-attributed), type checking, and semantic rules. Include evaluation and tree-based problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Compiler Design',
      topic_name: 'Intermediate Code Generation',
      atomic_logic: `Generate GATE-level questions covering three-address code, syntax trees, DAG, quadruples, triples, indirect triples, and translation schemes. Include representation and conversion problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Compiler Design',
      topic_name: 'Code Optimization',
      atomic_logic: `Generate GATE-level questions covering local and global optimizations, common subexpression elimination, dead code elimination, loop optimization, and peephole optimization. Include code transformation problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Compiler Design',
      topic_name: 'Top-Down Parsing',
      atomic_logic: `Generate GATE-level questions covering LL(1) parsing, FIRST and FOLLOW sets, predictive parsing, recursive descent parsing, and elimination of left recursion and left factoring. Include table construction problems.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Compiler Design',
      topic_name: 'Bottom-Up Parsing',
      atomic_logic: `Generate GATE-level questions covering shift-reduce parsing, LR parsing (LR(0), SLR, CLR, LALR), parsing tables, handle recognition, and conflicts. Include parsing table and step simulation problems.`
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
