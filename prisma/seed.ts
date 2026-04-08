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
      branch: 'Computer Science',
      subject: 'Algorithms',
      topic_name: "Dijkstra's Algorithm",
      atomic_logic: 'Focus on updating distance values only for non-visited neighbors and explain the priority queue logic.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'Operating Systems',
      topic_name: 'Paging & Segmentation',
      atomic_logic: 'Calculate physical address from logical address using page table size and offset bits.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'Compiler Design',
      topic_name: 'LL(1) Parsing',
      atomic_logic: 'Identify if a grammar is LL(1) by checking First and Follow sets for conflicts.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'Computer Networks',
      topic_name: 'TCP Congestion Control',
      atomic_logic: 'Simulate Slow Start and Congestion Avoidance phases after a packet loss or timeout.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'SQL Query - Joins',
      atomic_logic: 'Determine the number of tuples in a natural join between two relations with given primary/foreign keys.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'ER Model - Cardinality & Participation',
      atomic_logic: 'Test the student’s ability to determine the constraints (1:1, 1:N, M:N) and participation (Total vs Partial) in a given scenario. Focus on how many entities can be associated with another.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'ER to Relational Mapping',
      atomic_logic: 'Calculate the minimum number of tables required for a specific ER diagram containing a Weak Entity set or a Multivalued attribute.',
    }, {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'Relational Algebra - Tuple Calculus',
      atomic_logic: 'Test the conversion between Relational Algebra and Tuple Relational Calculus (TRC). Provide a TRC expression and ask for the equivalent Algebra operation.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'Relational Algebra - Division Operator',
      atomic_logic: 'Focus on the "FOR ALL" logic. Test the student’s ability to identify which tuples are returned when a Division (÷) operator is applied to two tables.',
    }, {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'SQL - Nested Subqueries',
      atomic_logic: 'Test the behavior of "IN", "ANY", and "ALL" operators in nested SQL queries. Provide a schema and data, then ask for the count of rows returned.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'SQL - Aggregate Functions & NULLs',
      atomic_logic: 'Test how COUNT(*), COUNT(column), and SUM() handle NULL values in a table. This is a common "trick" area in GATE.',
    }, {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'FD - Lossless Join Decomposition',
      atomic_logic: 'Test if a decomposition of Relation R into R1 and R2 is Lossless. Focus on checking if (R1 ∩ R2) is a superkey for either R1 or R2.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'FD - Dependency Preserving',
      atomic_logic: 'Test whether a set of functional dependencies is preserved after decomposition. Focus on the closure of the FDs in the new sub-relations.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'Canonical Cover',
      atomic_logic: 'Test the student’s ability to find the minimal/canonical cover of a set of FDs by removing redundant FDs and extraneous attributes.',
    }, {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'Transactions - View Serializability',
      atomic_logic: 'Test if a schedule is View Serializable but NOT Conflict Serializable. Focus on identifying "blind writes" and initial/final read conditions.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'Concurrency - Two-Phase Locking (2PL)',
      atomic_logic: 'Test if a schedule follows Basic 2PL, Strict 2PL, or Rigorous 2PL rules. Focus on the "Locking" and "Unlocking" phases and deadlock possibilities.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'Timestamp Ordering Protocol',
      atomic_logic: 'Test the Thomas Write Rule logic. Provide a sequence of operations with timestamps and ask if a specific operation is rejected or ignored.',
    }, {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'Indexing - Secondary B+ Tree',
      atomic_logic: 'Calculate the number of disk accesses required to find a record using a non-clustered B+ tree index. Focus on the levels of the tree and the final data block pointer.',
    },
    {
      exam_type: 'GATE',
      branch: 'Computer Science',
      subject: 'DBMS',
      topic_name: 'Hashing - Extendible Hashing',
      atomic_logic: 'Test the behavior of global and local depths during a bucket split. Provide a sequence of insertions and ask for the final directory size.',
    },
    // Adding some SAT patterns for variety
  
  ];

  for (const pattern of patterns) {
    const created = await prisma.pattern.upsert({
      where: { topic_name: pattern.topic_name },
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
