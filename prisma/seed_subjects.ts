import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

async function main() {
  console.log(`${colors.bright}${colors.cyan}📜 Seeding Subject-Level Practice Data...${colors.reset}`);

  const subjectData = [
    {
      subject_name: "Computer Organization & Architecture",
      pyqs: [
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following two statements about interrupt handling mechanisms in a CPU. $\\text{S1}$: In non-vectored interrupt mechanism, it usually takes more time to start the Interrupt Service Routine (ISR) when compared to that in a vectored interrupt mechanism. $\\text{S2}$: In daisy-chain interrupt mechanism, the CPU polls all the input devices individually to determine the source of the interrupt. Which one of the following options is correct with respect to $\\text{S1}$ and $\\text{S2}?$ 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Both $\\text{S1}$ and $\\text{S2}$ are true",
            "B. Both $\\text{S1}$ and $\\text{S2}$ are false",
            "C. $\\text{S1}$ is true and $\\text{S2}$ is false",
            "D. $\\text{S1}$ is false and $\\text{S2}$ is true"
          ],
          "correct_answer": "C",
          "explanation": "S1: \"Non-vectored takes more time to start ISR than vectored\" Non-vectored: CPU polls to find source first, then jumps to ISR. Vectored: device sends ISR address directly. So non-vectored has extra polling overhead → S1 is TRUE ✅ S2: \"In daisy chain, CPU polls all devices individually\" In daisy-chain, the interrupt request line is shared, and devices are connected in a chain. The CPU acknowledges the interrupt, and the signal passes through devices; the first device that needs service grabs it. No polling by CPU; it's hardware-based. → S2 is FALSE ❌ Answer: (C) S1 true, S2 false",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a processor that has $16$ general purpose registers and it uses $2$-byte instruction format for all its instructions. Variable-sized opcodes are permitted. There are three different types of instructions; M-type, R-type, and C-type. Each M-type instruction has $2$ register operands and a $6$-bit immediate operand. Each Rtype instruction has $3$ register operands. Each C-type instruction has a register operand and a $6$ -bit offset value. If there are $2$ unique M-type opcodes and $7$ unique R-type opcodes, which one of the following options gives the maximum number of unique opcodes possible for C-type instructions? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $8$",
            "B. $4$",
            "C. $64$",
            "D. $16$"
          ],
          "correct_answer": "B",
          "explanation": "$\\textbf{Answer: (B) 4}$ $\\textbf{Solution:}$ Given: 16 general purpose registers. $ \\text{no of bits required = 4}$ Instruction format = $\\text{2 Byte = 16 bit}$ \\[ \\text{M inst}\\;\\;\\; \\boxed{\\; Opcode-2 \\;|\\; Reg-4 \\;|\\; Reg-4 \\;|\\; Im-6\\;} \\times 2\\] \\[ \\text{R inst}\\;\\;\\; \\boxed{\\; Opcode-4 \\;|\\; Reg-4\\;|\\; Reg-4\\;|\\; Reg-4\\;} \\times 7\\] \\[ \\text{C inst}\\;\\;\\; \\boxed{\\; Opcode-6 \\;|\\; Reg-4\\;|\\; Offset-6\\;} \\times x\\] Here we use $\\text{ Expand Opcode Technique:}$ \\[ \\begin{array}{|c|c|c|c|} \\hline \\textbf{Inst. Type} & \\#\\textbf{Total Opcode} & \\#\\textbf{Used Opcode} & \\#\\textbf{Available Opcode} \\\\ \\hline \\textbf{M} & 2^{2} = 4 & 2 & 4 - 2 = 2 \\\\ \\hline \\textbf{R} & 2 \\times 2^{4-2} = 8 & 7 & 8 - 7 = 1 \\\\ \\hline \\color{green}\\textbf{C} & \\color{green}1 \\times 2^{6-4} = 4 & \\color{green}- & \\color{green}4 \\\\ \\hline \\end{array} \\] \\[\\boxed{\\; \\color{yellow}\\therefore \\text{Maximum number of unique opcodes possible for C-type instructions = 4} \\;}\\]",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a system with a processor and a $4$ KB direct mapped cache with block size of $16$ bytes. The system has a $16$ MB physical memory. Four words $\\mathrm{P}, \\mathrm{Q}, \\mathrm{R}$, and S are accessed by the processor in the same order $10$ times. That is, there are a total of $40$ memory references in the sequence $\\mathrm{P}, \\mathrm{Q}, \\mathrm{R}, \\mathrm{S}, \\mathrm{P}, \\mathrm{Q}, \\mathrm{R}, \\mathrm{S}, \\ldots$ Assume that the cache memory is initially empty. The physical addresses of the words are given below ($1$ word $=1$ byte). $\\text{P: 0x845B32, Q: 0x845B26, R: 0x845B36, S: 0x846B32}$ Which of the following statements is/are true? Note: $1 \\mathrm{~K}=2^{10}$ and $1 \\mathrm{M}=2^{20}$",
          "images": [],
          "options": [
            "A. Every access to $\\text{P}$ results in a cache miss",
            "B. Every access to $\\text{R}$ results in a cache hit",
            "C. Every access to $\\text{Q}$ results in a cache miss",
            "D. Except the first access to $\\text{S}$, all subsequent accesses to $\\text{S}$ result in cache hits"
          ],
          "correct_answer": "A;B",
          "explanation": "Parameters & Mapping Block Size: 16 bytes. Cache: 4 KB Direct Mapped (256 lines). Block Address Calculation: $\\text{Address} / 16$ (or removing the last hex digit). Word Address Block Address Index (Block % 256) Tag P 0x845B32 0x845B3 0xB3 0x845 Q 0x845B26 0x845B2 0xB2 0x845 R 0x845B36 0x845B3 0xB3 0x845 S 0x846B32 0x846B3 0xB3 0x846 2. Execution Trace (Sequence: P, Q, R, S repeated 10x) Access P: Miss. Block 0x845B3 (containing P and R) is loaded into Index 0xB3 . Access Q: Miss. Block 0x845B2 is loaded into Index 0xB2 . Access R: HIT. Since P and R are in the same block ( 0x845B3 ), R is already in the cache. Access S: Miss. Block 0x846B3 is loaded into Index 0xB3 , evicting the block containing P and R. In every subsequent loop: P will miss (because S evicted it). Q will hit (it has its own index 0xB2 and is never evicted). R will hit (because P just re-loaded the block they share). S will miss (because the block containing P and R evicted it). 3. Evaluating Statements: A. Every access to P results in a cache miss (TRUE): P is always preceded by S in the previous cycle, which occupies the same cache line with a different tag. B. Every access to R results in a cache hit (TRUE): Because R shares a block with P, and P is accessed immediately before R (with only Q in between at a different index), the block is always present when R is accessed. C. Every access to Q results in a cache miss (FALSE): Only the first access is a miss. D. Except the first access to S, all subsequent accesses to S result in cache hits (FALSE): Every access to S is a miss because P/R always displace it. Final Answer : A and B.",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "To keep track of free blocks in a file system, one of the two approaches is generally used - using bitmaps (bit vectors) or using linked lists. Consider that the linked list approach is used to keep track of free blocks in a file system. Assume that the disk size is $16$ GB , block size is $2$ KB , and block numbers used are $32$-bit long. A single pointer of size $4$ bytes is used in each block of the list to point to the next block of the list. The number of blocks required to hold the free disk block numbers is $\\_\\_\\_\\_\\_\\_\\_$. (answer in integer) Note: $1 \\mathrm{K}=2^{10}$ and $1 \\mathrm{G}=2^{30}$ 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "16417",
          "explanation": "Answer : (16417)",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a system with $1$ MB physical memory and a word length of $1$ byte. The system uses a direct mapped cache, with block numbers starting from $0$. The word with physical address $\\text{0xA2C28}$ is mapped to the cache block number $17610$. The maximum possible size of the cache (in KB ) for this configuration is $\\_\\_\\_\\_\\_\\_\\_$. (answer in integer) Note: $1 \\mathrm{~K}=2^{10}$ and $1 \\mathrm{M}=2^{20}$ 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "128",
          "explanation": "Answer : (128)",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A non-pipelined instruction execution unit that operates at $1.6$ GHz clock takes an average of $5$ clock cycles to complete the execution of an instruction. To improve the performance, the system was pipelined with a goal of achieving an average throughput of one instruction per clock cycle. However, it could operate only at $1.2$ GHz due to pipeline overheads. While executing a program in the pipelined design, $30 \\%$ of instructions encountered a stall of $2$ cycles due to pipeline hazards. The speed-up obtained by the pipelined design over the non-pipelined one for this program is $\\_\\_\\_\\_\\_\\_\\_$ (rounded off to two decimal places) Note: $1 \\mathrm{G}=10^{9}$ 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "2.30:2.40",
          "explanation": "$For,$ $non-pipelined : IdealCPI = 5 \\Longrightarrow5*(\\frac{1}{1.6}) nsec$ $For,$ $pipelined : CPI = 1 (Ideal)+ 0.3*2 = 1.6 cycles = 1.6*(\\frac{1}{1.2}) nsec $ $Speedup= \\frac{non-pipelined}{pipelined}= \\frac {(\\frac{5}{1.6})}{(\\frac{1.6}{1.2})} = \\frac{5*1.2}{1.6*1.6} = 2.34$",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Match each addressing mode in $\\textbf{List I}$ with a data element or an element of a data structure (in a high-level language) in $\\textbf{List II}$: \\[ \\begin{array}{|l|l|} \\hline {\\textbf{List I}} & {\\textbf{List II}} \\\\ \\hline \\hline P.\\ \\text{Immediate} & 1.\\ \\text{Element of an array} \\\\ \\hline Q.\\ \\text{Indirect} & 2.\\ \\text{Pointer} \\\\ \\hline R.\\ \\text{Base with index} & 3.\\ \\text{Element of a record} \\\\ \\hline S.\\ \\text{Base with offset/displacement} & 4.\\ \\text{Constant} \\\\ \\hline \\end{array} \\] 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $\\mathrm{P}-4, \\mathrm{Q}-3, \\mathrm{R}-1, \\mathrm{~S}-2$",
            "B. $\\mathrm{P}-4, \\mathrm{Q}-2, \\mathrm{R}-1, \\mathrm{~S}-3$",
            "C. $\\mathrm{P}-1, \\mathrm{Q}-4, \\mathrm{R}-3, \\mathrm{~S}-2$",
            "D. $\\mathrm{P}-2, \\mathrm{Q}-3, \\mathrm{R}-1, \\mathrm{~S}-4$"
          ],
          "correct_answer": "B",
          "explanation": "Answer is option $\\boxed{B).\\text{P-4, Q-2, R-1, S-3}}$ Immediate: Constant $(P\\to 4)$ In Imm. Addressing mode the operand field of the instruction contains the actual data itself. Indirect :Pointer $(Q\\to 2)$ Address field of the instruction points to a memory location which contains the effective address . This is similar to working of pointer. Base with index: Elements of an array $(R \\to1)$ Base will hold the starting address of the array and index will tell us wihch element of the array we need. Both value can change here. Base with offset/displacement: Element of a record $(S\\to 3)$ Here displacement would be a fixed value and Base will change. Like for example this is used to access linked list contents. where base acts as starting address of linked list node and displacement will tell us which content of the Linked List to access. Good question to solve: https://gateoverflow.in/118291/gate-cse-2017-set-1-question-11",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a processor $\\text{P}$ whose instruction set architecture is the load-store architecture. The instruction format is such that the first operand of any instruction is the destination operand. Which one of the following sequences of instructions corresponds to the high-level language statement $\\mathrm{Z}=\\mathrm{X}+\\mathrm{Y}$ ? Note: X, Y, and Z are memory operands. R$0$, R$1$, and R$2$ are registers. 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. ADD Z, X, Y",
            "B. LOAD R$0$, X ADD Z, R$0$, Y",
            "C. ADD R$0$, X, Y STORE Z, R$0$",
            "D. LOAD R$0$, X LOAD R$1$, Y ADD R$2$, R$0$, R$1$ STORE Z, R$2$"
          ],
          "correct_answer": "D",
          "explanation": "Answer is D Given that $X, Y, and\\; Z$ are memory operands. $R_0, R_1, and \\;R_2$ are registers. A processor P whose instruction set architecture is the load-store architecture. $\\Rightarrow$ We need to load the values from Memory to Register and store the values from Registers to Memory. $Z=X+Y$ $\\Rightarrow$ that means X and Y values needs to load from memory to registers, then perform addition; thereafter save the result into Z. We know that Load and store instruction format has one register and one operand. Based on load/store we can identify which is destination and which is source. But for addition instruction, we must know which is destination operand. In the question it is given that $\\text{first operand of any instruction is the destination operand.}$ $\\therefore$ if addition instruction format is $\\text{ADD p,q,r}$ then storing back the result must be $\\text{STORE Z, p}$ With that we can identify the correct option.",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which one of the following dependencies among the register operands of different instructions can cause a data hazard in a pipelined processor? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Read-after-read",
            "B. Read-after-write",
            "C. Write-after-read",
            "D. Write-after-write"
          ],
          "correct_answer": "B",
          "explanation": "Data hazards in pipelining occur when instructions that depend on previous, in-flight instructions attempt to read or write data before it is ready, leading to potential pipeline stalls and data inconsistencies. Read after Read doesn't creates any issues in any pipeline model. In our pipeline models, instructions executes in the sequence. So, neither Write-after-Write nor Write-after-Read create issues for us as writing doesn't depend upon any previous instruction. Read-after-Write $\\Rightarrow$ read is depends upon write, so that may introduce potential stalls.",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The size of the physical address space of a processor is $2^{32}$ bytes. The capacity of a cache memory unit is $2^{23}$ bytes. The cache block size is $128$ bytes. The cache memory unit can be built as a direct mapped cache or as a $K$-way set-associative cache, where $K=2^{L}$ and $L \\in\\{1,2,3\\}$. Let the length of the TAG field be $M$ bits for the direct mapped cache, and $N$ bits for the set-associative cache. Which one of the following options is true? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $N=M+L$",
            "B. $N=M-L$",
            "C. $N=M+K$",
            "D. $N=M-K$"
          ],
          "correct_answer": "A",
          "explanation": "",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a system that has a cache memory unit and a memory management unit (MMU). The address input to the cache memory is a physical address. The MMU has a translation lookaside buffer (TLB). Assume that when a page is evicted from the main memory, the corresponding blocks in the cache are marked as invalid. For a given memory reference, which of the following sequences of events can NEVER happen?",
          "images": [],
          "options": [
            "A. TLB miss, Page table hit, Cache hit",
            "B. TLB hit, Page table miss, Cache hit",
            "C. TLB miss, Page table miss, Cache hit",
            "D. TLB miss, Page table miss, Cache miss"
          ],
          "correct_answer": "B;C",
          "explanation": "A. TLB miss, Page table hit, Cache hit ✔ Possible (TLB miss → PT se frame mila → cache me ho sakta hai) B. TLB hit, Page table miss, Cache hit ❌ Impossible Bhai simple baat: TLB hit ho gaya ⇒ translation mil gaya To page table ko access hi nahi karenge ➡️ “Page table miss” ka event aayega hi nahi C. TLB miss, Page table miss, Cache hit ❌ Impossible PT miss ⇒ page fault ⇒ page memory me nahi Given: memory se page gaya ⇒ cache invalidate ➡️ Cache hit ho hi nahi sakta D. TLB miss, Page table miss, Cache miss ✔ Possible (Page fault hai ⇒ cache miss obvious) ✅ Final Answer: 👉 B and C both can NEVER happen",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a hard disk with a rotational speed of $15000$ rpm. The time to move the read/write head from a track to its adjacent track is $1$ millisecond. Initially, the head is on track $0$. The number of sectors per track is $400$. The sector size is $1024$ bytes. It is necessary to transfer data from $10$ randomly located sectors in each of the following tracks in the order: $5, 12$ and $7$. The total time for the data transfer (in milliseconds) from the hard disk is $\\_\\_\\_\\_\\_\\_\\_$. (rounded off to one decimal place) 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "77.3 : 77.3",
          "explanation": "Given that, Rotation speed $= 15000$ rpm Track-to-track movement time $= 1~ms$ No. of sectors$/$track $= 400$ We need to access $10$ randomly located sectors in each of the tracks $5, 12, 7$. Time for one complete rotation: $R_t = \\dfrac{60}{15000}~sec = 0.004~sec = 4~ms$ Average rotational delay: $\\dfrac{4}{2} = 2~ms$ $($half of time taken for one rotation$)$ Transfer time for one sector: Since $1$ rotation ($4~ms$) reads $400$ sectors (as there are $400$ sectors in a track), $T_t = \\dfrac{4}{400} = 0.01~ms$ Important Point : Since the 10 sectors in each track are randomly located, they can be anywhere on that track. Therefore, after reading one sector, the disk must rotate again to bring the next required sector under the head. Hence, we need to consider average rotational latency for each sector separately, not just once per track. Time per sector $=$ Avg. Rot. Delay $+$ Transfer time $= 2 + 0.01 = 2.01~ms$ Time to read $10$ sectors in one track: $10 \\times 2.01 = 20.1~ms$ Initially head is on track $0.$ So, Head movement order: $0 \\rightarrow 5 \\rightarrow 12 \\rightarrow 7$ Seek time: $0 \\rightarrow 5 = 5~ms$ $5 \\rightarrow 12 = 7~ms$ $12 \\rightarrow 7 = 5~ms$ Total seek time $= 5 + 7 + 5 = 17~ms$ Total time $=$ Total seek time $+$ Time for $3$ tracks $= 17 + 3 \\times 20.1$ $= 17 + 60.3$ $= 77.3~ms$ $\\mathbf{\\therefore}$ Total time for data transfer $\\mathbf{= 77.3~ms}$",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The EX stage of a pipelined processor performs the memory read operations for LOAD instructions, and the operations for the arithmetic and logic instructions. Let $t_{E X}$ denote the time taken by the EX stage to perform the operation for an instruction. For each instruction type, the values of $t_{E X}$ and $M$ (the number of instructions of that type in a sequence of $100$ instructions for a program P ), are given in the table below. The duration of the pipeline clock cycle is $1$ nanosecond. Assume that the latch time for the interstage buffers in the pipeline is negligible. \\[ \\renewcommand{\\arraystretch}{1.3} \\begin{array}{|l|c|c|} \\hline \\text{Instruction} & \\begin{array}{c} t_{EX}\\ \\text{in} \\\\ \\text{nanoseconds} \\end{array} & M \\\\ \\hline \\text{LOAD} & 1.8 & 15 \\\\ \\hline \\text{IMUL} & 1.5 & 10 \\\\ \\hline \\text{IDIV} & 2.5 & 5 \\\\ \\hline \\text{FADD} & 1.7 & 10 \\\\ \\hline \\text{FSUB} & 1.7 & 5 \\\\ \\hline \\text{FMUL} & 2.8 & 15 \\\\ \\hline \\text{FDIV} & 3.2 & 5 \\\\ \\hline \\begin{array}{l} \\text{All other} \\\\ \\text{instructions} \\end{array} & \\begin{array}{c} \\text{Less than} \\\\ 1.0 \\end{array} & 35 \\\\ \\hline \\end{array} \\] When program $\\text{P}$ is executed, the number of clock cycles for which the pipeline is stalled due to structural hazards in the EX stage is $\\_\\_\\_\\_$. (answer in integer) 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "95 : 95",
          "explanation": "Total no. of stalls is 95",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a processor with instruction size of $2\\,\\text{bytes}$ and $16$ registers. The instruction set consists of three instruction formats $L$, $M$, and $N$. $L$: has $2$ register operands and a $6$-bit offset. $M$: has $3$ register operands. $N$: has $1$ register operand and a $6$-bit offset. If $L$ has $2$ unique opcodes and $M$ has $7$ unique opcodes, then the number of opcodes possible for $N$ is",
          "images": [],
          "options": [
            "A. $4$",
            "B. $8$",
            "C. $16$",
            "D. $64$"
          ],
          "correct_answer": "A",
          "explanation": "Instruction size = 2B = 16bits total possible encoding = 2^16 we have 16 register so we need 4 bits for them L : 2 * 2^4 * 2^4 * 2^6 = 32768 possible encoding for L M: 7 * 2^4 * 2^4 * 2^4 = 28672 possible encoding for M N: K * 2^4 * 2^6 possible encoding for N (suppose K is the number of unique opcode for N) all this encoding should be less than of equal to the total possible encoding which is 2^16 therefore we can form a equation as 32768 + 28672 + (K * 2^4 * 2^4) <= 2^16 solving this we will get K = 4",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following statements about interrupts. $\\text{S1}:$ A non vectored interrupt generally requires more time to identify the interrupting device compared to a vectored interrupt. $\\text{S2}:$ In daisy chaining, the CPU polls every I/O device to determine which device requested the interrupt. Which of the following options is correct?",
          "images": [],
          "options": [
            "A. $\\text{S1}$ is TRUE and $\\text{S2}$ is TRUE",
            "B. $\\text{S1}$ is TRUE and $\\text{S2}$ is FALSE",
            "C. $\\text{S1}$ is FALSE and $\\text{S2}$ is TRUE",
            "D. $\\text{S1}$ is FALSE and $\\text{S2}$ is FALSE"
          ],
          "correct_answer": "A",
          "explanation": "statement1: Because the CPU must manually check multiple devices in non-vectored systems, it takes significantly more time than the direct \"vectored\" approach.(True) statement 2: When the CPU receives an interrupt request, it sends out an Interrupt Acknowledge (INTA) signal. This signal passes through the first device, then the second, and so on. The first device in the chain that actually requested the interrupt \"intercepts\" the signal and stops it from moving further down the chain. Polling is a software method where the CPU initiates the check. In Daisy Chaining, the CPU does not poll; the hardware signal automatically identifies the highest-priority device. so (False) so option B",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a system with a $4\\,\\text{KB}$ direct-mapped data cache with a block size of $16\\,\\text{bytes}$. The system is byte addressable and has a physical address space of $16\\,\\text{MB}$. During the execution of a program, four data words $P, Q, R,$ and $S$ are accessed in that order $16$ times (i.e., $PQRS\\,PQRS\\,\\ldots$). Hence, there are $64$ accesses to the data cache altogether. Assume that the data cache is initially empty and no other data words are accessed by the program. The byte addresses of the first bytes of $P, Q, R,$ and $S$ are $\\text{0x845B32}$, $\\text{0x845B26}$, $\\text{0x845B36}$, and $\\text{0x846B32}$, respectively. For the execution of the above program, which of the following statements is/are TRUE with respect to the data cache?",
          "images": [],
          "options": [
            "A. Every access to $P$ is a miss.",
            "B. Every access to $R$ is a hit.",
            "C. Except for the first time, all subsequent accesses to $S$ are hits.",
            "D. Every access to $Q$ is a miss."
          ],
          "correct_answer": "A;B",
          "explanation": "",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a processor $P$ whose instruction set architecture is a load-store architecture. The instruction format is such that the first operand of any instruction is the destination operand. Which one of the following sequences of instructions corresponds to the high-level language statement $$ Z = X + Y $$ Note: $X$, $Y$, and $Z$ are memory operands. $R0$, $R1$, and $R2$ are registers.",
          "images": [],
          "options": [
            "A. $\\verb|ADD Z, X, Y|$",
            "B. $ \\begin{aligned} \\verb|LOAD R0, X|\\\\ \\verb|ADD Z, R0, Y| \\end{aligned} $",
            "C. $ \\begin{aligned} \\verb|ADD R0, X, Y|\\\\ \\verb|STORE Z, R0| \\end{aligned} $",
            "D. $ \\begin{aligned} \\verb|LOAD R0, X|\\\\ \\verb|LOAD R1, Y|\\\\ \\verb|ADD R2, R0, R1|\\\\ \\verb|STORE Z, R2| \\end{aligned} $"
          ],
          "correct_answer": "D",
          "explanation": "As it is a load store architecture which is register - register architecture we perform all arithmetic operations between the reg only so we first have to load the content of x and y into the register and then do the addition, store its result in the reg and then store back to the location z Hence answer is option A",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a hard disk with a rotational speed of $\\mathbf{15000 ~ rpm}$. The time to move the read/write head from a track to its adjacent track is $1$ millisecond. Initially the head is on track $\\mathbf{0}$. The number of sectors per track is $\\mathbf{400}$. The sector size is $1024$ bytes. It is necessary to transfer data from 10 randomly located sectors in each of the following tracks in the order $5$, $12$ and $7$. The total time for the data transfer (in milliseconds) from the hard disk is $\\_\\_\\_\\_\\_\\_$?",
          "images": [],
          "options": [],
          "correct_answer": "77.3",
          "explanation": "Given that, Rotation speed $= 15000$ rpm Track-to-track movement time $= 1~ms$ No. of sectors$/$track $= 400$ We need to access $10$ randomly located sectors in each of the tracks $5, 12, 7$. Time for one complete rotation: $R_t = \\dfrac{60}{15000}~sec = 0.004~sec = 4~ms$ Average rotational delay: $\\dfrac{4}{2} = 2~ms$ $($half of time taken for one rotation$)$ Transfer time for one sector: Since $1$ rotation ($4~ms$) reads $400$ sectors (as there are $400$ sectors in a track), $T_t = \\dfrac{4}{400} = 0.01~ms$ Important Point : Since the 10 sectors in each track are randomly located, they can be anywhere on that track. Therefore, after reading one sector, the disk must rotate again to bring the next required sector under the head. Hence, we need to consider average rotational latency for each sector separately, not just once per track. Time per sector $=$ Avg. Rot. Delay $+$ Transfer time $= 2 + 0.01 = 2.01~ms$ Time to read $10$ sectors in one track: $10 \\times 2.01 = 20.1~ms$ Initially head is on track $0.$ So, Head movement order: $0 \\rightarrow 5 \\rightarrow 12 \\rightarrow 7$ Seek time: $0 \\rightarrow 5 = 5~ms$ $5 \\rightarrow 12 = 7~ms$ $12 \\rightarrow 7 = 5~ms$ Total seek time $= 5 + 7 + 5 = 17~ms$ Total time $=$ Total seek time $+$ Time for $3$ tracks $= 17 + 3 \\times 20.1$ $= 17 + 60.3$ $= 77.3~ms$ $\\mathbf{\\therefore}$ Total time for data transfer $\\mathbf{= 77.3~ms}$",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Real-valued variables $X$ and $Y$ are represented in IEEE-754 single precision floating point format. Binary representations of $X$ and $Y$ are: $$ \\begin{aligned} X &= (35C00000)_H\\\\ Y &= (34A00000)_H \\end{aligned} $$ Let $Z = X + Y$. Which of the following is the binary representation of $Z$ (in hexadecimal)?",
          "images": [],
          "options": [
            "A. $(35C80000)_H$",
            "B. $(35E80000)_H$",
            "C. $(35EC0000)_H$",
            "D. $(35CC0000)_H$"
          ],
          "correct_answer": "B",
          "explanation": "$X~\\&~Y$ are represented in IEEE-754 format. IEEE-754 Format : Floating point no. $= (-1)^S\\times1.Mantissa \\times 2^{(E-127)}$ $X : (35C00000)_H$ Exponent : $(01101011)_b = (107)_d$ $X = (-1)^0 \\times 1.1 \\times 2^{(107-127)} = \\mathbf{1.1 \\times2^{-20}}$ $Y : (34A00000)_H$ Exponent $= (01101001)_b = (105)_d$ $Y= (-1)^0 \\times 1.01 \\times 2^{(105-127)} = 001.01 \\times 2^{-22} = \\mathbf{0.0101 \\times 2^{-20}}$ Adding $X$ and $Y$, we get $\\therefore Z = X+Y = (1.1 \\times 2^{-20}) + (0.0101 \\times 2^{-20})$ $\\therefore Z = 1.1101 \\times 2^{-20}$ Converting $Z$ into IEEE-754 format : Sign bit $= 0$ Biased Exponent $= -20 + 127 = 107 = (01101011)_b$ Mantissa $= 11010000000000000000000$ Combining it into $32$-bit IEEE-754 format : $(0011 ~0101 ~1110 ~1000 ~0000 ~0000 ~0000 ~0000)_b = \\mathbf{(35E80000)_h}$",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Match the following: \\[ \\renewcommand{\\arraystretch}{1.3} \\begin{array}{|c|l|c|l|} \\hline \\textbf{List-I} & \\textbf{Addressing Mode} & \\textbf{List-II} & \\textbf{Description} \\\\ \\hline P & \\text{Immediate} & 1 & \\text{Element of an array} \\\\ Q & \\text{Indirect} & 2 & \\text{Pointer} \\\\ R & \\text{Base with index} & 3 & \\text{Element of a record} \\\\ S & \\text{Base with offset} & 4 & \\text{Constant} \\\\ \\hline \\end{array} \\] A.$\\,\\mathrm{P\\!-\\!3,\\ Q\\!-\\!1,\\ R\\!-\\!3,\\ S\\!-\\!1}\\,$ B.$\\,\\mathrm{P\\!-\\!4,\\ Q\\!-\\!2,\\ R\\!-\\!1,\\ S\\!-\\!3}\\,$ C.$\\,\\mathrm{P\\!-\\!1,\\ Q\\!-\\!2,\\ R\\!-\\!4,\\ S\\!-\\!3}\\,$ D.$\\,\\mathrm{P\\!-\\!2,\\ Q\\!-\\!1,\\ R\\!-\\!3,\\ S\\!-\\!4}\\,$",
          "images": [],
          "options": [],
          "correct_answer": "B",
          "explanation": "Option B is correct Immediate AM = constant value Indirect AM = pointer Base with index = Element of a Array Base wtih offset = Element of a Record",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a system with the following cache configuration: Block size $=128$ bytes Physical memory size $=2^{23}$ bytes Cache size $=2^{13}$ bytes Two cache organizations are used: 1. A direct-mapped cache with tag size $=m$ bits. 2. A $k$-way set associative cache with tag size $=n$ bits where \\[ k=2^L,\\quad L\\in\\{1,2,3,\\ldots\\} \\] Which of the following relations between $n$ and $m$ is/are correct?",
          "images": [],
          "options": [
            "A. $n=m-L$",
            "B. $n=m+L$",
            "C. $n=mL$",
            "D. $n=m+k$"
          ],
          "correct_answer": "B",
          "explanation": "Physical memory = 2^23 B block size is 128 B so its 7 bits for block offset cache size = 2^13 B 1) For the direct mapped cache The number of lines will be 2^13 / 2^7 = 2^6 so 6 bits for line index remaining 10 bits so the tag so m = 10 2) For K - way set associative cache lines will be 2^6 now for number of set we do 2^6 / 2^L = 2^6-L so 6-L bits for set index remaining bits will be for tag which is n = 23 - (6 - L) - 7 = 23 - 6 + L -7 = 10 + L = m + L hence option B is correct n = m + L all other options are wrong",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which of the following dependencies among the register operands of different instructions can cause data hazards in a pipeline processor?",
          "images": [],
          "options": [
            "A. WAW (Write After Write)",
            "B. RAR (Read After Read)",
            "C. RAW (Read After Write)",
            "D. WAR (Write After Read)"
          ],
          "correct_answer": "C",
          "explanation": "In a pipelined processor, data hazards occur when the pipeline must be stalled because instructions that are overlapping in execution need to access the same data (registers or memory) in an order that differs from the original sequential program order. option c",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider there are $8$ holes of size $20 \\mathrm{~KB}, 4 \\mathrm{~KB}, 25 \\mathrm{~KB}, 18 \\mathrm{~KB}, 7 \\mathrm{~KB}, 9 \\mathrm{~KB}, 15 \\mathrm{~KB}$, and $12 \\mathrm{~KB}$, and there arrive two processes, process $P_1$ of size $16 \\mathrm{~KB}$ and process $P_2$ of size $9 \\mathrm{~KB}$. The holes are not necessarily adjacent to each other. We apply best fit algorithm to these processes to allocate memory. The number of holes less than $8 \\mathrm{~KB}$ size are $\\_\\_\\_\\_$. 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "3",
          "explanation": "By applying Best fit Algorithm : we will fil in those Hole(block ) which take less internal fragmentaion so process P1 goes to 18KB block so internal fragentaion =2 KB Process P2 fit exactly in Block 9KB so holes with size < 8KB is 4KB 7KB 18KB (2KB internal fragementation) so total 3 Block (hole)",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a computer with a word size of $1 ~\\mathrm{byte}$, $1 ~\\mathrm{MB}$ main memory designed with Direct mapped cache. If the main memory addressed data $\\mathrm{(A2C28)_{16}}$ is mapped to cache block $(176)_{10}$ then maximum size of cache is $\\_\\_\\_\\_$ ?",
          "images": [],
          "options": [],
          "correct_answer": "16",
          "explanation": "A2C28 in binary is 101000 10110000 101000 176 in binary is 10110000 as we can see the yellow part is matching here so definitely this is the part of the line bits..now we are",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The $32\\text{-bit}$ $\\mathrm{IEEE ~754}$ single-precision representation of a number is $\\mathrm{0xC2710000}$. Find the decimal representation of the number (correct to two decimal places).",
          "images": [],
          "options": [],
          "correct_answer": "-60.25",
          "explanation": "0xC2710000 in binary will be 1 10000100 11100010000000000000000 green is the sign bit as its 1 which means the number is negative so we have to add a minus sign in the last yellow one are the exponent which is equal to 132 and we subtract by the bias of the 32 bit ieee which is 127 so it becomes 5 normal form will be -1.1110001 * 2^5 = -60.25",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider non-pipeline processor with a $\\text{CPI}$ of $5$ and $\\text{clock frequency}$ of $1.6 ~\\mathrm{GHz}$. Pipeline $\\text{clock frequency}$ is $1.2 ~\\mathrm{GHz}$ with Ideal $\\text{CPI}$ of $1$ . If $30 \\%$ instructions cause $2$ stalls then pipelined speedup is $\\_\\_\\_\\_$.",
          "images": [],
          "options": [],
          "correct_answer": "2.343",
          "explanation": "clock cycle time = 1 / clock frequency = 1/ 1.6 nsec = 0.625nsec Execution Time of NonPipeline = CPI * clock cycle time = 5 * 0.625 = 3.125 nsec Clock frequency of Pipeline system = 1.2 GHz clock cycle time = 1/clock frequency = 1/1.2nsec = 0.833nsec Execution Time of Pipeline = (1 + no. of stall per instruction ) * clock cycle time No. of stal per instruction = 0.30 * 2 = 0.60 Execution Time of Pipeline = (1 + 0.6 ) * 0.833 = 1.33nsec speed up factor = Ex time of Non pipeline / Ex time of pipelie = 3.125/ 1.33 = 2.34",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Given a computing system with two levels of cache (L1 and L2) and a main memory. The first level (L1) cache access time is $1$ nanosecond (ns) and the \"hit rate\" for L1 cache is $90 \\%$ while the processor is accessing the data from L1 cache. Whereas, for the second level (L2) cache, the \"hit rate\" is $80 \\%$ and the \"miss penalty\" for transferring data from L2 cache to L1 cache is $10$ ns . The \"miss penalty\" for the data to be transferred from main memory to L2 cache is $100$ ns . Then the average memory access time in this system in nanoseconds is __________ . (rounded off to one decimal place)",
          "images": [],
          "options": [],
          "correct_answer": "4:4",
          "explanation": ".",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A $5$-stage instruction pipeline has stage delays of $180,250,150,170$, and $250$, respectively, in nanoseconds. The delay of an inter-stage latch is $10$ nanoseconds. Assume that there are no pipeline stalls due to branches and other hazards. The time taken to process $1000$ instructions in microseconds is __________. (rounded off to two decimal places)",
          "images": [],
          "options": [],
          "correct_answer": "260.20:261.20",
          "explanation": "\\[K = 5\\]\\[n = 1000\\]\\[t_p = \\max(\\text{Stage Delay} + \\text{Buffer Delay}) = 260 \\text{ ns}\\]\\[\\text{Execution Time} = (K + n - 1) t_p\\]\\[= (5 + 1000 - 1) \\times 260 \\text{ ns} = 261040 \\text{ ns}\\]\\[= 261.04 \\text{ } \\mu\\text{s}\\]",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "An application executes $6.4 \\times 10^{8}$ number of instructions in $6.3$ seconds. There are four types of instructions, the details of which are given in the table. The duration of a clock cycle in nanoseconds is __________. (rounded off to one decimal place) $$\\begin{array}{|c|c|c|} \\hline \\text{Instruction type} & \\text{Clock cycles required per} \\\\& \\text{instruction (CPI)} & \\text{Number of instructions executed} \\\\ \\hline \\text{Branch} & \\text{2} & \\text{$2.25 \\times 10^{8}$} \\\\ \\hline \\text{Load} & \\text{5} & \\text{$1.20 \\times 10^{8}$} \\\\ \\hline \\text{Store} & \\text{4} & \\text{$1.65 \\times 10^{8}$} \\\\ \\hline \\text{Arithmetic} & \\text{3} & \\text{$1.30 \\times 10^{8}$} \\\\ \\hline \\end{array}$$ 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "3.0:3.0",
          "explanation": "Total Execution time $= 6.3 \\;sec$ For, finding number of clock cycles for a particular Instruction type, Number of clock cycles $=$ Number of instructions executed $\\times$ CPI We would first calculate total number of clock cycles required for each type of instructions: For Branch Instruction : $2 \\times (2.25 \\times 10^{8}) = 4.5 \\times 10^{8}$ For Load Instruction : $5 \\times (1.20 \\times 10^{8}) = 6 \\times 10^{8}$ For Store Instruction : $4 \\times (1.65 \\times 10^{8}) = 6.6 \\times 10^{8}$ For Arithmetic Instruction : $3 \\times (1.30 \\times 10^{8}) = 3.9 \\times 10^{8}$ Total Number of Clock Cycles : $(4.5 \\times 10^{8}) + (6 \\times 10^{8}) + (6.6 \\times 10^{8}) + (3.9 \\times 10^{8})$ $= 21 \\times 10^{8}$ Total Execution time $=$ Total Number of Clock Cycles $\\times$ Clock Cycle time $\\therefore$ Clock Cycle time $= \\dfrac{6.3}{21 \\times 10^{8}}\\;sec$ $= 0.3 \\times 10^{-8}\\; sec $ $= 3 \\times 10^{-9} sec$ $= 3 ns$ Answer : Duration of Clock Cycle $= \\mathbf{3 \\;ns}$",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "​​​​Which of the following is/are part of an Instruction Set Architecture of a processor? ed Nov 13, 2025 reply Follow flag For Better Understanding : 1) https://acg.cis.upenn.edu/milom/cis501-Fall05/lectures/02_isa.pdf 2) https://gateoverflow.in/460817/gate-cse-2025-set-2-question-18?show=497512#a497512 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. The size of the cache memory",
            "B. The clock frequency of the processor",
            "C. The number of cache memory levels",
            "D. The total number of registers"
          ],
          "correct_answer": "D",
          "explanation": "Computer Architecture: A Quantitative Approach By: John L. Hennessy and David A. Patterson “Instruction set architecture is defined by the programmer-visible machine interface such as the instruction set, the number of registers, and addressing modes. Performance characteristics such as clock rate, cache size, and the number of cache levels are not part of ISA .” A) False, Cache size is a microarchitectural detail, not part of ISA. B) False, clock speed is a hardware implementation detail. C) false, Like cache size, the number of cache levels is not part of ISA . D) True , register count is defined by the ISA (e.g., x86 has 8 GPRs, RISC-V has 32). So, Option D) is the Source: 1) https://en.wikipedia.org/wiki/Instruction_set_architecture 2) https://www.cs.umd.edu/~meesh/411/CA-online/chapter/instruction-set-architecture/index.html",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "​​​​For a direct-mapped cache, $4$ bits are used for the tag field and $12$ bits are used to index into a cache block. The size of each cache block is one byte. Assume that there is no other information stored for each cache block. Which ONE of the following is the CORRECT option for the sizes of the main memory and the cache memory in this system (byte addressable), respectively?",
          "images": [],
          "options": [
            "A. $64$ KB and $4$ KB",
            "B. $128$ KB and $16$ KB",
            "C. $64$ KB and $8$ KB",
            "D. $128$ KB and $6$ KB"
          ],
          "correct_answer": "A",
          "explanation": "For a direct-mapped cache, Tag field $= 4$ bits Index field $= 12$ bits Size of cache block $= 1$ Byte $=2^{0}$ Bytes So, Block Offset bits $= 0$ bit Now, for main memory size, Physical $($main memory$)$ address bits $=4+12+0 = 16$ bits So, main memory size $=2^{16}$ Bytes $=64\\;KB$ For cache memory size, Index $+$ block offset would give cache memory address. So, cache memory address bits $ = 12+0=12$ bits So, cache memory size $=2^{12}$ Bytes $=4 \\;KB$ We could also verify this using following: $Tag\\; field\\; bits = \\log(\\frac{MM \\;SIZE}{CM \\;SIZE})$ Main Memory Size $= 64\\;KB$ Cache Memory Size $=4\\;KB$ Answer : $\\mathbf{(A)}$",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Suppose a program is running on a non-pipelined single processor computer system. The computer is connected to an external device that can interrupt the processor asynchronously. The processor needs to execute the interrupt service routine (ISR) to serve this interrupt. The following steps (not necessarily in order) are taken by the processor when the interrupt arrives: Which ONE of the following is the CORRECT sequence of steps? $\\text{(iii), (i), (ii)}$ $\\text{(i), (iii), (ii)}$ $\\text{(i), (ii), (iii)}$ $\\text{(iii), (ii), (i)}$",
          "images": [],
          "options": [
            "A. The processor saves the content of the program counter.",
            "B. The program counter is loaded with the start address of the ISR.",
            "C. The processor finishes the present instruction."
          ],
          "correct_answer": "A",
          "explanation": "(A) 3, 1, 2 whatever interrupt comes, processor will complete execution of current instruction first. then, it'll save current PC value so that it can return to the program after serving the interrupt. then, it'll load start address of ISR in PC and serve the interrupt. Basic question on what processor does after receiving an interrupt.",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A partial data path of a processor is given in the figure, where $\\text{RA, RB,}$ and $\\text{RZ}$ are $32$-bit registers. Which option(s) is/are CORRECT related to arithmetic operations using the data path as shown?",
          "images": [
            {
              "index": 1,
              "filename": "460063_img1.jpg"
            }
          ],
          "options": [
            "A. The data path can implement arithmetic operations involving two registers.",
            "B. The data path can implement arithmetic operations involving one register and one immediate value.",
            "C. The data path can implement arithmetic operations involving two immediate values.",
            "D. The data path can only implement arithmetic operations involving one register and one immediate value."
          ],
          "correct_answer": "A;B;C",
          "explanation": "(A), (B) & (C) we can choose any input from 1 MUX. and we have different select lines for MUX A & MUX B. hence we can have both registers as input, 1 register 1 immediate value as input, or both immediate value as input. hence, there is no compulsion of 1 input as immediate value and other from register hence option D is false",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a memory system with $1 \\mathrm{M}$ bytes of main memory and $16 \\mathrm{~K}$ bytes of cache memory. Assume that the processor generates $20$-bit memory address, and the cache block size is $16$ bytes. If the cache uses direct mapping, how many bits will be required to store all the $\\operatorname{tag}$ values? [Assume memory is byte addressable, $1 \\mathrm{~K}=2^{10}$, $1 \\mathrm{M}=2^{20}$.] 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $6 \\times 2^{10}$",
            "B. $8 \\times 2^{10}$",
            "C. $2^{12}$",
            "D. $2^{14}$"
          ],
          "correct_answer": "A",
          "explanation": "Answer - (A)",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A processor has $64$ general-purpose registers and $50$ distinct instruction types. An instruction is encoded in $32$-bits. What is the maximum number of bits that can be used to store the immediate operand for the given instruction? $\\text{ADD R1}$, $\\#25$ / / $\\text{R 1=R 1+25}$ See all 3 Comments 3 3 Comments reply Krishnendu_Sengupta commented Feb 28, 2025 reply Follow flag While allocating 6 bits for opcodes, 6 for registers, will give 20 bits for the immediate operand, can we not use expanding opcodes scheme ( https://gateoverflow.in/2479/gate-cse-1994-question-3-2?show=14870#a14870 ) for maximizing the space for immediate operand for the ADD instruction specifically? I am thinking of a scheme like this: if leftmost_bit == 1: reg = bits[1:7] imm = bits[7:32] # execute add operator else: # handling other opcodes ... Is this a correct solution? This is giving 25 as maximum. 0 0 reply Share jacknroll commented Sep 13, 2025 reply Follow flag Not deserving for 2 marks. 2 2 reply Share pooja_singh 2 commented Nov 11, 2025 reply Follow flag Answer 20 bits,,, https://correctbrain.com/buy/ 5 5 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $16$",
            "B. $20$",
            "C. $22$",
            "D. $24$"
          ],
          "correct_answer": "B",
          "explanation": "(B) 20 we need 6 bits to represent registers we need 6 bits to represent opcode (we have 50 distinct types of instructions) we have 32 bits instruction [ OPCODE | REGISTER | VALUE] [ 6 | 6 | 32-(6+6) ] = 32 - 12 = 20 Maximum 20 bits can be used to store immediate operand.",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A computer has a memory hierarchy consisting of two-level cache $\\text{(L1}$ and $\\text{L2)}$ and a main memory. If the processor needs to access data from memory, it first looks into $\\text{L1}$ cache. If the data is not found in $\\text{L1}$ cache, it goes to $\\text{L2}$ cache. If it fails to get the data from $\\text{L2}$ cache, it goes to main memory, where the data is definitely available. Hit rates and access times of various memory units are shown in the figure. The average memory access time in nanoseconds $(n s)$ is ________. (rounded off to two decimal places)",
          "images": [
            {
              "index": 1,
              "filename": "460037_img1.jpg"
            }
          ],
          "options": [],
          "correct_answer": "11.83:11.87",
          "explanation": "Access time def: miss penalty def: Reference: From David A.Patterson, John L.Hennessy- Computer Organization and Design: The Hardware/Software Interface https://theswissbay.ch/pdf/Books/Computer%20science/Computer%20Organization%20and%20Design-%20The%20HW_SW%20Inteface%205th%20edition%20-%20David%20A.%20Patterson%20%26%20John%20L.%20Hennessy.pdf 5th edition,455 page -> Access time including cache miss penalty: From the above definitions we can understand that access time including cache miss penalty is the time to access a word/data by the processor after a request is made to that particular cache and the time to update the data in the higher level caches where data requested is a miss. Note: It is no where mentioned in the definition that the access time of a Li level cache also includes the access time of all the higher level caches Lj, where j = 1 to i-1. It clearly states the access time only includes the time from the request is made to that particular cache to the data is received by the processor. In the question it is mentioned hierarchical access -> Average memory access time: The generic formula for AMAT is Reference : From David A.Patterson, John L.Hennessy- Computer Architecture: A Quantitative Approach https://acs.pub.ro/~cpop/SMPA/Computer%20Architecture,%20Sixth%20Edition_%20A%20Quantitative%20Approach%20(%20PDFDrive%20).pdf 6th edition, page no 114 When we have two levels of memory in our system, the formula is Reference:From David A.Patterson, John L.Hennessy- Computer Architecture: A Quantitative Approach https://acs.pub.ro/~cpop/SMPA/Computer%20Architecture,%20Sixth%20Edition_%20A%20Quantitative%20Approach%20(%20PDFDrive%20).pdf 6th edition, page no 115 Correct solution: From the above references we can write the AMAT for 3 Level memory hierarchy. AMAT = H1*T1 + (1-H1)*H2*(T1 + T2) + (1-H1) *(1-H2)*(T1+T2+T3) = T1 + (1-H1)*T2 + (1-H1)*(1-H2)*T3 H1 = L1 cache Hit rate = 95% H2 = L2 cache Hit rate = 85% T1 = L1 cache access time = 10ns T2 = L2 cache access time including L1 cache miss penalty = 20ns T3 = Main memory access time including L1 and L2 cache miss penalty = 200ns So, If we apply this formula, then the following is the answer. AMAT = H1*T1 + (1-H1)*H2*(T1 + T2) + (1-H1) *(1-H2)*(T1+T2+T3) = T1 + (1-H1)*T2 + (1-H1)*(1-H2)*T3 So finally ⇒ .95*10 + 0.05*0.85*(10+20) + 0.05*0.15*(10+20+200) = 12.5 ns Which can also be written as ⇒ 10 + 0.05*20 + 0.05*0.15*200 = 12.5 ns How is the answer given in the key 11.83-11.87 coming? AMAT = H1*T1 + (1-H1)*H2* T2 + (1-H1) *(1-H2)*(T3) = 0.95*10 + 0.05*0.85*20+0.05*0.15*200 = 11.85 ns The answer may have been derived using the cases below, which do not align with the given question. Case1: Simultaneous access Here, if we clearly observe, T1 is not considered when we are reading data from L2 cache and T1 and T2 time is not considered when we are accessing Main memory. This might be true when we are considering a memory system with simultaneous access. But in this question, the memory system is hierarchical in nature, so when we are accessing L2 cache, we have already accessed L1 cache also. So, we definitely need to consider both T1 and T2 at L2 cache and T1, T2 and T3 when we are accessing main memory. The correct formula is provided on the previous page. Case 2: Access time includes lower level cache access times. It is possible that the assumption is that the L2 access time already includes the L1 access time, and that the main memory access time already includes both L1 and L2 access times. If this is the assumption that is made, then it is not specified in the question. From the standard definitions of access time, we cannot implicitly assume the access time of a Li level cache also includes the access time of all the higher level caches Lj, where j = 1 to i-1. So, this case will not be applicable. Previous similar GATE questions where the approach we provided is used to solve the question: https://gateoverflow.in/118371/gate-cse-2017-set-2-question-29 https://gateoverflow.in/2308/gate-cse-1993-question-11 If we see, the above two questions are also, mostly similar to this year's gate question. The following formula is only applied in both of the above two previous gate questions. AMAT = H1*T1 + (1-H1)*H2*(T1 + T2) + (1-H1) *(1-H2)*(T1+T2+T3) = T1 + (1-H1)*T2 + (1-H1)*(1-H2)*T3 in these way answer is 12.5",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "​​​Consider a computer with a $4 \\mathrm{MHz}$ processor. Its $\\text{DMA}$ controller can transfer $8$ bytes in $1$ cycle from a device to main memory through cycle stealing at regular intervals. Which one of the following is the data transfer rate (in bits per second) of the $\\text{DMA}$ controller if $1 \\%$ of the processor cycles are used for $\\text{DMA}$?",
          "images": [],
          "options": [
            "A. $2,56,000$",
            "B. $3,200$",
            "C. $25,60,000$",
            "D. $32,000$"
          ],
          "correct_answer": "C",
          "explanation": "C",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "​​​​​An instruction format has the following structure: Instruction Number: Opcode destination reg, source reg-$1$, source reg-$2$ Consider the following sequence of instructions to be executed in a pipelined processor: $\\text{I 1: DIV R3, R1, R2}$ $\\text{I 2: SUB R5, R3, R4}$ $\\text{I 3: ADD R3, R5, R6}$ $\\text{I 4: MUL R7, R3, R8}$ Which of the following statements is/are TRUE?",
          "images": [],
          "options": [
            "A. There is a RAW dependency on $\\text{R 3}$ between $\\text{I 1}$ and $\\text{I 2}$",
            "B. There is a WAR dependency on $\\text{R 3}$ between $\\text{I 1}$ and $\\text{I 3}$",
            "C. There is a RAW dependency on $\\text{R 3}$ between $\\text{I 2}$ and $\\text{I 3}$",
            "D. There is a WAW dependency on $\\text{R 3}$ between $\\text{I 3}$ and $\\text{I 4}$"
          ],
          "correct_answer": "A",
          "explanation": "Video Explanation: GATE CSE 2024 - RAW Dependency, WAW Dependency, WAR Dependency There is a RAW dependency on $R_3$ between $I_1$ and $I_2$. There is a RAW dependency on $R_5$ between $I_2$ and $I_3$. There is NO RAW dependency on $R_3$ between $I_2$ and $I_3$. There is a WAW dependency on $R_3$ between $I_1$ and $I_3$. So, answer will be: Only Option $A$ is correct. See HERE. Data Dependency Vs Data Hazards: https://youtu.be/uJkGMjP6hzE?feature=shared",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A processor with $16$ general purpose registers uses a $32$-bit instruction format. The instruction format consists of an opcode field, an addressing mode field, two register operand fields, and a $16$-bit scalar field. If $8$ addressing modes are to be supported, the maximum number of unique opcodes possible for every addressing mode is ___________.",
          "images": [],
          "options": [],
          "correct_answer": "32",
          "explanation": "Instruction size = 32 bits Given that no. of Registers = 16 So no. of bits needed to specify a register in instruction = 4 Given that no. of Addressing modes = 8 So no. of bits needed to specify an addressing mode in instruction = 3 No. of bits available for opcode = Instruction size - (Addressing mode field size + 2 * Register field size + Scalar field size) = 32 - (3 + 2*4 + 16) = 32 - 27 = 5 So maximum no. of unique opcodes possible = 2^5 = 32",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A non-pipelined instruction execution unit operating at $2 \\mathrm{GHz}$ takes an average of $6$ cycles to execute an instruction of a program $\\text{P}$. The unit is then redesigned to operate on a $5$ -stage pipeline at $2 \\mathrm{GHz}$. Assume that the ideal throughput of the pipelined unit is $1$ instruction per cycle. In the execution of program $\\text{P}$, $20 \\%$ instructions incur an average of $2$ cycles stall due to data hazards and $20 \\%$ instructions incur an average of $3$ cycles stall due to control hazards. The speedup (rounded off to one decimal place) obtained by the pipelined design over the non-pipelined design is ____________.",
          "images": [],
          "options": [],
          "correct_answer": "3",
          "explanation": "Non-pipelined Design: A non-pipelined instruction takes $6$ cycles to execute an instruction. Average CPI = $6$ Pipelined Design: It is given that, $20\\%$ of instructions incur $2$ cycles stall and $20\\%$ of instructions incur $3$ cycles stall. Average CPI $= 1 + (0.2*2) + (0.2*3) = 1+0.4+0.6 = 2$ Speedup = $\\frac{\\text{Avg CPI in NPL } * \\cancel{CycleTime_{NPL}}}{\\text{Avg CPI in PL } * \\cancel{CycleTime_{PL}}} = \\frac{\\text{6}}{\\text{2}} = 3$ Since, frequency of both design is same, cycle time will also be same. So, I cut off cycle time from numerator and denominator. Note: In pipelined design, 1 cycle is taken by ALL instructions but 20% of them are taking 2 Stall cycles, which means they are taking \"extra\" 2 cycles & similarly other 20% of them are taking Extra 3 cycles. 2.9 to 3.1 is a (Acc to Official Answer key)",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A processor uses a $32$-bit instruction format and supports byte-addressable memory access. The $\\text{ISA}$ of the processor has $150$ distinct instructions. The instructions are equally divided into two types, namely $\\text{R}$-type and $\\text{I}$-type, whose formats are shown below. R - type Instruction Format: \\begin{array}{|l|l|l|l|l|} \\hline OPCODE & UNUSED & DST Register & SRC Register1 & SRC Register 2 \\\\ \\hline \\end{array} I - type Instruction Format: \\begin{array}{|l|l|l|l|} \\hline OPCODE & DST Register & SRC Register & \\# Immediate value/address \\\\ \\hline \\end{array} In the $\\text{OPCODE}$, $1$ bit is used to distinguish between $\\text{I}$-type and $\\text{R}$-type instructions and the remaining bits indicate the operation. The processor has $50$ architectural registers, and all register fields in the instructions are of equal size. Let $\\text{X}$ be the number of bits used to encode the $\\text{UNUSED}$ field, $\\text{Y}$ be the number of bits used to encode the $\\text{OPCODE}$ field, and $\\text{Z}$ be the number of bits used to encode the immediate value/address field. The value of $\\text{X+2Y+Z}$ is __________.",
          "images": [],
          "options": [],
          "correct_answer": "34",
          "explanation": "Opcode field(Y): There are 150 instructions, and they are equally divided into two types. Therefore, there are 75 I-type instructions and 75 R-type instructions. Since one bit is used to distinguish between instruction types, the number of bits used to encode opcode field is Y = (1+7) = 8 Register field: There are 50 architectural registers and all register fields in the instructions are of equal size. Therefore, the number of bits used to encode register field is 6 Unused field(X): T he number of bits used to encode unused field in R-type instructions is X = 32 - (8 + 6 + 6 + 6) = 6 Immediate value/address field(Z): T he number of bits used to encode i mmediate value/address field in I -type instructions is Z = 32 - (8 + 6 + 6) = 12 Therefore, the values of X, Y, and Z are: X = 6 bits (UNUSED field) Y = 8 bits (OPCODE field) Z = 12 bits (immediate value/address field) So the answer is 6 + 2 * 8 + 12 = 34",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "​​​​Which one of the following statements is FALSE?",
          "images": [],
          "options": [
            "A. In the cycle stealing mode of DMA, one word of data is transferred between an I/O device and main memory in a stolen cycle",
            "B. For bulk data transfer, the burst mode of DMA has a higher throughput than the cycle stealing mode",
            "C. Programmed I/O mechanism has a better CPU utilization than the interrupt driven I/O mechanism",
            "D. The CPU can start executing an interrupt service routine faster with vectored interrupts than with non-vectored interrupts"
          ],
          "correct_answer": "C",
          "explanation": "A.In the cycle stealing mode of DMA, one word of data is transferred between an I/O device and main memory in a stolen cycle ans.True (as defination) B.For bulk data transfer, the burst mode of DMA has a higher throughput than the cycle stealing mode ans.True(as define, through as compared to bulk data, for burst mode through put will be equal to 1 as bulk of data will be transferd at once but with cycle stealing mode transfer will take more time and throughput will be less) C.Programmed I/O mechanism has a better CPU utilization than the interrupt driven I/O mechanism ans.False (Programmed i/o is like polling(can remeber to recall the concept) so to check wether there is i/o who need's cpu ,cpu has to do alot of work, but in interrupt driven i/o ,i/o has given preveleged to tell cpu that i need you by sending the interrupt so cpu in is more utilized in interrupt driven i/o) D.The CPU can start executing an interrupt service routine faster with vectored interrupts than with non-vectored interrupts ans.true (vectored interrupt mean's address of program which handles that interrupt is send with the interrupt itself where in non vectored interrupt it is not send so cpu has to run defualt service rountine to identify the address of that routine and then run that routing)",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a $5$-stage pipelined processor with Instruction Fetch (IF), Instruction Decode (ID), Execute (EX), Memory Access (MEM), and Register Writeback (WB) stages. Which of the following statements about forwarding is/are CORRECT?",
          "images": [],
          "options": [
            "A. In a pipelined execution, forwarding means the result from a source stage of an earlier instruction is passed on to the destination stage of a later instruction",
            "B. In forwarding, data from the output of the MEM stage can be passed on to the input of the EX stage of the next instruction",
            "C. Forwarding cannot prevent all pipeline stalls",
            "D. Forwarding does not require any extra hardware to retrieve the data from the pipeline stages"
          ],
          "correct_answer": "A;B;C",
          "explanation": "Let's analyze each statement about forwarding in the context of a pipelined processor with stages Instruction Fetch (IF), Instruction Decode (ID), Execute (EX), Memory Access (MEM), and Register Writeback (WB): 1. In a pipelined execution, forwarding means the result from a source stage of an earlier instruction is passed on to the destination stage of a later instruction: This statement is CORRECT. Forwarding (also known as bypassing) is a technique used to reduce data hazards by passing the result of an instruction directly to a subsequent instruction that needs it, without waiting for the result to be written back to the register file. 2. In forwarding, data from the output of the MEM stage can be passed on to the input of the EX stage of the next instruction: This statement is CORRECT. One common form of forwarding involves passing the output of the MEM stage (where the result of a load instruction might be available) directly to the EX stage of the next instruction that needs it. 3. Forwarding cannot prevent all pipeline stalls: This statement is CORRECT. Forwarding helps mitigate certain types of data hazards, particularly read-after-write (RAW) hazards, but it cannot eliminate all types of pipeline stalls. For example, hazards arising from control dependencies (branch instructions) or certain structural hazards might still cause stalls. 4. Forwarding does not require any extra hardware to retrieve the data from the pipeline stages: This statement is INCORRECT. Forwarding requires additional hardware, such as multiplexers and control logic, to select the appropriate data to be forwarded and to ensure that the data is correctly routed to the required pipeline stages. Therefore, the statements that are CORRECT are: A) In a pipelined execution, forwarding means the result from a source stage of an earlier instruction is passed on to the destination stage of a later instruction. B) In forwarding, data from the output of the MEM stage can be passed on to the input of the EX stage of the next instruction. C)Forwarding cannot prevent all pipeline stalls.",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "​​​​Consider two set-associative cache memory architectures: $\\text{WBC}$, which uses the write back policy, and $\\text{WTC}$, which uses the write through policy. Both of them use the $\\text{LRU}$ (Least Recently Used) block replacement policy. The cache memory is connected to the main memory. Which of the following statements is/are TRUE?",
          "images": [],
          "options": [
            "A. A read miss in $\\text{WBC}$ never evicts a dirty block",
            "B. A read miss in $\\text{WTC}$ never triggers a write back operation of a cache block to main memory",
            "C. A write hit in $\\text{WBC}$ can modify the value of the dirty bit of a cache block",
            "D. A write miss in $\\text{WTC}$ always writes the victim cache block to main memory before loading the missed block to the cache"
          ],
          "correct_answer": "B;C",
          "explanation": "The answer should be B,C A. False When we miss accessing data in the cache (either by reading or writing), we can choose whether or not to add that missed data into the cache. Sometimes, we might decide not to add it because the data already in the cache from another memory location is more useful or accessed more often. Source of above info: https://cs.stackexchange.com/questions/133352/what-is-a-cache-write-miss So, the statement is false because it says that a read miss in WBC \"never\" removes a dirty block, which is not always the case. Option D in GATE 2022 Question B. True In the write-through policy, data is always kept synchronized. Therefore, we never need to perform a \"write back\" operation to remove any entry from the cache. This makes the option correct because it states that \"never\" triggers a write-back. C. True A write hit in WBC can modify the value of the dirty bit of a cache block. If there's a write hit in WBC, it means we're writing directly into the cache. So, of course, we'll also change the dirty bit. D. False A write miss in WTC always writes the victim cache block to main memory before loading the missed block to the cache. There are two blocks mentioned: a missed block and a victim block. The missed block is the one we want to access, while the victim block is the one replaced by LRU. When there's a write miss in WTC, it means the data we're trying to write isn't in the cache. Now, we may want to load it into the cache, or we may not want to. Suppose we don't want to bring it into the cache; in that case, we can directly modify the main memory. However, if we decide to bring it into the cache, then we may or may not need to replace the victim block depending on cache is already full or not",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The baseline execution time of a program on a $2 \\mathrm{GHz}$ single core machine is $100$ nanoseconds ( $n s)$. The code corresponding to $90 \\%$ of the execution time can be fully parallelized. The overhead for using an additional core is $10 ~ns$ when running on a multicore system. Assume that all cores in the multicore system run their share of the parallelized code for an equal amount of time. The number of cores that minimize the execution time of the program is __________.",
          "images": [],
          "options": [],
          "correct_answer": "3",
          "explanation": "The code that cannot be parallelized runs for 10ns. For every additional core, additional 10ns overhead is added to total execution time, overhead for n cores is $(n-1)10$ns. The code that can be parallelized runs for 90ns on one core, it runs for $\\frac{90}{n}$ns on n cores. Let t(n) be the execution time, it is given by - $t(n) = 10 + (n-1)10 + \\frac{90}{n} = 10n + \\frac{90}{n}$ $t(1) = 100, t(2) = 65, t(3) = 60, t(4) = 62.5, t(5) = 68, ...$ Answer - 3",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A given program has $25 \\%$ load/store instructions. Suppose the ideal $\\text{CPI}$ (cycles per instruction) without any memory stalls is $2$. The program exhibits $2 \\%$ miss rate on instruction cache and $8 \\%$ miss rate on data cache. The miss penalty is $100$ cycles. The speedup (rounded off to two decimal places) achieved with a perfect cache (i.e., with NO data or instruction cache misses) is __________. See all 8 Comments 8 8 Comments reply Show 5 previous comments Victor Abhinav' commented Jan 21 i | +--------------------------------------+ | | 1. Useful Work 2. Wasted Work (Ideal CPI) (Memory Stalls) | | [ 2 Cycles ] +----------+------------+ | | A. Instruction Cache B. Data Cache (Happens 100% (Happens only for of the time) Load/Store: 25%) | | Miss Rate: 2% Miss Rate: 8% Penalty: 100 Penalty: 100 2 2 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "3",
          "explanation": "CPI with a Perfect Cache: $2$ CPI with the Actual Cache: 2 (ideally) + $0.02 \\times 100$ (stall cycles for instruction cache miss) + $0.25 \\times 0.08 \\times 100$ (stall cycles for data cache miss) = $6$ Speedup with a perfect cache = $6/2 = 3.$",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a $3$-stage pipelined processor having a delay of $10 \\mathrm{~ns}$ (nanoseconds), $20 \\mathrm{~ns}$, and $14 \\mathrm{~ns},$ for the first, second, and the third stages, respectively. Assume that there is no other delay and the processor does not suffer from any pipeline hazards. Also assume that one instruction is fetched every cycle. The total execution time for executing $100$ instructions on this processor is _____________ $\\mathrm{ns}.$",
          "images": [],
          "options": [],
          "correct_answer": "2040",
          "explanation": "Given, delays = $10 ns, 20ns, 14ns$ total instruction (n) = $100$ We take pipeline delay as $t_p = max(10, 20, 14) = 20$ number of stages ($k$) $ = 3$ So, Total execution time $ = (k + (n – 1)) \\times t_p$ $\\implies (3 + 100- 1) \\times 20 ns$ $\\implies 2040ns$",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A keyboard connected to a computer is used at a rate of $1$ keystroke per second. The computer system polls the keyboard every $10 \\mathrm{~ms}$ (milli seconds) to check for a keystroke and consumes $100\\; \\mu \\mathrm{s}$ (micro seconds) for each poll. If it is determined after polling that a key has been pressed, the system consumes an additional $200\\; \\mu \\mathrm{s}$ to process the keystroke. Let $T_{1}$ denote the fraction of a second spent in polling and processing a keystroke. In an alternative implementation, the system uses interrupts instead of polling. An interrupt is raised for every keystroke. It takes a total of $1 \\mathrm{~ms}$ for servicing an interrupt and processing a keystroke. Let $T_{2}$ denote the fraction of a second spent in servicing the interrupt and processing a keystroke. The ratio $\\dfrac{T_{1}}{T_{2}}$ is _____________. (Rounded off to one decimal place)",
          "images": [],
          "options": [],
          "correct_answer": "10.2",
          "explanation": "The answer Should be 10.2 1 Keystroke per second. Polling System (T1) CPU Polls (ask) keyboard every 10 ms and asks did you get any keystrokes.? Keyboard Answers “Yes” only once per second. In One second, the CPU Polls the Keyboard 100 times (1 Sec = 1000 ms, and the CPU polls every 10 ms). Time Spent in Polling = 100 * 100microsec = 10000 microseconds or 10 milesec. Time Spent in Processing the Keystroke (Only once per second) = 200microsec or 0.2 milisec. CPU’s Time wasted in Polling System = Time Spend in Polling + Time Spent in Processing = 10.2 ms Interrupt System (T2) CPU doesn’t ask Keyboard periodically about the keystroke, but Keyboard tells CPU via interrupt about a Keystroke. Whenever, there is a keystroke, Keyboard interrupts CPU. CPU Executes corresponding Interrupt Service Routine (ISR) which takes 1ms. Thats all. Speed Up of Interrupt over polling system (S) = T1/T2 = 10.2 ms / 1 ms = 10.2 Example: Let's consider Rubina is personal assistant of Pathaan; Pathaan assigns some tasks to Rubina. Now Pathaan is a very busy man and his every minute is very important. Pathaan needs the status of the work that he assigned to Rubina. Pathaan can take the status of the work in two ways: Using Polling System Using Interrupt System If Pathaan uses Polling System, Pathaan will keep asking Rubina about the status of the work every 10 ms. 100 microsec of Pathaan are wasted in talking to Rubina, but Rubina answers Yes only once a second, If Rubina answer Yes then Pathaan spends another 200 microsec to review the work done by Rubina. So in this case Pathaan waste 100*100 microsec in talking to Rubina (Because he calls her every 10 ms and spends 100 microsec in talking so in one sec he waste 100*100 Microsec). Rubina completes work only once per second (Means she answers Yes only once out of 100 times that Pathaan asks in 1 sec). If Rubina answer Yes, Pathaan spends another 200 microsec to review the work done by Rubina. So Total time wasted by Pathaan is 10 ms + 0.2 ms. Better approach will be : Pathaan Assign work to Rubina and sits back and wait for Rubina to tell him work is done. (Rubina Interrupts Pathaan). Rubina interrupts Pathaan once per second and Pathaan spends 1 ms in reviewing the work . (So Lots of time saved of Pathaan) So, We can say second approach is 10.2 times faster than first approach. Pathaan == CPU Rubina == Input/Output.",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the given $\\text{C}$-code and its corresponding assembly code, with a few operands $\\text{U1-U4}$ being unknown. Some useful information as well as the semantics of each unique assembly instruction is annotated as inline comments in the code. The memory is byte-addressable. //C-code int a[10], b[10], i; // int is 32 bit for(i=0; i<10; i++) a[i] = b[i] * 8; ;assembly code (; indicates comments) ;r1-r5 are 32-bit integer registers ;initialize r1=0, r2=10 ;initialize r3, r4 with base address of a, b L01: jeq r1, r2, end ;if(r1==r2) goto end L02: lw, r5, 0(r4) ;r5 <- Memory[r4+0] L03: shl, r5, r5, U1 ;r5 <- r5 << U1 L04: sw, r5, 0(r3) ;Memory[r3+0] <- r5 L05: add, r3, r3, U2 ;r3 <- r3+U2 L06: add, r4, r4, U3 L07: add, r1, r1, 1 L08: jmp U4 ;goto U4 L09: end Which one of the following options is a $\\text{CORRECT}$ replacement for operands in the position $\\text{(U1, U2, U3, U4)}$ in the above assembly code?",
          "images": [],
          "options": [
            "A. $(8,4,1, \\text{L02)}$",
            "B. $(3,4,4, \\text{L01)}$",
            "C. $(8,1,1, \\text{L02)}$",
            "D. $(3,1,1, \\text{L01)}$"
          ],
          "correct_answer": "B",
          "explanation": "To understand $u_1$, we must first find out what the register $r_5$ is storing. If you check closely the line $L_{02}$, it’s fetching an element from array $b$ and storing it in $r_5$. Line $L_{04}$ is storing the value present in $r_5$ to array $a$, so we’re definitely performing the multiplication by $8$ in $L_{03}$. $L_{03}$ is a shift-left operator. To multiply by $8$, how many bits (in binary) do we need to shift to left? If you can find out that number, that would be the answer to $u_1$. $L_{05}$ and $L_{06}$ are incrementing the values of registers $r_3$ and $r_5$ respectively to point to next element of $a$ and $b$ respectively. But by how much shall we increase it to make it point to next element? Suppose at some point in time, $r_3$ is storing $1000$ in decimal and pointing to 2 nd element of array $a$. Recall that each element is 4Bytes in size (given in question). Now, what is the address of 3 rd element of array $a$, can you guess? Yes, it would be $1004$. Hence, $4$ must be added. Note: Given memory is byte addressable. Each int takes $32 bit = 4B$, so we need to shift by 4 addresses. $u_4$ should be the line to make the loop repeat. Note that if we make it $L_{02}$, the loop termination condition is skipped and would lead to infinite loop (or unless we got trapped due to accessing illegal memory). The value of $u_1, u_2, u_3, u_4$ will be $3, 4, 4, L01$. Option B is the right answer.",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A $4$ kilobyte $\\text{(KB)}$ byte-addressable memory is realized using four $1 \\mathrm{~KB}$ memory blocks. Two input address lines $\\text{(IA4 and IA3)}$ are connected to the chip select $\\text{(CS)}$ port of these memory blocks through a decoder as shown in the figure. The remaining ten input address lines from $\\text{IA11-IA0}$ are connected to the address port of these blocks. The chip select $\\text{(CS)}$ is active high. The input memory addresses $\\text{(IA11-IA0)},$ in decimal, for the starting locations $\\text{(Addr = 0)}$ of each block (indicated as $\\text{X1, X2, X3, X4}$ in the figure) are among the options given below. Which one of the following options is $\\text{CORRECT}?$",
          "images": [
            {
              "index": 1,
              "filename": "399279_img1.png"
            }
          ],
          "options": [
            "A. $(0,1,2,3)$",
            "B. $(0,1024,2048,3072)$",
            "C. $(0,8,16,24)$",
            "D. $(0,0,0,0)$"
          ],
          "correct_answer": "C",
          "explanation": "A 4 KB memory is given. 4 KB = $2^{12}$, means we require 12 bits for its representation. But, 4 KB memory is implemented as four 1 KB memory blocks. Out of these 12 bits, 2 bits(I4 & I3) are connected to 2:4 Decoder. 4 output pins of decoder Q0, Q1, Q2, Q3 is connected to 4 chip select ports of X1, X2, X3 & X4 respectively. With 2-bits we can generate 4 different configurations, which are sufficient to uniquely identify the memory block. Q0, Q1, Q2, Q3 can be recognized by these corresponding values of I4 & I3 : I4 I3 O/p 0 0 Q0 0 1 Q1 1 0 Q2 1 1 Q3 Remaining 10 bits are connected to address port of these blocks. For starting location (Addr =0) we have to put all the bits from I0 – I11 as 0. I11 I10 I9 I8 I7 I6 I5 I4 I3 I2 I1 I0 Addr=0 Decimal Val. 0 0 0 0 0 0 0 0 0 0 0 0 X1 0 0 0 0 0 0 0 0 0 1 0 0 0 X2 8 0 0 0 0 0 0 0 1 0 0 0 0 X3 16 0 0 0 0 0 0 0 1 1 0 0 0 X4 24 As the input memory address is in decimal. So, Starting location (Addr = 0) for (X1, X2, X3, X4) are (0,8,16,24) . So, C.",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "An $8$-way set associative cache of size $64 \\mathrm{~KB} \\;(1 \\mathrm{~KB}=1024\\; \\text{bytes})$ is used in a system with $32$-bit address. The address is sub-divided into $\\text{TAG, INDEX},$ and $\\text{BLOCK OFFSET.}$ The number of bits in the $\\text{TAG}$ is ___________.",
          "images": [],
          "options": [],
          "correct_answer": "19",
          "explanation": "Given that for set associative mapping technique: Cache memory size $(CM’s)=64 KB=2^{16} $ bytes Main memory size $(MM’s)=32$ bits $P=8$way SAM Tag bit size (y) =? since block size is not given we assume it is $2^x$ byte. Number of cache block $(N)= \\frac{CM’s}{B’s}\\implies \\frac{2^16}{2^x}=2^{16-x}$ Number of sets $(S) = \\frac{N}{P}= \\frac{2^{16-x}}{2^3}=2^{13-x}$ as we know that for set associative mapping technique: $\\text{TAG+SLO+B’S=MM’s}$ $\\implies y+13-x+x=32$bits $\\implies y=32-13$ bits $\\implies y=19$ bits so the correct value of the tag size is $19$ bits.",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which one of the following facilitates transfer of bulk data from hard disk to main memory with the highest throughput?",
          "images": [],
          "options": [
            "A. $\\text{DMA}$ based $\\text{I/O}$ transfer",
            "B. Interrupt driven $\\text{I/O}$ transfer",
            "C. Polling based $\\text{I/O}$ transfer",
            "D. Programmed $\\text{I/O}$ transfer"
          ],
          "correct_answer": "A",
          "explanation": "ANSWER: A) DMA based I/O transfer In DMA (Direct Memory Access) mode, bulk amount of data is transferred from IO Device to Main Memory without the involvement of CPU. Whenever Prg Size > MM size, Virtual Memory is used with the help of Secondary Memory. Secondary memory is interfaced to system via DMA Module. So why highest throughput? This way, the CPU can keep working on other tasks while all the data is being moved. Think as if DMA is a super-fast moving truck that can transfer huge amounts of data from the hard drive to the computer's memory without needing the CPU to help it out. And because it can move more data in a shorter amount of time, it's like getting a lot more done in a shorter amount of time, that's why we call the “highest throughput” among other methods.",
          "year": 2022,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Let $\\text{WB}$ and $\\text{WT}$ be two set associative cache organizations that use $\\text{LRU}$ algorithm for cache block replacement. $\\text{WB}$ is a write back cache and $\\text{WT}$ is a write through cache. Which of the following statements is/are $\\text{FALSE}?$",
          "images": [],
          "options": [
            "A. Each cache block in $\\text{WB}$ and $\\text{WT}$ has a dirty bit.",
            "B. Every write hit in $\\text{WB}$ leads to a data transfer from cache to main memory.",
            "C. Eviction of a block from $\\text{WT}$ will not lead to data transfer from cache to main memory.",
            "D. A read miss in $\\text{WB}$ will never lead to eviction of a dirty block from $\\text{WB}.$"
          ],
          "correct_answer": "A;B;D",
          "explanation": "Option: A, B, D WB Cache: Updates to the cache block don’t result in Updates to the Main Memory immediately. Burst Writes are preferred for higher throughput and those needing higher write performance. WT Cache: Updates to the Cache block are reflected on Main Memory before carrying out other processes. Consistency is preferred. A WB must necessarily have a dirty bit to avoid redundant writes to Main Memory. Whereas a WT cache needn’t as the change is reflected after a write. False A WB cache’s primary use is to increase throughput or useful work. Multiple writes to the same cache block will not be reflected immediately, avoiding unnecessary data transfer time. False WT cache’s main goal is to prefer consistency overwrite performance, and a cache block is made to reflect the current main memory. True LRU doesn’t have specific replacement strategies for dirty and regular blocks. Hence a read miss might evict a dirty block. False",
          "year": 2022,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A cache memory that has a hit rate of $0.8$ has an access latency $10 \\; \\text{ns}$ and miss penalty $100 \\; \\text{ns}.$ An optimization is done on the cache to reduce the miss rate. However, the optimization results in an increase of cache access latency to $15 \\; \\text{ns},$ whereas the miss penalty is not affected. The minimum hit rate (rounded off to two decimal places) needed after the optimization such that it should not increase the average memory access time is _______________.",
          "images": [],
          "options": [],
          "correct_answer": "0.85",
          "explanation": "$\\text{For a given cache, Average memory access time can be computed as:}$ $\\text{AMAT} = \\text{HitTime} + \\text{Miss rate}*\\text{Miss Penalty}$ $\\text{Initially,}$ $\\text{Hit rate of cache} = 0.8$ $\\therefore \\text{Miss rate} = 0.2$ $\\text{Access Latency = HitTime} = 10\\,ns$ $\\text{Miss Penalty} = 100\\,ns$ $\\therefore \\text{AMAT}_{unoptimized} = 10 + 0.2(100) = 30\\,ns$ $\\text{For the optimized cache,}$ $\\text{Access Latency = HitTime} = 15\\,ns$ $\\therefore \\text{AMAT}_{optimized} = 15 + x(100)$ $\\text{Now,}$ $ \\text{AMAT}_{unoptimized} \\geqslant \\text{AMAT}_{optimized} $ $30 \\geqslant 15 + 100x$ $\\implies 15 \\geqslant 100x$ $\\implies 0.15 \\geqslant x$ $\\implies 0.85 \\leqslant 1-x$ $\\therefore \\text{The required hit rate} = (1-x) = 0.85$",
          "year": 2022,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a system with $2 \\;\\text{KB}$ direct mapped data cache with a block size of $64 \\; \\text{bytes}.$ The system has a physical address space of $64 \\; \\text{KB}$ and a word length of $16 \\; \\text{bits.}$ During the execution of a program, four data words $\\text{P, Q, R,}$ and $\\text{S}$ are accessed in that order $10$ times $\\text{(i.e., PQRSPQRS}\\dots).$ Hence, there are $40$ accesses to data cache altogether. Assume that the data cache is initially empty and no other data words are accessed by the program. The addresses of the first bytes of $\\text{P, Q, R,}$ and $\\text{S}$ are $\\text{0xA248, 0xC28A, 0xCA8A,}$ and $\\text{0xA262},$ respectively. For the execution of the above program, which of the following statements is/are $\\text{TRUE}$ with respect to the data cache?",
          "images": [],
          "options": [
            "A. Every access to $\\text{S}$ is a hit.",
            "B. Once $\\text{P}$ is brought to the cache it is never evicted.",
            "C. At the end of the execution only $\\text{R}$ and $\\text{S}$ reside in the cache.",
            "D. Every access to $\\text{R}$ evicts $\\text{Q}$ from the cache."
          ],
          "correct_answer": "A;B;D",
          "explanation": "Physical memory = 64KB ===> 16 bits required to represent Physical memory Cache memory = 2KB ===> 11 bits for cache memory Block size = 64 B = 32 words ===> 6 bits because of system is Byte addressable. Tag = 16-11 = 5 bits Cache index = 11-6 = 5 bits Block offset = 6 bits P = 0XA248 = 1010 0010 0100 1000 = $10100\\; \\color{red}{01001}\\; 001000$ ( Tag – cache index – Block offset ) Q = 0XC28A = 1100 0010 1000 1010 = $11000\\; \\color{red}{01010}\\; 001010$ R = 0XCA8A = 1100 1010 1000 1010 = $11001\\; \\color{red}{01010} \\;001010$ S=0XA262 = 1010 0010 0110 0010 = $10100\\; \\color{red}{01001} \\;100010$ Given that, Direct mapped cache, If we observe, P and S are belongs to same Block ( Tag and cache bits are same ). Therefore every access of S should result in a hit due to neither Q nor R competing for the same cache block and once P brought to the cache, it is never evicted. If we observe Q and R, those are competing for same cache block. So at the end R only present in the cache due to R is accessed at last. ( compaing to Q ) and every access to R evicts Q from the Cache. Therefore at the end, P,R and S in the Cache. Options A,B and D are true.",
          "year": 2022,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A processor $\\text{X}_{1}$ operating at $2 \\; \\text{GHz}$ has a standard $5-$stage $\\text{RISC}$ instruction pipeline having a base $\\text{CPI (cycles per instruction)}$ of one without any pipeline hazards. For a given program $\\text{P}$ that has $30 \\%$ branch instructions, control hazards incur $2$ cycles stall for every branch. A new version of the processor $\\text{X}_{2}$ operating at same clock frequency has an additional branch predictor unit $\\text{(BPU)}$ that completely eliminates stalls for correctly predicted branches. There is neither any savings nor any additional stalls for wrong predictions. There are no structural hazards and data hazards for $\\text{X}_{1}$ and $\\text{X}_{2}.$ If the $\\text{BPU}$ has a prediction accuracy of $80 \\%,$ the speed up $\\textit{(rounded off to two decimal places)}$ obtained by $\\text{X}_{2}$ over $\\text{X}_{1}$ in executing $\\text{P}$ is _______________.",
          "images": [],
          "options": [],
          "correct_answer": "1.42:1.45",
          "explanation": "Execution Time = No.of Instructions x Clocks per Instructions x Clock cylce time $Speedup = \\frac{\\text{Old system execution time}}{\\text{New system execution time}}$ When no.of Instructions and clock cycle time are same, then $Speedup = \\frac{\\text{Old system CPI}}{\\text{New system CPI}}$ Normal processor CPI = 1, without any pipeline hazards. Given that, Program P has 30% branch instructions where each instruction will lead to 2 stall cycles. Processor X1 has NO BPU, therefore CPI = $1+\\overset{\\text{branch instructions penalty}}{\\overbrace{(0.30*2)}}$ = 1.60 Processor X2 has BPU, therefore CPI = $1 + \\overset{\\text{branch instructions penalty}}{\\overbrace{(0.30* ({ \\underset{\\text{BPU correctly predicted}}{\\underbrace{0.80* 0}} \\;\\;\\;+ \\underset{\\text{BPU wrongly predicted}}{\\underbrace{0.2*2}} }) )}} $ = 1.12 $Speedup = \\frac{\\text{1.60}}{\\text{1.12}}=1.4285$",
          "year": 2022,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a set-associative cache of size $\\text{2KB (1KB} =2^{10}$ bytes$\\text{)}$ with cache block size of $64$ bytes. Assume that the cache is byte-addressable and a $32$ -bit address is used for accessing the cache. If the width of the tag field is $22$ bits, the associativity of the cache is _________",
          "images": [],
          "options": [],
          "correct_answer": "2 : 2",
          "explanation": "$32$ bit address is used for accessing the cache. It is given that cache is Set-Associative. The address bits get split as follows: Block Size $= 64 B \\implies$ Block offset $= 6\\; bits.$ Given that Tag field width $= 22\\; bits.$ Therefore, width of Set Index field $= 32-22-6 = 4 \\implies 2^4\\text{ = 16 sets in the cache.}$ Cache size is $2 KB$ and Block size $= 64 B$ $\\implies 2^5 \\text{ = 32 blocks present in the cache. }$ $16$ sets contain $32$ blocks $\\implies 2$ blocks per set or associativity $=2.$ $2$",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a computer system with $\\text{DMA}$ support. The $\\text{DMA}$ module is transferring one $8$-bit character in one $\\text{CPU}$ cycle from a device to memory through cycle stealing at regular intervals. Consider a $\\text{2 MHz}$ processor. If $0.5 \\%$ processor cycles are used for $\\text{DMA}$, the data transfer rate of the device is __________ bits per second.",
          "images": [],
          "options": [],
          "correct_answer": "80000 : 80000",
          "explanation": "Answer is $80,000$. To complete one cycle at $2$ MHz it will take $\\frac{1}{2\\times 10^6}$ seconds. So the total number of CPU cycles in one second will be $2 \\times 10^6$. Now $0.5 \\%$ of these cycles are taken by DMA to transfer the data. So total number of cycles taken to transfer the data will be $\\frac{0.5}{100} \\times 2 \\times 10^6 = 10,000$ and in each cycle $8$ bits are transferred. So, data transfer rate in bits per second $=8\\times 10000 = 80,000$.",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "​​​​​​Assume a two-level inclusive cache hierarchy, $L1$ and $L2$, where $L2$ is the larger of the two. Consider the following statements. $S_1$: Read misses in a write through $L1$ cache do not result in writebacks of dirty lines to the $L2$ $S_2$: Write allocate policy must be used in conjunction with write through caches and no-write allocate policy is used with writeback caches. Which of the following statements is correct?",
          "images": [],
          "options": [
            "A. $S_1$ is true and $S_2$ is false",
            "B. $S_1$ is false and $S_2$ is true",
            "C. $S_1$ is true and $S_2$ is true",
            "D. $S_1$ is false and $S_2$ is false"
          ],
          "correct_answer": "A",
          "explanation": "$S_1:$ Read Miss in a write through $L1$ cache results in read allocate. N o write back is done here, as in a write through $L1$ cache, both $L1$ and $L2$ caches are updated during a write operation (no dirty blocks and hence no dirty bits as in a write back cache). So during a Read miss it will simply bring in the missed block from $L2$ to $L1$ which may replace one block in $L1$ (this replaced block in $L1$ is already updated in $L2$ and so needs no write back). So, $S_1$ is TRUE. $S_2:$ This statement is FALSE. Both write-through and write-back policies can use either of these write-miss policies, but usually they are paired in this way. No write allocation during write through as $L1$ and $L2$ are accessed for each write operation (subsequent writes to same location gives no advantage even if the location is in $L1$ cache). In write back we can to do write allocate in $L1$ after a write operation hoping for subsequent writes to the same location which will then hit in $L1$ and thus avoiding a more expensive $L2$ access. Cache Writing Policies",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a pipelined processor with $5$ stages, $\\text{Instruction Fetch} (\\textsf{IF})$, $\\text{Instruction Decode} \\textsf{(ID)}$, $\\text{Execute } \\textsf{(EX)}$, $\\text{Memory Access } \\textsf{(MEM)}$, and $\\text{Write Back } \\textsf{(WB)}$. Each stage of the pipeline, except the $\\textsf{EX}$ stage, takes one cycle. Assume that the $\\textsf{ID}$ stage merely decodes the instruction and the register read is performed in the $\\textsf{EX}$ stage. The $\\textsf{EX}$ stage takes one cycle for $\\textsf{ADD}$ instruction and two cycles for $\\textsf{MUL}$ instruction. Ignore pipeline register latencies. Consider the following sequence of $8$ instructions: $$\\textsf{ADD, MUL, ADD, MUL, ADD, MUL, ADD, MUL}$$ Assume that every $\\textsf{MUL}$ instruction is data-dependent on the $\\textsf{ADD}$ instruction just before it and every $\\textsf{ADD}$ instruction (except the first $\\textsf{ADD}$) is data-dependent on the $\\textsf{MUL}$ instruction just before it. The $\\textit{speedup}$ defined as follows. $$\\textit{Speedup} = \\dfrac{\\text{Execution time without operand forwarding}}{\\text{Execution time with operand forearding}}$$ The $\\textit{Speedup} $ achieved in executing the given instruction sequence on the pipelined processor (rounded to $2$ decimal places) is _____________ ed Feb 1 reply Follow flag it seems as if split phase write back is assumed in some questions and not assumed in some questions. 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "1.87 : 1.88",
          "explanation": "$\\text{Speedup(def in question)}=\\cfrac{\\text{Time without Operand Forwarding}}{\\text{Time with Operand Forwarding}}$ Without Operand Forwarding: $\\tiny \\begin{array}{|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|}\\hline &1&2&3&4&5&6&7&8&9&10&11&12&13&14&15&16&17&18&19&20&21&22&23&24&25&26&27&28&29&30\\\\\\hline \\text{ADD}&\\text{IF}&\\text{ID}&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{MUL}&&\\text{IF}&\\text{ID}&&&\\text{EX}&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{ADD}&&&\\text{IF}&&&\\text{ID}&&&&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{MUL}&&&&&&\\text{IF}&&&&\\text{ID}&&&\\text{EX}&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{ADD}&&&&&&&&&&\\text{IF}&&&\\text{ID}&&&&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{MUL}&&&&&&&&&&&&&\\text{IF}&&&&\\text{ID}&&&\\text{EX}&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{ADD}&&&&&&&&&&&&&&&&&\\text{IF}&&&\\text{ID}&&&&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{MUL}&&&&&&&&&&&&&&&&&&&&\\text{IF}&&&&\\text{ID}&&&\\text{EX}&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\end{array}$ $\\text{Time taken without Operand Forwarding}=30$ With Operand Forwarding: $\\tiny \\begin{array}{|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|}\\hline &1&2&3&4&5&6&7&8&9&10&11&12&13&14&15&16\\\\\\hline \\text{ADD}&\\text{IF}&\\text{ID}&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{MUL}&&\\text{IF}&\\text{ID}&\\text{EX}&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{ADD}&&&\\text{IF}&\\text{ID}&&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{MUL}&&&&\\text{IF}&&\\text{ID}&\\text{EX}&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{ADD}&&&&&&\\text{IF}&\\text{ID}&&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{MUL}&&&&&&&\\text{IF}&&\\text{ID}&\\text{EX}&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{ADD}&&&&&&&&&\\text{IF}&\\text{ID}&&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\text{MUL}&&&&&&&&&&\\text{IF}&&\\text{ID}&\\text{EX}&\\text{EX}&\\text{MEM}&\\text{WB}\\\\\\hline \\end{array}$ $\\text{Time taken with Operand Forwarding }= 16$ $\\text{Speedup}=\\cfrac{\\text{Time without Operand Forwarding}}{\\text{Time with Operand Forwarding}}=\\cfrac{30}{16}=1.875$",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a computer system with a byte-addressable primary memory of size $2^{32}$ bytes. Assume the computer system has a direct-mapped cache of size $\\text{32 KB}$ ($\\text{1 KB}$ = $2^{10}$ bytes), and each cache block is of size $64$ bytes. The size of the tag field is __________ bits.",
          "images": [],
          "options": [],
          "correct_answer": "17 : 17",
          "explanation": "$\\text{Tag bits} = \\text{PAS}_{bits} – \\log_2 (\\text{Cache Size}) + \\log_2 (K)$ (where $K$ is associativity) $\\qquad = 32 - 15 + 0 = 17\\; \\text{bits}$",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A five-stage pipeline has stage delays of $150, 120, 150, 160$ and $140$ nanoseconds. The registers that are used between the pipeline stages have a delay of $5$ nanoseconds each. The total time to execute $100$ independent instructions on this pipeline, assuming there are no pipeline stalls, is _______ nanoseconds.",
          "images": [],
          "options": [],
          "correct_answer": "17160 : 17160",
          "explanation": "For the given pipelined system: Total number of stages $(k)=5$ Total number of instructions, $(n)=100$ Total delay ($t_p) = \\max(\\text{stage delay})+\\text{buffer delay}$ $\\implies t_p = \\max (150,120,150,160,140)+5\\;ns$ $\\implies t_p=160+5\\;ns$ $\\implies t_p =165\\;ns$ $ET_{p} = [(k+(n-1))*t_p]$ $\\implies ET_p= [(5+(100-1))*165]\\;ns$ $\\implies ET_p= (5+99)*165\\;ns$ $\\implies ET_{pipeline}=17160\\;ns$ $\\therefore$ To execute $100$ instructions in the given pipeline, $17160\\;ns$ time is required.",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following instruction sequence where registers $\\text{R1}, \\text{R2}$ and $\\text{R3}$ are general purpose and $\\text{MEMORY[X]}$ denotes the content at the memory location $\\text{X}.$ $\\begin{array}{llc} \\textbf{Instruction} & \\textbf{Semantics} & \\textbf{Instruction Size} \\text{ (bytes)} \\\\ \\hline \\text{MOV } \\text{R1}, (5000) & \\text{R1} \\leftarrow \\text{MEMORY}[5000] & 4 \\\\ \\hline \\text{MOV } \\text{R2}, (\\text{R3}) & \\text{R2} \\leftarrow \\text{MEMORY[R3]} & 4 \\\\ \\hline \\text{ADD} \\text{R2}, \\text{R1} & \\text{R2} \\leftarrow \\text{R1} + \\text{R2} & 2 \\\\ \\hline \\text{MOV } (\\text{R3}), \\text{R2} & \\text{MEMORY[R3]} \\leftarrow \\text{R2} & 4 \\\\ \\hline \\text{INC } \\text{R3} & \\text{R3} \\leftarrow \\text{R3}+1 & 2 \\\\ \\hline \\text{DEC } \\text{R1} & \\text{R1} \\leftarrow \\text{R1}-1 & 2 \\\\ \\hline \\text{BNZ } 1004 & \\text{Branch if not zero to the} & 2 \\\\ & \\text{given absolute address}& \\\\ \\hline \\text{HALT} & \\text{Stop} & 1 \\\\ \\hline \\end{array}$ Assume that the content of the memory location $5000$ is $10$, and the content of the register $\\text{R3}$ is $3000$. The content of each of the memory locations from $3000$ to $3020$ is $50$. The instruction sequence starts from the memory location $1000$. All the numbers are in decimal format. Assume that the memory is byte addressable. After the execution of the program, the content of memory location $3010$ is ____________",
          "images": [],
          "options": [],
          "correct_answer": "50 : 50",
          "explanation": "The given code is iterating 10 times and incrementing the contents of locations $3000$ to $3000+i$ by $10-i,$ for $i < 10.$ Location $3010$ is left untouched. So, $50.$",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following statements. Which of the above statements is/are TRUE? Ⅰ and Ⅱ only Ⅰ and Ⅳ only Ⅰ and Ⅲ only Ⅲ only",
          "images": [],
          "options": [
            "A. Daisy chaining is used to assign priorities in attending interrupts.",
            "B. When a device raises a vectored interrupt, the CPU does polling to identify the source of interrupt.",
            "C. In polling, the CPU periodically checks the status bits to know if any device needs its attention.",
            "D. During DMA, both the CPU and DMA controller can be bus masters at the same time."
          ],
          "correct_answer": "C",
          "explanation": "Answer : C I is true The daisy - chaining method of establishing priority consists of a serial connection of all devices that request an interrupt. The device with the highest priority is placed in the first position, followed by lower- priority devices up to the device with the lowest priority , which is placed last in the chain . II. is false Vectored interrupts are achieved by assigning each interrupting device a unique code, typically four to eight bits in length. When a device interrupts, it sends its unique code over the data bus to the processor, telling the processor which interrupt service routine to execute. III. is true The process of periodically checking status bits to see if it is time for the next I/O operation, is called polling . Polling is the simplest way for an I/O device to communicate with the processor the processor. IV. is false Since CPU release bus only after getting request from DMA and get after DMA release the BUS.",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following data path diagram. Consider an instruction: $R0 \\leftarrow R1 +R2$. The following steps are used to execute it over the given data path. Assume that PC is incremented appropriately. The subscripts $r$ and $w$ indicate read and write operations, respectively. Which one of the following is the correct order of execution of the above steps? $2,1,4,5,3$ $1,2,4,3,5$ $3,5,2,1,4$ $3,5,1,2,4$",
          "images": [
            {
              "index": 1,
              "filename": "333227_img1.jpg"
            }
          ],
          "options": [
            "A. $R2_{r},\\text{ TEMP1}_{r},ALU_{\\text{add}}, \\text{ TEMP2}_{w}$",
            "B. $R1_{r},\\text{ TEMP1}_{w}$",
            "C. $PC_{r}, \\text{ MAR}_{w}, \\text{ MEM}_{r}$",
            "D. $\\text{ TEMP2}_{r}, \\text{ R0}_{w}$",
            "E. $\\text{ MDR}_{r}, \\text{ IR}_{w}$"
          ],
          "correct_answer": "C",
          "explanation": "$3^{rd}$ followed by $5^{th}$ are Instruction fetch cycle micro operations and can be elaborated as follows: $t_{1}:\\text{MAR}_{w}\\leftarrow \\text{PC}_{r}$ $t_{2}:\\text{MDR}_{w}\\leftarrow \\text{Memory}_{r}\\mid \\text{PC}\\leftarrow \\text{PC}+1$ $t_{3}:\\text{IR}_{w}\\leftarrow \\text{MDR}_{r}$ Now we need to perform Execute cycle micro operations. Just observe the figure and it will be very easy to identify the sequence between $1^{st},2^{nd},4^{th}$ $2^{nd}$ is clearly stating that we need to move $\\text{R1}$ content to some temporary register named as $\\text{TEMP1}$ and it is very clear that before performing $\\text{ALU}$ operation we need the content in $\\text{TEMP1}.$ Hence $2^{nd}$ will be performed next after $5^{th}.$ $\\text{TEMP1}_{w}\\leftarrow \\text{R1}_{r}$ Now we can perform ALU operation and can take second operand directly from $R2$ and the figure clearly shows us that we need to put the result of ALU back into $\\text{TEMP2}.$ All these steps are performed in $1^{st}.$ So $1^{st}$ will be next. $\\text{TEMP2}_{w}\\leftarrow \\text{TEMP1}_{r}\\ +_{\\text{ALU}_{add}}\\ \\text{R2}_{r}$ Lastly we need to put the result present in $\\text{TEMP2}$ into $\\text{R0}.$ This step is performed by $4^{th}.$ $\\text{R0}_{w}\\leftarrow \\text{TEMP2}_{r}$ Correct Answer $(C): 3,5,2,1,4$",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A direct mapped cache memory of $1$ MB has a block size of $256$ bytes. The cache has an access time of $3$ ns and a hit rate of $94 \\%$. During a cache miss, it takes $2$0 ns to bring the first word of a block from the main memory, while each subsequent word takes $5$ ns. The word size is $64$ bits. The average memory access time in ns (round off to $1$ decimal place) is______.",
          "images": [],
          "options": [
            "A. Multiply Access Time(L1) with Hit Rate(L1)",
            "B. Do not compensate by adding Access Time(L1) in Miss Penalty as defined by Hamacher."
          ],
          "correct_answer": "13.3:13.3;13.5:13.5",
          "explanation": "Block size is 256 Bytes,word size is 64 bits or 8 bytes. So Block size in words is 8 words. Number of words per block=32 Time to fetch a word from main-memory to cache is: $20+31 \\times 5=175$ns because first word takes 20ns and rest each subsequent words take 5ns each. So average Memory acces time is $0.94(3)+0.06(3+175)=13.5$ ns",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A computer system with a word length of $32$ bits has a $16$ MB byte- addressable main memory and a $64$ KB, $4$-way set associative cache memory with a block size of $256$ bytes. Consider the following four physical addresses represented in hexadecimal notation. $A1= \\textsf{0x42C8A4}$, $A2= \\textsf{0x546888}$, $A3= \\textsf{0x6A289C}$, $A4=\\textsf{0x5E4880}$ Which one of the following is TRUE?",
          "images": [],
          "options": [
            "A. $A1$ and $A4$ are mapped to different cache sets.",
            "B. $A2$ and $A3$ are mapped to the same cache set.",
            "C. $A3$ and $A4$ are mapped to the same cache set.",
            "D. $A1$ and $A3$ are mapped to the same cache set."
          ],
          "correct_answer": "B",
          "explanation": "Block size is 256 Bytes. Number of sets in cache = $2^6$ so Set offset bits=6 and word offset bits=8. So check for set, check for the rightmost 4 digits of each physical address.(Last two byte denote the word address) A1= C8 A4 = C8 = 11 001000 A2= 68 88 = 68 = 01 101000 A3= 28 9C = 28 = 00 101000 A4= 48 80 = 48 = 010 01000 Now look for lowest order 6 bits in the highlighted part of Each physical address(corresponds to set number). 8 and 8 match and 6=01 10 and 2=00 10 two low order bits of 6 and 2 match,So A2 and A3 go to same set. So answer-B",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a non-pipelined processor operating at $2.5$ GHz. It takes $5$ clock cycles to complete an instruction. You are going to make a $5$- stage pipeline out of this processor. Overheads associated with pipelining force you to operate the pipelined processor at $2$ GHz. In a given program, assume that $30\\%$ are memory instructions, $60 \\%$ are ALU instructions and the rest are branch instructions. $5 \\%$ of the memory instructions cause stalls of $50$ clock cycles each due to cache misses and $50 \\%$ of the branch instructions cause stalls of $2$ cycles each. Assume that there are no stalls associated with the execution of ALU instructions. For this program, the speedup achieved by the pipelined processor over the non-pipelined processor (round off to $2$ decimal places) is_____________.",
          "images": [],
          "options": [],
          "correct_answer": "2.15:2.18",
          "explanation": "Time taken by non-pipelined processor to finish executing the $n$ instructions $: \\frac{5n}{2.5}=2n\\;\\text{ns}$ Now, for pipelined processor, $\\small \\begin{array}{|c|c |c| c|} \\hline \\text{Instruction type} & \\text{Number of such instructions} & \\% \\text{Causing stalls} & \\text{Number of stall cycles} \\\\\\hline \\text{Memory} & 0.3n & 5\\% \\;\\text{of}\\; 0.3n & 50 \\\\\\hline \\text{ALU} & 0.6n & \\text{None} & 0 \\\\\\hline \\text{Branch} & 0.1n & 50\\% \\;\\text{of}\\;0.1n & 2 \\\\\\hline \\end{array}$ Therefore, time taken by pipelined processor: $0.6n(1) + 0.3n[0.05(1+50) + 0.95(1)] + 0.1n[0.5(1+2) + 0.5(1)]$ cycles $= 1.85n$ cycles $= \\frac{1.85n}{2}\\;\\text{ns}$ $= 0.925n\\;\\text{ns}$ Speedup $= \\frac{2n}{0.925n} = 2.162 \\approx 2.16.$",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A processor has $64$ registers and uses $16$-bit instruction format. It has two types of instructions: I-type and R-type. Each I-type instruction contains an opcode, a register name, and a $4$-bit immediate value. Each R-type instruction contains an opcode and two register names. If there are $8$ distinct I-type opcodes, then the maximum number of distinct R-type opcodes is _______.",
          "images": [],
          "options": [],
          "correct_answer": "14",
          "explanation": "Instruction Length: $16$ bits To distinguish among $64$ registers, we need $\\log_2(64) = 6$ bits I-type instruction format: $\\begin{array} {|c|c|c|} \\hline \\text{Opcode} & \\text{Register} & \\text{Immediate Value} \\\\\\hline \\end{array}$ R-type instruction format: $\\begin{array} {|c|c|c|} \\hline \\text{Opcode} & \\text{Register} & \\text{Register} \\\\\\hline \\end{array}$ Maximum possible encodings $= 2^{16}$ It is given that there are $8$ I-type instructions. Let's assume the maximum R-type instructions to be $x$. Therefore, $(8\\times 2^{6} \\times 2^{4}) + (x \\times 2^6 \\times 2^6) = 2^{16}$ $\\implies x = 16-2 = 14$",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A certain processor uses a fully associative cache of size $16$ kB, The cache block size is $16$ bytes. Assume that the main memory is byte addressable and uses a $32$-bit address. How many bits are required for the Tag and the Index fields respectively in the addresses generated by the processor?",
          "images": [],
          "options": [
            "A. $24$ bits and $0$ bits",
            "B. $28$ bits and $4$ bits",
            "C. $24$ bits and $4$ bits",
            "D. $28$ bits and $0$ bits"
          ],
          "correct_answer": "D",
          "explanation": "Given that cache is Fully Associative. $$\\begin{array}{|c|c|} \\hline \\textbf{Tag Bits}&\\textbf{Block Offset}\\\\ \\hline 28 & 4\\\\ \\hline \\end{array}$$ There are no index bits in fully associative cache because every main memory block can go to any location in the cache $\\implies$ Index bits $= 0.$ Given that memory is byte addressable and uses $32$-bit address. Cache Block size is $16$ Bytes $\\implies$ Number of bits required for Block Offset $=⌈\\log_216⌉ = 4 \\text{ bits}$ $\\therefore $ Number of Tag bits $= 32 - 4 = 28.$ Answer is (D).",
          "year": 2019,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The chip select logic for a certain DRAM chip in a memory system design is shown below. Assume that the memory system has $16$ address lines denoted by $A_{15}$ to $A_0$. What is the range of address (in hexadecimal) of the memory system that can get enabled by the chip select (CS) signal?",
          "images": [
            {
              "index": 1,
              "filename": "302846_img1.png"
            }
          ],
          "options": [
            "A. C800 to CFFF",
            "B. CA00 to CAFF",
            "C. C800 to C8FF",
            "D. DA00 to DFFF"
          ],
          "correct_answer": "A",
          "explanation": "$(A_{15} \\: A_{14} \\: A_{13} \\: A_{12} \\: A_{11} \\: A_{10} \\: A_9 \\: A_ 8 \\: A_7 \\: A_6 \\: A_5 \\: A_4 \\: A_3 \\: A_2 \\: A_1 \\: A_0)$ According to question: $A_{15} = 1, \\: A_{14} = 1, \\: A_{13} = 0, \\: A_{12} = 0, \\: A_{11} = 1$ So the possible range in binary: $(\\bf{1 1 0 0 1}$$ 0 0 0 0 0 0 0 0 0 0 0) \\text{ to } (\\bf{1 1 0 0 1}$$ 1 1 1 1 1 1 1 1 1 1 1)$ Converting to Hexadecimal: $(C800) \\text{ to } (CFFF)$ Option A.",
          "year": 2019,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A certain processor deploys a single-level cache. The cache block size is $8$ words and the word size is $4$ bytes. The memory system uses a $60$-MHz clock. To service a cache miss, the memory controller first takes $1$ cycle to accept the starting address of the block, it then takes $3$ cycles to fetch all the eight words of the block, and finally transmits the words of the requested block at the rate of $1$ word per cycle. The maximum bandwidth for the memory system when the program running on the processor issues a series of read operations is ______$\\times 10^6$ bytes/sec.",
          "images": [],
          "options": [],
          "correct_answer": "160",
          "explanation": "Time to transfer a cache block $ = 1+3+8 = 12$ cycles. i.e., $4$ bytes $\\times 8 = 32$ bytes in $12$ cycles. So, memory bandwidth $ = \\frac{32}{12 \\text{ cycle time}} =\\frac{32}{12/(60 \\times 10^6)}= 160 \\times 10^6 $ bytes/s",
          "year": 2019,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A processor has $16$ integer registers $\\text{(R0, R1}, \\ldots ,\\text{ R15)}$ and $64$ floating point registers $\\text{(F0, F1}, \\ldots , \\text{F63)}.$ It uses a $2\\text{- byte}$ instruction format. There are four categories of instructions: $\\text{Type-1, Type-2, Type-3},$ and $\\text{Type-4. Type-1}$ category consists of four instructions, each with $3$ integer register operands $\\text{(3Rs). Type-2}$ category consists of eight instructions, each with $2$ floating point register operands $\\text{(2Fs). Type-3}$ category consists of fourteen instructions, each with one integer register operand and one floating point register operand $\\text{(1R+1F). Type-4}$ category consists of $\\text{N}$ instructions, each with a floating point register operand $\\text{(1F)}.$ The maximum value of $\\text{N}$ is _________. ed Jan 9 reply Follow flag https://www.youtube.com/watch?v=CRhOeYkFGFw 2 2 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "32",
          "explanation": "We have $\\text{2-byte}$ instruction format. So, total number of instruction encodings $=2^{16}$ PS: This is not the number of different instructions but different encodings; a single instruction can have different encodings when the address part differs. No. of bits taken by an integer operand $(16$ possible integer registers$) =\\log_2 16 = 4.$ No. of bits taken by a floating point operand $(64$ possible floating point registers$) =\\log_2 64 = 6.$ No. of encodings consumed by Type $1$ instructions $=4 \\times 2^{3 \\times 4} = 2^{14}.$ No. of encodings consumed by Type $2$ instructions $=8 \\times 2^{2 \\times 6} = 2^{15}.$ No. of encodings consumed by Type $3$ instructions $=14 \\times 2^{(4+6)} = 14336.$ No. of encodings left for Type $4 =2^{16} - (2^{14}+2^{15}+14336) = 2048.$ No. of different instructions of Type $4 = \\frac{2048}{64} = 32.$",
          "year": 2018,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The instruction pipeline of a RISC processor has the following stages: Instruction Fetch $(IF)$, Instruction Decode $(ID)$, Operand Fetch $(OF)$, Perform Operation $(PO)$ and Writeback $(WB)$, The $IF$, $ID$, $OF$ and $WB$ stages take $1$ clock cycle each for every instruction. Consider a sequence of $100$ instructions. In the $PO$ stage, $40$ instructions take $3$ clock cycles each, $35$ instructions take $2$ clock cycles each, and the remaining $25$ instructions take $1$ clock cycle each. Assume that there are no data hazards and no control hazards. The number of clock cycles required for completion of execution of the sequence of instruction is _____.",
          "images": [],
          "options": [],
          "correct_answer": "219",
          "explanation": "Total Instruction $= 100$ Number of stages $= 5$ In normal case total cycles $= 100 +5 -1 = 104$ cycles Now, For PO stage $40$ instructions take $3$ cycles, $35$ take $2$ cycles and rest of the $25$ take $1$ cycle. That means all other stages are perfectly fine and working with $CPI$ (Clock Cycle Per Instruction)$ = 1$ PO stage: $40$ instructions take $3$ cycles i.e. these instructions are suffering from $2$ stall cycle, $35$ instructions take $2$ cycles i.e. these instructions are suffering from $1$ stall cycle, $25$ instructions take $1$ cycles i.e. these instructions are suffering from $0$ stall cycle, So, extra cycle would be $40*2 + 35*1 + 25*0 = 80+35 = 115$ cycle. Total cycles = $104 + 115 = 219$",
          "year": 2018,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The size of the physical address space of a processor is $2^P$ bytes. The word length is $2^W$ bytes. The capacity of cache memory is $2^N$ bytes. The size of each cache block is $2^M$ words. For a $K$-way set-associative cache memory, the length (in number of bits) of the tag field is",
          "images": [],
          "options": [
            "A. $P-N- \\log_2K$",
            "B. $P-N+ \\log_2 K$",
            "C. $P-N-M-W- \\log_2 K$",
            "D. $P-N-M-W+ \\log_2 K$"
          ],
          "correct_answer": "B",
          "explanation": "$\\text{Physical Address Space} =2^P$ Bytes i.e. $P$ bits to represent size of total memory. $\\text{Cache Size} = 2^N$ Byte i.e., $N$ bits to represent Cache memory. $\\text{Tag size} = 2^X$ Bytes i.e., $X$ bits to represent Tag. Cache is $K-$ way associative. $\\text{(Size of Tag)} \\times \\frac{\\text{Cache Size}}{K} = \\text{Total Memory Size}$ $\\implies 2^X \\times \\frac{2^N}{K} = 2^P $ $\\implies 2^{X+N-\\log(K)} = 2^P $ $\\implies 2^{X} = 2^{P-N+\\log(K)} $ $\\implies X (\\text{Size of Tag in bits}) = P - N + \\log(K)$ $B$",
          "year": 2018,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A $32\\text{-bit}$ wide main memory unit with a capacity of $1\\;\\textsf{GB}$ is built using $256\\textsf{M} \\times 4\\text{-bit}$ DRAM chips. The number of rows of memory cells in the DRAM chip is $2^{14}$. The time taken to perform one refresh operation is $50\\;\\text{nanoseconds}$. The refresh period is $2\\;\\text{milliseconds.}$ The percentage (rounded to the closest integer) of the time available for performing the memory read/write operations in the main memory unit is _________.",
          "images": [],
          "options": [],
          "correct_answer": "59 : 60",
          "explanation": "One refresh operation takes $50\\;\\text{ns}$. Total number of rows $= 2^{14}$ Total time to refresh all Rows $= 2^{14}\\times 50\\; \\text{ns} = 819200 \\;\\text{ns} = 0.819200\\;\\text{ms}$ The Refresh Period is $2\\;\\text{ms}.$ $\\%$ Time spent in refresh $= \\frac{\\text{Total time to Refresh all Rows}}{\\text{Refresh period}}\\ast 100 $ $= \\frac{0.8192\\;\\text{ms}}{2.0\\;\\text{ms}}\\ast 100 = 40.96\\%$ $\\%$ Time spent in Read/Write $= 100 - 40.96 = 59.04\\%$ $= 59\\%$ (Rounded to the closest Integer) Reference: https://en.wikipedia.org/wiki/Memory_refresh",
          "year": 2018,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following processor design characteristics: Which of the characteristics above are used in the design of a RISC processor? I and II only II and III only I and III only I, II and III ed Aug 17, 2025 reply Follow flag Why RISC → Hardwired CU RISC instructions are few, simple, and fixed-length. Decoding them requires less hardware complexity. So a hardwired CU is sufficient and gives speed advantage. By contrast: CISC instructions are many, variable-length, complex. A microprogrammed CU is better for handling that complexity. RISC → Hardwired control (fast, simple, less flexible). CISC → Microprogrammed control (slower, flexible, supports complex instructions). 2 2 reply Share jayanttarane834 commented Dec 23, 2025 reply Follow flag cisc in not register to register its register to memory and memory to register..... 1 1 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Register-to-register arithmetic operations only",
            "B. Fixed-length instruction format",
            "C. Hardwired control unit"
          ],
          "correct_answer": "D",
          "explanation": "(D) All of these Hardwired control units are implemented through use of combinational logic units, featuring a finite number of gates that can generate specific results based on the instructions that were used to invoke those responses. Their design uses a fixed architecture —it requires changes in the wiring if the instruction set is modified or changed. This architecture is preferred in reduced instruction set computers (RISC) as they use a simpler instruction set. Instructions length cannot vary in RISC usually it's $32$ bit. For CISC it can be between $16$ to $64$ bits. The hardwired control unit is used when instructions are fixed. Register to register operations is always possible in RISC. CISC can have memory to memory instructions also. References: https://www-cs-faculty.stanford.edu/~eroberts/courses/soco/projects/2000-01/risc/risccisc/ https://en.wikipedia.org/wiki/Control_unit#Hardwired_control_unit",
          "year": 2018,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A cache memory unit with capacity of $N$ words and block size of $B$ words is to be designed. If it is designed as a direct mapped cache, the length of the $\\textsf{TAG}$ field is $10$ bits. If the cache unit is now designed as a $16$-way set-associative cache, the length of the $\\textsf{TAG}$ field is ____________ bits.",
          "images": [],
          "options": [],
          "correct_answer": "14",
          "explanation": "In set-associative 1 set = 16 lines . So the number of index bits will be $4$ less than the direct mapped case. So, Tag bits increased to $14$ bits.",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a $2$-way set associative cache with $256$ blocks and uses $\\text{LRU}$ replacement. Initially the cache is empty. Conflict misses are those misses which occur due to the contention of multiple blocks for the same cache set. Compulsory misses occur due to first time access to the block. The following sequence of access to memory blocks : $\\big \\{0,128,256,128,0,128,256,128,1,129,257,129,1,129,257,129 \\big \\}$ is repeated $10$ times. The number of conflict misses experienced by the cache is _________ .",
          "images": [],
          "options": [],
          "correct_answer": "76",
          "explanation": "$\\{0,128,256,128,0,128,256,128,1,129,257,129,1,129,257,129\\}$ 1$^{\\text{st}}$ Iteration: For $\\left \\{ 0,128,256,128,0,128,256,128 \\right \\}$ \\begin{array}{|l|c|l|} \\hline \\textbf {Block ID} \\ & \\textbf{Type} & \\textbf{Set 0 content } \\\\\\hline \\text{0} & \\text{Compulsory Miss} & \\text{0} \\\\\\hline\\text{128} & \\text{Compulsory Miss} & \\text{0 128} \\\\\\hline \\text{256} & \\text{Compulsory Miss} & \\text{128 256}\\\\\\hline \\text{128} & \\text{Hit} & \\text{256 128} \\\\\\hline \\text{0} & \\text{Conflict miss} & \\text{128 0} \\\\\\hline \\text{128} & \\text{Hit} & \\text{0 128} \\\\\\hline \\text{256} & \\text{Conflict miss} & \\text{128 256} \\\\\\hline \\text{128} & \\text{Hit} & \\text{256 128} \\\\\\hline \\end{array} Total number of conflict misses $=2$; Similarly for $\\left \\{ 1,129,257,129,1,129,257,129 \\right \\}$, total number of conflict misses in $\\text{set1} = 2$ Total number of conflict misses in $1^{\\text{st}}$ iteration $= 2+2=4$ $2^{\\text{nd}}$ iteration: for $\\left \\{ 0,128,256,128,0,128,256,128 \\right \\}$ \\begin{array}{|l|c|l|} \\hline \\textbf {Block ID} \\ & \\textbf{Type} & \\textbf{Set 0 content } \\\\\\hline \\text{0} & \\text{Conflict Miss} & \\text{128 0} \\\\\\hline\\text{128} & \\text{Hit} & \\text{0 128} \\\\\\hline \\text{256} & \\text{Conflict miss} & \\text{128 256}\\\\\\hline \\text{128} & \\text{Hit} & \\text{256 128} \\\\\\hline \\text{0} & \\text{Conflict miss} & \\text{128 0} \\\\\\hline \\text{128} & \\text{Hit} & \\text{0 128} \\\\\\hline \\text{256} & \\text{Conflict miss} & \\text{128 256} \\\\\\hline \\text{128} & \\text{Hit} & \\text{256 128} \\\\\\hline \\end{array} Total number of conflict misses $= 4$. Similarly for $\\{1,129,257,129,1,129,257,129\\}$, total number of conflict misses in $\\text{set1} = 4$ Total Number of conflict misses in $2^{\\text{nd}}$ iteration $= 4+4=8$ Note that content of each set is same, before and after $2^{\\text{nd}}$ iteration. Therefore each of the remaining iterations will also have $8$ conflict misses. Therefore, overall conflict misses $= 4+8\\ast 9 = 76$",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Instruction execution in a processor is divided into $5$ stages, Instruction Fetch (IF), Instruction Decode (ID), Operand fetch (OF), Execute (EX), and Write Back (WB). These stages take 5, 4, 20, 10 and 3 nanoseconds (ns) respectively. A pipelined implementation of the processor requires buffering between each pair of consecutive stages with a delay of 2 ns . Two pipelined implementation of the processor are contemplated: The speedup (correct to two decimal places) achieved by EP over NP in executing $20$ independent instructions with no hazards is _________ .",
          "images": [],
          "options": [
            "A. a naive pipeline implementation (NP) with $5$ stages and",
            "B. an efficient pipeline (EP) where the OF stage is divided into stages $\\text{OF1}$ and $\\text{OF2}$ with execution times of 12 ns and 8 ns respectively."
          ],
          "correct_answer": "1.50 : 1.51",
          "explanation": "Case 1: Stages $5,$ max delay $= 22\\text{ (after adding buffer delay), number of instructions}= 20$ Case 2: Stages $6,$ (since OF is split), max delay $= 14,\\text{ number of instructions}=20$ So, execution time is $(K+N-1)\\times \\text{ Max delay}$ Speed Up $=\\dfrac{528}{350}=1.508 ($Execution time case $1/$Execution time case $2)$ So, the answer is 1.508",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a machine with a byte addressable main memory of $2^{32}$ bytes divided into blocks of size $32$ bytes. Assume that a direct mapped cache having $512$ cache lines is used with this machine. The size of the tag field in bits is _______",
          "images": [],
          "options": [],
          "correct_answer": "18",
          "explanation": "No. of blocks of main Memory $= \\dfrac{2^{32}}{2^5} = 2^{27}$ And there are $512 = 2^9$ lines in Cache Memory. Tag bits tell us to how many blocks does $1$ line in Cache memory points to $1$ cache line points to $ \\large \\dfrac{2^{27}}{2^9} = 2^{18}$ lines So, $18$ bits are required as TAG bits.",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The read access times and the hit ratios for different caches in a memory hierarchy are as given below: $$\\begin{array}{|l|c|c|} \\hline \\text {Cache} & \\text{Read access time (in nanoseconds)}& \\text{Hit ratio} \\\\\\hline \\text{I-cache} & \\text{2} & \\text{0.8} \\\\\\hline \\text{D-cache} & \\text{2} & \\text{0.9}\\\\\\hline \\text{L2-cache} & \\text{8} & \\text{0.9} \\\\\\hline \\end{array}$$ The read access time of main memory in $90\\;\\text{nanoseconds}$. Assume that the caches use the referred-word-first read policy and the write-back policy. Assume that all the caches are direct mapped caches. Assume that the dirty bit is always $0$ for all the blocks in the caches. In execution of a program, $60\\%$ of memory reads are for instruction fetch and $40\\%$ are for memory operand fetch. The average read access time in nanoseconds (up to $2$ decimal places) is _________",
          "images": [],
          "options": [],
          "correct_answer": "4.7 : 4.8",
          "explanation": "$L2$ cache is shared between Instruction and Data (is it always? see below) So, average read time $=$ Fraction of Instruction Fetch $\\ast $ Average Instruction fetch time $+$ Fraction of Data Fetch $\\ast$ Average Data Fetch Time Average Instruction fetch Time $= L1$ access time $+ L1$ miss rate $\\ast \\;L2$ access time $+ L1$ miss rate $\\ast\\; L2$ miss rate $\\ast $ Memory access time $\\quad= 2 + 0.2 \\times 8 + 0.2 \\times 0.1 \\times 90$ $\\quad= 5.4 \\;\\text{ns}$ Average Data fetch Time $= L1$ access time $+ L1$ miss rate $\\ast \\;L2$ access time $+ L1$ miss rate $\\ast \\;L2$ miss rate $\\ast $ Memory access time $\\quad = 2 + 0.1 \\times 8 + 0.1 \\times 0.1 \\times 90$ $\\quad= 3.7\\;\\text{ns}$ So, average memory access time $$= 0.6 \\times 5.4 + 0.4 \\times 3.7 = 4.72\\; \\text{ns}$$ Now, why $L2$ must be shared? Because we can otherwise use it for either Instruction or Data and it is not logical to use it for only $1.$ Ideally this should have been mentioned in question, but this can be safely assumed also (not enough merit for Marks to All). Some more points in the question: Assume that the caches use the referred-word-first read policy and the writeback policy Writeback policy is irrelevant for solving the given question as we do not care for writes. Referred-word-first read policy means there is no extra time required to get the requested word from the fetched cache line. Assume that all the caches are direct mapped caches. Not really relevant as average access times are given Assume that the dirty bit is always 0 for all the blocks in the caches Dirty bits are for cache replacement- which is not",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "In a two-level cache system, the access times of $L_1$ and $L_2$ caches are $1$ and $8$ clock cycles, respectively. The miss penalty from the $L_2$ cache to main memory is $18$ clock cycles. The miss rate of $L_1$ cache is twice that of $L_2$. The average memory access time (AMAT) of this cache system is $2$ cycles. The miss rates of $L_1$ and $L_2$ respectively are",
          "images": [],
          "options": [
            "A. $0.111$ and $0.056$",
            "B. $0.056$ and $0.111$",
            "C. $0.0892$ and $0.1784$",
            "D. $0.1784$ and $0.0892$"
          ],
          "correct_answer": "A",
          "explanation": "In two-level memory system (hierarchical), it is clear that the second level is accessed only when first level access is a miss. So, we must include the first level access time in all the memory access calculations. Continuing this way for any level, we must include that level access time (without worrying about the hit rate in that level), to all memory accesses coming to that level (i.e., by just considering the miss rate in the previous level). So, for the given question, we can get the following equation: $\\text{AMAT} = \\text{L1 access time}$ $+ \\text{L1 miss rate} \\times \\text{L2 access time}$ $+ \\text{L1 miss rate} \\times \\text{L2 miss rate} \\times \\text{Main memory access time}$ $2 = 1 + x \\times 8 + 0.5 x^2 \\times 18$ $\\implies 9x^2 + 8x -1 = 0$ $\\implies x = \\dfrac{-8 \\pm \\sqrt{64 + 36}}{18} = \\dfrac{2}{18} = 0.111$. So, Answer is option (A).",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a RISC machine where each instruction is exactly $4$ bytes long. Conditional and unconditional branch instructions use PC-relative addressing mode with Offset specified in bytes to the target location of the branch instruction. Further the Offset is always with respect to the address of the next instruction in the program sequence. Consider the following instruction sequence$$\\begin{array}{ll} \\text{Instr. No.} & \\text{Instruction} \\\\\\hline \\text{i:} & \\text{add R2, R3, R4} \\\\ \\text{i+1:} & \\text{sub R5, R6, R7} \\\\ \\text{i+2:} & \\text{cmp R1, R9, R10} \\\\ \\text{i+3:} & \\text{beq R1, Offset} \\\\ \\end{array}$$If the target of the branch instruction is $i,$ then the decimal value of the Offset is ____________ .",
          "images": [],
          "options": [],
          "correct_answer": "-16.0",
          "explanation": "Answer is $-\\bf{16.}$ Program Counter is updated with the address of next instruction even before the current instruction is executed. That is why the question says that the address of the next instruction is updated with next instruction in sequence. Before executing instruction $\\bf{i + 3}$, the current state looks as under: Please note: BEQ instruction is for Branch Equal Question says that the target of branch instruction is 'i' which is at $2000$ in our example. So, we need to go to address $\\bf{2000}$ from address $2016$ (which is currently pointed by PC) $\\bf{2016 - 2000 = 16}$ So, we have to specify Offset as $-16$ which would mean that $16$ should be subtracted from next address instruction ($2016$).",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a two-level cache hierarchy with $L1$ and $L2$ caches. An application incurs $1.4$ memory accesses per instruction on average. For this application, the miss rate of $L1$ cache is $0.1$; the $L2$ cache experiences, on average, $7$ misses per $1000$ instructions. The miss rate of $L2$ expressed correct to two decimal places is ________.",
          "images": [],
          "options": [],
          "correct_answer": "0.05",
          "explanation": "Answer = $0.05$. Assuming there are 1000 instructions for the ease of calculation, which means there are 7 memory reference misses from the L2 cache. A cache experiences misses with memory references. Thus, it is essential to determine the counts of incoming memory references and the counts of memory references hitting or missing in order to calculate the cache hit rate or miss rate. Upon reading the question, it becomes apparent that the incoming memory references to the L2 cache are unknown, and we must derive this information using the provided L1 cache information.",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the $C$ struct defined below: struct data { int marks [100]; char grade; int cnumber; }; struct data student; The base address of student is available in register $R1$. The field student.grade can be accessed efficiently using:",
          "images": [],
          "options": [
            "A. Post-increment addressing mode, $(R1)+$",
            "B. Pre-decrement addressing mode, $-(R1)$",
            "C. Register direct addressing mode, $R1$",
            "D. Index addressing mode, $X(R1)$, where $X$ is an offset represented in $2's$ complement $16\\text{-bit}$ representation"
          ],
          "correct_answer": "D",
          "explanation": "Answer is option (D) . Displacement Mode :- Similar to index mode, except instead of a index register a base register will be used. Base register contains a pointer to a memory location. An integer (constant) is also referred to as a displacement. The address of the operand is obtained by adding the contents of the base register plus the constant. The difference between index mode and displacement mode is in the number of bits used to represent the constant. When the constant is represented a number of bits to access the memory, then we have index mode. Index mode is more appropriate for array accessing; displacement mode is more appropriate for structure (records) accessing. Reference: http://www.cs.iit.edu/~cs561/cs350/addressing/addsclm.html",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A block-set associative cache memory consists of $128$ blocks divided into four block sets. The main memory consists of $16, 384$ blocks and each block contains $256$ eight bit words.",
          "images": [],
          "options": [
            "A. How many bits are required for addressing the main memory?",
            "B. How many bits are needed to represent the TAG, SET and WORD fields?"
          ],
          "correct_answer": "22",
          "explanation": "For main memory, there are $2^{14}$ blocks and each block size is $2^8$ bytes (A byte is an eight-bit word) Size of main memory $=2^{14}\\times 2^8=4MB$ ( $22-\\text{bits}$ required for addressing the main memory). For WORD field, we require $8-\\text{bits}$, as each block contains $2^8 $ words. As there are $4$ blocks in $1$ set, $32$ sets will be needed for $128$ blocks. Thus SET field requires $5- \\text{bits}$. Then, TAG field requires $22-(5+8)= 9- \\text{bits}$ $$\\begin{array}{|c|c|c|} \\hline \\text {9-bits (for tag)} & \\text{5- bits (for set)}& \\text{8-bits (for word)} \\\\\\hline \\end{array}$$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "State whether the following statements are TRUE or FALSE with reason: The flags are affected when conditional CALL or JUMP instructions are executed.",
          "images": [],
          "options": [],
          "correct_answer": "0",
          "explanation": "False. Flags are tested during conditional call and jump not affected or changed",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "State whether the following statements are TRUE or FALSE with reason: The data transfer between memory and I/O devices using programmed I/O is faster than interrupt-driven I/O. 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "0",
          "explanation": "$\\text{False}$ because in programmed I/O, CPU will check the I/O devices' status according to written program. Suppose CPU requested $5$ I/O devices and the program is written to check sequentially and 5$^{th}$ device is ready before 2$^{nd}$ device, then also CPU will come to check at its turn. So, programmed I/O doesn't care about availability status of devices. it blindly works according to written program. That's why it is slow. Interrupt driven I/O : Here, if any device is ready then it won't wait for CPU, it will say to CPU that \"I am ready\" by sending interrupt request and the delay here will be only \"time taken in servicing the interrupt\" which is less than programmed I/O. So, the answer is FALSE.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "State whether the following statements are TRUE or FALSE: Data transfer between a microprocessor and an I/O device is usually faster in memory-mapped-I/O scheme than in I/O-mapped -I/O scheme.",
          "images": [],
          "options": [],
          "correct_answer": "1",
          "explanation": "Memory operations (like MOV, LOAD, STORE, etc.) are faster than special I/O instructions (such as IN and OUT used in I/O-mapped I/O). Since in memory-mapped I/O, the CPU uses the same instructions for both memory and I/O operations, this means faster data transfers because it doesn't need special I/O instructions which are slower. Merits of memory-mapped I/O over I/O mapped I/O: Cheaper, faster, easier to build, consumes less power and can be physically smaller, supported by all systems.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "State whether the following statements are TRUE or FALSE In a microprocessor-based system, if a bus (DMA) request and an interrupt request arrive sumultaneously, the microprocessor attends first to the bus request.",
          "images": [],
          "options": [],
          "correct_answer": "1",
          "explanation": "i think it should be true ....consider a system in which we have modules like FETCH,DECODE,EXECUTE,WRITE-BACK.. now say both DMA request and interrupt arrive during DECODE cycle..... CPU always look for DMA after every phase(like fetch,decode)but CPU see interrupt only after end of instruction.... reason is that if we allow interrupt in between the phases...interrupt may change current registers and program status word....so its always done that DMA can be allowed in phases(as it dont changes the register content)...but interrupt not....",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "On receiving an interrupt from a I/O device the CPU: 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Halts for a predetermined time.",
            "B. Hands over control of address bus and data bus to the interrupting device.",
            "C. Branches off to the interrupt service routine immediately.",
            "D. Branches off to the interrupt service routine after completion of the current instruction."
          ],
          "correct_answer": "D",
          "explanation": "Answer should be (D) i.e branches off to ISR after completing current instruction. CPU checks the status bit of interrupt at the completion of each current instruction running when there is a interrupt it service the interrupt using ISR. https://gateoverflow.in/18581/isro2009-78",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A microprogrammed control unit",
          "images": [],
          "options": [
            "A. Is faster than a hard-wired control unit.",
            "B. Facilitates easy implementation of new instruction.",
            "C. Is useful when very small programs are to be run.",
            "D. Usually refers to the control unit of a microprocessor."
          ],
          "correct_answer": "B",
          "explanation": "is wrong. Microprogrammed Control Unit (CU) can never be faster than hardwired CU. Microprogrammed CU it has an extra layer on top of hardwired CU and hence can only be slower than hardwired CU. is a suitable answer as we can add new instruction by changing the content of control memory. is not correct as when only small programs are there, hardwired control makes more sense. control unit can also be hardwired, so this is also not correct. Reference: Slides $B$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The most relevant addressing mode to write position-independent codes is: Related Questions : GATE CSE 2004 | Question: 20 GATE CSE 1998 | Question: 1.19 GATE CSE 1996 | Question: 1.16, ISRO2016-42 ed Jan 10, 2023 reply Follow flag @nvs16 Why C variables stored in specific memory locations? - Stack Overflow 1 1 reply Share KODANDA SIVA SANDEEP commented Nov 19, 2025 reply Follow flag Position independent codes can be written in relative mode 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Direct mode",
            "B. Indirect mode",
            "C. Relative mode",
            "D. Indexed mode"
          ],
          "correct_answer": "C",
          "explanation": "(C) Relative Mode since we can just change the content of base register if we wish to relocate. REFERENCE: https://gateoverflow.in/155280/self-doubt-computer-organization?show=155312",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Transferring data in blocks from the main memory to the cache memory enables an interleaved main memory unit to operate unit at its maximum speed.True/False. Explain.",
          "images": [],
          "options": [],
          "correct_answer": "1",
          "explanation": "With interleaved memory, memory addresses are allocated to each memory bank in turn. For example, in an interleaved system with two memory banks (assuming word-addressable memory), if logical address 32 belongs to bank 0, then logical address 33 would belong to bank 1, logical address 34 would belong to bank 0, and so on. An interleaved memory is said to be n-way interleaved when there are n banks and memory location i resides in bank i mod n. Memory interleaving example with 4 banks. Red banks are refreshing and can't be used. Interleaved memory results in contiguous reads (which are common both in multimedia and execution of programs) and contiguous writes (which are used frequently when filling storage or communication buffers) actually using each memory bank in turn, instead of using the same one repeatedly. This results in significantly higher memory throughput as each bank has a minimum waiting time between reads and writes. Main memory ( random-access memory , RAM) is usually composed of a collection of DRAM memory chips, where a number of chips can be grouped together to form a memory bank. It is then possible, with a memory controller that supports interleaving, to lay out these memory banks so that the memory banks will be interleaved. In traditional (flat) layouts, memory banks can be allocated a continuous block of memory addresses, which is very simple for the memory controller and gives the equal performance in completely random access scenarios, when compared to performance levels achieved through interleaving. However, in reality, memory reads are rarely random due to the locality of reference , and optimizing for close together access gives the far better performance in interleaved layouts. Note that the way memory is addressed has no effect on the access time for memory locations which are already cached , having an impact only on memory locations which need to be retrieved from DRAM.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following assembly language program for a hypothetical processor $A, B,$ and $C$ are $8$ bit registers. The meanings of various instructions are shown as comments. MOV B, #0 ; $B \\leftarrow 0$ MOV C, #8 ; $C \\leftarrow 8$ Z: CMP C, #0 ; compare C with 0 JZ X ; jump to X if zero flag is set SUB C, #1 ; $C \\gets C-1$ RRC A, #1 ; right rotate A through carry by one bit. Thus: ; If the initial values of A and the carry flag are $a_7..a_0$ and ; $c_0$ respectively, their values after the execution of this ; instruction will be $c_0a_7..a_1$ and $a_0$ respectively. JC Y ; jump to Y if carry flag is set JMP Z ; jump to Z Y: ADD B, #1 ; $B \\gets B+1$ JMP Z ; jump to Z X: Which of the following instructions when inserted at location $X$ will ensure that the value of the register $A$ after program execution is as same as its initial value? 🚩 Edit necessary | 👮 Arjun",
          "images": [],
          "options": [
            "A. $\\text{RRC A}, \\#1$",
            "B. $\\text{NOP} ;$ no operation",
            "C. $\\text{LRC A,} \\#1; $ left rotate $A$ through carry flag by one bit",
            "D. $\\text{ADD A,} \\#1$"
          ],
          "correct_answer": "A",
          "explanation": "Option $(A) \\text{RRC}\\; a, \\#1.$ As the 8 bit register is rotated via carry $8$ times. $a_7a_6a_5a_4a_3a_2a_1a_0$ $c_0a_7a_6a_5a_4a_3a_2a_1$, now $a_0$ is the new carry. So, after next rotation, $a_0c_0a_7a_6a_5a_4a_3a_2$ So, after $8$ rotations, $a_6a_5a_4a_3a_2a_1a_0c_0$ and carry is $a_7$. Now, one more rotation will restore the original value of $A_0$. PS: In question, “ADD B, #1” should be replaced with “INC B” to prevent modification of carry flag.",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following program segment for a hypothetical CPU having three user registers $R_1, R_2$ and $R_3.$ \\begin{array}{|l|l|c|} \\hline \\text {Instruction} & \\text{Operation }& \\text{Instruction size (in Words)} \\\\\\hline \\text{MOV $R_1,5000$} & \\text{$R1$} \\leftarrow \\text{Memory$[5000]$}& \\text{$2$} \\\\\\hline\\text{MOV $R_2(R_1)$} & \\text{$R2$} \\leftarrow \\text{Memory$[(R_1)]$}& \\text{$1$} \\\\\\hline \\text{ADD $R_2,R_3$} & \\text{$R_2$} \\leftarrow \\text{$R_2 + R_3$} & \\text{$1$} \\\\\\hline \\text{MOV $6000,R_2$} & \\text{Memory$[6000]$} \\leftarrow \\text{$R_2$} & \\text{$2$} \\\\\\hline \\text{Halt} & \\text{Machine Halts} & \\text{$1$} \\\\\\hline \\end{array} Let the clock cycles required for various operations be as follows: \\begin{array}{|l|l|} \\hline \\text {Register to/from memory transfer} & \\text{3 clock cycles } \\\\\\hline \\text {ADD with both operands in register} & \\text{1 clock cycles } \\\\\\hline \\text {Instruction fetch and decode} & \\text{2 clock cycles }\\\\\\hline \\end{array} The total number of clock cycles required to execute the program is",
          "images": [],
          "options": [
            "A. $29$",
            "B. $24$",
            "C. $23$",
            "D. $20$"
          ],
          "correct_answer": "B",
          "explanation": "B. $24 \\text{ cycles}$ $$\\begin{array}{|l|c|c|} \\hline \\text {Instruction} & \\text{Size }& \\text{Fetch and Decode + Execute} \\\\\\hline \\text{MOV} & \\text{$2$} & \\text{$2$} \\times \\text{$2 + 3 = 7$} \\\\\\hline \\text{MOV} & \\text{$1$} & \\text{$2$} \\times \\text{$1 + 3 = 5$} \\\\\\hline \\text{ADD} & \\text{$1$} & \\text{$2$} \\times \\text{$1 + 1 = 3$} \\\\\\hline \\text{MOV} & \\text{$2$} & \\text{$2$} \\times \\text{$2 + 3 = 7$} \\\\\\hline \\text{HALT} & \\text{$1$} & \\text{$2$} \\times \\text{$1 + 0 = 2$} \\\\\\hline & \\text{Total} & \\text{$24 $ Cycles} \\\\\\hline \\end{array}$$",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following data path of a $\\text{CPU}.$ The $\\text{ALU},$ the bus and all the registers in the data path are of identical size. All operations including incrementation of the $\\text{PC}$ and the $\\text{GPRs}$ are to be carried out in the $\\text{ALU}.$ Two clock cycles are needed for memory read operation – the first one for loading address in the $\\text{MAR}$ and the next one for loading data from the memory bus into the $\\text{MDR}.$ The instruction \"call Rn, sub” is a two word instruction. Assuming that $\\text{PC}$ is incremented during the fetch cycle of the first word of the instruction, its register transfer interpretation is $\\text{Rn} \\leftarrow \\text{PC} + 1$; $\\text{PC} \\leftarrow \\text{M[PC]}$; The minimum number of CPU clock cycles needed during the execution cycle of this instruction is:",
          "images": [
            {
              "index": 1,
              "filename": "43568_img1.png"
            }
          ],
          "options": [
            "A. $2$",
            "B. $3$",
            "C. $4$",
            "D. $5$"
          ],
          "correct_answer": "B",
          "explanation": "$\\text{MAR} \\leftarrow \\text{PC}\\qquad \\to1$ cycle $S \\leftarrow \\text{PC}$ (Since these two actions are independent they can be done in same cycle) $\\text{MDR} \\leftarrow \\text{M[MAR]}\\qquad \\to 2^{nd}$ cycle (System BUS) $\\text{Rn} \\leftarrow S +1$ $(\\text{ALU}$ Is free and the two actions are independent.) ( Internal BUS) $\\text{PC} \\leftarrow \\text{MDR}\\qquad \\to 3$rd cycle Therefore $3$ cycles needed. A rough sketch:",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider two cache organizations. First one is $32$ $kB$ $2$-way set associative with $32$ $byte$ block size, the second is of same size but direct mapped. The size of an address is $32$ $bits$ in both cases . A $2$-to-$1$ multiplexer has latency of $0.6 ns$ while a $k-$bit comparator has latency of $\\frac{k}{10} ns$. The hit latency of the set associative organization is $h_1$ while that of direct mapped is $h_2$. The value of $h_2$ is:",
          "images": [],
          "options": [
            "A. $2.4$ $ns$",
            "B. $2.3$ $ns$",
            "C. $1.8$ $ns$",
            "D. $1.7$ $ns$"
          ],
          "correct_answer": "D",
          "explanation": "$\\text{number of sets} = \\dfrac{\\text{cache size}}{\\text{no. of blocks in a set } \\times \\text{ block size}}$ $=\\dfrac{32KB}{1 \\times 32B} = 1024$ So, number of index bits $= 10,$ and number of tag bits $=32-10-5=17.$ So, $h2 =\\dfrac{17}{10}= 1.7\\text{ ns}$ $D$",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A CPU has a $32$ $KB$ direct mapped cache with $128$ byte-block size. Suppose $A$ is two dimensional array of size $512 \\times512$ with elements that occupy $8-bytes$ each. Consider the following two $C$ code segments, $P1$ and $P2$. $P1$: for (i=0; i<512; i++) { for (j=0; j<512; j++) { x +=A[i] [j]; } } P2: for (i=0; i<512; i++) { for (j=0; j<512; j++) { x +=A[j] [i]; } } $P1$ and $P2$ are executed independently with the same initial state, namely, the array $A$ is not in the cache and $i$, $j$, $x$ are in registers. Let the number of cache misses experienced by $P1$ be $M1$ and that for $P2$ be $M2$. The value of the ratio $\\frac{M_{1}}{M_{2}}$:",
          "images": [],
          "options": [
            "A. $0$",
            "B. $\\frac{1}{16}$",
            "C. $\\frac{1}{8}$",
            "D. $16$"
          ],
          "correct_answer": "B",
          "explanation": "$\\text{Number of Cache Lines}= \\dfrac{2^{15}B}{128B}= 256$ $\\text{In 1 Cache Line} =\\dfrac{128B}{8B} = 16\\ elements$ $P_1=\\dfrac{\\text{total elements in array}}{\\text{elements in a cache line}}$ $\\quad=\\dfrac{512 \\times 512}{16}= 2^{14}= 16384.$ $P_2= 512 \\times 512=2^{18}$ $\\dfrac{P_1}{P_2}=\\dfrac{16384}{512 \\times 512}$ $\\quad = 2^{14-18}= 2^{-4}=\\dfrac{1}{16}$ It is so, because for $P_1$ for every line there is a miss, and once a miss is processed we get $16$ elements in memory. So, another miss happens after $16$ elements. For $P_2$ for every element there is a miss because storage is row major order(by default) and we are accessing column wise. Hence, answer is option B.",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following program segment. Here $\\text{R1, R2}$ and $\\text{R3}$ are the general purpose registers. $$\\begin{array}{|l|l|l|c|} \\hline & \\text {Instruction} & \\text{Operation }& \\text{Instruction Size} \\\\ & & & \\text{(no. of words)}\\\\\\hline & \\text{MOV R1,(3000)} & \\text{R1} \\leftarrow \\text{M[3000]} & \\text{$2$} \\\\\\hline \\text{LOOP:}& \\text{MOV R2,(R3)} & \\text{R2} \\leftarrow \\text{M[R3]} & \\text{$1$} \\\\\\hline & \\text{ADD R2,R1} & \\text{R2} \\leftarrow \\text{R1 + R2} & \\text{$1$} \\\\\\hline & \\text{MOV (R3),R2} & \\text{M[R3]} \\leftarrow \\text{R2} & \\text{$1$} \\\\\\hline& \\text{INC R3} &\\text{R3} \\leftarrow \\text{R3 + 1} & \\text{$1$} \\\\\\hline & \\text{DEC R1} &\\text{R1} \\leftarrow \\text{R1 – 1} & \\text{$1$} \\\\\\hline& \\text{BNZ LOOP} & \\text{Branch on not zero} & \\text{$2$} \\\\\\hline & \\text{HALT} & \\text{Stop} & \\text{$1$} \\\\\\hline\\end{array}$$ Assume that the content of memory location $3000$ is $10$ and the content of the register $\\text{R3}$ is $2000.$ The content of each of the memory locations from $2000$ to $2010$ is $100.$ The program is loaded from the memory location $1000.$ All the numbers are in decimal. Assume that the memory is byte addressable and the word size is $32$ bits. If an interrupt occurs during the execution of the instruction “INC R3”, what return address will be pushed on to the stack?",
          "images": [],
          "options": [
            "A. $1005$",
            "B. $1020$",
            "C. $1024$",
            "D. $1040$"
          ],
          "correct_answer": "C",
          "explanation": "An interrupt is checked for after the execution of the current instruction and the contents of PC (address of next instruction to be executed) is pushed on to stack. Here, address of INC, R3 $= 1000 +\\dfrac{ (2 + 1 + 1 + 1) \\times 32}{8} = 1020$ and next instruction address $= 1020 + 4 = 1024$ which is pushed on to stack. Reference: http://www.ece.utep.edu/courses/web3376/Notes_files/ee3376-interrupts_stack.pdf $C$",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following program segment. Here $\\text{R1, R2}$ and $\\text{R3}$ are the general purpose registers. $$\\small \\begin{array}{|c|l|l||c|} \\hline & \\text {Instruction} & \\text{Operation }& \\text{Instruction Size} \\\\ & & & \\text{(no. of words)} \\\\\\hline & \\text{MOV R1,(3000)} & \\text{R1} \\leftarrow \\text{M[3000]} & 2 \\\\\\hline \\text{LOOP:}& \\text{MOV R2,(R3)} & \\text{R2} \\leftarrow \\text{M[R3]} & 1 \\\\\\hline & \\text{ADD R2,R1} & \\text{R2} \\leftarrow \\text{R1 + R2} & 1 \\\\\\hline & \\text{MOV (R3),R2} & \\text{M[R3]} \\leftarrow \\text{R2} & 1 \\\\\\hline& \\text{INC R3} & \\text{R3} \\leftarrow \\text{R3 + 1} & 1 \\\\\\hline & \\text{DEC R1} & \\text{R1} \\leftarrow \\text{R1 – 1} & 1 \\\\\\hline& \\text{BNZ LOOP} & \\text{Branch on not zero} & 2 \\\\\\hline & \\text{HALT} & \\text{Stop} & 1 \\\\\\hline\\end{array}$$ Assume that the content of memory location $3000$ is $10$ and the content of the register $\\text{R3}$ is $2000$. The content of each of the memory locations from $2000$ to $2010$ is $100$. The program is loaded from the memory location $1000$. All the numbers are in decimal. Assume that the memory is word addressable. After the execution of this program, the content of memory location $2010$ is:",
          "images": [],
          "options": [
            "A. $100$",
            "B. $101$",
            "C. $102$",
            "D. $110$"
          ],
          "correct_answer": "A",
          "explanation": "The loop runs $10$ times. When $R1=10 , \\text{Memory}[2000] = 110,$ When $R1=9 , \\text{Memory}[2001] = 109,$ When $R1=8 , \\text{Memory}[2002] = 108,$ When $R1=7 , \\text{Memory}[2003] = 107,$ When $R1=6 , \\text{Memory}[2004] = 106,$ When $R1=5 , \\text{Memory}[2005] = 105,$ When $R1=4 , \\text{Memory}[2006] = 104,$ When $R1=3 , \\text{Memory}[2007] = 103,$ When $R1=2 , \\text{Memory}[2008] = 102,$ When $R1=1 , \\text{Memory}[2009] = 101,$ When $R1=0$ the loop breaks., $\\text{Memory}[2010]= 100$ $A$",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a machine with a byte addressable main memory of $2^{16}$ bytes. Assume that a direct mapped data cache consisting of $32$ lines of $64$ bytes each is used in the system. A $50$ x $50$ two-dimensional array of bytes is stored in the main memory starting from memory location $1100H$. Assume that the data cache is initially empty. The complete array is accessed twice. Assume that the contents of the data cache do not change in between the two accesses. Which of the following lines of the data cache will be replaced by new blocks in accessing the array for the second time?",
          "images": [],
          "options": [
            "A. line $4$ to line $11$",
            "B. line $4$ to line $12$",
            "C. line $0$ to line $7$",
            "D. line $0$ to line $8$"
          ],
          "correct_answer": "A",
          "explanation": "Cache Organization: Staring Address $=1100H = 16^3+16^2+0+0 =4352B$ is the starting address. We need to find Starting block $=\\dfrac{4352\\ B}{64\\ B}= 68^{th}$ block in main memory from where array start storing elements. $50\\times 50\\ B =\\text{array size}=50\\times \\dfrac{50\\ B}{64\\ B} =39.0625$ blocks needed $\\approxeq 40\\ blocks$ $\\text{68,69,70....107 block}$ we need $=40\\text{ blocks}$ Starting block is $68\\pmod {32}= 4^{th}$ cache block and after that in sequence they will be accessed. As shown in below table, line number $4$ to $11$ has been replaced by array in second time \\begin{array}{|c|c|c|} \\hline \\textbf {Cache Block Number} & \\textbf{First Cycle }& \\textbf{Second cycle} \\\\\\hline \\text{0} & \\text{96} & \\text{} \\\\\\hline \\text{1} & \\text{97} & \\text{} \\\\\\hline \\text{2} & \\text{98} & \\text{}\\\\\\hline\\text{3} & \\text{99} & \\text{}\\\\\\hline\\text{4} & \\text{68 // 100} & \\text{68}\\\\\\hline\\text{5} & \\text{69 // 101} & \\text{}69\\\\\\hline\\text{6} & \\text{70//102} & \\text{70}\\\\\\hline\\text{7} & \\text{71//103} & \\text{71}\\\\\\hline\\text{8} & \\text{72//104} & \\text{72}\\\\\\hline\\text{9} & \\text{73//105} & \\text{73}\\\\\\hline\\text{10} & \\text{74/106} & \\text{74}\\\\\\hline\\text{11} & \\text{75//107} & \\text{75}\\\\\\hline\\text{12} & \\text{76} & \\text{}\\\\\\hline\\text{13} & \\text{77} & \\text{}\\\\\\hline\\text{14} & \\text{78} & \\text{}\\\\\\hline\\text{15} & \\text{79} & \\text{}\\\\\\hline\\text{16} & \\text{80} & \\text{}\\\\\\hline\\text{17} & \\text{81} & \\text{}\\\\\\hline\\text{18} & \\text{82} & \\text{}\\\\\\hline\\text{19} & \\text{83} & \\text{}\\\\\\hline\\text{20} & \\text{84} & \\text{}\\\\\\hline\\text{21} & \\text{85} & \\text{}\\\\\\hline\\text{22} & \\text{86} & \\text{}\\\\\\hline\\text{23} & \\text{87} & \\text{}\\\\\\hline\\text{24} & \\text{88} & \\text{}\\\\\\hline\\text{25} & \\text{89} & \\text{}\\\\\\hline\\text{26} & \\text{90} & \\text{}\\\\\\hline\\text{27} & \\text{91} & \\text{}\\\\\\hline\\text{28} & \\text{92} & \\text{}\\\\\\hline\\text{29} & \\text{93} & \\text{}\\\\\\hline\\text{30} & \\text{94} & \\text{}\\\\\\hline\\text{31} & \\text{95} & \\text{}\\\\\\hline \\end{array} $A$",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a machine with a $2$-way set associative data cache of size $64$ Kbytes and block size $16$ bytes. The cache is managed using $32$ bit virtual addresses and the page size is $4$ Kbytes. A program to be run on this machine begins as follows: double ARR[1024][1024]; int i, j; /*Initialize array ARR to 0.0 */ for(i = 0; i < 1024; i++) for(j = 0; j < 1024; j++) ARR[i][j] = 0.0; The size of double is $8$ bytes. Array $\\text{ARR}$ is located in memory starting at the beginning of virtual page $\\textsf{0xFF000}$ and stored in row major order. The cache is initially empty and no pre-fetching is done. The only data memory references made by the program are those to array $\\text{ARR}$. The cache hit ratio for this initialization loop is:",
          "images": [],
          "options": [
            "A. $0\\%$",
            "B. $25\\%$",
            "C. $50\\%$",
            "D. $75\\%$"
          ],
          "correct_answer": "C",
          "explanation": "Block size $=16\\textsf{B}$ and one element $=8\\textsf{B}.$ So, in one block $2$ element will be stored. For $1024\\times 1024$ element num of block required $=\\dfrac{1024\\times 1024}{2} =2^{19}$ blocks required. In one block the first element will be a miss and second one is hit(since we are transferring two unit at a time) $\\Rightarrow \\text{hit ratio}=\\dfrac{\\text{Total hit}}{\\text{Total reference}}$ $=\\dfrac{2^{19}}{2^{20}}$ $=\\dfrac{1}{2}=0.5$ $=0.5\\times 100=50\\%$ $C$",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a machine with a $2$-way set associative data cache of size $64$ Kbytes and block size $16$ bytes. The cache is managed using $32$ bit virtual addresses and the page size is $4$ Kbytes. A program to be run on this machine begins as follows: double ARR[1024][1024]; int i, j; /*Initialize array ARR to 0.0 */ for(i = 0; i < 1024; i++) for(j = 0; j < 1024; j++) ARR[i][j] = 0.0; The size of double is $8$ bytes. Array $\\text{ARR}$ is located in memory starting at the beginning of virtual page $\\textsf{0xFF000}$ and stored in row major order. The cache is initially empty and no pre-fetching is done. The only data memory references made by the program are those to array $\\text{ARR}$. Which of the following array elements have the same cache index as $\\text{ARR[0][0]}$?",
          "images": [],
          "options": [
            "A. $\\text{ARR[0][4]}$",
            "B. $\\text{ARR[4][0]}$",
            "C. $\\text{ARR[0][5]}$",
            "D. $\\text{ARR[5][0]}$"
          ],
          "correct_answer": "B",
          "explanation": "Number of sets $=$ cache size/ size of a set $= 64 \\ \\textsf{KB} / (16 \\ \\textsf{B} \\times 2)$ (two blocks per set) $= 2 \\ \\textsf{K} = 2^{11}$ So, we need $11$ bits for set indexing. Number of WORD bits required $= 4$ as a cache block consists of $16$ bytes and we need $4$ bits to address each of them. So, number of tag bits $= 32 - 11 - 4 = 17$ Total size of the tag $= 17 \\times$ Number of cache blocks $=17 \\times 2^{11} \\times 2$ (since each set has $2$ blocks) $= 68 \\ \\textsf{KB}$ We use the top $17$ bits for tag and the next $11$ bits for indexing and next $4$ for offset. So, for two addresses to have the same cache index, their $11$ address bits after the $4$ offset bits from right must be same. $\\text{ARR[0][0]}$ is located at virtual address $\\textsf{0x FF000 000. (FF000}$ is page address and $000$ is page offset). So, index bits are $00000000000$ Address of $\\text{ARR[0][4]} = \\textsf{0xFF000} + 4 \\times$ sizeof (double) $= \\textsf{0xFF000 000} + 4\\times 8 = \\textsf{0xFF000 020} (32 = 20$ in hex) (index bits differ) Address of $\\text{ARR[4][0] } = \\textsf{0xFF000 } + 4 \\times 1024 \\times$ sizeof (double) [since we use row major storage] $= \\textsf{0xFF000 000} + 4096\\times 8 = \\textsf{0xFF000 000 + 0x8000 = 0xFF008 000}$ ( index bits matches that of $\\text{ARR [0][0]}$ as both read $000 \\ 0000 \\ 0000$) Address of $\\text{ARR[0][5]} = \\textsf{0xFF000} + 5 \\times$ sizeof (double) $= \\textsf{0xFF000 000}+ 5\\times 8 = \\textsf{0xFF000 028} (40 = 28$ in hex) (index bits differ) Address of $\\text{ARR[5][0]} = \\textsf{0xFF000} + 5 \\times 1024 \\times$ sizeof (double) [since we use row major storage] $ = \\textsf{0xFF000 000} + 5120\\times 8 = \\textsf{0xFF000 000 + 0xA000 = 0xFF00A 000}$ (index bits differ) So, only $\\text{ARR[4][0]}$ and $\\text{ARR[0][0]}$ have the same cache index. The inner loop is iterating from $0$ to $1023$, so consecutive memory locations are accessed in sequence. Since cache block size is only $16$ bytes and our element being double is of size $8$ bytes, during a memory access only the next element gets filled in the cache. i.e.; every alternative memory access is a cache miss giving a hit ratio of $50\\%. ($If loops i and j are reversed, all accesses will be misses and hit ratio will become $0).$ $B$",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Delayed branching can help in the handling of control hazards The following code is to run on a pipelined processor with one branch delay slot: I1: ADD $R2 \\leftarrow R7 + R8$ I2: Sub $R4 \\leftarrow R5 – R6$ I3: ADD $R1 \\leftarrow R2 + R3$ I4: STORE Memory $[R4] \\leftarrow R1$ BRANCH to Label if $R1 == 0$ Which of the instructions I1, I2, I3 or I4 can legitimately occupy the delay slot without any program modification?",
          "images": [],
          "options": [
            "A. I1",
            "B. I2",
            "C. I3",
            "D. I4"
          ],
          "correct_answer": "D",
          "explanation": "What is Delayed Branching ? One way to maximize the use of the pipeline, is to find an instruction that can be safely executed whether the branch is taken or not, and execute that instruction. So, when a branch instruction is encountered, the hardware puts the instruction following the branch into the pipe and begins executing it, just as in predict-not-taken. However, unlike in predict-not-taken, we do not need to worry about whether the branch is taken or not, we do not need to clear the pipe because no matter whether the branch is taken or not, we know the instruction is safe to execute. Moving $I_1$ after branch $I1$ is updating the value of $R2$ $R2$ which is used to determine branch condition $R1$ Value of $R2$ is available after branch $\\Rightarrow$ Cannot be moved Moving $I_3$ after branch value of $R1$ is computed in this instruction $R1$ is the branch condition $\\Rightarrow$ Cannot be moved Moving $I_4$ after branch $I4$ is simple store instruction used to store R1 in memory program execution will have no effect if this is placed after conditional branch $\\Rightarrow$ Can be moved Moving $I_2$ after branch It update the memory location to place the storing of conditional branch instruction $R1$ If moved after branch , when compiler reaches $I4$ program execution will stop $\\Rightarrow $ Cannot be moved Hence, option D is answer.",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A computer system has an $L1$ cache, an $L2$ cache, and a main memory unit connected as shown below. The block size in $L1$ cache is $4$ words. The block size in $L2$ cache is $16$ words. The memory access times are $2$ nanoseconds, $20$ nanoseconds and $200$ nanoseconds for $L1$ cache, $L2$ cache and the main memory unit respectively. When there is a miss in both $L1$ cache and $L2$ cache, first a block is transferred from main memory to $L2$ cache, and then a block is transferred from $L2$ cache to $L1$ cache. What is the total time taken for these transfers?",
          "images": [
            {
              "index": 1,
              "filename": "43329_img1.png"
            }
          ],
          "options": [
            "A. $222$ nanoseconds",
            "B. $888$ nanoseconds",
            "C. $902$ nanoseconds",
            "D. $968$ nanoseconds"
          ],
          "correct_answer": "C",
          "explanation": "The transfer time should be $4*200 + 20 = 820$ ns. But this is not in option. So, I assume the following is what is meant by the question. $L2$ block size being $16$ words and data width between memory and $L2$ being $4$ words, we require $4$ memory accesses(for read) and $4$ $L2$ accesses (for store). Now, we need to send the requested block to $L1$ which would require one more $L2$ access (for read) and one $L1$ access (for store). So, total time $= 4 * (200 + 20) + (20 + 2)$ $= 880 + 22$ $= 902 \\ ns$ $C$",
          "year": 2010,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A computer has a $256$-$\\text{KByte}$, 4-way set associative, write back data cache with block size of $32$ $\\text{Bytes}$. The processor sends $32$ $\\text{bit}$ addresses to the cache controller. Each cache tag directory entry contains, in addition to address tag, $2$ valid bits, $1$ modified bit and $1$ replacement bit. The size of the cache tag directory is:",
          "images": [],
          "options": [
            "A. $160$ $\\text{Kbits}$",
            "B. $136$ $\\text{Kbits}$",
            "C. $40$ $\\text{Kbits}$",
            "D. $32$ $\\text{Kbits}$"
          ],
          "correct_answer": "A",
          "explanation": "Total cache size $=256\\ KB$ Cache block size $= 32\\text{ Bytes}$ So, number of cache entries $=\\dfrac{256\\ K}{32}=8\\ K$ Number of sets in cache $=\\dfrac{8\\ K}{4}=2\\ K$ as cache is $4\\text{-way}$ associative. So, $\\log(2048) =11\\text{ bits}$ are needed for accessing a set. Inside a set we need to identify the cache entry. Total number of distinct cache entries $=\\dfrac{2^{32}}{\\text{cache entry size}}=\\dfrac{2^{32}}{32}=2^{27}$ Out of this $2^{27},$ each set will be getting only $\\dfrac{2^{27}}{2^{11}}=2^{16}$ possible distinct cache entries as we use the first $11 \\text{ bits}$ to identify a set. So, we need $16$ bits to identify a cache entry in a set, which is the number of bits in the tag field. Size of cache tag directory$=\\text{Size of tag entry}\\times \\text{Number of tag entries}$ $=16 +(2+1+1) \\text{ bits (2 valid, 1 modified, 1 replacement as given in question)}\\times 8\\ K$ $= 20 * \\text 8 \\text{K bits} = 160\\text{ K bits}$ Not needed for this question, still: Valid bit: Tells if the memory referenced by the cache entry is valid. Initially, when a process is loaded all entries are invalid. Only when a page is loaded, its entry becomes valid. Modified bit: When processor writes to a cache location its modified bit is made $1.$ This information is used when a cache entry is replaced- entry $0$ means no update to main memory needed. Entry $1$ means an update is needed. Replacement bit: This is needed for the cache replacement policy. Explained in the below link: https://www.seas.upenn.edu/~cit595/cit595s10/handouts/LRUreplacementpolicy.pdf $A$",
          "year": 2012,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The size of the data count register of a $\\text{DMA}$ controller is $16\\;\\text{bits}$. The processor needs to transfer a file of $29,154$ kilobytes from disk to main memory. The memory is byte addressable. The minimum number of times the $\\text{DMA}$ controller needs to get the control of the system bus from the processor to transfer the file from the disk to main memory is _________.",
          "images": [],
          "options": [],
          "correct_answer": "456",
          "explanation": "Data count register gives the number of words the DMA can transfer in a single cycle.. Here it is $16$ bits.. so max $2^{16}$ words can be transferred in one cycle.. Since memory is byte addressable.. $1 \\text{ word}=1\\;\\text{byte}$ so $2^{16}$ bytes in $1$ cycle.. Now for the given file.. File size $=29154\\ \\textsf{KB} = 29154\\times 2^{10}\\ \\textsf{B}$ $1$ cylce $\\rightarrow$ DMA transfers $2^{16}\\ \\textsf{B}$ i.e $1\\ B$ transfered by DMA $\\rightarrow \\dfrac{1}{2^{16}}$ cycles. Now, for full file of size $29154\\ \\textsf{KB},$ Minimum number of cylces $=\\dfrac{(29154\\times 2^{10}\\ B)}{2^{16}}= 455.53$ But number of cylces is",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The stage delays in a $4$-stage pipeline are $800, 500, 400$ and $300$ picoseconds. The first stage (with delay $800$ picoseconds) is replaced with a functionality equivalent design involving two stages with respective delays $600$ and $350$ picoseconds. The throughput increase of the pipeline is ___________ percent.",
          "images": [],
          "options": [],
          "correct_answer": "33.0 : 34.0",
          "explanation": "In pipeline ideally $CPI=1$ So in $1$ cycle $1$ instruction gets completed Throughput is instructions in unit time In pipeline $1,$ cycle time$=$ max stage delay $=800\\ \\text{psec}$ In $800\\ \\text{psec},$ we expect to finish $1$ instruction So, in $1\\;\\text{ps},$ $\\dfrac{1}{800}$ instructions are expected to be completed, which is also the throughput for pipeline $1.$ Similarly pipeline $2,$ throughput$=\\dfrac{1}{600}$ Throughput increase in percentage $=\\dfrac{\\text{new-old} }{\\text{old}}\\times100$ $= \\dfrac{\\dfrac{1}{600}-\\dfrac{1}{800}}{\\dfrac{1}{800} }\\times 100$ $=\\dfrac{200}{600}\\times 100$ $=33.33 \\%$",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A processor can support a maximum memory of $4\\;\\textsf{GB}$, where the memory is word-addressable (a word consists of two bytes). The size of address bus of the processor is at least _________bits. 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "31",
          "explanation": "Size of Memory = No of words (Addresses) $\\times$ No of bits per word $2^{32}\\;\\textsf{B} =$ No of words (Addresses) $\\times \\;2\\;\\textsf{B}$ No of words (Addresses) $= 2^{31}$ Number of Address lines $= 31$",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Suppose the functions $F$ and $G$ can be computed in $5$ and $3$ nanoseconds by functional units $U_{F}$ and $U_{G}$, respectively. Given two instances of $U_{F}$ and two instances of $U_{G}$, it is required to implement the computation $F(G(X_{i}))$ for $1 \\leq i \\leq 10$. Ignoring all other delays, the minimum time required to complete this computation is ____________ nanoseconds.",
          "images": [],
          "options": [],
          "correct_answer": "28",
          "explanation": "The same concept is used in pipelining. Bottleneck here is $U_F$ as it takes $5\\;\\text{ns}$ while $U_G$ takes $3\\;\\text{ns}$ only. We have to do $10$ such calculations and we have $2$ instances of $U_F$ and $U_G$ respectively. So, $U_F$ can be done in $50/2 = 25$ nano seconds. For the start $U_F$ needs to wait for $U_G$ output for $3\\;\\text{ns}$ and rest all are pipelined and hence no more waiting is needed. So, answer is $$3 + 25 = 28\\;\\text{ns}.$$",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The width of the physical address on a machine is $40$ bits. The width of the tag field in a $512$ KB $8$-way set associative cache is ________ bits.",
          "images": [],
          "options": [],
          "correct_answer": "24",
          "explanation": "Physical Address $=40$ Tag + Set + Block Offset $=40$ $T + S + B = 40\\qquad \\to (1)$ We have: Cache Size = number of sets $\\times$ blocks per set $\\times$ Block size $512\\ KB$ = number of sets $\\times\\ 8\\ \\times$ Block size Number of sets $\\times$ Block size $=\\dfrac{512}{8}\\ KB = 64\\ KB$ $S + B =16 \\qquad \\to (2)$ From $(1), (2)$ T = 24 bits (Ans) Second way : Cache Size $= 2^{19}$ MM size $=2^{40}$ This means, We need to map $\\dfrac{2^{40}}{2^{19}}=2^{21}$ Blocks to one line. And a set contain $2^3$ lines. Therefore, $2^{24}$ blocks are mapped to one set. Using Tag field, I need to identify which one block out of $2^{24}$ blocks are present in this set. Hence, $24$ bits are needed in Tag field.",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a processor with $64$ registers and an instruction set of size twelve. Each instruction has five distinct fields, namely, opcode, two source register identifiers, one destination register identifier, and twelve-bit immediate value. Each instruction must be stored in memory in a byte-aligned fashion. If a program has $100$ instructions, the amount of memory (in bytes) consumed by the program text is _________.",
          "images": [],
          "options": [],
          "correct_answer": "500",
          "explanation": "Answer: 500 bytes Number of registers $= 64$ Number of bits to address register $=\\left \\lceil \\log_{2}64 \\right \\rceil= 6-\\text{bits}$ Number of Instructions $= 12$ Opcode size $=\\left \\lceil \\log_{2}12 \\right \\rceil = 4$ \\begin{array}{|c|c|c|c|} \\hline \\text {Opcode$(4)$} & \\text{ reg1$(6)$}& \\text{reg2$(6)$} & \\text{reg3$(6)$} & \\text{Immediate$(12)$} \\\\\\hline \\end{array} Total bits per instruction $= 34$ Total bytes per instruction $= 4.25$ Due to byte alignment we cannot store $4.25 \\text{ bytes},$ without wasting $0.75\\;\\text{ bytes.}$ So, total bytes per instruction $= 5$ Total number of instructions $= 100$ Total size $=$ Number of instructions $\\times$ Size of an instruction $\\qquad =100\\times 5= 500 \\text{ bytes}$",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A file system uses an in-memory cache to cache disk blocks. The miss rate of the cache is shown in the figure. The latency to read a block from the cache is $1$ ms and to read a block from the disk is $10$ ms. Assume that the cost of checking whether a block exists in the cache is negligible. Available cache sizes are in multiples of $10$ MB. The smallest cache size required to ensure an average read latency of less than $6$ ms is _________ MB.",
          "images": [
            {
              "index": 1,
              "filename": "39592_img1.jpg"
            }
          ],
          "options": [],
          "correct_answer": "30",
          "explanation": "Look aside Cache Latency $= 1$ ms Main Memory Latency $= 10$ ms Lets try with $20$ MB Miss rate $= 60\\%$ , Hit rate $= 40\\%$ Avg $=0.4 (1) +0.6 (10)$ $= 0.4 +6 = 6.4 \\ \\text{ms} > 6\\ \\text{ms}$ Next Take $30$ MB Miss rate $= 40\\%$ , Hit rate $= 60\\%$ Avg $= 0.6 (1) + 0.4 (10)$ $= 0.6 + 4 = 4.6 \\ \\text{ms} < 6 \\ \\text{ms}$ So answer is $30$ MB",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a $3 \\ \\text{GHz}$ (gigahertz) processor with a three stage pipeline and stage latencies $\\large\\tau_1,\\tau_2$ and $\\large\\tau_3$ such that $\\large\\tau_1 =\\dfrac{3 \\tau_2}{4}=2\\tau_3$. If the longest pipeline stage is split into two pipeline stages of equal latency , the new frequency is __________ $\\text{GHz}$, ignoring delays in the pipeline registers.",
          "images": [],
          "options": [],
          "correct_answer": "4",
          "explanation": "Answer is 4 GHz. Given $3$ stage pipeline , with $3\\text{ GHz}$ processor. Given , $e_1 =\\dfrac{3e_2}{4}=2e_3$ Put $e_1 = 6x$ we get, $e_2 = 8x\\ , e_3 = 3x$ Now largest stage time is $8x$. So, frequency is $\\dfrac{1}{8x}$ $\\Rightarrow\\dfrac{1}{8x}=3 \\text{GHz}$ $\\Rightarrow\\dfrac{1}{x}=24\\text{ GHz}\\quad \\rightarrow (1)$ Now, we divide $e_2$ into two stages of $4x\\ \\&\\ 4x.$ New processor has $4$ stages - $6x,\\ 4x,\\ 4x,\\ 3x.$ Now largest stage time is $6x$. So, new frequency is $\\dfrac{1}{6x}$ = $\\dfrac{24}{6}$ = 4 GHz (Ans) $[\\because \\text{from}\\; (1)]$",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A processor has $40$ distinct instruction and $24$ general purpose registers. A $32$-bit instruction word has an opcode, two registers operands and an immediate operand. The number of bits available for the immediate operand field is_______.",
          "images": [],
          "options": [],
          "correct_answer": "16",
          "explanation": "Instruction Opcode Size $= \\log_2 40 = 6$ Register operand size $= \\log_224 =5$ Total bits available $= 32$ Bits required for opcode $+$ two register operands $= 6 + 2 \\times 5 = 16$ Bits available for immediate operand $= 32 - 16 = 16.$",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following reservation table for a pipeline having three stages $S_1, S_2 \\text{ and } S_3$. $$\\begin{array}{|l|l|} \\hline \\textbf{Time} \\rightarrow \\\\\\hline & \\text{1}& \\text{2} & \\text{$3$} & \\text{$4$} & \\text{$5$} \\\\\\hline \\textbf{$S _1$} & \\text{$X$} & & & & \\text{$X$}\\\\\\hline \\textbf{$S _2$} & & \\text{$X$} & & \\text{$X$}\\\\\\hline \\textbf{$S _3$} & & & \\text{$X$} & \\\\\\hline \\end{array}$$ The minimum average latency (MAL) is ______",
          "images": [],
          "options": [],
          "correct_answer": "3",
          "explanation": "Reference: Page 24 http://www2.cs.siu.edu/~cs401/Textbook/ch3.pdf $S_1$ is needed at time $1$ and $5,$ so its forbidden latency is $5-1=4.$ $S_2$ is needed at time $2$ and $4,$ so its forbidden latency is $4-2=2.$ So, forbidden latency $= (2,4,0)$ ( $0$ by default is forbidden) Allowed latency $= (1,3,5)$ (any value more than $5$ also). Collision vector $(4,3,2,1,0) = 10101$ which is the initial state as well. From initial state we can have a transition after $\\text{“1\"}$ or $\\text{“3\"}$ cycles and we reach new states with collision vectors $(10101 >> 1 + 10101 = 11111)$ and $(10101 >> 3 + 10101 = 10111)$ respectively. These $2$ becomes states $2$ and $3$ respectively. For $\\text{“5\"}$ cycles we come back to state $1$ itself. From state $2\\ (11111),$ the new collision vector is $11111.$ We can have a transition only when we see the first $0$ from the right. So, here it happens on $5^{th}$ cycle only which goes to the initial state. (Any transition after $5$ or more cycles goes to initial state as we have $5$ time slices). From state $3\\ (10111),$ the new collision vector is $10111.$ So, we can have a transition on $3,$ which will give $(10111 >> 3 + 10101 = 10111)$ third state itself. For $5,$ we get the initial state. Thus all the transitions are complete. $$\\begin{array}{|c|c|c|} \\hline \\textbf {State\\Time} & \\textbf {1} & \\textbf {3} & \\textbf{5 } \\\\\\hline \\textbf{1(10101)} & \\text{2}& \\text{3} & \\text{1} \\\\\\hline \\textbf{2(11111)} & \\text{-} & \\text{-}& \\text{1}\\\\\\hline \\textbf{3(10111)}& \\text{-}&\\text{3} & \\text{1}\\\\\\hline \\end{array}$$ So, minimum length cycle is of length 3 either from $\\text{3-3}$ or from $\\text{1-3,3-1}$. Not",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following code sequence having five instructions from $I_1 \\text{ to } I_5$. Each of these instructions has the following format. OP Ri, Rj, Rk Where operation OP is performed on contents of registers Rj and Rk and the result is stored in register Ri. $I_1$: ADD R1, R2, R3 $I_2$: MUL R7, R1, R3 $I_3$: SUB R4, R1, R5 $I_4$: ADD R3, R2, R4 $I_5$: MUL R7, R8, R9 Consider the following three statements. S1: There is an anti-dependence between instructions $I_2 \\text{ and } I_5$ S2: There is an anti-dependence between instructions $I_2 \\text{ and } I_4$ S3: Within an instruction pipeline an anti-dependence always creates one or more stalls Which one of the above statements is/are correct? ed Jan 28, 2025 reply Follow flag how we decide to take 5 stage .in this question no mention about stage .also it doesnt say to take risc or not ? 0 0 reply Share Silver_Reaper commented Jan 29, 2025 reply Follow flag Question is not even asking for finding no of clock cycles for all instructions to complete,so why do you even need to know how many stages does this pipeline have? 2 2 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Only S1 is true",
            "B. Only S2 is true",
            "C. Only S1 and S3 are true",
            "D. Only S2 and S3 are true"
          ],
          "correct_answer": "B",
          "explanation": "Answer should be (B). Anti-dependence can be overcome in pipeline using register renaming. So, \"always\" in S3 makes it false. Also, if $I2$ is completed before $I4$ (execution stage of MUL), then also there won't be any stall.",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a machine with a byte addressable main memory of $2^{20}$ bytes, block size of $16$ bytes and a direct mapped cache having $2^{12}$ cache lines. Let the addresses of two consecutive bytes in main memory be $\\textsf{(E201F)}_{16}$ and $\\textsf{(E2020)}_{16}$. What are the tag and cache line addresses ( in hex) for main memory address $\\textsf{(E201F)}_{16}$?",
          "images": [],
          "options": [
            "A. $\\textsf{E, 201}$",
            "B. $\\textsf{F, 201}$",
            "C. $\\textsf{E, E20}$",
            "D. $\\textsf{2, 01F}$"
          ],
          "correct_answer": "A",
          "explanation": "Block size of $16$ bytes means we need $4$ offset bits. (The lowest $4$ digits of memory address are offset bits) Number of sets in cache (cache lines) $= 2^{12}$ so the next lower $12$ bits are used for set indexing. The top $4\\;\\text{bits}\\; ($out of $20)$ are tag bits. So, the answer is A.",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a non-pipelined processor with a clock rate of $2.5$ gigahertz and average cycles per instruction of four. The same processor is upgraded to a pipelined processor with five stages; but due to the internal pipeline delay, the clock speed is reduced to $2$ gigahertz. Assume that there are no stalls in the pipeline. The speedup achieved in this pipelined processor is_______________.",
          "images": [],
          "options": [],
          "correct_answer": "3.2",
          "explanation": "Answer = 3.2. To compute cycle time, we know that a $2.5\\;\\textsf{GHz}$ processor means it completes $2.5\\;\\text{billion}$ cycles in a second. So, for an instruction which on an average takes $4$ cycles to get completed, it will take $\\dfrac{4}{2.5}\\ $ nanoseconds. On a perfect pipleline (i.e., one which has no stalls) $\\text{CPI} = 1$ as during it an instruction takes just one cycle time to get completed. So, Speed Up $=\\dfrac{\\text{Old Execution Time of an Instruction}}{\\text{New Execution Time of an Instruction}}$ $=\\dfrac{\\text{CPI}_{\\text{old}}/\\text{CF}_{\\text{old}}}{\\text{CPI}_{\\text{new}}/\\text{CF}_{\\text{new}}}$ $=\\dfrac{4/2.5\\;\\textsf{GHz}}{1/2\\;\\textsf{GHz}}$ $=3.2$",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the sequence of machine instruction given below: $$\\begin{array}{ll} \\text{MUL} & \\text{R5, R0, R1} \\\\ \\text{DIV} & \\text{R6, R2, R3} \\\\ \\text{ADD} & \\text{R7, R5, R6} \\\\ \\text{SUB} & \\text{R8, R7, R4} \\\\ \\end{array}$$ In the above sequence, $R0$ to $R8$ are general purpose registers. In the instructions shown, the first register shows the result of the operation performed on the second and the third registers. This sequence of instructions is to be executed in a pipelined instruction processor with the following $4$ stages: $(1)$ Instruction Fetch and Decode $(IF)$, $(2)$ Operand Fetch $(OF)$, $(3)$ Perform Operation $(PO)$ and $(4)$ Write back the result $(WB)$. The $IF$, $OF$ and $WB$ stages take $1$ clock cycle each for any instruction. The $PO$ stage takes $1$ clock cycle for ADD and SUB instruction, $3$ clock cycles for MUL instruction and $5$ clock cycles for DIV instruction. The pipelined processor uses operand forwarding from the PO stage to the OF stage. The number of clock cycles taken for the execution of the above sequence of instruction is _________.",
          "images": [],
          "options": [],
          "correct_answer": "13",
          "explanation": "$$\\small \\begin{array}{|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|} \\hline &\\bf{t_1}&\\bf{t_2}&\\bf{t_3}&\\bf{t_4}&\\bf{t_5}&\\bf{t_6}&\\bf{t_7}&\\bf{t_8}&\\bf{t_9}&\\bf{t_{10}}&\\bf{t_{11}}&\\bf{t_{12}}&\\bf{t_{13}}&\\bf{t_{14}}&\\bf{t_{15}}\\\\ \\hline \\textbf{I1}&\\text{IF}&\\text{OF}&\\text{PO}&\\text{PO}&\\text{PO}&\\text{WB}\\\\ \\textbf{I2}&&\\text{IF}&\\text{OF}&\\color{red}{-}&\\color{red}{-}&\\text{PO}&\\text{PO}&\\text{PO}&\\text{PO}&\\color{green}{\\boxed{\\text{PO}}}&\\text{WB}\\\\ \\textbf{I3}&&&\\text{IF}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{green} {\\boxed{\\text{OF}}}&\\color{blue}{\\boxed{\\text{PO}}}&\\text{WB}\\\\ \\textbf{I4}&&&&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\text{IF}&\\color{red}{-} &\\color{blue}{\\boxed{\\text{OF}}} &\\text{PO}&\\text{WB}\\\\ \\hline\\end{array}$$ It is mentioned in the question that operand forwarding takes place from PO stage to OF stage and not to PO stage. So, $15$ clock cycles. But since operand forwarding is from PO-OF, we can do like make the PO stage produce the output during the rising edge of the clock and OF stage fetch the output during the falling edge. This would mean the final PO stage and OF stage can be done in one clock cycle making the total number of cycles $=$ $13$. And $13$ is the answer given in GATE key. $$\\small \\begin{array}{|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|} \\hline &\\bf{t_1}&\\bf{t_2}&\\bf{t_3}&\\bf{t_4}&\\bf{t_5}&\\bf{t_6}&\\bf{t_7}&\\bf{t_8}&\\bf{t_9}&\\bf{t_{10}}&\\bf{t_{11}}&\\bf{t_{12}}&\\bf{t_{13}}\\\\ \\hline \\textbf{I1}&\\text{IF}&\\text{OF}&\\text{PO}&\\text{PO}&\\text{PO}&\\text{WB}\\\\ \\textbf{I2}&&\\text{IF}&\\text{OF}&\\color{red}{-}&\\color{red}{-}&\\text{PO}&\\text{PO}&\\text{PO}&\\text{PO}&\\color{green}{\\boxed{\\text{PO}}}&\\text{WB}\\\\ \\textbf{I3}&&&\\text{IF}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{green} {\\boxed{\\text{OF}}}&\\color{blue}{\\boxed{\\text{PO}}}&\\text{WB}\\\\ \\textbf{I4}&&&&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\text{IF} &\\color{blue}{\\boxed{\\text{OF}}} &\\text{PO}&\\text{WB}\\\\ \\hline\\end{array}$$ Reference: https://web.archive.org/web/20120105062937/http://www.cs.iastate.edu/%7Eprabhu/Tutorial/PIPELINE/forward.html",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a processor with byte-addressable memory. Assume that all registers, including program counter (PC) and Program Status Word (PSW), are size of two bytes. A stack in the main memory is implemented from memory location $(0100)_{16}$ and it grows upward. The stack pointer (SP) points to the top element of the stack. The current value of SP is $(016E)_{16}$. The CALL instruction is of two words, the first word is the op-code and the second word is the starting address of the subroutine (one word = 2 bytes). The CALL instruction is implemented as follows: Store the current value of PC in the stack Store the value of PSW register in the stack Load the statring address of the subroutine in PC The content of PC just before the fetch of a CALL instruction is $(5FA0)_{16}$. After execution of the CALL instruction, the value of the stack pointer is:",
          "images": [],
          "options": [
            "A. $(016A)_{16}$",
            "B. $(016C)_{16}$",
            "C. $(0170)_{16}$",
            "D. $(0172)_{16}$"
          ],
          "correct_answer": "D",
          "explanation": "First we have to consider here memory is byte-addressable The CALL instruction is implemented as follows: Store the current value of PC in the stack PC is $2$ bytes it means when we store pc in stack it will increase by $2$ So current value of SP is $(016E)_{16} +2$ Store the value of PSW register in the stack PSW is $2$ byte it means when we store psw in stack it will increase by $2$ So current value of SP is $(016E)_{16}+2+2 =(0172)_{16}$ $D$",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Assume that for a certain processor, a read request takes $50\\:\\text{nanoseconds}$ on a cache miss and $5\\:\\text{nanoseconds}$ on a cache hit. Suppose while running a program, it was observed that $80\\%$ of the processor's read requests result in a cache hit. The average read access time in nanoseconds is ______.",
          "images": [],
          "options": [],
          "correct_answer": "14",
          "explanation": "Answer is: $14 \\ ns$ $= 0.8(5) + 0.2(50)$ PS: Here instead of cache and main memory access times, time taken on a cache hit and miss are directly given in question. So, $$\\text{Average Access Time} = \\text{Hit Rate} \\times \\text{Hit Time} + \\text{Miss Rate} \\times \\text{Miss Time}$$",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A computer system has a three-level memory hierarchy, with access time and hit ratios as shown below: $$\\overset{ \\text {Level $1$ (Cache memory)} \\\\ \\text{Access time = $50 nsec/byte$}}{\\begin{array}{|l|l|} \\hline \\textbf{Size} & \\textbf{Hit ratio} \\\\\\hline \\text{$8 M $ bytes} & \\text{$0.80$} \\\\\\hline \\text{$16 M $ bytes} & \\text{$0.90$} \\\\\\hline \\text{$64 M $ bytes} & \\text{$0.95$} \\\\\\hline \\end{array}} \\quad \\overset{\\text {Level $2$ (Main memory)} \\\\ \\text{Access time = $200 nsec/byte$}}{\\begin{array}{|l|l|l|} \\hline \\textbf{Size} & \\textbf{Hit ratio} \\\\\\hline \\text{$4 M$ bytes} & \\text{$0.98$} \\\\\\hline \\text{$16 M$ bytes} & \\text{$0.99$} \\\\\\hline \\text{$64 M$ bytes} & \\text{$0.995$} \\\\\\hline \\end{array}} \\quad \\overset{ \\text {Level $3$} \\\\ \\text{Access time = $5$} \\mu \\text{sec/byte}}{\\begin{array}{|l|l|l|} \\hline \\textbf{Size} & \\textbf{Hit ratio} \\\\\\hline \\text{$260M$ bytes} & \\text{$1.0$} \\\\\\hline\\end{array}}$$",
          "images": [],
          "options": [
            "A. What should be the minimum sizes of level $1$ and $2$ memories to achieve an average access time of less than $100 nsec$?",
            "B. What is the average access time achieved using the chosen sizes of level $1$ and level $2$ memories?"
          ],
          "correct_answer": "61.25",
          "explanation": "The equation for access time can be written as follows (assuming $a,b$ are the hit ratios of level 1 and level 2 respectively). $T=T_1 + (1-a)T_2+(1-a)\\times(1-b)T_3$ Here $T\\leq 100, T_1 = 50ns ,T_2 = 200ns$ and $T_3 = 5000 ns.$ On substituting the $a, b$ for the first case we get $T = 95ns$ for $a = 0.8$ and $b = 0.995.$ i.e., $L1 = 8M$ and $L2 = 64M.$ $T = 75ns$ for $a = 0.9$ and $b = 0.99.$ i.e., $L1 = 16M$ and $L2 = 4M$ B. $L_1 = 8M, a = 0.8, L_2 = 4M, b = 0.98$. So, $T = 50 + 0.2 \\times 200 + 0.2 \\times 0.02 \\times 5000 \\\\= 50 + 40 + 20 = 110ns$ $L_1 = 16M, a = 0.9, L_2 = 16M, b = 0.99$. So, $T = 50 + 0.1 \\times 200 + 0.1 \\times 0.01 \\times 5000 \\\\=50 + 20 + 5 = 75ns$ $L_1 = 64M, a = 0.95, L_2= 64M, b = 0.995$. So, $T = 50 + 0.05 \\times 200 + 0.05 \\times 0.005 \\times 5000 \\\\= 50 + 10 + 1.25 = 61.25ns$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A hard disk is connected to a $50$ MHz processor through a DMA controller. Assume that the initial set-up of a DMA transfer takes $1000$ clock cycles for the processor, and assume that the handling of the interrupt at DMA completion requires $500$ clock cycles for the processor. The hard disk has a transfer rate of $2000$ Kbytes/sec and average block transferred is $4$ K bytes. What fraction of the processor time is consumed by the disk, if the disk is actively transferring $100\\%$ of the time?",
          "images": [],
          "options": [],
          "correct_answer": "1.4 : 1.5",
          "explanation": "$2000$ $KB$ is transferred in $1$ second $4$ $KB$ transfer is $(4/2000 ) * 1000 \\text{ ms} = 2 \\text{ ms}$ Total cycle required for locking and handling of interrupts after DMA transfer control $=(1000+500) \\text{ clock cycle } = 1500 \\text{ clock cycle }$ Now, $50$ $Mhz = 50 * 10^6 = 0.02 \\text{ microsecond}$ So, $(1500 * 0.02 ) = 30 \\text{ microsecond}$ $30 \\mu s$ for initialization and termination and $\\ 2 ms$ for data transfer. The CPU time is consumed only for initialization and termination. Fraction of CPU time consumed $=\\dfrac{30\\mu s}{(30\\mu s+2\\,ms)}=0.015$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A micro program control unit is required to generate a total of $25$ control signals. Assume that during any micro instruction, at most two control signals are active. Minimum number of bits required in the control word to generate the required control signals will be:",
          "images": [],
          "options": [
            "A. $2$",
            "B. $2.5$",
            "C. $10$",
            "D. $12$"
          ],
          "correct_answer": "C",
          "explanation": "The best sense I can make of this question is that you want to transmit up to $2$ simultaneous signals out of a choice of $25$, and ask how many bits you need for that. One solution would be to have $2$ groups of $5-bits$, each can send one of $31$ signals (or the absence of signal). But it is not optimal. The number of different states is $1 \\text{(no signal)} + 25 \\text{(one signal)} + (25\\times 24/2) \\text{(two signals)} = 326\\text{ states}.$ You can transmit any of these states over $9 -bits$. But it is more complex to encode/ decode, adding an extra bit would probably cost less. Hence C is correct option. Reference: https://www.ocf.berkeley.edu/~wwu/cgi-bin/yabb/YaBB.cgi?board=riddles_cs;action=display;num=1354778770",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "For the daisy chain scheme of connecting I/O devices, which of the following statements is true?",
          "images": [],
          "options": [
            "A. It gives non-uniform priority to various devices",
            "B. It gives uniform priority to all devices",
            "C. It is only useful for connecting slow devices to a processor device",
            "D. It requires a separate interrupt pin on the processor for each device"
          ],
          "correct_answer": "A",
          "explanation": "Daisy chaining approach tells the processor in which order the interrupt should be handled by providing priority to the devices. In daisy-chaining method, all the devices are connected in serial. The device with the highest priority is placed in the first position, followed by lower priority devices. The interrupt pin is common to all. So answer is option (A).",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Relative mode of addressing is most relevant to writing: Related Questions : GATE CSE 2004 | Question: 20 GATE CSE 1998 | Question: 1.19 GATE CSE 1987 | Question: 1-V 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Co – routines",
            "B. Position – independent code",
            "C. Shareable code",
            "D. Interrupt Handlers"
          ],
          "correct_answer": "B",
          "explanation": "Answer is ( B ) . Relative mode addressing is most relevant to writing a position-independent code. Reference: http://en.wikipedia.org/wiki/Addressing_mode#PC-relative",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A computer system has a $4 \\ K$ word cache organized in block-set-associative manner with $4$ blocks per set, $64$ words per block. The number of bits in the SET and WORD fields of the main memory address format is:",
          "images": [],
          "options": [
            "A. $15, 40$",
            "B. $6, 4$",
            "C. $7, 2$",
            "D. $4, 6$"
          ],
          "correct_answer": "D",
          "explanation": "Number of sets $=\\dfrac{4K}{(64\\times 4)}=16$ So, we need $4$-bits to identify a set $\\Rightarrow$ SET $= 4$ bits. $64$ words per block mean WORD is $6$-bits. So, the answer is an option (D).",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A sequence of two instructions that multiplies the contents of the DE register pair by 2 and stores the result in the HL register pair (in 8085 assembly language) is: 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. XCHG and DAD B",
            "B. XTHL and DAD H",
            "C. PCHL and DAD D",
            "D. XCHG and DAD H"
          ],
          "correct_answer": "would",
          "explanation": "ans b)",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The principle of locality justifies the use of:",
          "images": [],
          "options": [
            "A. Interrupts",
            "B. DMA",
            "C. Polling",
            "D. Cache Memory"
          ],
          "correct_answer": "D",
          "explanation": "Answer is (D) . Locality of reference is actually the frequent accessing of any storage location or some value. We can say in simple language that whatever things are used more frequently, they are stored in the locality of reference. So we have cache memory for the purpose.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "In a vectored interrupt: 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. The branch address is assigned to a fixed location in memory",
            "B. The interrupting source supplies the branch information to the processor through an interrupt vector",
            "C. The branch address is obtained from a register in the processor",
            "D. None of the above"
          ],
          "correct_answer": "B",
          "explanation": "Answer: B A vectored interrupt is a processing technique in which the interrupting device directs the processor to the appropriate interrupt service routine. This is in contrast to a polled interrupt system, in which a single interrupt service routine must determine the source of the interrupt by checking all potential interrupt sources, a slow and relatively laborious process.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which of the following statements is true? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. ROM is a Read/Write memory",
            "B. PC points to the last instruction that was executed",
            "C. Stack works on the principle of LIFO",
            "D. All instructions affect the flags"
          ],
          "correct_answer": "C",
          "explanation": "It is (C) . Only the top of the stack can be accessed at any time. You can imagine a stack to be opened from only one side data structure. So that if we put one thing over the other, we are able to access the last thing we inserted first. That is Last in First Out (LIFO). ROM is Read-Only Memory. PC points to the next instruction to be executed. Not all instructions affect the flags.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "State True or False with one line explanation Expanding opcode instruction formats are commonly employed in RISC. (Reduced Instruction Set Computers) machines. 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "1",
          "explanation": "I think the answer is TRUE . RISC systems use fixed length instruction to simplify pipeline. eg: MIPS, PowerPC: Instructions are $4$ bytes long. CISC systems use Variable-length instructions. eg: Intel $80X86$: Instructions vary from $1$ to $17$ bytes long. Now the challenge is: How to fit multiple sets of instruction types into same (limited) number of bits (Fixed size instruction)? Here comes Expanding opcode into the picture. RISC systems commonly uses Expanding opcode technique to have fixed size instructions.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A computer system has an $L1$ cache, an $L2$ cache, and a main memory unit connected as shown below. The block size in $L1$ cache is $4$ words. The block size in $L2$ cache is $16$ words. The memory access times are $2$ nanoseconds, $20$ nanoseconds and $200$ nanoseconds for $L1$ cache, $L2$ cache and the main memory unit respectively. When there is a miss in $L1$ cache and a hit in $L2$ cache, a block is transferred from $L2$ cache to $L1$ cache. What is the time taken for this transfer?",
          "images": [
            {
              "index": 1,
              "filename": "2352_img1.png"
            }
          ],
          "options": [
            "A. $2$ nanoseconds",
            "B. $20$ nanoseconds",
            "C. $22$ nanoseconds",
            "D. $88$ nanoseconds"
          ],
          "correct_answer": "C",
          "explanation": "Ideally the answer should be $20$ ns as it is the time to transfer a block from $L2$ to $L1$ and this time only is",
          "year": 2010,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A micro instruction is to be designed to specify: The minimum number of bits in the micro-instruction is: $9$ $5$ $8$ None of the above",
          "images": [],
          "options": [
            "A. none or one of the three micro operations of one kind and",
            "B. none or upto six micro operations of another kind"
          ],
          "correct_answer": "C",
          "explanation": "Actually the given question incorporates the concept of horizontal μprogramming (also known as decoded form of control signals) and vertical μprogramming (also known as encoded form of control signals) The $(a)$ part says : none or one of the three micro operations of one kind This is referred to encoding form of vertical one since at most one signal can be active in vertical microprogramming since it involves use of external decoder to select one control signal out of the given control signals.. No of bits required for vertical microprogramming given n number of control signals $=\\lceil ( \\log_{2} n )\\rceil$ Here, $n = 3$ So, no of bits required for part $(a)$ $=\\lceil( \\log_{2} 3)\\rceil= 2$ Now coming to $(b)$ part , it says : none or upto six micro operations of another kind at maximum we can have at most $6$ microoperations of another kind at a time. To accommodate that we need decoded form of control signals which is horizontal signals. So, no of bits required for $(b)$ part $=$ No of control signals of $(b)$ kind $= 6$ Therefore overall bits required to accommodate both $(a)$ and $(b),$ $ = 2 + 6=8-bits$ Besides this, address field, flags etc are also there in a control word. That is why it is",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The correct matching for the following pairs is: $$\\begin{array}{ll} \\text{(A) DMA I/O} & \\text{(1) High speed RAM} \\\\ \\text{(B) Cache} & \\text{(2) Disk} \\\\ \\text{(C) Interrupt I/O} & \\text{(3) Printer} \\\\ \\text{(D) Condition Code Register} & \\text{(4) ALU} \\\\ \\end{array}$$",
          "images": [],
          "options": [
            "A. $A-4\\quad B-3\\quad C-1\\quad D-2$",
            "B. $A-2\\quad B-1\\quad C-3\\quad D-4$",
            "C. $A-4\\quad B-3\\quad C-2\\quad D-1$",
            "D. $A-2\\quad B-3\\quad C-4\\quad D-1$"
          ],
          "correct_answer": "B",
          "explanation": "Correct Option: B. $A-2,B-1,C-3,D-4$ $$\\begin{array}{c l| c l} \\hline \\text{A.} & \\text{DMA I/O} & 2. & \\text{Disk}\\\\\\hline \\text{B.} & \\text{Cache} & 1. & \\text{High-speed RAM} \\\\\\hline \\text{C.} & \\text{Interrupt I/O} & 3. & \\text{Printer}\\\\\\hline \\text{D.} & \\text{Condition Code Register} & 4. & \\text{ALU} \\\\\\hline \\end{array}$$ Reason: DMA I/O - For high speed, high volume data transfer from disk without affecting the processor(in most cases). Cache-A high speed & low memory version of a RAM. Interrupt I/O - The printer sends an interrupt signal when it is ready for use. Condition Code Register - Part of the ALU, as a special purpose register, to store flag bits. [Source - Google/Wikipedia]",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A $5-$stage pipelined processor has Instruction Fetch (IF), Instruction Decode (ID), Operand Fetch (OF), Perform Operation (PO) and Write Operand (WO) stages. The IF, ID, OF and WO stages take $1$ clock cycle each for any instruction. The PO stage takes $1$ clock cycle for ADD and SUB instructions, $3$ clock cycles for MUL instruction and $6$ clock cycles for DIV instruction respectively. Operand forwarding is used in the pipeline. What is the number of clock cycles needed to execute the following sequence of instructions? $$\\begin{array}{|c|l||} \\hline \\textbf {Instruction} & \\textbf{Meaning of instruction} \\\\\\hline \\text{$t _0$: MUL $R _2$,$R _0$,$R _1$} & \\text{R}_2 \\gets \\text{R}_0*\\text{R}_1\\\\\\hline \\text{$t _1$: DIV $R _5,R _3,R _4$} & \\text{R}_5 \\gets \\text{R}_3 ∕ \\text{R}_4\\\\\\hline \\text{$t _2$: ADD $R _2,R _5,R _2$} & \\text{R}_2 \\gets \\text{R}_5 + \\text{R}_2 \\\\\\hline t_3: \\text{SUB} \\:\\text{R}_5,\\text{R}_2,\\text{R}_6 & \\text{R}_5 \\gets \\text{R}_2 - \\text{R}_6 \\\\\\hline\\end{array}$$",
          "images": [],
          "options": [
            "A. $13$",
            "B. $15$",
            "C. $17$",
            "D. $19$"
          ],
          "correct_answer": "B",
          "explanation": "$\\small \\begin{array}{|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|} \\hline &\\bf{t_1}&\\bf{t_2}&\\bf{t_3}&\\bf{t_4}&\\bf{t_5}&\\bf{t_6}&\\bf{t_7}&\\bf{t_8}&\\bf{t_9}&\\bf{t_{10}}&\\bf{t_{11}}&\\bf{t_{12}}&\\bf{t_{13}}&\\bf{t_{14}}&\\bf{t_{15}}\\\\ \\hline \\textbf{MUL}&\\text{IF}&\\text{ID}&\\text{OF}&\\text{PO}&\\text{PO}&\\text{PO}&\\text{WO}\\\\ \\textbf{DIV}&&\\text{IF}&\\text{ID}&\\text{OF}&\\color{red}{-}&\\color{red}{-}&\\text{PO}&\\text{PO}&\\text{PO}&\\text{PO}&\\text{PO}&\\color{green}{\\boxed{\\text{PO}}}&\\text{WO}\\\\ \\textbf{ADD}&&&\\text{IF}&\\text{ID}&\\color{red}{-}&\\color{red}{-}&\\text{OF}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-} &\\color{blue}{\\boxed{\\color{green}{\\boxed{\\text{PO}}}}}&\\text{WO}\\\\ \\textbf{SUB}&&&&\\text{IF}&\\color{red}{-}&\\color{red}{-}&\\text{ID}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&\\color{red}{-} &\\text{OF} &\\color{blue}{\\boxed{\\text{PO}}}&\\text{WO}\\\\ \\hline\\end{array}$ Operand forwarding allows an output to be passed for the next instruction. Here from the output of PO stage of DIV instruction operand is forwarded to the PO stage of ADD instruction and similarly between ADD and SUB instructions. Hence, $15$cycles required. http://www.cs.iastate.edu/~prabhu/Tutorial/PIPELINE/forward.html $B$",
          "year": 2010,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A computer has a $256\\text{-KByte}$, 4-way set associative, write back data cache with block size of $32\\text{-Bytes}$. The processor sends $32\\text{-bit}$ addresses to the cache controller. Each cache tag directory entry contains, in addition to address tag, $2$ valid bits, $1$ modified bit and $1$ replacement bit. The number of bits in the tag field of an address is",
          "images": [],
          "options": [
            "A. $11$",
            "B. $14$",
            "C. $16$",
            "D. $27$"
          ],
          "correct_answer": "C",
          "explanation": "Total cache size $= 256\\ KB$ Cache block size $=32\\text{ Bytes}$ So, number of cache entries $=\\dfrac{ 256\\ K}{32}=8\\ K$ Number of sets in cache $=\\dfrac{ 8\\ K}{4}=2\\ K$ as cache is $4\\text{-way}$ associative. So, $\\log(2048) = 11\\ \\text{bits}$ are needed for accessing a set. Inside a set we need to identify the cache entry. No. of memory block possible $=\\dfrac{\\text{Memory size}}{\\text{Cache block size}}$ $=\\dfrac{2^{32}}{32} = 2^{27}$. So, no. of memory block that can go to a single cache set $=\\dfrac{2^{27}}{2^{11}}$ $=2^{16}.$ So, we need $16\\text{ tag bits}$ along with each cache entry to identify which of the possible $2^{16}$ blocks is being mapped there. $C$",
          "year": 2012,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "An $8\\text{KB}$ direct-mapped write-back cache is organized as multiple blocks, each size of $32\\text{-bytes}$. The processor generates $32\\text{-bit}$ addresses. The cache controller contains the tag information for each cache block comprising of the following. $1$ valid bit $1$ modified bit As many bits as the minimum needed to identify the memory block mapped in the cache. What is the total size of memory needed at the cache controller to store meta-data (tags) for the cache?",
          "images": [],
          "options": [
            "A. $4864$ bits",
            "B. $6144$ bits",
            "C. $6656$ bits",
            "D. $5376$ bits"
          ],
          "correct_answer": "D",
          "explanation": "Number of cache blocks $=\\dfrac{\\text{cache size}}{\\text{size of a block}}$ $=\\dfrac{8\\ KB}{32\\ B}$ $=256$ So, we need $8\\text{-bits}$ for indexing the $256$ blocks of the cache. And since a block is $32\\text{ bytes}$ we need $5$ WORD bits to address each byte. So, out of the remaining $19\\text{-bits}$ (32 - 8 - 5) should be tag bits. So, a tag entry size $=19 + 1\\text{(valid bit)}+1\\text{(modified bit)}=21\\text{ bits}.$ Total size of metadata $= 21\\times \\text{Number of cache blocks}$ $= 21\\times 256$ $=5376\\text{ bits}$ $D$",
          "year": 2011,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider an instruction pipeline with four stages $\\text{(S1, S2, S3 and S4)}$ each with combinational circuit only. The pipeline registers are required between each stage and at the end of the last stage. Delays for the stages and for the pipeline registers are as given in the figure. What is the approximate speed up of the pipeline in steady state under ideal conditions when compared to the corresponding non-pipeline implementation? ed Nov 9, 2025 reply Follow flag Pipeline = max (5, 6, 11, 8) + 1 = 12 ns Non-pipe = 5+6+11+8 = 30 ns speed up = 30 / 12 = 2.5 1 1 reply Share Please log in or register to add a comment.",
          "images": [
            {
              "index": 1,
              "filename": "2143_img1.jpg"
            }
          ],
          "options": [
            "A. $4.0$",
            "B. $2.5$",
            "C. $1.1$",
            "D. $3.0$"
          ],
          "correct_answer": "B",
          "explanation": "Answer is ( B) 2.5 In pipeline system, Time taken is determined by the max delay at any stage i.e., $11$ $\\text{ns}$ plus the delay incurred by pipeline stages i.e., $1$ $\\text{ns}$ = $12$ $\\text{ns}$. In non-pipeline system, Delay = $5$ $\\text{ns}$ $+$ $6$ $\\text{ns}$ $+$ $11$ $\\text{ns}$ $+$ $8$ $\\text{ns}$ $=$ $30$ $\\text{ns}$. $\\therefore$ $\\text{The speedup is}$ $\\frac{30}{12} = 2.5$ $\\text{ns}$.",
          "year": 2011,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "On a non-pipelined sequential processor, a program segment, which is the part of the interrupt service routine, is given to transfer $500$ bytes from an I/O device to memory. Initialize the address register Initialize the count to 500 LOOP: Load a byte from device Store in memory at address given by address register Increment the address register Decrement the count If count !=0 go to LOOP Assume that each statement in this program is equivalent to a machine instruction which takes one clock cycle to execute if it is a non-load/store instruction. The load-store instructions take two clock cycles to execute. The designer of the system also has an alternate approach of using the DMA controller to implement the same transfer. The DMA controller requires $20$ clock cycles for initialization and other overheads. Each DMA transfer cycle takes two clock cycles to transfer one byte of data from the device to the memory. What is the approximate speed up when the DMA controller based design is used in a place of the interrupt driven program based input-output? ed Dec 30, 2025 reply Follow flag @goku4199 Please hide the comment, I have upvoted the answer, writing at two places may get you flagged for spam! 0 0 reply Share js__ commented Jan 21 reply Follow flag speed-up = (2 + 7*500) / (20 + 2*500) = 3502 / 1020 = 3.43 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $3.4$",
            "B. $4.4$",
            "C. $5.1$",
            "D. $6.7$"
          ],
          "correct_answer": "A",
          "explanation": "$$\\begin{array}{llc} & \\textbf{Statement} & \\textbf{Clock Cycles(s) Needed} \\\\\\hline & \\text{Initialize the address register} & \\text{1} \\\\ & \\text{Initialize the count to 500} & \\text{1} \\\\ \\text{LOOP:} &\\textbf{Load}\\text{ a byte from device} & \\text{2} \\\\ & \\textbf{Store}\\text{ in memory at address given by address register} & \\text{2} \\\\ & \\text{Increment the address register} & \\text{1} \\\\ & \\text{Decrement the count} & \\text{1} \\\\ & \\text{If count != 0 go to LOOP} & \\text{1} \\end{array}$$ Interrupt driven transfer time $= 1+1+500\\times(2+2+1+1+1) = 3502$ DMA based transfer time $= 20+500\\times 2 = 1020$ Speedup $= 3502/1020 = 3.4$ $A$",
          "year": 2011,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a hypothetical processor with an instruction of type $\\text{LW R1, 20(R2)}$, which during execution reads a $32\\text{-bit}$ word from memory and stores it in a $32\\text{-bit}$ register $\\text{R1}$. The effective address of the memory location is obtained by the addition of a constant $20$ and the contents of register $\\text{R2}$. Which of the following best reflects the addressing mode implemented by this instruction for the operand in memory? Related Questions : ISRO-DEC2017-43 ed Sep 11, 2024 reply Follow flag In register indirect scaled addressing mode , index and scaling factor should be provide with the base register which is not provided in the instruction and in base indexed addressing base register should be provided with the index which is given in the instruction hence ''d' will be the most appropriate option. 1 1 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Immediate addressing",
            "B. Register addressing",
            "C. Register Indirect Scaled Addressing",
            "D. Base Indexed Addressing"
          ],
          "correct_answer": "D",
          "explanation": "The answer is (D). Base Index Addressing, as the content of register $\\text{R2}$ will serve as the index, and $20$ will be the Base address.",
          "year": 2011,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The memory access time is $1$ nanosecond for a read operation with a hit in cache, $5$ nanoseconds for a read operation with a miss in cache, $2$ nanoseconds for a write operation with a hit in cache and $10$ nanoseconds for a write operation with a miss in cache. Execution of a sequence of instructions involves $100$ instruction fetch operations, $60$ memory operand read operations and $40$ memory operand write operations. The cache hit-ratio is $0.9$. The average memory access time (in nanoseconds) in executing the sequence of instructions is ______.",
          "images": [],
          "options": [],
          "correct_answer": "1.68",
          "explanation": "The question is to find the time taken for, $\\frac{\\Large100 \\space \\text{fetch operations and $60$ operand read operations and $40$ memory operand write operations}}{\\Large\\text{total number of instructions}}$. Total number of instructions $=100+60+40 =200$ Time taken for $100$ fetch operations(fetch = read) $= 100*((0.9*1)+(0.1*5))$ $1$ corresponds to time taken for read when there is cache hit $= 140 \\,\\text{ns}$ $0.9$ is cache hit rate Time taken for $60$ read operations, $= 60*((0.9*1)+(0.1*5))$ $= 84\\,\\text{ns}$ Time taken for $40$ write operations $= 40*((0.9*2)+(0.1*10))$ $= 112\\,\\text{ns}$ Here, $2$ and $10$ are the times taken for write when there is cache hit and no cache hit respectively. So,the total time taken for $200$ operations is, $= 140+84+112$ $= 336\\,\\text{ns}$ Average time taken $=$ time taken per operation $=\\dfrac{336}{200}$ $= 1.68\\,\\text{ns}$",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "An instruction pipeline has five stages, namely, instruction fetch (IF), instruction decode and register fetch (ID/RF), instruction execution (EX), memory access (MEM), and register writeback (WB) with stage latencies $1$ ns, $2.2 $ ns, $2$ ns, $1$ ns, and $0.75$ ns, respectively (ns stands for nanoseconds). To gain in terms of frequency, the designers have decided to split the ID/RF stage into three stages (ID, RF1, RF2) each of latency $2.2/3$ ns. Also, the EX stage is split into two stages (EX1, EX2) each of latency $1$ ns. The new design has a total of eight pipeline stages. A program has $20\\%$ branch instructions which execute in the EX stage and produce the next instruction pointer at the end of the EX stage in the old design and at the end of the EX2 stage in the new design. The IF stage stalls after fetching a branch instruction until the next instruction pointer is computed. All instructions other than the branch instruction have an average CPI of one in both the designs. The execution times of this program on the old and the new design are $P$ and $Q$ nanoseconds, respectively. The value of $P/Q$ is __________.",
          "images": [],
          "options": [],
          "correct_answer": "1.50 : 1.60",
          "explanation": "Five stages: (IF), instruction decode and register fetch (ID/RF), instruction execution (EX), memory access (MEM), and register writeback (WB) P old design: with stage latencies $\\text{1 ns, 2.2 ns, 2 ns, 1 ns, and 0.75 ns}$ $\\text{MAX( 1 ns, 2.2 ns, 2 ns, 1 ns, and 0.75 ns) = 2.2nsec}$ AVG instruction execution time is $\\text{Tavg=(1+no of stalls$\\times $branch penality)$\\times $cycle time}$ $=(1+0.20\\times 2)2.2$ { branch peanlity is $2$ because the next instruction pointer at the end of the EX stage in the old design.} $=3.08 \\text{ nsec}$ Q :new DESIGN: the designers decided to split the ID/RF stage into three stages $\\text{(ID, RF1, RF2)}$ each of latency $\\dfrac{2.2}{3}\\text{ ns}$. Also, the $EX$ stage is split into two stages $\\text{(EX1, EX2)}$ each of latency $1\\text{ ns}$. The new design has a total of eight pipeline stages. Time of stages in new design $=\\text{{1 ns, 0.73ns, 0.73ns, 0.73ns , 1ns,1ns, 1 ns, and 0.75 ns}}$ (IF), instruction decode register fetch (ID/RF) $\\rightarrow$ further divided into $3$ ie with latency $0.73$ of each instruction execution (EX) $\\rightarrow$ further divided int $1\\text{ nsec}$ of each) memory access (MEM) register writeback (WB) $\\text{MAX( 1 ns, 0.73ns, 0.73ns, 0.73ns , 1ns,1ns, 1 ns, and 0.75 ns) =1 nsec}$ AVG instruction execution time is $\\text{Tavg=(1+no of stalls$\\times $branch penality)$\\times $cycle time}$ $=(1+0.20\\times 5)1$ { branch penalty is $5$ because the next instruction pointer at the end of the $EX2$ stage in the new design.} $=2 \\text{nsec}$ final result $\\dfrac{P}{Q}=\\dfrac{3.08}{2}=1.54$",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following processors (ns stands for nanoseconds). Assume that the pipeline registers have zero latency. $\\text{P1:}$ Four-stage pipeline with stage latencies $\\text{1 ns, 2 ns, 2 ns, 1 ns}$. $\\text{P2:}$ Four-stage pipeline with stage latencies $\\text{1 ns, 1.5 ns, 1.5 ns, 1.5 ns}$. $\\text{P3:}$ Five-stage pipeline with stage latencies $\\text{0.5 ns, 1 ns, 1 ns, 0.6 ns, 1 ns}$. $\\text{P4:}$ Five-stage pipeline with stage latencies $\\text{0.5 ns, 0.5 ns, 1 ns, 1 ns, 1.1 ns}$. Which processor has the highest peak clock frequency?",
          "images": [],
          "options": [
            "A. $\\text{P1}$",
            "B. $\\text{P2}$",
            "C. $\\text{P3}$",
            "D. $\\text{P4}$"
          ],
          "correct_answer": "C",
          "explanation": "frequency $=\\dfrac{1}{ \\text{max(time in stages)}}$ for $P_3$, it is $\\dfrac{1}{1} = 1 \\; \\textsf{GHz}$ for $P_1$, it is $\\dfrac{1}{2} = 0.5\\; \\textsf{GHz}$ for $P_2$, it is $\\dfrac{1}{1.5} = 0.67\\;\\textsf{GHz}$ for $P_4$, it is $\\dfrac{1}{1.1} = 0.90 \\;\\textsf{GHz}$ $C$",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "If the associativity of a processor cache is doubled while keeping the capacity and block size unchanged, which one of the following is guaranteed to be NOT affected?",
          "images": [],
          "options": [
            "A. Width of tag comparator",
            "B. Width of set index decoder",
            "C. Width of way selection multiplexer",
            "D. Width of processor to main memory data bus"
          ],
          "correct_answer": "D",
          "explanation": "If associativity is doubled, keeping the capacity and block size constant, then the number of sets gets halved. So, width of set index decoder can surely decrease - (B) is false. Width of way-selection multiplexer must be increased as we have to double the ways to choose from- (C) is false As the number of sets gets decreased, the number of possible cache block entries that a set maps to gets increased. So, we need more tag bits to identify the correct entry. So, (A) is also false. (D) is the main memory data bus has nothing to do with cache associativity- this can be answered without even looking at other options.",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "In designing a computer's cache system, the cache block (or cache line) size is an important parameter. Which one of the following statements is correct in this context?",
          "images": [],
          "options": [
            "A. A smaller block size implies better spatial locality",
            "B. A smaller block size implies a smaller cache tag and hence lower cache tag overhead",
            "C. A smaller block size implies a larger cache tag and hence lower cache hit time",
            "D. A smaller block size incurs a lower cache miss penalty"
          ],
          "correct_answer": "D",
          "explanation": "A smaller block size means during a memory access only a smaller part of near by addresses are brought to cache- meaning spatial locality is reduced. A smaller block size means more number of blocks (assuming cache size constant) and hence index bits go up and offset bits go down. But the tag bits remain the same. A smaller block size implying larger cache tag is true, but this can't lower cache hit time in any way. A smaller block size incurs a lower cache miss penalty. This is because during a cache miss, an entire cache block is fetched from next lower level of memory. So, a smaller block size means only a smaller amount of data needs to be fetched and hence reduces the miss penalty (Cache block size can go till the size of data bus to the next level of memory, and beyond this only increasing the cache block size increases the cache miss penalty). $D$",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A $4$-way set-associative cache memory unit with a capacity of $16$ KB is built using a block size of $8$ words. The word length is $32$ bits. The size of the physical address space is $4$ GB. The number of bits for the TAG field is ____",
          "images": [],
          "options": [],
          "correct_answer": "20",
          "explanation": "Number of sets$=\\dfrac{\\text{cache size}}{\\text{sizeof a set}}$ Size of a set $=\\text{blocksize}\\times \\text{no. of blocks in a set}$ $= 8 \\text{ words}\\times 4\\text{ (4-way set-associative)}$ $= 8\\times 4\\times 4\\text{ (since a word is 32 bits = 4 bytes)}$ $= 128\\text{ bytes}.$ So, number of sets $=\\dfrac{16\\ KB}{(128\\ B)}=128$ Now, we can divide the physical address space equally between these $128$ sets. So, the number of bytes each set can access $=\\dfrac{4\\ GB}{128}$ $={32\\ MB}$ $=\\dfrac{32}{4}=8\\text{ M words}=1 \\text{ M blocks. ($2^{20}$ blocks)}$ So, we need $20$ tag bits to identify these $2^{20}$ blocks.",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider two processors $P_1$ and $P_2$ executing the same instruction set. Assume that under identical conditions, for the same input, a program running on $P_2$ takes $\\text{25%}$ less time but incurs $\\text{20%}$ more CPI (clock cycles per instruction) as compared to the program running on $P_1$. If the clock frequency of $P_1$ is $\\text{1GHZ}$, then the clock frequency of $P_2$ (in GHz) is ______.",
          "images": [],
          "options": [],
          "correct_answer": "1.6",
          "explanation": "CPU TIME $(T) =$ No. of Instructions $( I ) \\times$ No. of Cycles Per Instruction $(c) \\times$ Cycle Time $(t)$ OR CPU TIME $(T) = \\dfrac{\\text{No. of Instructions(I) $\\times$ No. of Cycles Per Instruction (c)}}{\\text{Clock frequency (f)}}$ $\\rightarrow T = I_{c} \\times CPI \\times F^{-1}$ $\\rightarrow \\dfrac{T \\times F}{CPI} = I_{c}$ $P_1$ & $P_2$ executing same instruction set So, No. of Instructions same for both $= I_1 = I_2 = I$ If $P_1$ takes $T_1$ time, $\\rightarrow T_2 = 0.75\\times T_1 \\rightarrow\\dfrac{T_{2}}{ T_{1}}=0.75$ If $P_1$ incurs $C_1$ clock cycles per instruction, $\\rightarrow C_2 =1.2 \\times C_1\\rightarrow \\dfrac{C_{2}}{C_{1}}=1.2$ Since $I$ is same for both, $\\rightarrow \\dfrac{ ( f_{1} \\times T_{1} )}{c1} = \\dfrac{ ( f_{2} \\times T_{2} )}{c2}$ and $f_1 =1\\ GHz$ $\\rightarrow F_2 =(\\dfrac{C_{2}}{C_{1}}) \\times (\\dfrac{T_{1}}{T_{2}}) \\times F_{1}$ $= \\dfrac{1.2 \\times 1 GHz}{0.75}=1.6\\ GHz$ Hence, the clock frequency of $P_2$ is $=1.6\\ GHz$.",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "An access sequence of cache block addresses is of length $N$ and contains n unique block addresses. The number of unique block addresses between two consecutive accesses to the same block address is bounded above by $k$. What is the miss ratio if the access sequence is passed through a cache of associativity $ A\\geq k $ exercising least-recently-used replacement policy?",
          "images": [],
          "options": [
            "A. $\\left(\\dfrac{n}{N}\\right)$",
            "B. $\\left(\\dfrac{1}{N}\\right)$",
            "C. $\\left(\\dfrac{1}{A}\\right)$",
            "D. $\\left(\\dfrac{k}{n}\\right)$"
          ],
          "correct_answer": "A",
          "explanation": "There are $N$ accesses to cache. Out of these $n$ are unique block addresses. Now, we need to find the number of misses. (min. $n$ misses are guaranteed whatever be the access sequence due to $n$ unique block addresses). We are given that between two consecutive accesses to the same block, there can be only $k$ unique block addresses. So, for a block to get replaced we can assume that all the next $k$ block addresses goes to the same set (given cache is set-associative) which will be the worst case scenario (they may also go to a different set but then there is lesser chance of a replacement). Now, if associativity size is $\\geq k$, and if we use LRU (Least Recently Used) replacement policy, we can guarantee that these $k$ accesses won't throw out our previously accessed cache entry (for that we need at least k accesses). So, this means we are at the best-cache scenario for cache replacement -- out of $N$ accesses we miss only $n$ (which are unique and can not be helped from getting missed and there is no block replacement in cache). So, miss ratio is $n/N$. PS: In question it is given \"bounded above by $k$\", which should mean $k$ unique block accesses as $k$ is an integer, but to ensure no replacement this must be '$k-1$'. Guess, a mistake in question. $A$",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a $6$-stage instruction pipeline, where all stages are perfectly balanced. Assume that there is no cycle-time overhead of pipelining. When an application is executing on this $6$-stage pipeline, the speedup achieved with respect to non-pipelined execution if $25$% of the instructions incur $2$ pipeline stall cycles is ____________",
          "images": [],
          "options": [],
          "correct_answer": "4",
          "explanation": "Time without pipeline $=6 \\text{ stages}=6 \\text{ cycles}$ Time with pipeline $=1+\\text{stall freqency}\\times \\text{stall cycle}$ $=1+.25\\times 2$ $=1.5$ Speed up $=\\dfrac{6}{1.5}=4$",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A CPU has a $32 KB$ direct mapped cache with $128$ byte-block size. Suppose A is two dimensional array of size $512 \\times512$ with elements that occupy $8$-bytes each. Consider the following two C code segments, $P1$ and $P2$. P1: for (i=0; i<512; i++) { for (j=0; j<512; j++) { x +=A[i] [j]; } } P2: for (i=0; i<512; i++) { for (j=0; j<512; j++) { x +=A[j] [i]; } } $P1$ and $P2$ are executed independently with the same initial state, namely, the array $A$ is not in the cache and $i$, $j$, $x$ are in registers. Let the number of cache misses experienced by $P1$ be $M_{1}$and that for $P2$ be $M_{2}$. The value of $M_{1}$ is:",
          "images": [],
          "options": [
            "A. $0$",
            "B. $2048$",
            "C. $16384$",
            "D. $262144$"
          ],
          "correct_answer": "C",
          "explanation": "Code being C implies array layout is row-major. http://en.wikipedia.org/wiki/Row-major_order When $A[0][0]$ is fetched, $128$ consecutive bytes are moved to cache. So, for the next $\\dfrac{128}{8} -1=15$ memory references there won't be a cache miss. For the next iteration of $i$ loop also the same thing happens as there is no temporal locality in the code. So, number of cache misses for $P1$ is $= \\dfrac{512}{16} \\times 512$ $ = 32 \\times 512 $ $=2^{14} = 16384$ $C$",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider two cache organizations. First one is $32 \\; \\textsf{KB}\\;2\\text{-way}$ set associative with $32 \\; \\text{byte}$ block size, the second is of same size but direct mapped. The size of an address is $32\\; \\text{bits}$ in both cases . A $2\\text{-to-}1$ multiplexer has latency of $0.6 \\; \\text{ns}$ while a $k\\text{-bit}$ comparator has latency of $\\frac{k}{10} \\text{ns}$. The hit latency of the set associative organization is $h_1$ while that of direct mapped is $h_2$. The value of $h_1$ is:",
          "images": [],
          "options": [
            "A. $2.4 \\text{ ns} $",
            "B. $2.3 \\text{ ns}$",
            "C. $1.8 \\text{ ns}$",
            "D. $1.7 \\text{ ns}$"
          ],
          "correct_answer": "A",
          "explanation": "Cache size is $32 \\hspace{0.2cm} KB$ and cache block size is $32 \\hspace{0.2cm} B$. So, $\\text{Number of sets} = \\dfrac{\\text{cache size}}{\\text{no. of blocks in a set } \\times \\text{ block size}}$ $ = \\dfrac{32 \\hspace{0.2cm}KB}{2 \\times 32 \\hspace{0.2cm}B} = 512$ So, number of index bits needed $= 9$ ( since $2^9 = 512$). Number of offset bits $= 5$ (since $2^5 = 32 \\hspace{0.2cm} B$ is the block size and assuming byte addressing). So, number of tag bits $= 32 - 9 - 5 = 18$ (as memory address is of $32 \\hspace{0.2cm} bits$). So, $\\text{ time for comparing the data}$ $ \\text{= Time to compare the data + Time to select the block in set} \\\\= 0.6 + 18/10 \\text{ ns} \\\\= 2.4 \\text{ ns}.$ (Two comparisons of tag bits need to be done for each block in a set, but they can be carried out in parallel and the succeeding one multiplexed as the output). Reference: https://courses.cs.washington.edu/courses/cse378/09au/lectures/cse378au09-19.pdf $A$",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a new instruction named branch-on-bit-set (mnemonic bbs). The instruction “bbs reg, pos, label” jumps to label if bit in position pos of register operand reg is one. A register is $32$ -bits wide and the bits are numbered $0$ to $31,$ bit in position $0$ being the least significant. Consider the following emulation of this instruction on a processor that does not have bbs implemented. $temp\\leftarrow reg \\& mask$ Branch to label if temp is non-zero. The variable temp is a temporary register. For correct emulation, the variable mask must be generated by ed Aug 21, 2024 reply Follow flag this will help https://www.youtube.com/live/2greQ1zLPxs?feature=shared&t=710 7 7 reply Share mohdamaan commented Nov 6, 2024 reply Follow flag Watch this u will have no problem in this question. 1 1 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $ mask\\leftarrow \\text{0x1} << pos$",
            "B. $ mask\\leftarrow \\text{0xffffffff} << pos$",
            "C. $ mask\\leftarrow pos $",
            "D. $ mask\\leftarrow \\text{0xf}$"
          ],
          "correct_answer": "A",
          "explanation": "$mask\\leftarrow \\text{0x1} << pos$ We want to check for a particular bit position say $2$ (third from right). Let the number be $0xA2A7$ (last $4$ bits being $0111$). Here, the bit at position $2$ from right is $1$. So, we have to AND this with $0x0004$ as any other flag would give wrong value (may count other bits or discard the bit at position \"$pos$\"). And $0x0004$ is obtained by $0x1 << 2$ (by shifting $1$ \"$pos$\" times to the left we get a flag with $1$ being set only for the \"$pos$\" bit position).",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A CPU has a five-stage pipeline and runs at $1$ GHz frequency. Instruction fetch happens in the first stage of the pipeline. A conditional branch instruction computes the target address and evaluates the condition in the third stage of the pipeline. The processor stops fetching new instructions following a conditional branch until the branch outcome is known. A program executes $10^9$ instructions out of which $20\\%$ are conditional branches. If each instruction takes one cycle to complete on average, the total execution time of the program is:",
          "images": [],
          "options": [
            "A. $\\text{1.0 second}$",
            "B. $\\text{1.2 seconds}$",
            "C. $\\text{1.4 seconds}$",
            "D. $\\text{1.6 seconds}$"
          ],
          "correct_answer": "C",
          "explanation": "Delay slots in the pipeline caused due to a branch instruction is $2$ as after the $3^{rd}$ stage of current instruction (during $4^{th}$ stage) IF of next begins. Ideally, this should be during $2\\text{nd}$ stage. So, for total no. of instructions = $10^9$ and $20\\%$ branch, we have $0.2 \\times 2 \\times 10^9 = 4 \\times 10^8$ cycle penalty. Since clock speed is $1\\text{ GHz}$ and each instruction on average takes $1$ cycle, total execution time in seconds will be $=\\dfrac{10^9}{10^9}+4 \\times \\dfrac{10^8}{10^9}$ $= 1.4$ $C$",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A CPU has a cache with block size $64$ bytes. The main memory has $k$ banks, each bank being $c$ bytes wide. Consecutive $c$ − byte chunks are mapped on consecutive banks with wrap-around. All the $k$ banks can be accessed in parallel, but two accesses to the same bank must be serialized. A cache block access may involve multiple iterations of parallel bank accesses depending on the amount of data obtained by accessing all the $k$ banks in parallel. Each iteration requires decoding the bank numbers to be accessed in parallel and this takes $\\frac{k}{2} ns$.The latency of one bank access is $80$ ns. If $c = 2$ and $k = 24$, the latency of retrieving a cache block starting at address zero from main memory is:",
          "images": [],
          "options": [
            "A. $92$ ns",
            "B. $104$ ns",
            "C. $172$ ns",
            "D. $184$ ns"
          ],
          "correct_answer": "D",
          "explanation": "This question is based on the concept of MEMORY INTERLEAVING... which says that instead of accessing data from memory every time, it is better to divide memory in modules or banks and distribute consecutive data on each module to access the data in parallel..to improve data transfer rate. For this purpose the additional decoder is used to access each module in parallel, so we have to count the latency of decoder also along with each module latency. now i am going to explain the solution:----> according to the original question there are k banks and k=24 and each bank has c bytes where c=2 . So total we got 2*24=48 bytes in one iteration. now we have to calculate one iteration latency: decoding time for one iteration is k/2 ns: 24/2=12 ns and each bank latency is 80 ns normally when decoder latency is given then total iteration time is calculated as; K*(decoder latency) + bank latency but here we have given the total decoding latency of iteration=12 ns therefore for one iteration we require : 12+80= 92 ns Now as we discussed above in one iteration we can get 48 bytes of data but question ask for cache block(64 bytes) transfer therefore we require 2 iterations....... that is 2*92=184 ns",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A machine has a $32\\text{-bit}$ architecture, with $1\\text{-word}$ long instructions. It has $64$ registers, each of which is $32$ bits long. It needs to support $45$ instructions, which have an immediate operand in addition to two register operands. Assuming that the immediate operand is an unsigned integer, the maximum value of the immediate operand is ____________",
          "images": [],
          "options": [],
          "correct_answer": "16383",
          "explanation": "$64$ registers means $6$ bits $(\\lceil \\log_2 64 \\rceil = 6)$ for a register operand. So, $2$ register operands require $12$ bits. Now, $45$ instructions require another $6$ bits for opcode $(\\lceil \\log_2 45 \\rceil = 6)$. So, totally $18$ bits. Now we have $32 - 18 = 14$ bits left for the immediate operand. So, the max value will be $2^{14} - 1 = 16383$ (as the operand is unsigned we do not need a sign bit and with $14$ bits we can represent from $0$ to $2^{14} -1$)",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The address space of $8086$ CPU is",
          "images": [],
          "options": [
            "A. one Megabyte",
            "B. $256$ Kilobytes",
            "C. $1 \\;\\text{K}$ Megabytes",
            "D. $64$ Kilobytes"
          ],
          "correct_answer": "A",
          "explanation": "in 8086 architecture there are 16 bit data lines and 20 address lines. 20 lines means 2^20 byte = 1 mega byte",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which of the following is true?",
          "images": [],
          "options": [
            "A. Unless enabled, a CPU will not be able to process interrupts.",
            "B. Loop instructions cannot be interrupted till they complete.",
            "C. A processor checks for interrupts before executing a new instruction.",
            "D. Only level triggered interrupts are possible on microprocessors."
          ],
          "correct_answer": "A",
          "explanation": "Answer is (A). Options (B) and (D) are obviously false. A processor checks for the interrupt before FETCHING an instruction, so option (C) is also false.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which of the following addressing modes permits relocation without any change whatsoever in the code? Related Questions : GATE CSE 2004 | Question: 20 GATE CSE 1996 | Question: 1.16, ISRO2016-42 GATE CSE 1987 | Question: 1-V 🚩 Edit necessary | 👮 Arjun ed Nov 16, 2024 reply Follow flag The question makes more sense if they remove the \"in the code\" part. If a swap happens, the base register needs to updated to reflect the new memory location at which the process is loaded. However, no such management is required in PC relative addressing. Hence, PC relative addressing requires no change whatsoever during both - the intial load and also while swapping the process into new memory location. 1 1 reply Share divy.sisodia commented Jan 16 reply Follow flag Answer: $Option (D)$ Think of it like this - If the code has already been written by using PC relative indexing addressing mode. In this case, if this code is reloacted to any position, nothing has to be changed. It will simply work as it is. But if the code was written using base register addressing mode, then if the code is relocated to some other location, then the contents of the base register will have to be changed. 1 1 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Indirect addressing",
            "B. Indexed addressing",
            "C. Base register addressing",
            "D. PC relative addressing"
          ],
          "correct_answer": "D",
          "explanation": "( D ) PC relative addressing is the best option. For Base register addressing, we have to change the address in the base register while in PC relative there is absolutely no change in code needed.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following sequence of micro-operations. MBR ← PC MAR ← X PC ← Y Memory ← MBR Which one of the following is a possible operation performed by this sequence?",
          "images": [],
          "options": [
            "A. Instruction fetch",
            "B. Operand fetch",
            "C. Conditional branch",
            "D. Initiation of interrupt service"
          ],
          "correct_answer": "D",
          "explanation": "Here PC value is being stored in memory which is done when either CALL RETURN involved or there is Interrupt. As, we will have to come back to execute current instruction. So, options (A), (B) are clearly incorrect. Option (C) is incorrect because conditional branch does not require to save PC contents. Option (D) is correct as it matches the generic Interrupt Cycle : $$\\text{Interrupt Cycle:}$$ $$\\begin{array}{lcl} t_1:&\\text{MBR}&\\leftarrow(\\text{PC})\\\\ t_2:&\\text{MAR}&\\leftarrow(\\text{save-address})\\\\ &\\text{PC}&\\leftarrow(\\text{routine-address})\\\\ t_3:&\\text{Memory}&\\leftarrow(\\text{MBR})\\\\ \\end{array}$$",
          "year": 2013,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "An instruction pipeline consists of $4$ stages – Fetch $(F)$, Decode field $(D)$, Execute $(E)$ and Result Write $(W)$. The $5$ instructions in a certain instruction sequence need these stages for the different number of clock cycles as shown by the table below $$\\begin{array}{|c|c|c|c|c|} \\hline \\textbf{Instruction} & \\textbf {F} &\\textbf {D} & \\textbf {E} & \\textbf{W } \\\\\\hline \\textbf{1}& 1 & 2 & 1 & 1 \\\\\\hline \\textbf{2} & 1 & 2 & 2 & 1\\\\\\hline \\textbf{3}& 2 & 1 & 3 & 2 \\\\\\hline \\textbf{4} & 1 & 3 & 2 & 1 \\\\\\hline \\textbf{5} & 1 & 2 & 1 & 2 \\\\\\hline \\end{array}$$ Find the number of clock cycles needed to perform the $5$ instructions.",
          "images": [],
          "options": [],
          "correct_answer": "15",
          "explanation": "Answer: 15 cycles are required. $$\\begin{array}{c|ccccccccccccc} &t_1&t_2&t_3&t_4&t_5&t_6&t_7&t_8&t_9&t_{10}&t_{11}&t_{12}&t_{13}&t_{14}&t_{15}\\\\\\hline I_1&\\text{F}&\\text{D}&\\text{D}&\\text{E}&\\text{W} \\\\ I_2&&\\text{F}&-&\\text{D}&\\text{D}&\\text{E}&\\text{E}&\\text{W}\\\\ I_3&&&&\\text{F}&\\text{F}&\\text{D}&-&\\text{E}&\\text{E}&\\text{E}&\\text{W}&\\text{W}\\\\ I_4&&&&&&\\text{F}&-&\\text{D}&\\text{D}&\\text{D}&\\text{E}&\\text{E}&\\text{W}\\\\ I_5&&&&&&&&\\text{F}&-&-&\\text{D}&\\text{D}&\\text{E}&\\text{W}&\\text{W}\\\\ \\end{array}$$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A certain processor supports only the immediate and the direct addressing modes. Which of the following programming language features cannot be implemented on this processor?",
          "images": [],
          "options": [
            "A. Pointers",
            "B. Arrays",
            "C. Records",
            "D. Recursive procedures with local variable"
          ],
          "correct_answer": "A;B;C;D",
          "explanation": "Pointer access requires indirect addressing which can be simulated with indexed addressing or register indirect addressing but not with direct and immediate addressing. An array and record access needs a pointer access. So, options (A), (B) and (C) cannot be implemented on such a processor. Now, to handle recursive procedures we need to use stack. A local variable inside the stack will be accessed as *$(SP+\\text{offset})$ which is nothing but a pointer access and requires indirect addressing. Usually this is done by moving the SP value to Base register and then using Base Relative addressing to avoid unnecessary memory accesses for indirect addressing- but not possible with just direct and immediate addressing. So, options (A), (B), (C) and (D) are correct.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The main difference(s) between a CISC and a RISC processor is/are that a RISC processor typically",
          "images": [],
          "options": [
            "A. has fewer instructions",
            "B. has fewer addressing modes",
            "C. has more registers",
            "D. is easier to implement using hard-wired logic"
          ],
          "correct_answer": "A;B;C;D",
          "explanation": "All are properties of the RISC processor. http://cs.stanford.edu/people/eroberts/courses/soco/projects/risc/whatis/index.html http://cs.stanford.edu/people/eroberts/courses/soco/projects/risc/risccisc/index.html https://web.archive.org/web/20161106095605/http://alpha-1.movie.coocan.jp/computer/Control_E.html",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Arrange the following configuration for CPU in decreasing order of operating speeds: Hard wired control, Vertical microprogramming, Horizontal microprogramming. 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Hard wired control, Vertical microprogramming, Horizontal microprogramming.",
            "B. Hard wired control, Horizontal microprogramming, Vertical microprogramming.",
            "C. Horizontal microprogramming, Vertical microprogramming, Hard wired control.",
            "D. Vertical microprogramming, Horizontal microprogramming, Hard wired control."
          ],
          "correct_answer": "B",
          "explanation": "Hard wired control involves only hardware, whereas microprogramming is software approach. So, hardwire control should be faster than both microprogramming approaches. Between vertical and horizontal microprogramming. Horizontal is faster because in this control signals are not encoded whereas in vertical microprogramming to save memory signals are encoded. So, it takes less time in horizontal microprogramming because decoding of signals is not required. Therefore, final order is : hard wired control > horizontal microprogramming > vertical microprogramming $B$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The main memory of a computer has $2\\;\\text{cm}$ blocks while the cache has $2\\;\\text{c}$ blocks. If the cache uses the set associative mapping scheme with $2$ blocks per set, then block $k$ of the main memory maps to the set:",
          "images": [],
          "options": [
            "A. $(k \\mod m)$ of the cache",
            "B. $(k \\mod c)$ of the cache",
            "C. $(k \\mod 2c)$ of the cache",
            "D. $(k \\mod 2\\; cm)$ of the cache"
          ],
          "correct_answer": "B",
          "explanation": "Number of cache blocks $= 2c$ Number of sets in cache $=\\dfrac{2c}{2}=c$ since each set has $2$ blocks. Now, a block of main memory gets mapped to a set (associativity of $2$ just means there are space for $2$ memory blocks in a cache set), and we have $2\\,cm$ blocks being mapped to $c$ sets. So, in each set $2m$ different main memory blocks can come and block $k$ of main memory will be mapped to $k \\mod c.$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "In a $k$-way set associative cache, the cache is divided into $v$ sets, each of which consists of $k$ lines. The lines of a set are placed in sequence one after another. The lines in set $s$ are sequenced before the lines in set $(s+1)$. The main memory blocks are numbered 0 onwards. The main memory block numbered $j$ must be mapped to any one of the cache lines from",
          "images": [],
          "options": [
            "A. $(j\\text{ mod }v) * k \\text{ to } (j \\text{ mod } v) * k + (k-1) $",
            "B. $(j \\text{ mod } v) \\text{ to } (j \\text{ mod } v) + (k-1) $",
            "C. $(j \\text{ mod } k) \\text{ to } (j \\text{ mod } k) + (v-1) $",
            "D. $(j \\text{ mod } k) * v \\text{ to } (j \\text{ mod } k) * v + (v-1) $"
          ],
          "correct_answer": "A",
          "explanation": "Number of sets in cache $= v$. The question gives a sequencing for the cache lines. For set $0$, the cache lines are numbered $0, 1, .., k-1$. Now for set $1$, the cache lines are numbered $k, k+1,... k+k-1$ and so on. So, main memory block $j$ will be mapped to set $(j \\ \\text{mod} \\ v)$, which will be any one of the cache lines from $(j \\ \\text{mod } v) * k \\ \\text{ to } (j \\ \\text{mod } v) * k + (k-1)$. (Associativity plays no role in mapping- $k$-way associativity means there are $k$ spaces for a block and hence reduces the chances of replacement.) $A$",
          "year": 2013,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following data path of a $\\text{CPU}.$ The $\\text{ALU},$ the bus and all the registers in the data path are of identical size. All operations including incrementation of the $\\text{PC}$ and the $\\text{GPRs}$ are to be carried out in the $\\text{ALU}.$ Two clock cycles are needed for memory read operation – the first one for loading address in the $\\text{MAR}$ and the next one for loading data from the memory bus into the $\\text{MDR}.$ The instruction $``\\text{add R0, R1}”$ has the register transfer interpretation $\\text{R0} \\Leftarrow \\text{R0 + R1}.$ The minimum number of clock cycles needed for execution cycle of this instruction is: ed Nov 11, 2025 reply Follow flag Load R0 → S (temp reg) → 1 cycle Load R1 → T (temp reg) → 1 cycle ALU: S + T → R0 → 1 cycle Total Cycles 1+1+1=3 0 0 reply Share Please log in or register to add a comment.",
          "images": [
            {
              "index": 1,
              "filename": "1402_img1.png"
            }
          ],
          "options": [
            "A. $2$",
            "B. $3$",
            "C. $4$",
            "D. $5$"
          ],
          "correct_answer": "B",
          "explanation": "Instruction fetch requires two cycles but the question asks for the execution part only! Now for execution: $R1_{out}, S_{in}\\qquad S \\leftarrow R0 \\quad -1^{st}$ cycle $R2_{out}, T_{in}\\qquad T \\leftarrow R1 \\quad - 2^{nd}$ cycle $S_{out}, T_{out}, \\text{Add } R0_{in} \\quad R0 \\leftarrow R0 + R1 \\quad - 3^{rd}$ cycle So, $3$ cycles for execution. As it is",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a disk drive with the following specifications: $16$ surfaces, $512$ tracks/surface, $512$ sectors/track, $1$ KB/sector, rotation speed $3000$ rpm. The disk is operated in cycle stealing mode whereby whenever one $4$ byte word is ready it is sent to memory; similarly, for writing, the disk interface reads a $4$ byte word from the memory in each DMA cycle. Memory cycle time is $40$ nsec. The maximum percentage of time that the CPU gets blocked during DMA operation is:",
          "images": [],
          "options": [
            "A. $10$",
            "B. $25$",
            "C. $40$",
            "D. $50$"
          ],
          "correct_answer": "B",
          "explanation": "First lets calculate the disk transfer rate. Only one surface is read/written at a time. In one rotation, one track is read One track has $512$ sectors and $1\\;KB$ per sector means $512\\;KB$ per track Rotations Per Minute is $3000\\implies 3000 \\times 512\\;KB$ per minute (or) $50 \\times 512\\;KB$ per second = $25600\\;KBps$ Time to read $4$ bytes $ = \\dfrac{4}{25600 \\times 1024} s = 152.6 ns$ Since memory cycle time is $40\\; ns$ this will be $\\left \\lceil \\dfrac{152.6}{40} \\right\\rceil =4$ cycles. Now, coming to DMA, it does not block the CPU directly but it steals the memory cycles and if the CPU is needing memory it gets blocked. So, in worst case (see the usage “ maximum percentage of time” in question) lets assume CPU is needing memory all the time (fully memory bound process execution). In this case the percentage of time CPU gets blocked will be the amount of time DMA is using the memory cycles. Whenever $4$ bytes is ready from disk, memory cycles are taken – this needs $40\\;$ ns When memory cycles are used, disk will continue to fetch further data – it is not getting blocked here or the disk wont be waiting for this $40\\;ns$ if it has any pending read That is, if DMA is continuously transferring data, one in every $4$ memory cycles can get blocked. So, the maximum percentage of time CPU gets blocked $ = \\dfrac{1}{4} \\times 100 = 25 \\%$ Correct Option: B Reference",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A device with data transfer rate $10$ KB/sec is connected to a CPU. Data is transferred byte-wise. Let the interrupt overhead be $4\\mu$sec. The byte transfer time between the device interface register and CPU or memory is negligible. What is the minimum performance gain of operating the device under interrupt mode over operating it under program-controlled mode? ed Nov 18, 2022 reply Follow flag They should have",
          "images": [],
          "options": [
            "A. $15$",
            "B. $25$",
            "C. $35$",
            "D. $45$"
          ],
          "correct_answer": "B",
          "explanation": "In Programmed I/O, the CPU issues a command and waits for I/O operations to complete. So here, CPU will wait for $1\\text{ sec}$ to transfer $10\\ KB$ of data. The minimum performance gain for interrupt mode happens for the smallest unit of data transfer – which here is $1$ byte. Time to transfer $1$ byte of data in programmed I/O mode $=\\dfrac{1}{10\\; KBps} = 100 \\mu s$ In Interrupt mode, to transfer $1$ byte of data, overhead is $4 \\times 10^{-6}s = 4\\mu s$ Performance gain $=\\dfrac{100}{4}= 25$ Thus, (b) is",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A $5$ stage pipelined CPU has the following sequence of stages: IF – instruction fetch from instruction memory RD – Instruction decode and register read EX – Execute: ALU operation for data and address computation MA – Data memory access – for write access, the register read at RD state is used. WB – Register write back Consider the following sequence of instructions: $I_1$: $L$ $R0, loc$ $1$; $R0 \\Leftarrow M[loc1]$ $I_2$: $A$ $R0$, $R0$; $R0 \\Leftarrow R0 +R0$ $I_3$: $S$ $R2$, $R0$; $R2 \\Leftarrow R2-R0$ Let each stage take one clock cycle. What is the number of clock cycles taken to complete the above sequence of instructions starting from the fetch of $I_1$?",
          "images": [],
          "options": [
            "A. $8$",
            "B. $10$",
            "C. $12$",
            "D. $15$"
          ],
          "correct_answer": "A",
          "explanation": "Answer is option A. Without data forwarding: 13 clock - WB and RD state non overlapping. $$\\begin{array}{|c|c|c|c|c|} \\hline \\textbf {T1} & \\textbf {T2} & \\textbf {T3} & \\textbf {T4} & \\textbf {T5} & \\textbf {T6} & \\textbf {T7} & \\textbf {T8} & \\textbf {T9} & \\textbf {T10} & \\textbf {T11} & \\textbf {T12} & \\textbf {T13} \\\\\\hline \\text{IF}& \\text{RD} & \\text{EX} & \\text{MA} & \\text{WB} & & \\\\\\hline \\text{} & \\text{IF} & &&&\\text{RD} & \\text{EX} & \\text{MA} & \\text{WB} & \\text{} & \\text{}\\\\\\hline &&&&& \\text{IF}& & & &\\text{RD} & \\text{EX} & \\text{MA}&\\text{WB} \\\\\\hline \\end{array}$$ Here, WB and RD stage operate in Non-Overlapping mode. 11 clock - WB and RD states overlapping. $$\\begin{array}{|c|c|c|c|c|} \\hline \\textbf {T1} & \\textbf {T2} & \\textbf {T3} & \\textbf {T4} & \\textbf {T5} & \\textbf {T6} & \\textbf {T7} & \\textbf {T8} & \\textbf {T9} & \\textbf {T10} & \\textbf {T11} \\\\\\hline \\text{IF}& \\text{RD} & \\text{EX} & \\text{MA} & \\text{WB} & & \\\\\\hline \\text{} & \\text{IF} & &&\\text{RD} & \\text{EX} & \\text{MA} & \\text{WB} & \\text{} & \\text{}\\\\\\hline &&&& \\text{IF}& & &\\text{RD} & \\text{EX} & \\text{MA}&\\text{WB} \\\\\\hline \\end{array}$$ Split Phase access between WB and RD means: WB stage produce the output during the rising edge of the clock and RD stage fetch the output during the falling edge. In Question it is mentioned for write access, the register read at RD state is used. This means that for writing operands back to memory, register read at RD state is used (no operand forward for STORE instructions). Note As in any question in any subject unless otherwise stated we always consider the best case. So, do overlap - unless otherwise stated. But this is for only WB/RD Why there is stall for I2 in T3 and T4 ? RD is instruction decode and register read. IF we execute RD of I2 in T3, data from memory will not get stored to R0 hence proper operands are not available at T3. Perhaps I2 has to wait until I1 write values to memory. WB of I1 and RD of I2 are operating in same clock why it is so ? If nothing has mentioned in question. This scenario is taken into consideration by default. It is because after MA operands will be available in register so RD and WB could overlap . With data forwarding (Should be the case here as question says no operand forwarding for memory register for STORE instructions) 8 clock cycles Why there is a stall I2 in T4 ? Data is being forwarded from MA of I1 EX of I2 .MA operation of I1 must complete so that correct data will be available in register . Why RD of I2 in T3 ? Will it not fetch incorrect information if executed before Operand are forwarded from MA of I1 ? Yes. RD of I2 will definitely fetch INCORRECT data at T3 . But don't worry about it Operand Forwarding technique will take care of it . Why can't RD of I2 be placed in T4 ? Yes . We can place RD of I2 in T4 as well. But what is the fun in that ? pipeline is a technique used to reduce the execution time of instructions . Why do we need to make an extra stall ? Moreover there is one more problem which is discussed just below .After reading the below point Just think if we had created a stall at T3 ! Why can't RD of I3 be placed at T4 ? This cannot be done . I3 cannot use RD because Previous instruction I2 should start next stage (EX) before current (I3) could utilize that(RD) stage . It is because data will be residing in buffers. Can an operand being forwarded from one clock cycle to same clock cycle ? No, the previous clock cycle must complete before data being forwarded . Unless split phase technique is used Cant there be a forwarding from EX stage(T3) of I1 to EX stage(T4) of I2 ? This is not possible . See what is happening in I1 . It is Memory Read .So data will be available in register after memory read only .So data cannot be forwarded from EX of I1 . In some case data is forwarded from MA and some case data is forwarded from EX Why it is so ? Data is forwarded when it is ready . It solely depends on the type of instruction . When to use Split-Phase ? We can use split phase if data is readily available like between WB/RD and also when operand forwarding happens from EX-ID stage, but not from EX-EX stage. We cannot do split phase access between EX-EX because here the instruction execution may not be possible in the first phase. (This is not mentioned in any standard resource but said by Arjun Suresh by considering practical implementation and how previous year GATE questions have been formed) [Mostly it is given in question that there is operand forwarding from A stage to B stage eg: https://gateoverflow.in/8218/gate2015-2_44 ] Split-Phase can be used even when no Operand Forwarding because they aren't related. References http://web.cs.iastate.edu/~prabhu/Tutorial/PIPELINE/forward.html Similar Questions https://gateoverflow.in/8218/gate2015-2_44 https://gateoverflow.in/2207/gate2010-33 https://gateoverflow.in/34735/pipelining-without-operand-forwarding Discussions https://gateoverflow.in/102565/operand-forwarding-in-pipeline https://gateoverflow.in/113244/doubts-in-pipelining",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a direct mapped cache of size $32$ $KB$ with block size $32$ $bytes$. The $CPU$ generates $32$ $bit$ addresses. The number of bits needed for cache indexing and the number of tag bits are respectively,",
          "images": [],
          "options": [
            "A. $10, 17$",
            "B. $10, 22$",
            "C. $15, 17$",
            "D. $5, 17$"
          ],
          "correct_answer": "A",
          "explanation": "Number of blocks $= \\dfrac{\\text{cache size}}{\\text{block size}}= \\dfrac{32\\text{ KB}}{32 \\text{ B} }=\\text{1024}$ So, indexing requires $\\text{10-bits}.$ Number of OFFSET bits required to access $\\text{32-bit block} = 5.$ So, number of TAG bits $= 32 - 10 - 5 = 17.$ So, answer is (A).",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Match each of the high level language statements given on the left hand side with the most natural addressing mode from those listed on the right hand side.$$\\begin{array}{clcl} \\text{(1)} &\\text{$A[I] = B[J]$} & \\qquad\\text{(a)} &\\text{Indirect addressing} \\\\ \\text{(2)} &\\text{while $(^*A\\text{++});$} & \\qquad\\text{(b)} & \\text{Indexed addressing} \\\\ \\text{(3)} & \\text{int temp $= ^*x$} & \\qquad\\text{(c)} &\\text{Auto increment} \\\\ \\end{array}$$ See all 3 Comments 3 3 Comments reply jatinmittal199510 commented Apr 17, 2021 i int main() { int b[] = {3,2,0,1}; int *A = b; //*A++ will be treated as *(A++) but increment of A will happen after using *A for condition check while(*A++){ printf(\"%d\\n\",*A); } return 0; } Output: 2 0 #include <stdio.h> int main() { int b[] = {3,2,0,1}; int *A = b; //value of A[0] is checked for condition and then A[0] is incremented by 1, always checking A[0] while((*A)++){ printf(\"%d\\n\",*A); } return 0; } Output: 4 5 6 7 . . . 8 8 reply Share Pranavpurkar commented Nov 28, 2022 reply Follow flag @jatinmittal199510 Sir, output of the first code will be :2,0,1. why will it not print 1? 0 0 reply Share Abhrajyoti00 commented Jan 23, 2023 reply Follow flag @Pranavpurkar This is because after *A = 0 is in while loop, it breaks out. Thus although later A++ makes it point to the 4 th element (i.e. 1) it can’t print it. 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $(1, c), (2, b), (3, a)$",
            "B. $(1, c), (2, c), (3, b)$",
            "C. $(1, b), (2, c), (3, a)$",
            "D. $(1, a), (2, b), (3, c)$"
          ],
          "correct_answer": "C",
          "explanation": "$C$ is the answer. $A[i] = B[j]$; Indexed addressing while $(^*A++)$; Auto increment temp $=^*x$; Indirect addressing",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a three word machine instruction $\\text{ADD} A[R_0], @B$ The first operand (destination) $“A[R_0]”$ uses indexed addressing mode with $R_0$ as the index register. The second operand (source) $“@B”$ uses indirect addressing mode. $A$ and $B$ are memory addresses residing at the second and third words, respectively. The first word of the instruction specifies the opcode, the index register designation and the source and destination addressing modes. During execution of $\\text{ADD}$ instruction, the two operands are added and stored in the destination (first operand). The number of memory cycles needed during the execution cycle of the instruction is:",
          "images": [],
          "options": [
            "A. $3$",
            "B. $4$",
            "C. $5$",
            "D. $6$"
          ],
          "correct_answer": "B",
          "explanation": "$1\\;\\text{memory read}$ to get the first operand from memory address $A+R_0\\; (A$ is given as part of instruction) $1\\;\\text{memory read}$ to get the address of the second operand (since second uses indirect addressing) $1\\;\\text{memory read}$ to get the second operand from the address given by the previous memory read $1\\;\\text{memory write}$ to store to first operand (which is the destination) So, total of $4$ memory cycles once the instruction is fetched. The second and third words of the instruction are loaded as part of the Instruction fetch and not during the execute stage. Reference: http://www.cs.iit.edu/~cs561/cs350/fetch/fetch.html",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a $4$-way set associative cache (initially empty) with total $16$ cache blocks. The main memory consists of $256$ blocks and the request for memory blocks are in the following order: $0, 255, 1, 4, 3, 8, 133, 159, 216, 129, 63, 8, 48, 32, 73, 92, 155.$ Which one of the following memory block will NOT be in cache if LRU replacement policy is used?",
          "images": [],
          "options": [
            "A. $3$",
            "B. $8$",
            "C. $129$",
            "D. $216$"
          ],
          "correct_answer": "D",
          "explanation": "$16$ blocks and sets with $4$ blocks each means there are $4$ sets.So, the lower $2$ bits are used for getting a set and $4$-way associative means in a set only the last $4$ cache accesses can be stored. $\\text{0, 255, 1, 4, 3, 8, 133, 159, 216, 129, 63, 8, 48, 32, 73, 92, 155}$ mod $4$ gives, $\\text{0, 3, 1, 0, 3, 0, 1, 3, 0, 1, 3, 0, 0, 0, 1, 0, 3}$ Now for each of $0..3,$ the last $4$ accesses will be in cache. So, $\\text{{92, 32, 48, 8}, {155, 63, 159, 3}, {73, 129, 133, 1} and {}}$ will be in cache. So, the missing element from choice is $216.$ $D$",
          "year": 2009,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a $4$ stage pipeline processor. The number of cycles needed by the four instructions $I1, I2, I3, I4$ in stages $S1, S2, S3, S4$ is shown below: $$\\begin{array}{|c|c|c|c|c|} \\hline \\textbf{} & \\textbf {S1} &\\textbf {S2} & \\textbf {S3} & \\textbf{S4 } \\\\\\hline \\textbf{I1}& 2 & 1 & 1 & 1 \\\\\\hline \\textbf{I2} & 1 & 3 & 2 & 2\\\\\\hline \\textbf{I3}& 2 & 1 & 1 & 3 \\\\\\hline \\textbf{I4} & 1 & 2 & 2 & 2 \\\\\\hline \\end{array}$$ What is the number of cycles needed to execute the following loop? For (i=1 to 2) {I1; I2; I3; I4;}",
          "images": [],
          "options": [
            "A. $16$",
            "B. $23$",
            "C. $28$",
            "D. $30$"
          ],
          "correct_answer": "B",
          "explanation": "Here bound of the loop are constants, therefore compiler will do the loop unrolling(If compiler won't then prefetcher will do) to increase the instruction level parallelism. And after loop unrolling $23$ cycles are required for execution. Therefore, be (B). PS: We assume the buffers between the pipeline stages can store multiple results in the form of a queue. $$\\tiny \\begin{array}{|c|c|c|c|c|c|c|c|c|c|c|c|c|} \\hline &C_1&C_2&C_3&C_4&C_5&C_6&C_7&C_8&C_9&C_{10}&C_{11}&C_{12}&C_{13}&C_{14}&C_{15}&C_{16}&C_{17}&C_{18}&C_{19}&C_{20} &C_{21}&C_{22}&C_{23}\\\\\\hline \\bf{I_1}&S_1&S_1&S_2&S_3&S_4\\\\\\hline \\bf{I_2}&&&S_1&S_2&S_2&S_2&S_3& S_3&S_4&S_4\\\\\\hline \\bf{I_3}&&&&S_1&S_1&\\color{red}{-}&S_2&\\color{red}{-}&S_3&\\color{red}{-}&S_4& S_4&S_4\\\\\\hline \\bf{I_4}&&&&&&S_1&\\color{red}{-}&S_2&S_2&S_3&S_3&\\color{red}{-}&\\color{red}{-}&S_4&S_4\\\\\\hline \\bf{I_1}&&&&&&&S_1&S_1&\\color{red}{-}&S_2&\\color{red}{-}&S_3&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&S_4\\\\\\hline \\bf{I_2}&&&&&&&&&S_1&\\color{red}{-}&S_2&S_2&S_2&S_3& S_3&\\color{red}{-}&S_4&S_4\\\\\\hline \\bf{I_3}&&&&&&&&&&S_1&S_1&\\color{red}{-}&\\color{red}{-}&S_2&\\color{red}{-}&S_3&\\color{red}{-}&\\color{red}{-}&S_4& S_4&S_4\\\\\\hline \\bf{I_4} &&&&&&&&&&&&S_1&\\color{red}{-}&\\color{red}{-}&S_2&S_2&S_3&S_3&\\color{red}{-}&\\color{red}{-}&\\color{red}{-}&S_4&S_4\\\\\\hline \\end{array} $$",
          "year": 2009,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A CPU generally handles an interrupt by executing an interrupt service routine: 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. As soon as an interrupt is raised.",
            "B. By checking the interrupt register at the end of fetch cycle.",
            "C. By checking the interrupt register after finishing the execution of the current instruction.",
            "D. By checking the interrupt register at fixed time intervals."
          ],
          "correct_answer": "C",
          "explanation": "It will be (C) . After finishing the execution of each instruction the CPU reads the interrupt pins to recognize the interrupts. INTR $= 1 =$ Interrupt is present.(Service the Interrupt) $= 0 =$ Interrupt is not present.(Goto next Instruction fetch from user program)",
          "year": 2009,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a machine with a byte addressable main memory of $2^{16}$ bytes. Assume that a direct mapped data cache consisting of $32$ lines of $64$ bytes each is used in the system. A $50 \\times 50$ two-dimensional array of bytes is stored in the main memory starting from memory location $1100H$. Assume that the data cache is initially empty. The complete array is accessed twice. Assume that the contents of the data cache do not change in between the two accesses. How many data misses will occur in total?",
          "images": [],
          "options": [
            "A. $48$",
            "B. $50$",
            "C. $56$",
            "D. $59$"
          ],
          "correct_answer": "C",
          "explanation": "Bits used to represent the address = $\\log_2{2^{16}} = 16$ Each cache line size $=64$ bytes; means offset requires $6\\text{-bits}$ Total number of lines in cache $= 32;$ means line # requires $5\\text{-bits}$ So, tag bits $= 16- 6-5=5$ We have a $2\\text{D-array}$ each of its element is of size $=1\\text{ Byte};$ Total size of this array $= 50 \\times 50 \\times 1\\text{ Byte}=2500\\text{ Bytes}$ So, total number of lines it will require to get contain in cache $=\\dfrac{2500B}{64B} = 39.0625 \\approx 40$ Starting address of array $= 1100H = 00010 \\ 00100 \\ 000000$ The group of bits in middle represents Cache Line number $\\implies$ array starts from cache line number $4$, We require $40$ cache lines to hold all array elements, but we have only $32$ cache lines Lets group/partition our $2500$ array elements in those $40$ array lines, we call this first array line as $A_0$ which will have $64$ of its elements. This line(group of $64$ elements) of array will be mapped to cache line number $4$ as found by analysis of starting address of array above. This all means that among those $40$ array lines some array lines will be mapped to same cache line, coz there are just $32$ cache lines but $40$ of array lines. This is how mapping is: $\\begin{matrix} 0& A_{28} & \\\\ 1& A_{29} & \\\\ 2& A_{30} & \\\\ 3& A_{31} & \\\\ 4& A_{0} & A_{32} \\\\ 5& A_{1} & A_{33} \\\\ 6& A_{2} & A_{34} \\\\ 7& A_{3} & A_{35} \\\\ 8& A_{4} & A_{36} \\\\ 9& A_{5} & A_{37} \\\\ 10& A_{6} & A_{38} \\\\ 11& A_{7} & A_{39} \\\\ 12& A_{8} & \\\\ \\vdots\\\\ 30& A_{26} & \\\\ 31& A_{27} & \\end{matrix}$ So, if we access complete array twice we get $=32+8+8+8 = 56$ miss because only $8$ lines from cache line number $4$ to $11$ are miss operation, rest are Hits(not counted) or Compulsory misses(first 32). Hence, answer is option (C).",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following program segment. Here $\\text{R1, R2}$ and $\\text{R3}$ are the general purpose registers. $$\\begin{array}{|l|l|l|c|} \\hline & \\text {Instruction} & \\text{Operation }& \\text{Instruction Size} \\\\ & & & \\text{(no. of words)} \\\\\\hline & \\text{MOV R1,(3000)} & \\text{R1} \\leftarrow \\text{M[3000]} & \\text{$2$} \\\\\\hline \\text{LOOP:}& \\text{MOV R2,(R3)} & \\text{R2} \\leftarrow \\text{M[R3]} & \\text{$1$} \\\\\\hline & \\text{ADD R2,R1} & \\text{R2} \\leftarrow \\text{R1 + R2} & \\text{$1$} \\\\\\hline & \\text{MOV (R3),R2} & \\text{M[R3]} \\leftarrow \\text{R2} & \\text{$1$} \\\\\\hline& \\text{INC R3} & \\text{R3} \\leftarrow \\text{R3 + 1} & \\text{$1$} \\\\\\hline & \\text{DEC R1} & \\text{R1} \\leftarrow \\text{R1 – 1} & \\text{$1$} \\\\\\hline& \\text{BNZ LOOP} & \\text{Branch on not zero} & \\text{$2$} \\\\\\hline & \\text{HALT} & \\text{Stop} & \\text{$1$} \\\\\\hline\\end{array}$$ Assume that the content of memory location $3000$ is $10$ and the content of the register $\\text{R3}$ is $2000$. The content of each of the memory locations from $2000$ to $2010$ is $100$. The program is loaded from the memory location $1000$. All the numbers are in decimal. Assume that the memory is word addressable. The number of memory references for accessing the data in executing the program completely is",
          "images": [],
          "options": [
            "A. $10$",
            "B. $11$",
            "C. $20$",
            "D. $21$"
          ],
          "correct_answer": "D",
          "explanation": "Loop is executed $10$ times and there are two memory reference in the loop (each MOV is loading $1$ word, so $1$ memory reference for each MOV inside the loop). So number of memory reference inside loop is $2 \\text{(MOV)}\\times 10\\text{ (times iteration)}\\times 1\\text{(1 word access/ MOV)} =20\\text{ memory accesses.}$ One memory access is outside the loop for the first instruction MOV R1, (3000) So, totally $20+1 = 21$ $D$",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "In a simplified computer the instructions are: $$\\begin{array}{|l|l|} \\hline \\text {OP }R _j , R _i & \\text{Perform }R _j \\text{ OP } R _i \\text{ and store the result in register }R _j \\\\\\hline \\text{OP }m,R _i & \\text{Perform } val\\text{ OP }R _i \\text{ and store the result in register }R _i \\\\ & val \\text{ denotes the content of the memory location }m \\\\\\hline \\text{MOV }m,R _i & \\text{Moves the content of memory location }m \\text{ to register }R _i \\\\\\hline \\text{MOV }R _i,m & \\text{Moves the content of register }R _i\\text{ to memory location }m\\\\\\hline \\end{array}$$ The computer has only two registers, and OP is either ADD or SUB. Consider the following basic block: $t_1\\: = \\: a+b$ $t_2\\: = \\: c+d$ $t_3\\: = \\: e-t_2$ $t_4\\: = \\: t_1 – t_3$ Assume that all operands are initially in memory. The final value of the computation should be in memory. What is the minimum number of MOV instructions in the code generated for this basic block?",
          "images": [],
          "options": [
            "A. $2$",
            "B. $3$",
            "C. $5$",
            "D. $6$"
          ],
          "correct_answer": "B",
          "explanation": "MOV $a, R_1$ ADD $b, R_1$ MOV $c, R_2$ ADD $d, R_2$ SUB $e, R_2$ SUB $R_1, R_2$ MOV $R_2, m$ Total number of MOV instructions $= 3$ $B$",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a pipelined processor with the following four stages: IF: Instruction Fetch ID: Instruction Decode and Operand Fetch EX: Execute WB: Write Back The IF, ID and WB stages take one clock cycle each to complete the operation. The number of clock cycles for the EX stage depends on the instruction. The ADD and SUB instructions need $1$ clock cycle and the MUL instruction needs $3$ clock cycles in the EX stage. Operand forwarding is used in the pipelined processor. What is the number of clock cycles taken to complete the following sequence of instructions? $$\\begin{array}{ll} \\textbf{ADD} & \\text{R2, R1, R0} &&& \\text{R2 $\\leftarrow$ R1$+$R0} \\\\ \\textbf{MUL} & \\text{R4, R3, R2} &&& \\text{R4 $\\leftarrow$ R3$*$R2} \\\\ \\textbf{SUB} & \\text{R6, R5, R4} &&& \\text{R6 $\\leftarrow$ R5$-$R4} \\\\ \\end{array}$$",
          "images": [],
          "options": [
            "A. $7$",
            "B. $8$",
            "C. $10$",
            "D. $14$"
          ],
          "correct_answer": "B",
          "explanation": "Answer: option B. Considering EX to EX data forwarding. $$\\small \\begin{array}{|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|} \\hline &\\bf{t_1}&\\bf{t_2}&\\bf{t_3}&\\bf{t_4}&\\bf{t_5}&\\bf{t_6}&\\bf{t_7}&\\bf{t_8}\\\\ \\hline \\textbf{ADD}&\\text{IF}&\\text{ID}&\\color{green}{\\boxed{\\text{EX}}}&\\text{WB}&&&\\\\ \\textbf{MUL}&&\\text{IF}&\\text{ID}&\\color{green}{\\boxed{\\text{EX}}}&\\text{EX}&\\color{blue}{\\boxed{\\text{EX}}}&\\text{WB}\\\\ \\textbf{SUB}&&&\\text{IF}&\\text{ID}&\\color{red}{-}&\\color{red}{-}&\\color{blue}{\\boxed{\\text{EX}}}&\\text{WB}\\\\ \\hline\\end{array}$$ EX to EX data Forwarding:",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a $4$-way set associative cache consisting of $128$ lines with a line size of $64$ words. The CPU generates a $20-bit$ address of a word in main memory. The number of bits in the TAG, LINE and WORD fields are respectively:",
          "images": [],
          "options": [
            "A. $9, 6, 5$",
            "B. $7, 7, 6$",
            "C. $7, 5, 8$",
            "D. $9, 5, 6$"
          ],
          "correct_answer": "D",
          "explanation": "Number of sets $=\\dfrac{\\text{cache size}}{\\text{(size of a block * No. of blocks in a set)}}$ $=\\dfrac{128 * 64}{(64 * 4)}\\text{ (4 way set associative means 4 blocks in a set)}$ $= 32.$ So, number of index (LINE) bits $= 5$ and number of WORD bits $= 6$ since cache block (line) size is $64.$ So, number of TAG bits $= 20 - 6 - 5 = 9.$ Answer is (D) choice",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A 4-stage pipeline has the stage delays as $150$, $120$, $160$ and $140$ $nanoseconds$, respectively. Registers that are used between the stages have a delay of $5$ $nanoseconds$ each. Assuming constant clocking rate, the total time taken to process $1000$ data items on this pipeline will be:",
          "images": [],
          "options": [
            "A. $\\text{120.4 microseconds}$",
            "B. $\\text{160.5 microseconds}$",
            "C. $\\text{165.5 microseconds}$",
            "D. $\\text{590.0 microseconds}$"
          ],
          "correct_answer": "C",
          "explanation": "Pipelining requires all stages to be synchronized meaning, we have to make the delay of all stages equal to the maximum pipeline stage delay which here is $160$. We also have to add the intermediate register delay which here is $5ns$ which makes the clock period as $165ns.$ Time for execution of the first instruction $= 165* 4 = 660$ ns. Now, in every $165$ ns, an instruction can be completed. So, Total time for $1000$ instructions $= 660 + 999*165 = 165.495$ microseconds $C$",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A hard disk with a transfer rate of $10$ Mbytes/second is constantly transferring data to memory using DMA. The processor runs at $600$ MHz, and takes $300$ and $900$ clock cycles to initiate and complete DMA transfer respectively. If the size of the transfer is $20$ Kbytes, what is the percentage of processor time consumed for the transfer operation? ; it helped me to revisit the topic. 2 2 reply Share goku4199 commented Oct 14, 2025 reply Follow flag Ans 0 0 reply Share divy.sisodia commented Jan 16 reply Follow flag The first 300 cycles spent by the $CPU is for the DMA register initialization(source address, destination address, count register, and mode register). The 900 cycles needed by the CPU at the end/completion of the data transfer are spent in servicing the ISR for the interrupt raised by the DMA after completion. 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $5.0 \\%$",
            "B. $1.0\\%$",
            "C. $0.5\\%$",
            "D. $0.1\\%$"
          ],
          "correct_answer": "D",
          "explanation": "Clock cycle time = $\\frac{1}{600 \\times 10^6}$ [ Frequency = 1/Time] For DMA initiation and completion = $\\frac{(900+300)}{600\\times10^6} = 2$ microsec . Disk Transfer rate $= 10$ Mbytes/sec $1$ byte $= \\frac{1}{10^7}$ sec $20$ Kbytes $= 2$ milisec $= 2000$ micro sec Percentage $= \\left (\\frac{2}{2+2000} \\right )\\times100 =0.0999 ≃ 0.1\\%$ option (D) $\\%$ of CPU time consumed $=\\frac{x}{x+y}$ If $x$ is the Data preparation time or Total cycle time used by CPU and $y$ is the Data transfer time, to calculate the fraction of CPU time to the data transfer time - we use $\\frac{x}{x+y}$ in burst mode.",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The microinstructions stored in the control memory of a processor have a width of $26$ bits. Each microinstruction is divided into three fields: a micro-operation field of $13$ bits, a next address field $(X),$ and a MUX select field $(Y).$ There are $8$ status bits in the input of the MUX. How many bits are there in the $X$ and $Y$ fields, and what is the size of the control memory in number of words?",
          "images": [
            {
              "index": 1,
              "filename": "1061_img1.png"
            }
          ],
          "options": [
            "A. $10, 3, 1024$",
            "B. $8, 5, 256$",
            "C. $5, 8, 2048$",
            "D. $10, 3, 512$"
          ],
          "correct_answer": "A",
          "explanation": "$x + y + 13 = 26 \\rightarrow (1)$ $y = 3$ $(y)$ is no of bits used to represent 8 different states of multiplexer $ \\rightarrow (2)$ $x$ is no of bits required represent size of control memory $x = 10$ from $(1)$ and $(2)$ $\\therefore$ Size of control memory $= 2^x = 2^{10}= 1024$ $A$",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a small two-way set-associative cache memory, consisting of four blocks. For choosing the block to be replaced, use the least recently used (LRU) scheme. The number of cache misses for the following sequence of block addresses is: $8, 12, 0, 12, 8$.",
          "images": [],
          "options": [
            "A. $2$",
            "B. $3$",
            "C. $4$",
            "D. $5$"
          ],
          "correct_answer": "C",
          "explanation": "We have $4$ blocks and $2$ blocks in a set $\\implies$ there are $2$ sets. So blocks will go to sets as follows: $$\\begin{array}{|c|c|} \\hline \\textbf {Set Number} & \\textbf{Block Number} \\\\\\hline \\text{0} & \\text{0,8,12} \\\\\\hline\\text{1} & \\\\\\hline \\end{array}$$ Since the lowest bit of block address is used for indexing into the set, so $8, 12$ and $0$ first miss in cache with $0$ replacing $8$ (there are two slots in each set due to $2-\\text{way}$ set) and then $12$ hits in cache and $8$ again misses. So, totally $4$ misses. $C$",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following program segment for a hypothetical CPU having three user registers $R_1, R_2$ and $R_3.$ $$\\begin{array}{|l|l|c|} \\hline \\text {Instruction} & \\text{Operation }& \\text{Instruction size} \\\\&& \\text{(in words)} \\\\\\hline \\text{MOV $R_1,5000$} & \\text{$R_1$} \\leftarrow \\text{Memory$[5000]$}& \\text{$2$} \\\\\\hline\\text{MOV $R2,(R1)$} & \\text{$R2$} \\leftarrow \\text{Memory$[(R_1)]$}& \\text{$1$} \\\\\\hline \\text{ADD $R_2,R_3$} & \\text{$R2$} \\leftarrow \\text{$R_2 + R_3$} & \\text{$1$} \\\\\\hline \\text{MOV $6000,R_2$} & \\text{Memory$[6000]$} \\leftarrow \\text{$R_2$} & \\text{$2$} \\\\\\hline \\text{HALT} & \\text{Machine Halts} & \\text{$1$} \\\\\\hline \\end{array}$$Consider that the memory is byte addressable with size $32$ bits, and the program has been loaded starting from memory location $1000$ (decimal). If an interrupt occurs while the CPU has been halted after executing the HALT instruction, the return address (in decimal) saved in the stack will be",
          "images": [],
          "options": [
            "A. $1007$",
            "B. $1020$",
            "C. $1024$",
            "D. $1028$"
          ],
          "correct_answer": "D",
          "explanation": "Option is D. Word size is $32$ $bits$ ($4$ $bytes$). Interrupt occurs after execution of HALT instruction NOT during , So address of next instruction will be saved on to the stack which is $1028$. (We have $5$ instructions starting from address $1000$, each of size $2, 1, 1, 2, 1$ totaling $7$ words $= 7 *4 =28$ $bytes$). $1000+ 28 = 1028$, $1028$ is the starting address of NEXT Instruction . After HALT instruction CPU enters a HALT state and if an interrupt happens the return address will be that of the instruction after the HALT. References : https://x86.puri.sm/html/file_module_x86_id_134.html [ X86 Instructors Manual ] http://electronics.stackexchange.com/questions/277735/what-happens-if-the-interrupt-occurs-during-the-execution-of-halt-instruction https://en.wikipedia.org/wiki/HLT_(x86_instruction)",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which of the following addressing modes are suitable for program relocation at run time? I and IV I and II II and III I, II and IV Related Questions : GATE CSE 1998 | Question: 1.19 GATE CSE 1996 | Question: 1.16, ISRO2016-42 GATE CSE 1987 | Question: 1-V ed Jan 20, 2025 reply Follow flag Relative addressing mode, Indexed addressing mode, Base register addressing mode all these 3 are relocatable codes. 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Absolute addressing",
            "B. Based addressing",
            "C. Relative addressing",
            "D. Indirect addressing"
          ],
          "correct_answer": "C",
          "explanation": "Answer: (C) A displacement type addressing should be preferred. So, (I) is not the answer. Indirect Addressing leads to extra memory reference which is not preferable at run time. So, (IV) is not the answer.",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following assembly language program for a hypothetical processor $A, B,$ and $C$ are $8-$bit registers. The meanings of various instructions are shown as comments. $$\\small \\begin{array}{lll} & \\text{MOV B, #0}&& \\text{;} & \\text{$B \\leftarrow 0$} \\\\& \\text{MOV C, #8} && \\text{;}& \\text{$C \\leftarrow 8$} \\\\ \\text{Z:} & \\text{CMP C, #0} &&\\text{;}& \\text{compare C with 0} \\\\ & \\text{JZ X} && \\text{;}& \\text{jump to X if zero flag is set} \\\\ & \\text{SUB C, #1} && \\text{;}& \\text{$C \\gets C-1$} \\\\ & \\text{RRC A, #1} && \\text{;}& \\text{right rotate A through carry by one bit. Thus:} \\\\ & \\text{} && \\text{;}& \\text{If the initial values of A and the carry flag are $a_7\\ldots a_0$ and} \\\\ & \\text{} && \\text{;}& \\text{$c_0$ respectively, their values after the execution of this} \\\\ & \\text{} && \\text{;}& \\text{instruction will be $c_0a_7\\ldots a_1$ and $a_0$ respectively.} \\\\ & \\text{JC Y} && \\text{;}& \\text{jump to Y if carry flag is set} \\\\ & \\text{JMP Z} && \\text{;}& \\text{jump to Z} \\\\ \\text{Y:} & \\text{ADD B, #1} && \\text{;}& \\text{$B \\gets B+1$} \\\\ & \\text{JMP Z} && \\text{;}& \\text{jump to Z} \\\\ \\text{X:}& \\text{} && \\text{;}& \\text{} \\\\ \\end{array}$$ If the initial value of register A is A0 the value of register B after the program execution will be",
          "images": [],
          "options": [
            "A. the number of $0$ bits in $A_0$",
            "B. the number of $1$ bits in $A_0$",
            "C. $A_0$",
            "D. $8$"
          ],
          "correct_answer": "B",
          "explanation": "All other instructions except CMP are self explanatory. CMP A, #K The above instruction does A – #K, where A is a register and #K is a constant value, and if the result is positive, negative or zero, sets the flag accordingly which in turn activates the following “JZ” (Jump on Zero), “JP” (Jump on Positive), “JN” (Jump on Negative) etc. The mnemonic I used here might be different on different architecture but the working remains the same. So, the code here is counting the number of 1 bits in $A_0$. When a 1 is moved to carry, B is incremented. Correct Option: B.",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "For a pipelined CPU with a single ALU, consider the following situations Which of the above can cause a hazard I and II only II and III only III only All the three 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. The ${j+1}^{st}$ instruction uses the result of the $j^{th}$ instruction as an operand",
            "B. The execution of a conditional jump instruction",
            "C. The $j^{th}$ and ${j+1}^{st}$ instructions require the ALU at the same time."
          ],
          "correct_answer": "D",
          "explanation": "1. Data hazard 2. Control hazard 3. Structural hazard as only one ALU is there So, $(D)$. https://web.archive.org/web/20120106063906/http://www.cs.iastate.edu/~prabhu/Tutorial/PIPELINE/hazards.html",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A CPU has $24$-$bit$ instructions. A program starts at address $300$ (in decimal). Which one of the following is a legal program counter (all values in decimal)? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $400$",
            "B. $500$",
            "C. $600$",
            "D. $700$"
          ],
          "correct_answer": "C",
          "explanation": "Option $(C)$. $24$ bits = $3$ bytes instructions. So, PC will have multiples of $3$ in it.",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Horizontal microprogramming:",
          "images": [],
          "options": [
            "A. does not require use of signal decoders",
            "B. results in larger sized microinstructions than vertical microprogramming",
            "C. uses one bit for each control signal",
            "D. all of the above"
          ],
          "correct_answer": "D",
          "explanation": "Option (D ). All statements are true. Reference: https://web.archive.org/web/20180219000846/http://www.cs.virginia.edu/~cs333/notes/microprogramming.pdf",
          "year": 2002,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The performance of a pipelined processor suffers if:",
          "images": [],
          "options": [
            "A. the pipeline stages have different delays",
            "B. consecutive instructions are dependent on each other",
            "C. the pipeline stages share hardware resources",
            "D. All of the above"
          ],
          "correct_answer": "D",
          "explanation": "Answer is D. A: Yes. Total delay = Max (All delays) + Register Delay. B: Yes, if data forwarding is not there. C: Yes, like ID and EX shares ID/EX register.",
          "year": 2002,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "In the absolute addressing mode:",
          "images": [],
          "options": [
            "A. the operand is inside the instruction",
            "B. the address of the operand in inside the instruction",
            "C. the register containing the address of the operand is specified inside the instruction",
            "D. the location of the operand is implicit"
          ],
          "correct_answer": "B",
          "explanation": "(B) is the answer. Absolute addressing mode means address of operand is given in the instruction. option (A), operand is inside the instruction $\\rightarrow $ immediate addressing option (C), register containing the address in specified in operand $\\rightarrow $ register Indirect addressing option (D), the location of operand is implicit $\\rightarrow $ implicit addressing",
          "year": 2002,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which of the following is not a form of memory 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. instruction cache",
            "B. instruction register",
            "C. instruction opcode",
            "D. translation look-a-side buffer"
          ],
          "correct_answer": "C",
          "explanation": "The instruction opcode is a part of the instruction which tells the processor what operation is to be performed so it is not a form of memory while the others are",
          "year": 2002,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "closed with the note: Out of syllabus now In 8085 which of the following modifies the program counter",
          "images": [],
          "options": [
            "A. Only PCHL instruction",
            "B. Only ADD instructions",
            "C. Only JMP and CALL instructions",
            "D. All instructions"
          ],
          "correct_answer": "D",
          "explanation": "All the instruction modifies the pc Pchl transfers content of hl to pc Call and jump modifies the pc address where it wl jump When add is to be performed the pc is incremented to fetch the next instruction",
          "year": 2002,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A device employing INTR line for device interrupt puts the CALL instruction on the data bus while:",
          "images": [],
          "options": [
            "A. $\\overline{\\text{INTA}}$ is active",
            "B. HOLD is active",
            "C. READY is inactive",
            "D. None of the above"
          ],
          "correct_answer": "A",
          "explanation": "INTR is a signal which if enabled then microprocessor has interrupt enabled it receives high INR signal & activates INTA signal, so another request can’t be accepted till CPU is busy in servicing interrupt. Hence ( A ) is correct option.",
          "year": 2002,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following data path of a simple non-pipelined CPU. The registers $A, B$, $A_{1},A_{2}, \\textsf{MDR},$ the $\\textsf{bus}$ and the $\\textsf{ALU}$ are $8$-$bit$ wide. $\\textsf{SP}$ and $\\textsf{MAR}$ are $16$-$bit$ registers. The $\\textsf{MUX}$ is of size $8 \\times (2:1)$ and the $\\textsf{DEMUX}$ is of size $8 \\times (1:2)$. Each memory operation takes $2$ $\\textsf{CPU}$ clock cycles and uses $\\textsf{MAR}$ (Memory Address Register) and $\\textsf{MDR}$ (Memory Date Register). $\\textsf{SP}$ can be decremented locally. The $\\textsf{CPU}$ instruction \" push r \" where, $r =$ $A$ or $B$ has the specification $M[SP] ← r $ $SP ← SP - 1$ How many $\\textsf{CPU}$ clock cycles are required to execute the \" push r \" instruction?",
          "images": [
            {
              "index": 1,
              "filename": "731_img1.png"
            }
          ],
          "options": [
            "A. $2$",
            "B. $3$",
            "C. $4$",
            "D. $5$"
          ],
          "correct_answer": "D",
          "explanation": "A microinstruction cannot be further broken down into two or more. It can take more than a cycle if it involves a memory access. The first instruction given here is not a microinstruction. It is an assembly language instruction. It can be broken down as: $T1 , T2: MAR \\leftarrow SP$ $T3. : MDR\\leftarrow r , SP\\leftarrow SP-1$ $($It is not mandatory to decrement it in this cycle. Anyway, it can be decremented locally$)$ $T4, T5 : M [MAR] \\leftarrow MDR$ The problem says, 8-bit MDR, 8-bit data bus, 8 bit registers.Can't you see that the given CPU is 8-bit? 8 multiplexers transfer 8 bits when selection input is 0 and 1 respectively. During cycle 1, bits in even positions are moved to MAR. During cycle 2, bits in odd positions are transferred to MAR. We certainly need to move 16-bit SP to 16-bit MAR via a 8-bit bus. So, 2 cycles to get SP to MAR. The given data path has a single bus, which requires r to be carried in a separate cycle. For the contents of r to be moved to MDR during the cycles T1 or T2, address and data bus should be separate. Here, it ain't the case. Memory read takes 2 more cycles. In total, we need 5 of them clock cycles to execute a push. https://www.cise.ufl.edu/~mssz/CompOrg/CDA-proc.html Computer organization pal chaudari page 334-335 Computer architecture by behrooz parahmi exercise 7.6 $D$",
          "year": 2001,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which is the most appropriate match for the items in the first column with the items in the second column:$$\\begin{array}{|cl|cl|} \\hline \\text{X.} &\\text{Indirect Addressing} & \\text{I.} &\\text{Array implementation} \\\\\\hline \\text{Y.} &\\text{Indexed Addressing} & \\text{II.} &\\text{Writing relocatable code} \\\\\\hline \\text {Z.} &\\text{Base Register Addressing} & \\text{III.} &\\text{Passing array as parameter}\\\\\\hline \\end{array}$$ Related Questions : GATE CSE 2000 | Question: 1.10 ISRO CSE 2017 | Question: 19 ed Oct 8, 2019 reply Follow flag Register add mode : access the local variables Immediate add mode : access the constant Direct/Absolute add mode : access the static variables Indirect add mode : implement pointer indexed/ Base index : access the random array Auto index: access the linear array relative add mode and base register add mode : relocation at run time base register add mode : best suit to write positions independent code 2 2 reply Share ritiksri8 commented Sep 7, 2024 reply Follow flag Indirect Addressing : Matches Passing array as parameter (uses pointers). Indexed Addressing : Matches Array implementation (accesses array elements). Base Register Addressing : Matches Writing relocatable code (adjusts addresses with a base register). 0 0 reply Share Tushar Rana commented Jan 20, 2025 reply Follow flag Relative, Indexed, Base Register all these three are relocatable code. 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. (X, III), (Y, I), (Z, II)",
            "B. (X, II), (Y, III), (Z, I)",
            "C. (X, III), (Y, II), (Z, I)",
            "D. (X, I), (Y, III), (Z, II)"
          ],
          "correct_answer": "A",
          "explanation": "(A) is the answer. Array implementation can use Indexed addressing. While passing array as parameter we can make use of a pointer (as in (C) ) and hence can use Indirect addressing. Base Register addressing can be used to write relocatable code by changing the content of Base Register.",
          "year": 2001,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Suppose a processor does not have any stack pointer registers, which of the following statements is true? ed Jan 22 reply Follow flag @ayush18288 Best answer! 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. It cannot have subroutine call instruction",
            "B. It cannot have nested subroutines call",
            "C. Interrupts are not possible",
            "D. All subroutine calls and interrupts are possible"
          ],
          "correct_answer": "X",
          "explanation": "A stack pointer is a small register that stores the address of the last program request in a stack . And a nested function (or nested procedure or subroutine) is a function which is defined within another function , the enclosing function. So if there is no stack pointer register then No nested subroutine call possible, hence option B is correct.",
          "year": 2001,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "A low memory can be connected to 8085 by using",
          "images": [],
          "options": [
            "A. $INTER$",
            "B. $\\overline{RESET\\text{ }IN}$",
            "C. $HOLD$",
            "D. $READY$"
          ],
          "correct_answer": "D",
          "explanation": "Memory can be connected to 8085 by using READY signal. If READY is set then communication is possible.Hence (D) is correct option.",
          "year": 2001,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "More than one word are put in one cache block to:",
          "images": [],
          "options": [
            "A. exploit the temporal locality of reference in a program",
            "B. exploit the spatial locality of reference in a program",
            "C. reduce the miss penalty",
            "D. none of the above"
          ],
          "correct_answer": "B",
          "explanation": "Exploit the spatial locality of reference in a program as, if the next locality is addressed immediately, it will already be in the cache. Consider the scenario similar to cooking, where when an ingredient is taken from cupboard, you also take the near by ingredients along with it- hoping that they will be needed in near future. $B$",
          "year": 2001,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The most appropriate matching for the following pairs$$\\begin{array}{ll} \\text{X: Indirect addressing} & \\text{1: Loops } \\\\ \\text{Y: Immediate addressing } & \\text{2: Pointers} \\\\ \\text{Z: Auto decrement addressing } & \\text{3: Constants } \\\\ \\end{array}$$ is Related Questions : GATE CSE 2001 | Question: 2.9 ISRO CSE 2017 | Question: 19 ed Oct 17, 2019 reply Follow flag base register add mode : best suit to write positions independent code @mohan123 Why not PC relative add mode is best suit ? 0 0 reply Share mohan123 commented Oct 17, 2019 reply Follow flag @Satbir positions independent code means we can transfer control of statement multiple segment using diff diff base address but pc relative control will be transfer within the segment 2 2 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $X - 3, Y - 2, Z - 1$",
            "B. $X - 1, Y - 3, Z - 2$",
            "C. $X - 2, Y - 3, Z - 1$",
            "D. $X - 3, Y - 1, Z - 2$"
          ],
          "correct_answer": "C",
          "explanation": "(C) is the most appropriate one. General instruction format: |opcode|Mode|Address Field| Pointer dereference $\\rightarrow $ Indirect addressing, $E.A = M$ [Value stored in address field] Operating with a constant $\\rightarrow $ Immediate addressing, $E.A =$ Address field of the instruction. Loop iteration counter check $\\rightarrow $ Auto decrement addressing $R1=R1-1$; $E.A = R1$ E.A = Effective address, where the required operand will be found.",
          "year": 2000,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Comparing the time T1 taken for a single instruction on a pipelined CPU with time T2 taken on a non-pipelined but identical CPU, we can say that",
          "images": [],
          "options": [
            "A. T1 ≤ T2",
            "B. T1 ≥ T2",
            "C. T1 < T2",
            "D. T1 and T2 plus the time taken for one instruction fetch cycle"
          ],
          "correct_answer": "B",
          "explanation": "Here we are comparing the execution time of only a single instruction. Pipelining in no way improves the execution time of a single instruction (the time from its start to end). It increases the overall performance by splitting the execution to multiple pipeline stages so that the following instructions can use the finished stages of the previous instructions. But in doing so pipelining causes some problems also as given in the below link, which might slow some instructions. So, (B) is the answer. http://www.cs.wvu.edu/~jdm/classes/cs455/notes/tech/instrpipe.html",
          "year": 2000,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "To put the 8085 microprocessor in the wait state",
          "images": [],
          "options": [
            "A. lower the HOLD input",
            "B. lower the READY input",
            "C. raise the HOLD input",
            "D. raise the READY input"
          ],
          "correct_answer": "B",
          "explanation": "Lower the READY input,option B",
          "year": 2000,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The access times of the main memory and the Cache memory, in a computer system, are $500$ n sec and $50$ nsec, respectively. It is estimated that $80\\%$ of the main memory request are for read the rest for write. The hit ratio for the read access only is $0.9$ and a write-through policy (where both main and cache memories are updated simultaneously) is used. Determine the average time of the main memory (in ns).",
          "images": [],
          "options": [
            "A. Read the word from main memory which is missed in cache memory",
            "B. Send the entire block of data from main memory to cache from where the required WORD is present.",
            "C. CPU reads the required word from cache memory"
          ],
          "correct_answer": "180",
          "explanation": "Average memory access time $=$ Time spend for read $+$ Time spend for write $=$ Read time when cache hit $+$ Read time when cache miss $+$ Write time when cache hit $+$ Write time when cache miss $= 0.8 \\times 0.9 \\times 50 + 0.8 \\times 0.1 \\times (500+50) $ (assuming hierarchical read from memory and cache as only simultaneous write is mentioned in question) $+ 0.2 \\times 0.9 \\times 500 + 0.2 \\times 0.1 \\times 500 $ (simultaneous write mentioned in question) $= 36 + 44 + 90 + 10 = 180$ ns. Reference: http://www.howardhuang.us/teaching/cs232/24-Cache-writes-and-examples.pdf",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "In an $11$-bit computer instruction format, the size of address field is $4$-bits. The computer uses expanding OP code technique and has $5$ two-address instructions and $32$ one-address instructions. The number of zero-address instructions it can support is ________",
          "images": [],
          "options": [],
          "correct_answer": "256",
          "explanation": "No. of possible instruction encoding $=2^{11} = 2048$ No. of encoding taken by two-address instructions $=5 \\times 2^4 \\times 2^4 = 1280$ No. of encoding taken by one-address instructions $=32 \\times 2^4 = 512$ So, no. of possible zero-address instructions $=2048 - (1280 + 512) = 256$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The total size of address space in a virtual memory system is limited by: 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. the length of MAR",
            "B. the available secondary storage",
            "C. the available main memory",
            "D. all of the above",
            "E. none of the above"
          ],
          "correct_answer": "A;B",
          "explanation": "The answer is (A) and (B). Virtual memory concept is independent of size of main memory and depends only on the availability of the secondary storage. MAR holds the address generated by CPU and this obviously limits the total virtual memory address space.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Delayed branching can help in the handling of control hazards For all delayed conditional branch instructions, irrespective of whether the condition evaluates to true or false,",
          "images": [],
          "options": [
            "A. The instruction following the conditional branch instruction in memory is executed",
            "B. The first instruction in the fall through path is executed",
            "C. The first instruction in the taken path is executed",
            "D. The branch takes longer to execute than any other instruction"
          ],
          "correct_answer": "A",
          "explanation": "Answer is A. In order to avoid the pipeline delay due to conditional branch instruction, a suitable instruction is placed below the conditional branch instruction such that the instruction will be executed irrespective of whether branch is taken or not and won't affect the program behaviour.",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a machine with a $2$-way set associative data cache of size $64\\text{Kbytes}$ and block size $16\\text{bytes}$. The cache is managed using $32\\;\\text{bit}$ virtual addresses and the page size is $4\\text{Kbytes}$. A program to be run on this machine begins as follows: double ARR[1024][1024]; int i, j; /*Initialize array ARR to 0.0 */ for(i = 0; i < 1024; i++) for(j = 0; j < 1024; j++) ARR[i][j] = 0.0; The size of double is $8\\text{Bytes}$. Array $\\text{ARR}$ is located in memory starting at the beginning of virtual page $\\textsf{0xFF000}$ and stored in row major order. The cache is initially empty and no pre-fetching is done. The only data memory references made by the program are those to array $\\text{ARR}$. The total size of the tags in the cache directory is:",
          "images": [],
          "options": [
            "A. $32\\text{Kbits}$",
            "B. $34\\text{Kbits}$",
            "C. $64\\text{Kbits}$",
            "D. $68\\text{Kbits}$"
          ],
          "correct_answer": "D",
          "explanation": "Number of sets $=\\dfrac{\\text{cache size}}{\\text{size of a set}}$ $=\\dfrac{64\\ KB}{(16\\ B\\times 2)}$ (two blocks per set) $=2\\ K=2^{11}$ So, we need $11\\text{-bits}$ for set indexing. Number of WORD bits required $=4$ as a cache block consists of $16\\text{ bytes}$ and we need $4\\text{-bits}$ to address each of them. So, number of tag bits $=32-11-4=17$ Total size of the tag$= 17\\times \\text{Number of cache blocks}$ $= 17\\times 2^{11}\\times 2$ (since each set has $2$ blocks) $=68\\text{ Kbits}$ Answer is option D) 68 Kbits We use the top $17\\text{-bits}$ for tag and the next $11\\text{-bits}$ for indexing and next $4$ for offset. So, for two addresses to have the same cache index, their $11$ address bits after the $4$ offset bits from right must be same. $ARR[0][0]$ is located at virtual address $\\text{0x FF000 000. (FF000 is page address and 000 is page offset).}$ So, index bits are $00000000000$ Address of $ARR[0][4]=\\text{0xFF000}+4\\times \\text{sizeof (double)}$ $=\\text{0xFF000 000}+4\\times 8=\\text{0xFF000 020 (32 = 20 in hex)}$ (index bits differ) Address of $ARR[4][0] =\\text{0xFF000}+4\\times 1024\\times \\text{sizeof (double)}$ [since we use row major storage] $=\\text{0xFF000 000}+4096\\times 8=\\text{0xFF000 000 + 0x8000 = 0xFF008 000}$ ( index bits matches that of $ARR [0][0]$ as both read $\\text{000 0000 0000}$ ) Address of $ARR[0][5] =\\text{0xFF000} + 5\\times \\text{sizeof (double) = 0xFF000 000}$$+ 5\\times 8 =\\text{0xFF000 028 (40 = 28 in hex)}$ (index bits differ) Address of $ARR[5][0] =\\text{0xFF000} + 5\\times 1024\\times \\text{ sizeof (double)}$ [since we use row major storage] $=\\text{0xFF000 000}+5120\\times 8=\\text{0xFF000 000 + 0xA000 = 0xFF00A 000}$ (index bits differ) So, only $ARR[4][0]$ and $ARR[0][0]$ have the same cache index. The inner loop is iterating from $0$ to $1023,$ so consecutive memory locations are accessed in sequence. Since cache block size is only $16\\text{ bytes}$ and our element being double is of size $8\\text{ bytes},$ during a memory access only the next element gets filled in the cache. i.e.; every alternative memory access is a cache miss giving a hit ratio of $50%.$ (If loops $i$ and $j$ are reversed, all accesses will be misses and hit ratio will become $0$ ).",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which of the following statements about synchronous and asynchronous I/O is NOT true?",
          "images": [],
          "options": [
            "A. An ISR is invoked on completion of I/O in synchronous I/O but not in asynchronous I/O",
            "B. In both synchronous and asynchronous I/O, an ISR (Interrupt Service Routine) is invoked after completion of the I/O",
            "C. A process making a synchronous I/O call waits until I/O is complete, but a process making an asynchronous I/O call does not wait for completion of the I/O",
            "D. In the case of synchronous I/O, the process waiting for the completion of I/O is woken up by the ISR that is invoked after the completion of I/O"
          ],
          "correct_answer": "B",
          "explanation": "Answer is (B). In synchronous I/O process performing I/O operation will be placed in blocked state till the I/O operation is completed. An ISR will be invoked after the completion of I/O operation and it will place process from block state to ready state. In asynchronous I/O, Handler function will be registered while performing the I/O operation. The process will not be placed in the block state and process continues to execute the remaining instructions. when the I/O operation completed signal mechanism is used to notify the process that data is available.",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "In an instruction execution pipeline, the earliest that the data TLB (Translation Lookaside Buffer) can be accessed is:",
          "images": [],
          "options": [
            "A. before effective address calculation has started",
            "B. during effective address calculation",
            "C. after effective address calculation has completed",
            "D. after data cache lookup has completed"
          ],
          "correct_answer": "C",
          "explanation": "C is the answer here. Effective address is the address after applying the addressing mode like indexed, immediate etc. But this resulting address is still the virtual address, the physical address is invisible to the CPU and will be given only by the MMU when given the corresponding virtual address. Virtual address is given for TLB look up. TLB -Translation Lookaside Buffer, here Lookaside means during Address translation (from Virtual to Physical). But virtual address must be there before we look into TLB. https://gateoverflow.in/?qa=blob&qa_blobid=15279338060050073946",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "The use of multiple register windows with overlap causes a reduction in the number of memory accesses for: $\\text{I}$ only $\\text{II}$ only $\\text{III}$ only $\\text{I}, \\text{II}$ and $\\text{III}$ ed Aug 17, 2019 reply Follow flag Thank you @Tuhin Dutta , the explanation was very helpful. 0 0 reply Share Sherrinford commented Sep 11, 2019 reply Follow flag Thanks for sharing the link, it is really helpful 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Function locals and parameters",
            "B. Register saves and restores",
            "C. Instruction fetches"
          ],
          "correct_answer": "A",
          "explanation": "Functions locals and parameters this is true because overlapped registers eliminates the need for memory accesses. we here got to use registers instead. Register saves and restores this is false bc we need to see where memory accesses are reduced here before also we were using register as it says Register saves... later also (i.e. after using multiple register windows) registers will are referred. So NO memory accesses are reduced here. Instruction fetches it has nothing to do with reduction in memory accesses. Hence, option (A) is correct.",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which of the following are NOT true in a pipelined processor? I and II only I and III only II and III only I, II and III ed Dec 15, 2025 reply Follow flag Bypassing is the same as forwarding. 1 1 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Bypassing can handle all RAW hazards",
            "B. Register renaming can eliminate all register carried WAR hazards",
            "C. Control hazard penalties can be eliminated by dynamic branch prediction"
          ],
          "correct_answer": "B",
          "explanation": "(B) I and III I - False Bypassing can't handle all RAW hazard, consider when any instruction depends on the result of LOAD instruction, now LOAD updates register value at Memory Access Stage (MA), so data will not be available directly on Execute stage. II - True, register renaming can eliminate all WAR Hazard. III- False, It cannot completely eliminate, though it can reduce Control Hazard Penalties",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "For inclusion to hold between two cache levels $L_1$ and $L_2$ in a multi-level cache hierarchy, which of the following are necessary? IV only I and IV only I, II and IV only I, II, III and IV",
          "images": [],
          "options": [
            "A. $L_1$ must be write-through cache",
            "B. $L_2$ must be a write-through cache",
            "C. The associativity of $L_2$ must be greater than that of $L_1$",
            "D. The $L_2$ cache must be at least as large as the $L_1$ cache"
          ],
          "correct_answer": "A",
          "explanation": "1$^{\\text{st}}$ is not correct as data need not to be exactly same at the same point of time and so write back policy can be used in this. 2$^{\\text{nd}}$ is not needed when talking only about $L1$ and $L2$. For 3$^{\\text{rd}}$, associativity can be equal. So, only 4$^{\\text{th}}$ statement is Necessarily true - (A) choice.",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which of the following must be true for the RFE (Return From Exception) instruction on a general purpose processor? I only II only I and II only I, II and III only See all 6 Comments 6 6 Comments reply Show 3 previous comments Divy Kala commented Apr 7, 2019 reply Follow flag Here are my thoughts.. please give your rebuttals 1. why must it be a trap instruction? I find no reason that it has to be a trap. No referenced link in this post says it has to be a trap. 2. It has to be a privileged instruction because it accesses kernel stack in the newer OS. Although in older OS, there was no concept of kernel space and user space, it was one huge address space. 3. An exception cannot be allowed to occur? Aborts and faults (they are exceptions too) can occur during the execution of any instruction. It's like saying power failure is not allowed to happen when RFE is executing. I think the answer should be II only 5 5 reply Share shashankrustagi commented Jan 18, 2021 reply Follow flag Transitions from kernel to user mode are performed explicitly by the operating system, generally at the end of an interrupt handler or kernel call, using a privileged RFE (return from exception) instruction. I found this from the link 1 1 reply Share madhes23 commented Aug 1, 2021 i",
          "images": [],
          "options": [
            "A. It must be a trap instruction",
            "B. It must be a privileged instruction",
            "C. An exception cannot be allowed to occur during execution of an RFE instruction"
          ],
          "correct_answer": "D",
          "explanation": "RFE (Return From Exception) is a privileged trap instruction that is executed when exception occurs, so an exception is not allowed to execute. (D) is the correct option. Reference: http://www.cs.rochester.edu/courses/252/spring2014/notes/08_exceptions",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Which of the following is/are true of the auto-increment addressing mode? I only II only III only II and III only",
          "images": [],
          "options": [
            "A. It is useful in creating self-relocating code",
            "B. If it is included in an Instruction Set Architecture, then an additional ALU is required for effective address calculation",
            "C. The amount of increment depends on the size of the data item accessed"
          ],
          "correct_answer": "C",
          "explanation": "In auto increment addressing mode, the base address is incremented after operand fetch. This is useful in fetching elements from an array. But this has no effect in self-relocating code (where code can be loaded to any address) as this works on the basis of an initial base address. An additional ALU is desirable for better execution especially with pipelining, but never a necessity. Amount of increment depends on the size of the data item accessed as there is no need to fetch a part of a data. So, answer must be C only.",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider an instruction pipeline with five stages without any branch prediction: Fetch Instruction (FI), Decode Instruction (DI), Fetch Operand (FO), Execute Instruction (EI) and Write Operand (WO). The stage delays for FI, DI, FO, EI and WO are $\\text{5 ns, 7 ns, 10 ns, 8 ns and 6 ns},$ respectively. There are intermediate storage buffers after each stage and the delay of each buffer is $1\\ \\text{ns}.$ A program consisting of $12$ instructions $\\text{I1, I2, I3,}\\ldots,\\text{ I12}$ is executed in this pipelined processor. Instruction $\\text{I4}$ is the only branch instruction and its branch target is $\\text{I9}.$ If the branch is taken during the execution of this program, the time (in ns) needed to complete the program is",
          "images": [],
          "options": [
            "A. $132$",
            "B. $165$",
            "C. $176$",
            "D. $328$"
          ],
          "correct_answer": "B",
          "explanation": "After pipelining we have to adjust the stage delays such that no stage will be waiting for another to ensure smooth pipelining (continuous flow). Since we can not easily decrease the stage delay, we can increase all the stage delays to the maximum delay possible. So, here maximum delay is $10$ ns. Buffer delay given is $1$ ns. So, each stage takes $11$ ns in total. FI of $\\text{I9}$ can start only after the EI of $\\text{I4}.$ So, the total execution time will be $$15 \\times 11 = 165$$ $$\\small \\begin{array}{|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|c|} \\hline &\\bf{t_1}&\\bf{t_2}&\\bf{t_3}&\\bf{t_4}&\\bf{t_5}&\\bf{t_6}&\\bf{t_7}&\\bf{t_8}&\\bf{t_9}&\\bf{t_{10}}&\\bf{t_{11}}&\\bf{t_{12}}&\\bf{t_{13}}&\\bf{t_{14}}&\\bf{t_{15}}\\\\ \\hline \\textbf{I1}&\\text{FI}&\\text{DI}&\\text{FO}&\\text{EI}&\\text{WO}\\\\ \\textbf{I2}&&\\text{FI}&\\text{DI}&\\text{FO}&\\text{EI}&\\text{WO}\\\\ \\textbf{I3}&&&\\text{FI}&\\text{DI}&\\text{FO} &\\text{EI}&\\text{WO}\\\\ \\textbf{I4}&&&&\\text{FI}&\\text{DI}&\\text{FO}&\\text{EI}&\\text{WO}\\\\ &&&&&\\color{red}{\\text{stall}}\\\\ &&&&&&\\color{red}{\\text{stall}}\\\\ &&&&&&&\\color{red}{\\text{stall}}\\\\ \\textbf{I9}&&&&&&&&\\text{FI}&\\text{DI}&\\text{FO}&\\text{EI}&\\text{WO}\\\\ \\textbf{I10}&&&&&&&&&\\text{FI}&\\text{DI}&\\text{FO}&\\text{EI}&\\text{WO}\\\\ \\textbf{I11}&&&&&&&&&&\\text{FI}&\\text{DI}&\\text{FO}&\\text{EI}&\\text{WO}\\\\ \\textbf{I12}&&&&&&&&&&&\\text{FI}&\\text{DI}&\\text{FO}&\\text{EI}&\\text{WO}\\\\ \\hline\\end{array}$$ $B$",
          "year": 2013,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider a system with a two-level paging scheme in which a regular memory access takes $150$ $nanoseconds$, and servicing a page fault takes $8$ $milliseconds$. An average instruction takes $100$ nanoseconds of CPU time, and two memory accesses. The TLB hit ratio is $90$%, and the page fault rate is one in every $10,000$ instructions. What is the effective average instruction execution time?",
          "images": [],
          "options": [
            "A. $\\text{645 nanoseconds}$",
            "B. $\\text{1050 nanoseconds}$",
            "C. $\\text{1215 nanoseconds}$",
            "D. $\\text{1230 nanoseconds}$"
          ],
          "correct_answer": "D",
          "explanation": "Average Instruction execution time = Average CPU execution time + Average time for getting data(instruction operands from memory for each instruction) = Average CPU execution time + Average address translation time for each instruction + Average memory fetch time for each instruction + Average page fault time for each instruction $=\\underbrace{100}_{\\text{Average CPU execution time}}+\\underbrace{2\\left(0.9 (0) + 0.1 (2 \\times 150)\\right)}_{\\text{Average address translation time for each instruction}} + \\underbrace{2\\times 150}_{\\text{Average memory fetch time for each instruction}} + \\underbrace{\\dfrac{1}{10000} \\times 8 \\times 10^6}_{\\text{Average page fault time for each instruction}}$ (Page Fault Rate per 10,000 instruction is directly given in question. Two memory accesses per instruction and hence we need 2 $\\times$ address translation time for average instruction execution time) [ TLB access time assumed as 0 and 2 page tables need to be accessed in case of TLB miss as the system uses two-level paging ] = $100 + 60 + 300 + 800$ = $1260 \\textsf{ ns}$ PS: GATE question might have missed the time for second address translation in their calculation which might have made them give 1230 in option D instead of 1260.",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "co-and-architecture",
          "question_text": "Register renaming is done in pipelined processors: 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. as an alternative to register allocation at compile time",
            "B. for efficient access to function parameters and local variables",
            "C. to handle certain kinds of hazards",
            "D. as part of address translation"
          ],
          "correct_answer": "C",
          "explanation": "Register renaming is done to eliminate WAR (Write after Read) and WAW (Write after Write) dependency between instructions which could have caused pipieline stalls. Hence, (C) is the answer. Example: I1: Read $A$ to $B$ I2: Write $C$ to $A$ Here, there is a WAR dependency and pipeline would need stalls. In order to avoid it register renaming is done and Write $C$ to $A$ will be Write $C$ to $A$' WAR dependency is actually called anti-dependency and there is no real dependency except the fact that both uses same memory location. Register renaming can avoid this. Similarly WAW also. people.ee.duke.edu/~sorin/ece252/lectures/4.2-tomasulo.pdf",
          "year": 2012,
          "exam_type": "GATE",
          "question_type": "MCQ"
        }
      ]
    },
 
  ];

  for (const item of subjectData) {
    const subject = await prisma.subjectPattern.upsert({
      where: { subject_name: item.subject_name },
      update: {},
      create: { subject_name: item.subject_name }
    });

    console.log(`${colors.blue}📂 Subject: ${colors.bright}${item.subject_name}${colors.reset}`);

    let count = 0;
    const total = item.pyqs.length;

    for (const pyq of item.pyqs) {
      count++;
      const progress = `[${count}/${total}]`;

      // Data Cleaning: Remove scraper noise
      const cleanQuestionText = pyq.question_text
        .replace(/0 reply\s*Please log in or register to add a comment\./gi, '')
        .replace(/0 reply/gi, '')
        .replace(/🚩.*?💬\s*“[^”]*”/gi, '')
        .replace(/See all \d+ Comments[\s\S]*?Please log in or register to add a comment\./gi, '')
        .trim();

      // Transform images to have correct URLs
      const transformedImages = (pyq.images as any[])?.map((img: any) => ({
        ...img,
        url: img.url || (img.filename ? (img.filename.startsWith('/') ? img.filename : `/${img.filename}`) : '')
      }));

      await prisma.subjectPYQ.upsert({
        where: {
          subject_pyq_identifier: {
            subject_pattern_id: subject.id,
            question_text: cleanQuestionText
          }
        },
        update: {
          options: pyq.options,
          correct_answer: pyq.correct_answer,
          explanation: pyq.explanation,
          year: pyq.year,
          question_type: pyq.question_type,
          images: transformedImages
        },
        create: {
          subject_pattern_id: subject.id,
          question_text: cleanQuestionText,
          options: pyq.options,
          correct_answer: pyq.correct_answer,
          explanation: pyq.explanation,
          year: pyq.year,
          question_type: pyq.question_type,
          images: transformedImages
        }
      });

      if (count % 5 === 0 || count === total) {
        console.log(`${colors.green}  ✅ ${progress} Seeded questions for ${item.subject_name}${colors.reset}`);
      }
    }
  }

  console.log(`${colors.bright}${colors.green}✨ Subject Seeding Complete!${colors.reset}`);
}

main()
  .catch((e) => {
    console.error('💥 Error seeding subjects:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
