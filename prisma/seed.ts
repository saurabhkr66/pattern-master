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
      subject: 'Algorithms',
      topic_name: "Dijkstra's Algorithm",
      atomic_logic: 'Focus on updating distance values only for non-visited neighbors and explain the priority queue logic.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: 'Paging & Segmentation',
      atomic_logic: 'Calculate physical address from logical address using page table size and offset bits.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Compiler Design',
      topic_name: 'LL(1) Parsing',
      atomic_logic: 'Identify if a grammar is LL(1) by checking First and Follow sets for conflicts.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Computer Networks',
      topic_name: 'TCP Congestion Control',
      atomic_logic: 'Simulate Slow Start and Congestion Avoidance phases after a packet loss or timeout.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'SQL Query - Joins',
      atomic_logic: 'Determine the number of tuples in a natural join between two relations with given primary/foreign keys.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'ER Model - Cardinality & Participation',
      atomic_logic: 'Test the student’s ability to determine the constraints (1:1, 1:N, M:N) and participation (Total vs Partial) in a given scenario. Focus on how many entities can be associated with another.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'ER to Relational Mapping',
      atomic_logic: 'Calculate the minimum number of tables required for a specific ER diagram containing a Weak Entity set or a Multivalued attribute.',
    }, {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'Relational Algebra - Tuple Calculus',
      atomic_logic: 'Test the conversion between Relational Algebra and Tuple Relational Calculus (TRC). Provide a TRC expression and ask for the equivalent Algebra operation.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'Relational Algebra - Division Operator',
      atomic_logic: 'Focus on the "FOR ALL" logic. Test the student’s ability to identify which tuples are returned when a Division (÷) operator is applied to two tables.',
    }, {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'SQL - Nested Subqueries',
      atomic_logic: 'Test the behavior of "IN", "ANY", and "ALL" operators in nested SQL queries. Provide a schema and data, then ask for the count of rows returned.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'SQL - Aggregate Functions & NULLs',
      atomic_logic: 'Test how COUNT(*), COUNT(column), and SUM() handle NULL values in a table. This is a common "trick" area in GATE.',
    }, {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'FD - Lossless Join Decomposition',
      atomic_logic: 'Test if a decomposition of Relation R into R1 and R2 is Lossless. Focus on checking if (R1 ∩ R2) is a superkey for either R1 or R2.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'FD - Dependency Preserving',
      atomic_logic: 'Test whether a set of functional dependencies is preserved after decomposition. Focus on the closure of the FDs in the new sub-relations.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'Canonical Cover',
      atomic_logic: 'Test the student’s ability to find the minimal/canonical cover of a set of FDs by removing redundant FDs and extraneous attributes.',
    }, {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'Transactions - View Serializability',
      atomic_logic: 'Test if a schedule is View Serializable but NOT Conflict Serializable. Focus on identifying "blind writes" and initial/final read conditions.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'Concurrency - Two-Phase Locking (2PL)',
      atomic_logic: 'Test if a schedule follows Basic 2PL, Strict 2PL, or Rigorous 2PL rules. Focus on the "Locking" and "Unlocking" phases and deadlock possibilities.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'Timestamp Ordering Protocol',
      atomic_logic: 'Test the Thomas Write Rule logic. Provide a sequence of operations with timestamps and ask if a specific operation is rejected or ignored.',
    }, {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'Indexing - Secondary B+ Tree',
      atomic_logic: 'Calculate the number of disk accesses required to find a record using a non-clustered B+ tree index. Focus on the levels of the tree and the final data block pointer.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'DBMS',
      topic_name: 'Hashing - Extendible Hashing',
      atomic_logic: 'Test the behavior of global and local depths during a bucket split. Provide a sequence of insertions and ask for the final directory size.',
    },
    // 3. Define some ISRO Computer Science patterns
    {
      exam_type: 'ISRO',
      branch: 'CSE',
      subject: 'Digital Logic',
      topic_name: 'FSM - State Reduction',
      atomic_logic: 'Minimize a given state table using the implication chart method. Focus on identifying equivalent states.',
    },
    {
      exam_type: 'ISRO',
      branch: 'CSE',
      subject: 'Computer Organization',
      topic_name: 'DMA - Cycle Stealing',
      atomic_logic: 'Calculate the percentage of CPU time stalled during DMA transfer given bus bandwidth and device data rate.',
    },
    {
      exam_type: 'ISRO',
      branch: 'CSE',
      subject: 'Microprocessors',
      topic_name: '8085 Addressing Modes',
      atomic_logic: 'Identify the addressing mode (Indirect, Indexed, Register, etc.) for a series of 8085 assembly instructions.',
    },
    {
      exam_type: 'ISRO',
      branch: 'CSE',
      subject: 'Computer Networks',
      topic_name: 'Satellite Link propagation delay',
      atomic_logic: 'Calculate total round-trip time for a packet sent via a geostationary satellite at 36,000km altitude.',
    },
    {
      exam_type: 'ISRO',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Banker's Algorithm - Safety Check",
      atomic_logic: 'Determine if a system is in a safe state and find a safe sequence given Allocation, Max, and Available matrices.',
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Asymptotic Analysis",
      atomic_logic: `Generate diverse GATE-level questions covering time and space complexity, Big-O, Theta, Omega notations, best/worst/average cases, and comparison of growth rates.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Recurrence Relations",
      atomic_logic: `Generate diverse GATE-level questions covering solving recurrences using substitution, recursion tree, and Master Theorem, including edge cases and complexity analysis.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Divide and Conquer",
      atomic_logic: `Generate diverse GATE-level questions covering divide and conquer paradigm, recursion breakdown, complexity derivation, and algorithm design strategies.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Binary Search",
      atomic_logic: `Generate diverse GATE-level questions covering binary search logic, edge cases, lower/upper bounds, search space reduction, and time complexity.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Merge Sort",
      atomic_logic: `Generate diverse GATE-level questions covering divide and merge process, recurrence relation, time and space complexity, and stability.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Quick Sort",
      atomic_logic: `Generate diverse GATE-level questions covering pivot selection, partitioning, worst and average case complexity, and recursion depth.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Heap and Heap Sort",
      atomic_logic: `Generate diverse GATE-level questions covering heap properties, heap operations, priority queue behavior, and heap sort complexity.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Greedy Algorithms",
      atomic_logic: `Generate diverse GATE-level questions covering greedy choice property, correctness, counterexamples, and classic problems like activity selection and fractional knapsack.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Dynamic Programming",
      atomic_logic: `Generate diverse GATE-level questions covering overlapping subproblems, optimal substructure, memoization, tabulation, and state transition design.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Breadth First Search (BFS)",
      atomic_logic: `Generate diverse GATE-level questions covering traversal order, shortest path in unweighted graphs, queue behavior, and complexity analysis.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Depth First Search (DFS)",
      atomic_logic: `Generate diverse GATE-level questions covering recursion, stack behavior, traversal order, cycle detection, and connected components.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Topological Sorting",
      atomic_logic: `Generate diverse GATE-level questions covering DAG properties, ordering constraints, Kahn’s algorithm, DFS-based approach, and applications.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Dijkstra's Algorithm",
      atomic_logic: `Generate diverse GATE-level questions covering shortest path computation, priority queue behavior, relaxation process, graph variations, and complexity analysis.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Bellman-Ford Algorithm",
      atomic_logic: `Generate diverse GATE-level questions covering edge relaxation, negative weights, detection of negative cycles, and complexity analysis.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Floyd-Warshall Algorithm",
      atomic_logic: `Generate diverse GATE-level questions covering all-pairs shortest paths, dynamic programming formulation, and matrix-based computation.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Minimum Spanning Tree (Kruskal & Prim)",
      atomic_logic: `Generate diverse GATE-level questions covering MST properties, Kruskal and Prim algorithms, union-find structure, and complexity analysis.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Union-Find (Disjoint Set)",
      atomic_logic: `Generate diverse GATE-level questions covering union by rank, path compression, set operations, and amortized complexity.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "String Matching (KMP)",
      atomic_logic: `Generate diverse GATE-level questions covering prefix function (LPS array), pattern matching, failure function, and complexity analysis.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Hashing",
      atomic_logic: `Generate diverse GATE-level questions covering hash functions, collision resolution techniques, load factor, and complexity analysis.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Backtracking",
      atomic_logic: `Generate diverse GATE-level questions covering recursion tree, constraint satisfaction, pruning techniques, and complexity analysis.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Algorithms',
      topic_name: "Branch and Bound",
      atomic_logic: `Generate diverse GATE-level questions covering optimization problems, bounding functions, search space pruning, and comparison with backtracking.`
    }, {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Process Concept",
      atomic_logic: `Generate diverse GATE-level questions covering process states, process control block, context switching, and process lifecycle.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Threads",
      atomic_logic: `Generate diverse GATE-level questions covering user-level vs kernel-level threads, multithreading models, and performance implications.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "CPU Scheduling",
      atomic_logic: `Generate diverse GATE-level questions covering scheduling algorithms (FCFS, SJF, Round Robin, Priority), waiting time, turnaround time, response time, and Gantt chart analysis.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Process Synchronization",
      atomic_logic: `Generate diverse GATE-level questions covering critical section problem, mutex, semaphores, monitors, and synchronization techniques.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Deadlocks",
      atomic_logic: `Generate diverse GATE-level questions covering deadlock conditions, prevention, avoidance (Banker’s algorithm), detection, and recovery techniques.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Memory Management Basics",
      atomic_logic: `Generate diverse GATE-level questions covering logical vs physical address space, address binding, swapping, and memory allocation techniques.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Paging",
      atomic_logic: `Generate diverse GATE-level questions covering page tables, address translation, page size, internal fragmentation, and TLB usage.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Segmentation",
      atomic_logic: `Generate diverse GATE-level questions covering segment tables, address translation, protection, and fragmentation issues.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Virtual Memory",
      atomic_logic: `Generate diverse GATE-level questions covering demand paging, page faults, working set model, and locality of reference.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Page Replacement Algorithms",
      atomic_logic: `Generate diverse GATE-level questions covering FIFO, LRU, Optimal, Clock algorithms, page fault calculation, and Belady’s anomaly.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "File Systems",
      atomic_logic: `Generate diverse GATE-level questions covering file allocation methods, directory structures, inode structure, and file operations.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Disk Scheduling",
      atomic_logic: `Generate diverse GATE-level questions covering disk scheduling algorithms (FCFS, SSTF, SCAN, C-SCAN), seek time calculation, and performance comparison.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "I/O Systems",
      atomic_logic: `Generate diverse GATE-level questions covering I/O hardware, interrupts, DMA, buffering, and device management techniques.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "System Calls",
      atomic_logic: `Generate diverse GATE-level questions covering types of system calls, user mode vs kernel mode, and interface between OS and programs.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Interprocess Communication (IPC)",
      atomic_logic: `Generate diverse GATE-level questions covering shared memory, message passing, pipes, sockets, and synchronization issues.`
    },
    {
      exam_type: 'GATE',
      branch: 'CSE',
      subject: 'Operating Systems',
      topic_name: "Protection and Security",
      atomic_logic: `Generate diverse GATE-level questions covering access control, protection mechanisms, authentication, and security threats in operating systems.`
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
