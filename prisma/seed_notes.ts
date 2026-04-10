import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📝 Seeding Premium Vibrant Notes...');

  const notes = [
    {
      topic: 'Heap and Heap Sort',
      content: `### 1. Heap Properties
• **Complete Binary Tree**: Every level is fully filled, except possibly the last, which is filled from left to right.
• **Heap Order Property**: 
  - **Max-Heap**: Parent key ≥ Child keys. (Root is Maximum)
  - **Min-Heap**: Parent key ≤ Child keys. (Root is Minimum)

### 2. Array Representation
For a node at index \`i\`:
- Parent: \`floor((i-1)/2)\`
- Left Child: \`2i + 1\`
- Right Child: \`2i + 2\`

### 3. Key Operations & Time Complexity
- **Insert**: $O(log n)$ - Add at end and 'Bubble Up'.
- **Delete Root**: $O(log n)$ - Replace with last element and 'Max-Heapify'.
- **Build-Heap**: $O(n)$ - Using bottom-up heapify.
- **Heap Sort**: $O(n log n)$ - In-place, not stable.

### 4. Priority Queues
- Heaps are the most efficient structure for implementing Priority Queues.
- Extract-Max/Min: $O(log n)$.`
    },
    {
      topic: 'Pipelining',
      content: `### 1. Basic Concept
• Overlapping the execution of multiple instructions to increase throughput.
• **Cycle Time ($t_p$)** = $max(\text{stage delays}) + \text{register delay}$.

### 2. Performance Metrics
- **Speedup ($S$)** = $\frac{\text{Time}_{non-pipelined}}{\text{Time}_{pipelined}} = \frac{n \cdot k}{k + n - 1}$ (for $n$ instructions, $k$ stages).
- **Ideal Speedup** = $k$ (number of stages).
- **Efficiency ($\eta$)** = $\frac{S}{k}$.
- **Throughput** = $\frac{n}{\text{Total Time}}$.

### 3. Hazards (Pipeline Stalls)
1. **Structural Hazard**: Resource conflict (e.g., two instructions accessing memory).
2. **Data Hazard**: Depends on result of previous instruction.
   - RAW (Read After Write) - Most common.
   - WAR (Write After Read).
   - WAW (Write After Write).
3. **Control Hazard**: Branch instructions causing flow changes.`
    },
    {
      topic: 'Memory Organization',
      content: `### 1. Memory Hierarchy
- Register > Cache > Main Memory > Secondary Storage.
- As we go down: Cost decreases, Capacity increases, Access Time increases.

### 2. Cache Mapping Techniques
- **Direct Mapping**: Block $j$ maps to $(j \mod N)$. High conflict miss.
- **Fully Associative**: Block can go anywhere. Requires complex hardware.
- **Set-Associative**: Block $j$ maps to set $(j \mod S)$. Balanced approach.

### 3. Write Policies
- **Write-Through**: Write to both Cache and Main Memory simultaneously.
- **Write-Back**: Write only to Cache; update Main Memory when block is replaced.`
    },
    {
      topic: 'Process Concept',
      content: `### 1. Process States
• **New**: Being created.
• **Ready**: Waiting for CPU.
• **Running**: Instructions executing.
• **Waiting**: Waiting for I/O event.
• **Terminated**: Finished execution.

### 2. Process Control Block (PCB)
- Identifier (PID).
- Program Counter (PC).
- CPU Registers.
- Memory Limits.
- List of open files.

### 3. Context Switching
- Storing state of old process and loading state for new one.
- **Overhead**: No useful work done during switch. $O(1)$ usually.`
    },
    {
        topic: 'Binary Search',
        content: `### 1. Core Logic
• Divide and conquer approach on sorted arrays.
• Compare middle element with target.

### 2. Complexity Analysis
- **Best Case**: $O(1)$ - Middle element is target.
- **Avg/Worst Case**: $O(log n)$.
- **Space Complexity**: $O(1)$ iterative, $O(log n)$ recursive.

### 3. Loop Invariants
- Search range: \`[low, high]\`.
- Termination condition: \`low > high\`.`
    }
  ];

  for (const item of notes) {
    await prisma.pattern.updateMany({
      where: { topic_name: item.topic },
      data: { short_notes: item.content }
    });
    console.log(`✅ Updated notes for: ${item.topic}`);
  }

  console.log('✨ Premium notes seeding finished!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding notes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
