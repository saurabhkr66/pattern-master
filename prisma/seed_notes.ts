import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📝 Seeding Premium Vibrant Notes...');

  const notes = [
    {
      topic: "Chomsky Hierarchy",
      content: `### 1. Definition
A classification of formal grammars into four nested classes, each generating a different class of languages, proposed by Noam Chomsky.

### 2. The Four Levels (Very Important)
| Type | Grammar | Language | Automaton | Production Rule Form |
|---|---|---|---|---|
| Type 0 | Unrestricted | Recursively Enumerable (RE) | Turing Machine | α → β (no restriction) |
| Type 1 | Context-Sensitive (CSG) | Context-Sensitive (CSL) | Linear Bounded Automaton (LBA) | αAβ → αγβ, |γ|≥1 |
| Type 2 | Context-Free (CFG) | Context-Free (CFL) | Pushdown Automaton (PDA) | A → γ (A is single non-terminal) |
| Type 3 | Regular | Regular | Finite Automaton (DFA/NFA) | A → aB or A → a (right-linear) |

### 3. Containment Hierarchy
Regular ⊂ CFL ⊂ CSL ⊂ RE ⊂ All Languages
- Every regular language is CFL
- Every CFL is CSL
- Every CSL is RE
- Some languages are not RE (undecidable)

### 4. Properties of Each Class
**Regular Languages**:
- Closed under: union, intersection, complement, concatenation, Kleene star, reversal
- NOT closed under: nothing (closed under all regular operations)
- Decidable: membership, emptiness, finiteness, equivalence

**Context-Free Languages**:
- Closed under: union, concatenation, Kleene star, reversal
- NOT closed under: intersection, complement
- CFL ∩ Regular = CFL (CFL closed under intersection with regular)
- Decidable: membership (CYK), emptiness, finiteness
- Undecidable: equivalence, ambiguity, intersection of two CFLs

**Context-Sensitive Languages**:
- Closed under: union, intersection, complement, concatenation, Kleene star
- Decidable: membership (but PSPACE-complete)

**Recursively Enumerable**:
- Closed under: union, intersection, concatenation, Kleene star
- NOT closed under: complement
- Undecidable: membership (halting problem)

### 5. Key Languages per Level
- Regular: aⁿ (fixed n), (ab)*, a*b*
- CFL but not Regular: aⁿbⁿ, aⁿbⁿcⁿ is NOT CFL
- CSL but not CFL: aⁿbⁿcⁿ
- RE but not Recursive: Halting problem
- Not RE: Complement of halting problem

### 6. GATE Trick
Closure properties table is directly tested — CFL NOT closed under intersection and complement. CFL ∩ Regular = CFL is a key exception. aⁿbⁿcⁿ is the standard example of CSL that is not CFL. Containment is strict — every level has languages not in the level below.`
    },

    {
      topic: "Context-Free Grammars (CFG)",
      content: `### 1. Definition
A CFG is a 4-tuple G = (V, Σ, R, S) where:
- V = set of non-terminal symbols (variables)
- Σ = set of terminal symbols (alphabet), V ∩ Σ = ∅
- R = set of production rules of the form A → α, where A ∈ V, α ∈ (V ∪ Σ)*
- S ∈ V = start symbol

### 2. Derivations
- **Leftmost derivation (LMD)**: Always expand the leftmost non-terminal
- **Rightmost derivation (RMD)**: Always expand the rightmost non-terminal
- Both produce same strings but different parse trees

### 3. Parse Tree
- Root = start symbol S
- Internal nodes = non-terminals
- Leaves = terminals (left to right = derived string)
- Frontier of parse tree = derived string

### 4. Ambiguous Grammar (Very Important)
A grammar is **ambiguous** if some string has:
- Two or more distinct parse trees, OR
- Two or more distinct leftmost derivations, OR
- Two or more distinct rightmost derivations (all three equivalent)

**Inherently ambiguous CFL**: No unambiguous CFG exists for the language.
Example: {aⁱbʲcᵏ | i=j or j=k} is inherently ambiguous.

**Removing ambiguity**: Rewrite grammar (may not always be possible)
- Standard fix for arithmetic: use precedence and associativity in grammar

### 5. Simplification of CFG (Very Important)
**Step 1 — Remove useless symbols**:
- Non-generating: Non-terminals that cannot derive any terminal string → remove
- Non-reachable: Non-terminals not reachable from S → remove
- Order: remove non-generating first, then non-reachable

**Step 2 — Remove ε-productions** (Unit productions A → ε):
- Find nullable non-terminals (those that can derive ε)
- For each production with nullable symbol, add version with that symbol removed
- Remove original ε-productions (except S → ε if ε ∈ L(G))

**Step 3 — Remove unit productions** (A → B where B is single non-terminal):
- Find unit closure of each non-terminal
- Replace A → B → α with A → α directly

### 6. Closure Properties of CFL
- **Closed under**: Union, Concatenation, Kleene star, Reversal, Homomorphism
- **NOT closed under**: Intersection, Complement
- **Exception**: CFL ∩ Regular Language = CFL (important exception)
- Intersection of two CFLs may not be CFL
- Example: {aⁿbⁿcᵐ} ∩ {aᵐbⁿcⁿ} = {aⁿbⁿcⁿ} which is NOT CFL

### 7. GATE Trick
Ambiguity check: try to find one string with two parse trees. Grammar for aⁿbⁿ (equal counts) always needs recursion — cannot be done with regular grammar. Simplification order matters: non-generating before non-reachable. CFL intersection with regular language stays CFL — frequently tested exception to "CFL not closed under intersection".`
    },

    {
      topic: "Decidability & Undecidability",
      content: `### 1. Definition
- **Decidable (Recursive) language**: A TM exists that always halts and correctly accepts/rejects every input
- **Semi-decidable (Recursively Enumerable)**: A TM exists that accepts all strings in the language but may loop forever on strings NOT in the language
- **Undecidable**: No TM exists that decides the language

### 2. Decidability Hierarchy
Decidable ⊂ Semi-decidable (RE) ⊂ All Languages
- If L is decidable → L is RE, complement L̄ is also decidable and RE
- If L is RE but not decidable → L̄ is NOT RE
- If L is not RE → L̄ may or may not be RE

### 3. Halting Problem (Very Important)
**HP**: Given TM M and input w, does M halt on w?
- HP is **Semi-decidable** (RE) — TM accepts if M halts on w, loops forever if M doesn't halt
- HP is **Undecidable** — no TM can always answer YES/NO

**Proof sketch (Diagonalization)**:
Assume TM H decides HP. Build TM D: on input M, run H(M,M):
- If H says "halts" → D loops forever
- If H says "loops" → D halts
Running D on D gives contradiction → H cannot exist.

### 4. Important Decidable Problems
**For Regular Languages** (all decidable):
- Membership: is w ∈ L(DFA)?
- Emptiness: is L(DFA) = ∅?
- Finiteness: is L(DFA) finite?
- Equivalence: is L(DFA₁) = L(DFA₂)?

**For CFLs** (partially decidable):
- Membership: is w ∈ L(CFG)? (CYK algorithm, O(n³))
- Emptiness: is L(CFG) = ∅?
- Finiteness: is L(CFG) finite?
- Undecidable: Equivalence, Ambiguity, L(CFG) = Σ*, intersection non-empty

### 5. Important Undecidable Problems (Very Important)
| Problem | Status |
|---|---|
| Halting Problem | RE, Undecidable |
| Emptiness of TM: L(TM) = ∅? | Co-RE, Undecidable |
| Membership for TM | RE, Undecidable |
| Equivalence of two TMs | Undecidable, not RE |
| Post Correspondence Problem (PCP) | Undecidable |
| CFG ambiguity | Undecidable |
| CFG equivalence | Undecidable |
| L(CFG) = Σ* | Undecidable |
| Intersection of two CFGs non-empty | Undecidable |

### 6. Rice's Theorem (Very Important)
Any non-trivial property of the language recognized by a TM is undecidable.
- **Trivial property**: Either all TMs have it or no TM has it
- **Non-trivial**: Some TMs have it, some don't
- Examples of undecidable (by Rice's): "Does TM accept ε?", "Is L(TM) regular?", "Is L(TM) finite?", "Is L(TM) = ∅?"

### 7. Reductions
If A reduces to B (A ≤ B):
- If B is decidable → A is decidable
- If A is undecidable → B is undecidable
- Reduction preserves undecidability upward

### 8. GATE Trick
Rice's theorem is the fastest way to prove undecidability — check if property is about the language (not the TM machine itself) and is non-trivial. Halting problem is the standard reduction target. If L is undecidable RE, then L̄ is not RE — this is directly tested. "Does TM halt on empty input?" — undecidable by Rice's theorem.`
    },

    {
      topic: "Finite Automata (DFA & NFA)",
      content: `### 1. Definition
- **DFA** (Deterministic Finite Automaton): 5-tuple (Q, Σ, δ, q₀, F) where δ: Q × Σ → Q (exactly one transition per state per symbol)
- **NFA** (Non-deterministic Finite Automaton): δ: Q × Σ → 2^Q (zero or more transitions per state per symbol, plus ε-transitions allowed)

### 2. DFA Components
- Q = finite set of states
- Σ = input alphabet
- δ = transition function (total function)
- q₀ ∈ Q = start state
- F ⊆ Q = set of accepting (final) states

String w is accepted if δ*(q₀, w) ∈ F (extended transition function reaches accepting state)

### 3. NFA vs DFA (Very Important)
| | DFA | NFA |
|---|---|---|
| Transitions | Exactly one per (state, symbol) | Zero or more per (state, symbol) |
| ε-transitions | Not allowed | Allowed |
| Acceptance | Must reach final state | ANY path reaches final state |
| Power | Equal to NFA | Equal to DFA |
| States (worst case) | — | NFA with n states → DFA with 2ⁿ states |

**Key fact**: DFA and NFA recognize exactly the same class — Regular Languages.

### 4. NFA to DFA Conversion (Subset Construction — Very Important)
1. Compute ε-closure of start state → initial DFA state
2. For each DFA state (set of NFA states) and each symbol a:
   - Compute: ε-closure(δ(q, a) for all q in set)
   - This becomes new DFA state
3. DFA state is accepting if it contains any NFA accepting state
4. Repeat until no new states

Worst case: NFA with n states → DFA with 2ⁿ states (exponential blowup)

### 5. ε-closure
ε-closure(q) = set of all states reachable from q using zero or more ε-transitions
- ε-closure({q}) always includes q itself
- Computed using BFS/DFS following only ε-transitions

### 6. DFA Minimization (Very Important)
**Table-filling algorithm (Myhill-Nerode)**:
1. Mark all pairs (accepting, non-accepting) as distinguishable
2. For each pair (p,q) and each symbol a: if (δ(p,a), δ(q,a)) already marked → mark (p,q)
3. Repeat until no new pairs marked
4. Unmarked pairs → equivalent states → merge them

Minimum DFA is unique (up to isomorphism) for any regular language.

### 7. Dead State (Trap State)
DFA must be total function — add dead/sink state for missing transitions.
Dead state: once entered, never leave. Non-accepting.

### 8. Number of DFAs / NFAs
- Number of DFAs with n states over {a,b}: 2ⁿ × (n²)ⁿ × n (choose final states × transitions × start state)
- Number of distinct DFA languages with n states: complex combinatorial result

### 9. GATE Trick
NFA to DFA subset construction: 2ⁿ worst case but usually far fewer reachable states — only construct reachable DFA states. Minimization: two states are equivalent if they agree on acceptance for all possible future inputs. ε-NFA acceptance: any path (including through ε-transitions) reaching final state = accept. Complement of DFA: swap accepting and non-accepting states (must ensure DFA is complete/total first).`
    },

    {
      topic: "Introduction to TOC",
      content: `### 1. Definition
Theory of Computation (TOC) studies the fundamental capabilities and limitations of computers — what can be computed, how efficiently, and what cannot be computed at all.

### 2. Three Central Questions
1. **What can computers compute?** → Computability theory (decidability, Turing machines)
2. **What can computers compute efficiently?** → Complexity theory (P, NP, NP-complete)
3. **How do we describe and recognize patterns?** → Automata theory (DFA, PDA, grammars)

### 3. Alphabet, String, and Language
- **Alphabet (Σ)**: Finite non-empty set of symbols. Example: Σ = {0,1}, Σ = {a,b,c}
- **String (word)**: Finite sequence of symbols from Σ. Empty string = ε (epsilon)
- **Length**: |w| = number of symbols. |ε| = 0
- **Σ* **: Set of all strings over Σ including ε (infinite set)
- **Σ⁺ = Σ* − {ε}**: All non-empty strings
- **Language**: Any subset L ⊆ Σ*

### 4. Operations on Languages
| Operation | Definition |
|---|---|
| Union | L₁ ∪ L₂ = {w | w ∈ L₁ or w ∈ L₂} |
| Concatenation | L₁·L₂ = {xy | x ∈ L₁, y ∈ L₂} |
| Kleene Star | L* = {ε} ∪ L ∪ LL ∪ LLL ∪ ... |
| Complement | L̄ = Σ* − L |
| Intersection | L₁ ∩ L₂ |
| Reversal | Lᴿ = {wᴿ | w ∈ L} |

### 5. Proof Techniques in TOC
- **Proof by contradiction**: Assume opposite, derive contradiction
- **Diagonalization**: Used to prove undecidability of halting problem
- **Closure proofs**: Show operation on languages in class stays in class
- **Pumping lemma**: Prove language is NOT in a class (by contradiction)
- **Reduction**: If A reduces to B and A is undecidable → B is undecidable

### 6. Computational Models Summary
| Model | Accepts | Memory |
|---|---|---|
| DFA/NFA | Regular languages | Finite (states only) |
| PDA | CFLs | Finite + stack (LIFO) |
| LBA | CSLs | Tape bounded by input |
| TM | RE languages | Infinite tape |

### 7. Church-Turing Thesis
Any effectively computable function can be computed by a Turing Machine. Not a theorem — a thesis. Defines the boundary of what is computable.

### 8. GATE Trick
Σ* is countably infinite. The set of all languages over Σ is uncountably infinite (power set of Σ*). Since TMs are countable but languages are uncountable → most languages are undecidable. ε (empty string) ≠ ∅ (empty language): {ε} is a language containing the empty string; ∅ is the language with no strings.`
    },

    {
      topic: "Normal Forms (CNF & GNF)",
      content: `### 1. Definition
Normal forms are standardized restricted forms of CFG that simplify proofs and algorithms while preserving the generated language.

### 2. Chomsky Normal Form (CNF — Very Important)
Every production is of the form:
- A → BC (two non-terminals), OR
- A → a (single terminal)
- (S → ε allowed only if ε ∈ L(G))

**Algorithm to Convert to CNF**:
1. Add new start symbol S₀ → S (to handle ε)
2. **Remove ε-productions**: Find nullable variables, add all combinations without them
3. **Remove unit productions**: A → B → replace with A → (whatever B produces)
4. **Remove useless symbols**: Non-generating and non-reachable
5. **Fix long productions**: A → BCD → A → BX, X → CD (introduce new variables)
6. **Fix terminal in mixed rules**: A → aB → A → YB, Y → a (replace terminals with new variables)

### 3. Why CNF Matters
- CYK (Cocke-Younger-Kasami) algorithm for parsing requires CNF
- Simpler to analyze and prove properties
- Every CFG can be converted to CNF (for ε-free CFGs exactly, with minor adjustment for ε)

### 4. CYK Algorithm (Very Important)
Membership testing for CFG in CNF. O(n³ × |G|) time.
- Dynamic programming on substrings
- Table[i][j] = set of non-terminals that derive substring wᵢ...wⱼ
- String is in language iff S ∈ Table[1][n]

### 5. Greibach Normal Form (GNF — Very Important)
Every production is of the form:
- A → aα where a is a terminal and α ∈ V* (string of zero or more non-terminals)
- Every production starts with exactly one terminal

**Key property**: Every derivation of a string of length n takes exactly n steps (one terminal produced per step → no ε-productions, no left recursion)

**Algorithm to Convert to GNF**:
1. Convert to CNF first
2. Order non-terminals: A₁, A₂, ..., Aₖ
3. Eliminate left recursion using substitution
4. Ensure all productions start with terminal

### 6. Comparison
| Property | CNF | GNF |
|---|---|---|
| Production form | A→BC or A→a | A→aα |
| Derivation length | Variable | Exactly n steps for length-n string |
| Application | CYK parsing | PDA construction, proofs |
| Left recursion | Allowed | Not allowed |

### 7. ε-free CFG
- CFG with no A → ε productions (except possibly S → ε if ε ∈ L)
- Required before converting to CNF or GNF
- Pumping lemma for CFL assumes ε-free grammar

### 8. GATE Trick
CNF requires ALL productions to be A→BC or A→a — a single violation (like A→BCD or A→aB) means it is NOT CNF. GNF is used to prove that every CFL is generated by a grammar where derivations have length = string length (useful in pumping lemma proofs). CYK algorithm complexity O(n³) — directly tested with specific grammars and strings.`
    },

    {
      topic: "Pumping Lemma for CFL",
      content: `### 1. Definition
A necessary condition that every CFL must satisfy. Used to prove that a given language is NOT context-free.

### 2. Statement (Very Important)
For any CFL L, there exists a pumping length p such that any string w ∈ L with |w| ≥ p can be split as w = uvxyz satisfying:
1. **|vxy| ≤ p** (the middle portion is bounded)
2. **|vy| ≥ 1** (at least one of v or y is non-empty — both cannot be empty simultaneously)
3. **For all i ≥ 0**: uvⁱxyⁱz ∈ L (pumping v and y same number of times stays in L)

### 3. How to Use Pumping Lemma to Prove Non-CFL
(Proof by contradiction)
1. Assume L is CFL with pumping length p
2. Choose a specific string w ∈ L with |w| ≥ p (choose cleverly!)
3. Consider ALL possible splits w = uvxyz satisfying conditions 1 and 2
4. For each possible split, find i ≥ 0 such that uvⁱxyⁱz ∉ L
5. This contradicts condition 3 → L is not CFL

### 4. Standard Examples (Very Important)
**L = {aⁿbⁿcⁿ | n ≥ 0}** — Not CFL:
- Choose w = aᵖbᵖcᵖ, |w| = 3p ≥ p
- Since |vxy| ≤ p, vxy cannot span all three symbol types — v and y together cover at most two types
- Pumping (i=2) breaks equal count of at least one symbol → not in L

**L = {aⁿ | n is a perfect square}** — Not CFL:
- Choose w = aᵖ². Pumping gives aᵖ²⁺ᵏ for some k. Not always perfect square.

**L = {ww | w ∈ {a,b}*}** — Not CFL:
- Choose w = aᵖbᵖaᵖbᵖ. Any split uvxyz with |vxy|≤p cannot span the middle boundary correctly.

### 5. What Pumping Lemma Cannot Do
- Cannot prove a language IS CFL (only necessary, not sufficient)
- Some non-CFLs may satisfy pumping lemma (lemma is not sufficient condition)
- To prove a language IS CFL: provide a CFG or PDA

### 6. Key Difference from Regular Pumping Lemma
| | Regular PL | CFL PL |
|---|---|---|
| Split | w = xyz | w = uvxyz |
| Condition | |xy| ≥ 1 | |vy| ≥ 1, |vxy| ≤ p |
| Pump | xⁱ | vⁱ and yⁱ together |
| Purpose | Prove not regular | Prove not CFL |

### 7. GATE Trick
Choice of w is crucial — pick string that forces v and y to be in positions where pumping breaks membership. For aⁿbⁿcⁿ: vxy spans at most two types of symbols → pumping disrupts balance. Ogden's Lemma is a stronger version (marks positions) but rarely tested in GATE. Pumping lemma gives contradiction when uvⁱxyⁱz ∉ L for some i — usually i=0 (deflating) or i=2 (inflating).`
    },

    {
      topic: "Pumping Lemma for Regular Lang",
      content: `### 1. Definition
A necessary condition that every regular language must satisfy. Used to prove a language is NOT regular.

### 2. Statement (Very Important)
For any regular language L, there exists a pumping length p (≥1) such that any string w ∈ L with |w| ≥ p can be written as w = xyz satisfying:
1. **|xy| ≤ p** (pump section within first p characters)
2. **|y| ≥ 1** (y is non-empty — the part being pumped)
3. **For all i ≥ 0**: xyⁱz ∈ L (pumping y any number of times stays in L)

**Intuition**: DFA has p states. String of length ≥ p must revisit a state (pigeonhole). The loop between repeated states can be pumped.

### 3. How to Prove a Language is NOT Regular
(Proof by contradiction)
1. Assume L is regular with pumping length p
2. Choose a specific string w ∈ L with |w| ≥ p (choose to make pumping hard!)
3. Consider ALL possible splits w = xyz with |xy| ≤ p and |y| ≥ 1
4. For each possible split, find i ≥ 0 such that xyⁱz ∉ L
5. Contradiction → L is not regular

### 4. Standard Examples (Very Important)
**L = {aⁿbⁿ | n ≥ 0}** — Not Regular:
- Choose w = aᵖbᵖ
- Since |xy| ≤ p, y consists entirely of a's only (y = aᵏ for k ≥ 1)
- Pump i=2: xy²z = aᵖ⁺ᵏbᵖ — unequal counts → not in L. Contradiction.

**L = {aⁿ² | n ≥ 0}** — Not Regular:
- Choose w = aᵖ²
- y = aᵏ (1 ≤ k ≤ p). Pump: aᵖ²⁺ᵏ
- p² < p²+k ≤ p²+p < (p+1)² → not a perfect square → not in L.

**L = {w | w has equal number of 0s and 1s}** — Not Regular:
- Choose w = 0ᵖ1ᵖ, similar argument.

### 5. Common Mistakes to Avoid
- Mistake: Choosing a specific split (e.g., y = a) — must work for ALL valid splits
- Mistake: Forgetting |xy| ≤ p forces y to be in first p characters
- Mistake: Not verifying that chosen w is actually in L
- Correct: Show contradiction for ALL possible y satisfying the conditions

### 6. What Pumping Lemma Cannot Do
- Cannot prove a language IS regular (only necessary condition, not sufficient)
- Some non-regular languages also satisfy pumping lemma
- To prove IS regular: give DFA, NFA, or regular expression

### 7. Myhill-Nerode Theorem (Alternative — Very Important)
L is regular iff the number of equivalence classes of relation Rₗ is finite.
x Rₗ y iff for all z: xz ∈ L ↔ yz ∈ L (same future behavior)
- Number of equivalence classes = number of states in minimal DFA
- Stronger than pumping lemma (necessary AND sufficient)
- Use to prove non-regularity: show infinitely many equivalence classes

### 8. GATE Trick
Pumping lemma is necessary but not sufficient — cannot be used to prove regularity. Myhill-Nerode is sufficient and necessary — stronger tool. For aⁿbⁿ: the key insight is |xy| ≤ p forces y ⊆ aᵖ prefix — y cannot contain both a's and b's. Always verify the chosen w ∈ L before starting the proof.`
    },

    {
      topic: "Pushdown Automata (PDA)",
      content: `### 1. Definition
A PDA is a finite automaton augmented with a stack (unbounded LIFO memory). PDAs recognize exactly the Context-Free Languages.

### 2. Formal Definition
PDA = (Q, Σ, Γ, δ, q₀, Z₀, F) where:
- Q = finite set of states
- Σ = input alphabet
- Γ = stack alphabet
- δ: Q × (Σ ∪ {ε}) × Γ → 2^(Q × Γ*) = transition function
- q₀ = initial state
- Z₀ ∈ Γ = initial stack symbol
- F ⊆ Q = set of final states

Transition δ(q, a, A) = {(p, γ)} means: in state q, reading a, with A on top of stack → go to state p, replace A with γ.

### 3. Acceptance Modes (Very Important)
**Acceptance by Final State**: PDA accepts when input is fully consumed AND current state is in F. Stack may contain anything.

**Acceptance by Empty Stack**: PDA accepts when input is fully consumed AND stack is empty. No final states needed.

Both modes are equivalent — any language accepted by one mode can be accepted by the other.

### 4. Deterministic PDA (DPDA)
- At most one move possible in any configuration
- Accepts strictly fewer languages than NPDA
- DPDA languages ⊂ CFL (proper subset)
- Example: {ww^R} is CFL but not accepted by any DPDA
- {ww^R$} (with end marker) IS accepted by DPDA
- DPDA languages = deterministic CFLs (unambiguous subset)

### 5. Constructing PDA for Common Languages
**For aⁿbⁿ (n ≥ 0)**:
1. State q₀: push a's onto stack for each 'a' read
2. On first 'b', switch to state q₁
3. State q₁: pop one 'a' for each 'b' read
4. If stack has only Z₀ and all input consumed → accept

**For ww^R (even palindromes)**:
1. Push input symbols onto stack
2. Non-deterministically guess midpoint → switch to pop mode
3. Pop and match with remaining input
4. Accept by empty stack when input exhausted

**For balanced parentheses**:
1. Push '(' on stack for each '(' read
2. Pop for each ')' read
3. Accept if stack empty (only Z₀) and input exhausted

### 6. PDA ↔ CFG Equivalence
- For every CFG G → equivalent PDA P can be constructed
- For every PDA P → equivalent CFG G can be constructed
- Both recognize exactly the CFL class

**CFG to PDA (Top-down)**:
- State: single state (or few states)
- Stack represents sentential form
- Pop A, push production body (non-deterministically)

### 7. Configuration of PDA
Instantaneous description (ID): (q, w, γ) = (current state, remaining input, stack contents)
- Move relation: (q, aw, Aγ) ⊢ (p, w, βγ) if (p,β) ∈ δ(q, a, A)
- ⊢* denotes zero or more moves

### 8. GATE Trick
DPDA strictly weaker than NPDA — {ww^R} requires nondeterminism but {ww^R$} does not. PDA acceptance by empty stack vs final state — both equivalent, choose whichever is easier for a given problem. For membership in CFL: give CFG or PDA. Stack in PDA = mechanism to count/match — used to enforce n=n type constraints that DFA cannot.`
    },

    {
      topic: "Regular Expressions",
      content: `### 1. Definition
A regular expression (RE) is a formal notation for describing regular languages using algebraic operations on alphabets.

### 2. Formal Definition (Very Important)
Base cases (over alphabet Σ):
- ∅ — empty language
- ε — language containing only empty string {ε}
- a (for each a ∈ Σ) — language {a}

Recursive cases: if R and S are regular expressions:
- R + S (or R|S) — union: L(R) ∪ L(S)
- RS (concatenation) — L(R)·L(S)
- R* (Kleene star) — L(R)*
- (R) — grouping

### 3. Operator Precedence
(high to low): * > concatenation > + (union)
- a+bc* = a + (b(c*))
- ab* ≠ (ab)*

### 4. Standard Regular Expressions (Very Important)
| Language | Regular Expression |
|---|---|
| All strings over {a,b} | (a+b)* |
| Strings starting with a | a(a+b)* |
| Strings ending with b | (a+b)*b |
| Strings containing ab | (a+b)*ab(a+b)* |
| Even length strings | ((a+b)(a+b))* |
| Strings with even number of a's | (b*ab*a)*b* |
| No two consecutive a's | (b+ab)*(a+ε) |
| Strings NOT containing aa | (b+ab)*(ε+a) |

### 5. Algebraic Laws (Very Important)
- R + S = S + R (union commutative)
- (R+S)+T = R+(S+T) (associative)
- R·(S·T) = (R·S)·T (concatenation associative)
- R·(S+T) = RS + RT (distributive)
- R*(R*) = R* (idempotent)
- (R*)* = R*
- ε* = ε, ∅* = ε
- R·ε = ε·R = R (identity)
- R·∅ = ∅·R = ∅ (zero element)
- R + ∅ = R (identity for union)
- R + R = R (union idempotent)
- (ε + R)* = R*
- R*R* = R*

### 6. RE ↔ FA Conversion
**RE to NFA** (Thompson's construction):
- ∅ → NFA with no accepting path
- ε → two states with ε-transition
- a → two states with a-transition
- R+S, RS, R* → combine NFAs with ε-transitions

**DFA to RE** (State elimination):
- Generalized NFA (GNFA) with RE labels on transitions
- Eliminate states one by one, updating transitions with RE
- Final RE when reduced to start → accept state

### 7. GATE Trick
RE for "strings with even number of a's": b*(ab*ab*)* or (b*ab*a)*b* — both equivalent. Simplify using algebraic laws before constructing NFA. (R+ε)* = R* is a key identity. RE equivalence: two REs equivalent iff they describe same language (construct DFAs and check equivalence). L((a+b)*(aa+bb)(a+b)*) = strings containing aa or bb as substring.`
    },

    {
      topic: "Theory of Computation",
      content: `### 1. Definition
TOC is the mathematical study of computation — defining what problems can be solved algorithmically, what cannot, and how efficiently solvable problems can be solved.

### 2. Complexity Classes (Very Important)
**P (Polynomial Time)**:
- Problems solvable by deterministic TM in O(nᵏ) time
- Tractable problems — efficiently solvable
- Examples: sorting, shortest path, MST, primality testing (AKS)

**NP (Non-deterministic Polynomial Time)**:
- Problems where a solution can be VERIFIED in polynomial time
- Equivalently: solvable by non-deterministic TM in polynomial time
- Examples: Boolean SAT, Clique, Vertex Cover, Hamiltonian Path, TSP (decision)

**NP-Hard**:
- At least as hard as any NP problem
- Every NP problem reduces to it in polynomial time
- May or may not be in NP
- Example: Halting problem (NP-Hard but not in NP)

**NP-Complete (NPC)**:
- In NP AND NP-Hard
- Hardest problems in NP
- To prove NPC: show in NP (verify in poly time) + show NP-Hard (reduce known NPC to it)
- Examples: SAT (first NPC — Cook-Levin theorem), 3-SAT, Clique, Vertex Cover, TSP, Graph Coloring

### 3. P vs NP
- P ⊆ NP (every deterministic poly-time algorithm is a special case of nondeterministic)
- Whether P = NP is the most famous open problem in computer science
- Most believe P ≠ NP but not proven
- If P = NP → NPC problems become tractable

### 4. Reductions in Complexity (Very Important)
**Polynomial-time reduction (≤ₚ)**:
A ≤ₚ B means: A reduces to B in polynomial time
- If B ∈ P and A ≤ₚ B → A ∈ P
- If A is NP-Hard and A ≤ₚ B → B is NP-Hard
- To prove B is NPC: (1) B ∈ NP, (2) reduce known NPC A to B

**Known NPC Reductions Chain**:
SAT → 3-SAT → Clique → Independent Set → Vertex Cover → Hamiltonian Circuit → TSP

### 5. Space Complexity
- **PSPACE**: Problems solvable in polynomial space
- **NPSPACE**: Non-deterministic polynomial space
- **Savitch's theorem**: NPSPACE = PSPACE
- P ⊆ NP ⊆ PSPACE ⊆ EXPTIME
- PSPACE-complete: QBF (Quantified Boolean Formula)

### 6. Important Problem Classifications
| Problem | Class |
|---|---|
| Sorting | P |
| Shortest path (Dijkstra) | P |
| Boolean SAT | NPC |
| 3-SAT | NPC |
| 2-SAT | P |
| Graph 2-coloring | P |
| Graph 3-coloring | NPC |
| Clique | NPC |
| Euler circuit | P |
| Hamiltonian circuit | NPC |
| TSP (decision) | NPC |
| Primality testing | P |
| Factoring | NP (not known to be P or NPC) |

### 7. GATE Trick
P vs NP: P = problems easy to SOLVE; NP = problems easy to VERIFY. 2-SAT is in P but 3-SAT is NPC — a critical boundary. NP-Complete requires BOTH being in NP AND NP-Hard — problems that are only NP-Hard are NOT NPC (e.g., Halting problem). Reduction direction for NPC proofs: reduce FROM known NPC TO new problem to show NP-Hardness.`
    },

    {
      topic: "Turing Machines (TM)",
      content: `### 1. Definition
A Turing Machine is a mathematical model of computation consisting of an infinite tape, a read/write head, a finite set of states, and a transition function. It defines the limits of what is algorithmically computable.

### 2. Formal Definition
TM = (Q, Σ, Γ, δ, q₀, q_accept, q_reject) where:
- Q = finite set of states
- Σ = input alphabet (not containing blank ␣)
- Γ = tape alphabet (Σ ⊆ Γ, blank ␣ ∈ Γ)
- δ: Q × Γ → Q × Γ × {L, R} = transition function
- q₀ = start state
- q_accept = accept state
- q_reject = reject state (q_accept ≠ q_reject)

### 3. How TM Works
1. Input written on tape, rest is blank
2. Head starts at leftmost input symbol
3. At each step: read symbol → write symbol → move L or R → change state
4. Halt in q_accept → accept; halt in q_reject → reject; loop forever → neither

### 4. TM vs Other Models (Very Important)
| Model | Memory | Accepts |
|---|---|---|
| DFA | States only | Regular |
| PDA | Stack (LIFO) | CFL |
| LBA | Tape bounded by input | CSL |
| TM | Infinite tape | RE |
| Multi-tape TM | Multiple tapes | RE (same power) |
| Non-deterministic TM | Infinite tape, nondeterministic | RE (same power) |

**Key equivalences**: Multi-tape TM = single-tape TM = Non-deterministic TM in power (all recognize RE languages). However NTM can be exponentially faster.

### 5. TM Variants (Same Computational Power)
- **Multi-tape TM**: k tapes, k heads. Simulated by single-tape TM with O(t²) time overhead
- **Non-deterministic TM**: Multiple possible transitions. Simulated by deterministic TM
- **Enumerator**: Prints (enumerates) all strings in language. L is RE iff some enumerator enumerates it
- **Oracle TM**: TM with access to oracle for some problem — used in complexity theory

### 6. Language Classes and TM
- **Recursive (Decidable)**: TM that always halts (accepts or rejects)
- **Recursively Enumerable (RE)**: TM that accepts all strings in L (may loop on non-members)
- **Not RE**: No TM accepts this language

**Complement**:
- If L is decidable → L̄ is decidable
- If L is RE but not decidable → L̄ is NOT RE
- If L is RE and L̄ is RE → L is decidable

### 7. Universal Turing Machine (UTM)
A single TM U that simulates any TM M on input w, given ⟨M,w⟩ (encoding of M and w).
- Basis for stored-program computers
- UTM exists → computation is universal

### 8. Encoding of TMs
TMs can be encoded as strings over {0,1} → countably many TMs. Languages over {0,1} are uncountably infinite (2^(Σ*) is uncountable). Therefore most languages have no TM → most problems are undecidable.

### 9. Configuration and Computation
Configuration: (q, tape_contents, head_position) — represents complete snapshot
- Start configuration: (q₀, input, 0)
- Accepting configuration: state = q_accept
- TM accepts w if start config leads to accepting config via finite computation steps

### 10. GATE Trick
NTM and DTM have same computational power — both recognize exactly RE. NTM is not more powerful than DTM, just potentially faster. Multi-tape TM does not increase power but can reduce time complexity. UTM proves general-purpose computers are possible. L is decidable iff both L and L̄ are RE — key theorem directly tested.`
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
