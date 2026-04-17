import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📝 Seeding Premium Vibrant Notes...');

  const notes = [
    {
      topic: "Introduction to Compilers",
      content: `### 1. Compiler Phases (The Heart of CD)
A compiler operates in several sequential phases, each transforming one representation to another:
1. **Lexical Analysis (Scanner)**: Char stream → Token stream.
2. **Syntax Analysis (Parser)**: Token stream → Parse Tree/AST.
3. **Semantic Analysis**: Check for logical errors (Type checking).
4. **Intermediate Code Gen (ICG)**: Context-free → Three Address Code.
5. **Code Optimization**: Reduce time/space complexity (Independent of machine).
6. **Target Code Generation**: Output assembly/machine code.
7. **Symbol Table & Error Handler**: Interact with all phases.

### 2. Pass vs. Phase
- **Phase**: A logical stage of compilation.
- **Pass**: One full scan of the source program/intermediate representation. Multi-phase can be combined into a single pass.

### 3. Front End vs. Back End
- **Front End**: Machine-independent (Lexical through ICG).
- **Back End**: Machine-dependent (Optimization through Code Gen).
- **Benefit**: Retargeting a compiler only requires rewriting the Back End.

### 4. Cousins of Compiler
- **Preprocessors**: Handle macros, file inclusion (#include).
- **Assemblers**: Convert assembly to relocatable machine code.
- **Linkers**: Resolve external references between files.
- **Loaders**: Put the program in memory and adjust addresses.`
    },
    {
      topic: "Lexical Analysis",
      content: `### 1. Role of Lexical Analyzer
- First phase of compilation. Reads characters and groups them into meaningful sequences called **Lexemes**.
- Outputs **Tokens**: <token_name, attribute_value>.
- Strips out comments and whitespace.

### 2. Terminology
- **Token**: Abstract category (e.g., ID, KEYWORD, NUM).
- **Lexeme**: Actual text sequence (e.g., "x", "int", "3.14").
- **Pattern**: Rules (Regular Expressions) describing a token.

### 3. Implementation (DFA)
Lexical analyzers are implemented using **Finite Automata (DFA)**.
- If multiple patterns match, use:
  1. **Longest Match Rule**: Pick the longest lexeme (e.g., "intptr" is one ID, not "int" + "ptr").
  2. **Rule Priority**: Keywords have priority over identifiers (e.g., "if" is a keyword).

### 4. Input Buffering
- **Two-Buffer Scheme**: Using two pointers (*lexemeBegin* and *forward*).
- **Sentinels**: Special characters (EOF) to avoid checking buffer boundaries in every step.

### 5. GATE Formulas & Tricks
- **Total Identifiers**: Number of unique words that match the identifier RE.
- **Symbol Table**: Initialized with keywords. LA enters new identifiers into it.
- **Lexical Errors**: Caught when no pattern matches (e.g., illegal characters like @ in some languages).`
    },
    {
      topic: "Syntax Analysis",
      content: `### 1. The Parser
- Inputs tokens from LA. Outputs a **Parse Tree** or **Abstract Syntax Tree (AST)**.
- Based on **Context-Free Grammar (CFG)**.

### 2. Context-Free Grammar (CFG)
Defined by $(V, Σ, P, S)$:
- **V**: Variables (Non-terminals).
- **Σ**: Terminals.
- **P**: Productions.
- **S**: Start symbol.

### 3. Derivations and Parse Trees
- **LMD (Leftmost Derivation)**: Expand leftmost non-terminal first.
- **RMD (Rightmost Derivation)**: Expand rightmost non-terminal first.
- **Ambiguity**: A grammar is ambiguous if it produces >1 parse tree (or >1 LMD) for any string.

### 4. Ambiguity in GATE
- All regular languages are CFGs, but not all CFGs are regular.
- Ambiguity is **undecidable** for CFGs.
- Standard Ambiguity Example: The "Dangling Else" problem.

### 5. AST vs. Parse Tree
- **Parse Tree**: Shows every step of the derivation (includes punctuation/brackets).
- **AST**: Condensed form showing only the structure of the computation.`
    },
    {
      topic: "Top-Down Parsing",
      content: `### 1. Logic
Starts from the **Start Symbol** and tries to derive the input string by expanding non-terminals.
- Common issue: **Backtracking** (Inefficient).
- Efficient Solution: **Predictive Parsing (LL)**.

### 2. LL(1) Parsing
- **L**: Scan from Left to Right.
- **L**: Use Leftmost Derivation.
- **(1)**: Use 1 token of lookahead.

### 3. Prerequisites for LL(1)
- **No Left Recursion**: Grammar must not have $A \to Aα$.
- **No Left Factoring**: Factors like $A \to αβ1 | αβ2$ must be extracted.

### 4. FIRST and FOLLOW (Very Important)
- **FIRST(X)**: Set of terminals that can begin a string derived from X.
- **FOLLOW(A)**: Set of terminals that can follow A in any sentential form.
  - *Rule*: $\$$ is always in FOLLOW(Start Symbol).
  - *Rule*: For $A \to αBβ$, everything in FIRST($β$) is in FOLLOW($B$).

### 5. LL(1) Table Construction
- For $A \to α$, add $A \to α$ to entry $M[A, a]$ for every terminal $a \in FIRST(α)$.
- If $ε \in FIRST(α)$, add $A \to α$ to $M[A, b]$ for every $b \in FOLLOW(A)$.

### 6. GATE Trick
- A grammar is LL(1) if and only if there are **no multi-entries** in the table.
- If $FIRST(α)$ and $FOLLOW(A)$ overlap for $ε$-producing rules, it's NOT LL(1).`
    },
    {
      topic: "Bottom-Up Parsing",
      content: `### 1. Shift-Reduce Parsing
Starts from the input string and tries to reduce it back to the **Start Symbol**.
- Uses a **Stack** and an **Input Buffer**.
- **Four Actions**: **Shift**, **Reduce**, **Accept**, **Error**.

### 2. Terminology
- **Handle**: A substring that matches the RHS of a production and whose reduction represents a step in the RMD (in reverse).
- **Viable Prefix**: Prefixes of sentential forms that do not extend past the right end of a handle.

### 3. LR Parsing Hierarchy
1. **LR(0)**: Simplest, uses no lookahead. High chance of conflicts.
2. **SLR(1)**: Simple LR. Use FOLLOW sets to resolve conflicts.
3. **LALR(1)**: Lookahead LR. Merges states of CLR based on items. (Used by Yacc/Bison).
4. **CLR(1)**: Canonical LR. Most powerful. Uses lookahead in items.

**Power Comparison**: $CLR > LALR > SLR > LR(0)$.

### 4. LR Conflicts (GATE Favorite)
- **Shift-Reduce (SR)**: Cannot decide whether to shift or reduce.
- **Reduce-Reduce (RR)**: Cannot decide between two different reductions.
- *Note*: LL(1) is always subset of LR(1), but LR(k) is vastly more powerful.

### 5. GATE Strategy
- To show a grammar is NOT SLR(1), find a state with an SR conflict based on FOLLOW.
- CLR states are larger; LALR merges them. If CLR is conflict-free, LALR might still have RR conflicts, but **never** new SR conflicts.`
    },
    {
      topic: "Intermediate Code Generation",
      content: `### 1. Why ICG?
Provides a machine-independent representation. Allows portable optimizations.
- Connects the Front-End and Back-End.

### 2. Directed Acyclic Graphs (DAG)
- Similar to a tree, but **shares identical sub-expressions**.
- Used for identifying common sub-expressions and local optimization.

### 3. Three Address Code (TAC)
- General Form: $x = y \ op \ z$ (Max 3 addresses).
- **Representations**:
  1. **Quadruples**: (op, arg1, arg2, result). Uses temp names in result.
  2. **Triples**: (op, arg1, arg2). Refers to results by their position (index).
  3. **Indirect Triples**: Pointer to a triple table. Easier for code movement.

### 4. Postfix Notation
- Operator follows operands (e.g., $a \ b +$).
- Stack-based evaluation.

### 5. GATE formulas
- Number of nodes in a DAG for an expression: (Unique operands + Unique operators).
- Translation of control flow (if-else, while) into boolean TAC via backpatching.`
    },
    {
      topic: "Runtime Environment",
      content: `### 1. Memory Organization
- **Stack**: Stores Activation Records (Automatic vars, Recursion).
- **Heap**: Dynamic memory (Manual allocation).
- **Static/Data**: Global/Static variables.

### 2. Activation Record (Stack Frame)
Contains:
- Actual Parameters.
- Return Values.
- Control Link (Dynamic Link).
- Access Link (Static Link - for nested scopes).
- Saved machine status (registers).
- Local variables and Temps.

### 3. Allocation Strategies
- **Static Allocation**: For languages without recursion (FORTRAN). All addresses fixed at compile time.
- **Stack Allocation**: For recursion. Supports dynamic lifetime.
- **Heap Allocation**: For data that persists beyond function calls.

### 4. Scope and Binding
- **Static Scope (Lexical)**: Binding based on program text location.
- **Dynamic Scope**: Binding based on call sequence at runtime.

### 5. Static vs. Dynamic Link
- **Control Link**: Points to the activation record of the **caller**.
- **Access Link**: Points to the activation record of the **lexically enclosing** block.`
    },
    {
      topic: "Error Detection & Recovery",
      content: `### 1. Types of Errors
- **Lexical**: Typos, illegal characters.
- **Syntax**: Missing semicolons, unbalanced brackets.
- **Semantic**: Type mismatch, undeclared variables.
- **Logical**: Infinite loops (not caught by compiler).

### 2. Recovery Strategies (Very Important)
1. **Panic Mode**: Discard input tokens until a synchronizing token (like ; or }) is found. Simple, avoids infinite loops.
2. **Phrase-Level Recovery**: Perform local correction (e.g., insert missing ';').
3. **Error Productions**: Augment grammar with common error patterns.
4. **Global Correction**: Find the string with minimum edits to match a valid string (Expensive, rarely used).

### 3. Syntax vs. Semantic Errors
- Parser catches Syntax errors.
- Semantic analyzer catches errors like using a real as an array index.`
    },
    {
      topic: "Timestamp Ordering Protocol",
      content: `### 1. Basic Principle
Every transaction Ti is assigned a unique, monotonically increasing **Timestamp** (TS(Ti)) when it enters the system (usually its start time).
- If TS(Ti) < TS(Tj), then Ti is older and Tj is younger.
- The protocol ensures a serializable schedule equivalent to a serial execution in increasing order of timestamps.

### 2. Timestamps on Data Items
For every data item Q, two timestamps are maintained:
- **W-TS(Q)**: Largest timestamp of any transaction that successfully executed **write(Q)**.
- **R-TS(Q)**: Largest timestamp of any transaction that successfully executed **read(Q)**.

### 3. Read Rule (Ti issues read(Q))
1. If **TS(Ti) < W-TS(Q)**: 
   - A younger transaction has already written a newer value to Q. 
   - Reading would violate the timestamp order (Ti should have read the value PRIOR to Tj's write). 
   - **Action**: Abort Ti and restart it with a new, larger timestamp.
2. If **TS(Ti) ≥ W-TS(Q)**:
   - The read is safe as it follows the latest write in timestamp order.
   - **Action**: Execute read. Update **R-TS(Q) = max(R-TS(Q), TS(Ti))**.

### 4. Write Rule (Ti issues write(Q))
1. If **TS(Ti) < R-TS(Q)**:
   - A younger transaction has already read Q.
   - Allowing Ti to write now would mean the younger transaction read the "wrong" (old) value.
   - **Action**: Abort Ti and restart.
2. If **TS(Ti) < W-TS(Q)**: 
   - A younger transaction has already written a newer value to Q.
   - **Action**: Abort Ti and restart (unless using Thomas Write Rule).
3. Otherwise:
   - **Action**: Execute write. Update **W-TS(Q) = TS(Ti)**.

### 5. Thomas Write Rule (Optimization)
This optimization specifically handles the case where **TS(Ti) < W-TS(Q)** during a write:
- Instead of aborting, **ignore** (don't execute) the write and let Ti continue.
- **Logic**: Ti's write is "obsolete" because a younger transaction Tj has already overwritten it with a newer value. In any serial order, Ti's write would be invisible.
- **Note**: TS(Ti) < R-TS(Q) still causes an abort even with this rule.
- **Crucial**: TWR helps achieve **View Serializability** but the schedule may NOT be **Conflict Serializable**.

### 6. Protocol Properties (Very Important)
- **Deadlock-Free**: Transactions never wait for each other; they either proceed or abort. Since there is no "waiting", no circular wait (deadlock) can form.
- **Conflict Serializable**: Basic TO guarantees conflict serializability (serialization order = timestamp order).
- **Starvation**: A transaction might keep getting aborted if it repeatedly encounters newer transactions (Livelock/Starvation).
- **Recoverability**: Not guaranteed in Basic TO. It allows **Dirty Reads** (Ti reads uncommitted data from Tj), which can lead to **Cascading Rollbacks**.

### 7. Strict Timestamp Ordering
Rules are modified to ensure cascadelessness:
- Ti cannot read or write Q if some Tj (with TS(Tj) < TS(Ti)) has written Q but **not yet committed/aborted**.
- Result: Ti is made to wait, preserving **Strictness** and **Recoverability**.

### 8. GATE Trick
- In a schedule trace, check abort conditions immediately: "Has a younger transaction (larger TS) already read or written this item?"
- **Read check**: Compare TS(Ti) against W-TS(item).
- **Write check**: Compare TS(Ti) against BOTH R-TS(item) and W-TS(item).
- **Thomas Rule**: If you see Ti writing to something already written by a younger Tj, don't abort! Just skip that one write.
- **Deadlock**: If a question asks about deadlock in TO, the answer is almost always **'No'** (it's inherently deadlock-free).`
    },
    {
      topic: "Indexing - Secondary B+ Tree",
      content: `### 1. Introduction to B+ Tree Indexing
A B+ Tree is a balanced M-way search tree where all pointers to data records are stored in the **leaf nodes**. Internal nodes only contain **search keys** and **child pointers** for navigation.
- **Balanced**: All leaf nodes are at the same depth (height).
- **Secondary Index**: A non-clustering index where the data file is not necessarily sorted by the search key. Secondary indices are **always dense**.

### 2. Node Structure & Constraints (Order 'n')
In GATE, for a B+ tree of order $n$:

**Internal Node (Non-Leaf):**
- **Max Pointers**: $n$
- **Max Keys**: $n - 1$
- **Min Pointers (except root)**: $\lceil n/2 \rceil$
- **Min Keys (except root)**: $\lceil n/2 \rceil - 1$
- Root must have at least 2 pointers (unless it's the only node).

**Leaf Node:**
- **Max Keys/Pointers**: $n - 1$ (Key, Record Pointer pairs) + 1 Sibling Pointer.
- **Min Keys/Pointers**: $\lceil (n-1)/2 \rceil$ or $\lfloor n/2 \rfloor$ (Check question context, usually $\lceil (n-1)/2 \rceil$).

### 3. Key Features of Secondary Index
- **Dense Index**: Every record in the data file has an entry in the leaf level of the index.
- **Non-Clustering**: The search key in the index does not determine the physical order of records in the data file.
- **Leaf Linkage**: Leaf nodes are linked together (usually doubly-linked) to support efficient **range queries**.

### 4. Performance Calculations (Very Important)
**Max Height/Levels ($H$):** 
Calculated by: $n^H \ge L$, where $L$ is the number of leaf nodes.
For minimum occupancy (worst case height): $(\lceil n/2 \rceil)^H \ge L$.

**Total Block Accesses:**
For an equality search: **$H$ (Index accesses) + 1 (Data block access)**.
For a range search: **$H$ (Initial traversal) + No. of subsequent leaf blocks + Total unique data blocks**.

### 5. Order Calculation Formula
Block Size ($B$), Key Size ($K$), Block Pointer ($P$), Record Pointer ($R$).

**Internal Node Order $p$:**
$(p \times P) + ((p-1) \times K) \le B$
$p(P + K) - K \le B$

**Leaf Node Order $p$:**
$(p \times (K + R)) \le B - P$ (Standard)
OR: $(p \times (K + R)) + P \le B$

### 6. Node Overflow and Split
- **Leaf Split**: When a leaf node with $n-1$ keys receives a new key, it splits. The middle key is **copied** to the parent, and both split nodes keep the middle key in the leaves.
- **Internal Split**: When an internal node with $n-1$ keys receives a new key, it splits. The middle key is **pushed up** to the parent (not kept in the children).

### 7. Advantages over Hash Indexing
- B+ Trees are superior for **range queries** and **ordered results**.
- Hash indices offer $O(1)$ average time for equality search but fail for range/pattern matching.

### 8. GATE Trick & Strategy
- **Max Keys vs Max Pointers**: Always distinguish between "Order" (usually pointers) and "Keys". 
- **Tree vs File**: Remember that in a secondary index, the data pointer in the leaf points to the **data block/record**, not another index block.
- **Min Occupancy**: For "Maximum Height" or "Minimum Nodes" questions, always use the formula for half-full nodes ($\lceil n/2 \rceil$).
- **Root Level**: Some authors call root Level 0, others Level 1. GATE usually specifies or the options clear it up. Assume Height = No. of index blocks in the search path.
`
    }
  ];

  for (const item of notes) {
    await prisma.pattern.updateMany({
      where: { topic_name: item.topic },
      data: {
        short_notes: item.content,
        short_notes_hindi: (item as any).content_hindi
      }
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
