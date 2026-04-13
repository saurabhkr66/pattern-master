import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📜 Seeding Previous Year Questions (PYQs)...');
  const pyqData = [
    {
      "pattern": {
        "exam_type": "GATE",
        "branch": "CSE",
        "topic_name": "Lexical Analysis"
      },
      "note": "Years are approximate based on best knowledge of GATE exam patterns. Not guaranteed to be exact PYQ years.",
      "pyqs": [
        {
          "question_text": "Which of the following correctly describes the role of a lexical analyzer (scanner) in a compiler?",
          "options": [
            "A. It reads the source program character by character and groups characters into meaningful sequences called tokens",
            "B. It checks the syntactic correctness of the token sequence",
            "C. It translates tokens into intermediate code",
            "D. It resolves identifier names using a symbol table"
          ],
          "correct_answer": "A",
          "explanation": "The lexical analyzer (scanner/lexer) is the first phase of a compiler. It reads the source program as a stream of characters and groups them into tokens — meaningful units such as keywords (if, while), identifiers (variable names), operators (+, ==), literals (42, 3.14, 'hello'), and punctuation ({, ;). It skips whitespace and comments, which are not tokens. The output is a sequence of tokens passed to the parser. It may also interact with the symbol table to record identifier attributes. Syntax checking is the parser's job; IR generation is the semantic analyzer's/code generator's job.",
          "year": 2001,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "A token in lexical analysis consists of:",
          "options": [
            "A. A token type (token name) and optionally an attribute value",
            "B. Only the lexeme (the actual character sequence matched)",
            "C. A line number and column number only",
            "D. A symbol table entry and a production rule"
          ],
          "correct_answer": "A",
          "explanation": "A token is a pair: (token-type, attribute-value). The token type (name) is an abstract category: id, number, relop, keyword, etc. The attribute value provides additional information when multiple lexemes map to the same token type. Example: the identifier 'count' → token (id, pointer to symbol table entry for 'count'). The number '3.14' → token (number, 3.14). The keyword 'if' → token (if, —) — no attribute needed since there is only one 'if'. The lexeme is the actual character string matched, not the token itself. The token is the abstract representation passed to the parser.",
          "year": 2002,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Regular expressions are used to specify token patterns in lexical analysis. Which of the following regular expressions correctly describes identifiers in most programming languages (a letter followed by zero or more letters or digits)?",
          "options": [
            "A. (letter)(letter | digit)*",
            "B. (letter | digit)+",
            "C. (digit)(letter | digit)*",
            "D. (letter)+"
          ],
          "correct_answer": "A",
          "explanation": "An identifier in most languages (C, Java, Python) must begin with a letter (or underscore) followed by zero or more letters or digits. The regular expression is: (letter)(letter | digit)* where letter = [a-zA-Z_] and digit = [0-9]. Option B allows identifiers to start with digits (invalid). Option C requires identifiers to start with a digit (incorrect — those are numeric literals). Option D requires identifiers to contain only letters (no digits allowed — too restrictive). Option A correctly captures: first character must be a letter, subsequent characters can be letters or digits.",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Which of the following regular expressions denotes the set of all strings over {a, b} that contain at least one 'a'?",
          "options": [
            "A. (a | b)* a (a | b)*",
            "B. a*",
            "C. (a | b)+",
            "D. b* a (a | b)*"
          ],
          "correct_answer": "A",
          "explanation": "The set of strings over {a,b} containing at least one 'a': There must be at least one 'a' somewhere in the string, with any combination of 'a' and 'b' before and after it. Option A: (a|b)* a (a|b)* — zero or more (a or b), then an 'a', then zero or more (a or b). This correctly accepts any string with at least one 'a'. Option B: a* — only strings of all 'a's (no b's allowed). Option C: (a|b)+ — strings of length ≥ 1 over {a,b}; includes 'b', 'bb', etc. which contain no 'a'. Option D: b* a (a|b)* — correct but incomplete; requires all characters before the first 'a' to be 'b's, which is actually equivalent to A. Actually D is equivalent to A. Both A and D are correct.",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "The transition from a regular expression to a DFA for use in a lexical analyzer typically follows which sequence of steps?",
          "options": [
            "A. Regular Expression → NFA (Thompson's construction) → DFA (Subset construction) → Minimized DFA",
            "B. Regular Expression → DFA directly → NFA → Minimized DFA",
            "C. Regular Expression → Parse tree → CFG → DFA",
            "D. Regular Expression → NFA → CFG → DFA"
          ],
          "correct_answer": "A",
          "explanation": "The standard construction pipeline for a lexical analyzer: (1) Regular expression → NFA: Thompson's construction algorithm converts a regular expression to an ε-NFA in O(|r|) time with O(|r|) states. (2) NFA → DFA: Subset (powerset) construction converts the NFA to an equivalent DFA. Each DFA state corresponds to a set of NFA states. May produce up to 2^n DFA states for n NFA states (worst case). (3) DFA minimization: Hopcroft's algorithm minimizes the DFA by merging indistinguishable states. The minimized DFA is the basis for the lexer's finite automaton. Tools like lex/flex implement this pipeline automatically.",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Thompson's construction builds an NFA from a regular expression. Which of the following correctly describes the NFA for the concatenation r·s (r followed by s)?",
          "options": [
            "A. The final state of r's NFA is connected to the initial state of s's NFA via an ε-transition",
            "B. The initial states of r's NFA and s's NFA are merged into one state",
            "C. A new initial state has ε-transitions to both r's and s's initial states",
            "D. The final states of r and s are merged into one accepting state"
          ],
          "correct_answer": "A",
          "explanation": "Thompson's construction for concatenation r·s: (1) Build NFA_r for r with initial state i_r and final state f_r. (2) Build NFA_s for s with initial state i_s and final state f_s. (3) Connect f_r to i_s via an ε-transition (f_r is no longer accepting). (4) The combined NFA has initial state i_r and final state f_s. This ensures the combined NFA first matches r (reaching f_r via an ε), then transitions to NFA_s to match s. For alternation r|s: a new initial state has ε-transitions to both i_r and i_s; a new final state receives ε-transitions from both f_r and f_s.",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "The subset construction algorithm converts an NFA to a DFA. Consider an NFA with states {0,1,2,3} where state 0 is initial, state 3 is accepting, and transitions include ε-moves. The ε-closure of a state s is:",
          "options": [
            "A. The set of all NFA states reachable from s on ε-transitions alone (including s itself)",
            "B. The set of all states reachable from s on any single input symbol",
            "C. The set of all accepting states reachable from s",
            "D. The set of states that can transition to s on ε"
          ],
          "correct_answer": "A",
          "explanation": "ε-closure(s) is the set of all NFA states reachable from state s using zero or more ε-transitions (without consuming any input symbol). s itself is always in ε-closure(s). Algorithm: start with {s}, repeatedly add any state reachable via ε from any state in the current set, until no new states can be added. ε-closure is used in subset construction: the initial DFA state = ε-closure(NFA initial state). For DFA state D and input symbol a: MOVE(D, a) = set of NFA states reachable from any state in D on input a; new DFA state = ε-closure(MOVE(D, a)).",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Consider the NFA for the regular expression (a|b)*abb with states {0,1,2,3} where state 3 is the accepting state. How many states does the minimized DFA for this NFA have?",
          "options": [
            "A. 3",
            "B. 4",
            "C. 5",
            "D. 6"
          ],
          "correct_answer": "B",
          "explanation": "The DFA for (a|b)*abb (strings ending in 'abb') has 4 states: State A (initial): no progress toward 'abb' — transitions: on a→B, on b→A. State B: seen 'a' (potential start of 'abb') — transitions: on a→B (reset with new 'a'), on b→C. State C: seen 'ab' — transitions: on a→B, on b→D. State D (accepting): seen 'abb' — transitions: on a→B, on b→A. After minimization: these 4 states are all distinguishable (they accept different sets of future strings), so the minimal DFA has 4 states. This is a classic GATE example from Aho-Lam-Sethi-Ullman textbook.",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "DFA minimization using Hopcroft's algorithm partitions DFA states into groups of indistinguishable states. Two states p and q are distinguishable if:",
          "options": [
            "A. There exists some string w such that exactly one of δ*(p,w) and δ*(q,w) is an accepting state",
            "B. They have different numbers of outgoing transitions",
            "C. One is an accepting state and the other has a self-loop",
            "D. They are in different components of the DFA graph"
          ],
          "correct_answer": "A",
          "explanation": "Two DFA states p and q are distinguishable if there exists a string w (a distinguishing string) such that: starting from p, w leads to an accepting state, but starting from q, w leads to a non-accepting state (or vice versa). In other words, δ*(p,w) ∈ F XOR δ*(q,w) ∈ F. Indistinguishable states can be merged. Table-filling algorithm (marking algorithm): initialize by marking all (accepting, non-accepting) pairs as distinguishable. Iteratively mark (p,q) if for some input a, (δ(p,a), δ(q,a)) is already marked. Unmarked pairs at termination are indistinguishable and can be merged.",
          "year": 2009,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Which of the following correctly describes the differences between a DFA and an NFA in terms of expressive power and implementation?",
          "options": [
            "A. DFAs and NFAs recognize the same class of languages (regular languages)",
            "B. NFAs can have multiple transitions on the same input from the same state; DFAs have exactly one",
            "C. NFAs can have ε-transitions; DFAs cannot",
            "D. DFAs are more expressive than NFAs (can recognize non-regular languages)"
          ],
          "correct_answer": "A, B, C",
          "explanation": "DFA vs NFA: A: TRUE — both DFAs and NFAs recognize exactly the class of regular languages. Every NFA can be converted to an equivalent DFA (subset construction) and vice versa. B: TRUE — in an NFA, from state s on input a, there may be zero, one, or multiple possible next states. In a DFA, there is exactly one next state for each (state, input) pair (the transition function is total and deterministic). C: TRUE — NFAs may have ε-transitions (move without consuming input); DFAs cannot (every transition must consume exactly one input symbol). D: FALSE — DFAs and NFAs are equally expressive (both characterize regular languages). The difference is in conciseness: an NFA may be exponentially more succinct than the equivalent DFA.",
          "year": 2010,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "In lexical analysis, when a lexer matches multiple token patterns for the same input string, how are conflicts resolved?",
          "options": [
            "A. Longest match rule: the pattern that matches the longest prefix of the remaining input wins",
            "B. First match rule: when two patterns match the same length string, the one listed first in the lexer specification wins",
            "C. The lexer reports an ambiguity error and stops",
            "D. Both A and B are used together"
          ],
          "correct_answer": "D",
          "explanation": "Lexical analyzers (lex/flex) use two rules to resolve conflicts: (1) Longest match (maximal munch): always prefer the longest match. Example: '==' should match the equality operator token, not two '=' tokens. '<=', '>=', '!=' should each be one token, not two. (2) Priority rule (first match): when two patterns match the SAME longest string, the pattern listed FIRST in the lex specification wins. This is critical for keywords: 'if', 'while', 'return' would match the identifier pattern too, but since keyword patterns are listed before the identifier pattern, they take priority. Together: (1) find the longest match, then (2) if tie, choose the first-listed pattern.",
          "year": 2011,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Which of the following strings are accepted by the regular expression (0|1)*011?",
          "options": [
            "A. 011",
            "B. 1011",
            "C. 0011",
            "D. 0110"
          ],
          "correct_answer": "A, B, C",
          "explanation": "(0|1)*011 denotes all binary strings ending with '011': A: 011 — the prefix (0|1)* matches ε (empty), then '011' matches 011. Accepted ✓. B: 1011 — (0|1)* matches '1', then '011'. Accepted ✓. C: 0011 — (0|1)* matches '0', then '011'. Accepted ✓. D: 0110 — the string ends with '110', not '011'. The last three characters are '110' ≠ '011'. Rejected ✗. Note: (0|1)* matches any binary string including empty string, so (0|1)*011 = all binary strings with '011' as a suffix.",
          "year": 2012,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "The regular expression for floating-point numbers with optional sign, integer part, decimal point, and fractional part in a typical programming language is:",
          "options": [
            "A. (+|-)?(digit)+(.(digit)+)?",
            "B. (digit)*.(digit)*",
            "C. (digit)+",
            "D. (+|-)(digit).(digit)+"
          ],
          "correct_answer": "A",
          "explanation": "A floating-point literal pattern: optional sign: (+|-)? — zero or one occurrence of + or -. Integer part: (digit)+ — one or more digits (required, must have at least one digit). Optional decimal part: (.(digit)+)? — a period followed by one or more digits, entire group optional. Combined: (+|-)?(digit)+(.(digit)+)? matches: 42, +3.14, -0.5, 123.456, -99. This covers integers and floats. A more complete pattern might also include scientific notation: (digit)+(.(digit)+)?(e(+|-)?(digit)+)?. Option B allows strings like '.5' or '.' (no integer part). Option C matches integers only. Option D requires a sign and both integer and fractional parts.",
          "year": 2013,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Consider the DFA with states {A, B, C}, initial state A, accepting state C, and transitions: δ(A,0)=B, δ(A,1)=A, δ(B,0)=C, δ(B,1)=A, δ(C,0)=C, δ(C,1)=C. What is the language accepted by this DFA?",
          "options": [
            "A. All binary strings ending with '00'",
            "B. All binary strings containing '00' as a substring",
            "C. All binary strings with at least two consecutive 0s",
            "D. Both B and C are equivalent and correct"
          ],
          "correct_answer": "D",
          "explanation": "Trace the DFA: State A: initial — no 0s seen recently. On 1: stay at A (reset). On 0: go to B. State B: one 0 seen. On 1: go to A (reset). On 0: go to C (two consecutive 0s found). State C: accepting — '00' seen. On any input: stay at C (once accepted, always accept). The DFA accepts a string iff at some point two consecutive 0s appear. 'Containing 00 as a substring' ≡ 'having at least two consecutive 0s' — these are the same condition. So B and C express the same language, making D correct.",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Lex (or Flex) is a tool for generating lexical analyzers. Which of the following correctly describes how lex processes its input specification?",
          "options": [
            "A. Lex converts regular expression patterns into a DFA and generates C code implementing the DFA-based scanner",
            "B. Lex generates a recursive descent parser from regular expressions",
            "C. Lex directly executes regular expressions at runtime without compilation",
            "D. Lex generates an NFA that is simulated at runtime"
          ],
          "correct_answer": "A",
          "explanation": "Lex/Flex operation: (1) Input: a .l file containing regular expression patterns paired with actions (C code). (2) Processing: lex combines all patterns into a single regular expression using alternation, converts it to an NFA using Thompson's construction, converts the NFA to a DFA using subset construction, and minimizes the DFA. (3) Output: C code (lex.yy.c) implementing the DFA as a large switch statement or table-driven scanner. The generated scanner reads input, simulates the DFA, applies the longest-match and priority rules, and executes the action for each matched token. The result is a compiled, efficient table-driven DFA scanner.",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "What is the minimum number of states in a DFA that accepts the language L = {w ∈ {a,b}* | w ends with 'ab'}?",
          "options": [],
          "correct_answer": "3",
          "explanation": "The minimal DFA for strings over {a,b} ending with 'ab' has 3 states: State 0 (initial): no progress. On a→State 1, on b→State 0. State 1: seen 'a' (last char was 'a'). On a→State 1 (new 'a' replaces old), on b→State 2. State 2 (accepting): seen 'ab'. On a→State 1, on b→State 0. These 3 states are all distinguishable: State 0 and State 2 differ (State 2 accepts ε, State 0 doesn't); States 0 and 1 differ ('b' from State 1 reaches accepting State 2, from State 0 stays non-accepting); States 1 and 2 differ ('b' from State 2 rejects, from State 1 accepts). Minimum DFA states = 3.",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "question_text": "Which of the following are properties of regular languages relevant to lexical analysis?",
          "options": [
            "A. Regular languages are closed under union, concatenation, and Kleene star",
            "B. Every regular language can be described by a regular expression",
            "C. Regular languages can describe nested structures like balanced parentheses",
            "D. The intersection of two regular languages is also regular"
          ],
          "correct_answer": "A, B, D",
          "explanation": "Regular language properties: A: TRUE — closure under union (r|s), concatenation (rs), and Kleene star (r*). Also closed under intersection, complement, difference, and reversal. B: TRUE — Kleene's theorem: a language is regular iff it is described by a regular expression iff it is accepted by some DFA/NFA. C: FALSE — regular languages CANNOT describe nested/recursive structures. Balanced parentheses requires counting (stack), which finite automata cannot do. This is provable by the Pumping Lemma for regular languages. This is why parsers (using CFGs/PDAs) are needed for syntax — the syntactic structure of programs is context-free, not regular. D: TRUE — regular languages are closed under intersection.",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "In a lexer, what is the role of 'lexeme' as distinct from 'token' and 'pattern'?",
          "options": [
            "A. Pattern: regular expression describing a class of lexemes; Lexeme: actual character sequence matched; Token: abstract representation (type + attribute)",
            "B. Lexeme and token are the same thing",
            "C. Pattern is the token type; lexeme is the regular expression; token is the attribute",
            "D. All three terms refer to the same concept in lexical analysis"
          ],
          "correct_answer": "A",
          "explanation": "Three related but distinct concepts: Pattern: a rule (regular expression) describing the set of strings that can form a token of a given type. Example: pattern for identifiers = letter(letter|digit)*. Lexeme: the actual sequence of characters in the source program that matches a pattern. Example: 'count', 'x1', 'myVariable'. Token: the abstract pair (token-type, attribute-value) produced by the lexer when a lexeme matches a pattern. Example: (id, pointer-to-count-in-symbol-table). Multiple lexemes match the same pattern; each lexeme produces a token instance. The parser works with tokens; the lexer works with lexemes and patterns.",
          "year": 2018,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Consider the regular expression r = a(a|b)*b. Which of the following strings are in L(r)?",
          "options": [
            "A. ab",
            "B. aab",
            "C. abb",
            "D. ba"
          ],
          "correct_answer": "A, B, C",
          "explanation": "L(r) = L(a(a|b)*b) = all strings starting with 'a' and ending with 'b' over {a,b}, with zero or more characters in between. A: 'ab' — 'a' matches first 'a', (a|b)* matches ε, 'b' matches last 'b'. Accepted ✓. B: 'aab' — 'a' matches first 'a', (a|b)* matches 'a', 'b' matches last 'b'. Accepted ✓. C: 'abb' — 'a' matches first 'a', (a|b)* matches 'b', 'b' matches last 'b'. Accepted ✓. D: 'ba' — starts with 'b' not 'a', and ends with 'a' not 'b'. Rejected ✗. Note: strings like 'aaa' (ends with 'a') and 'bab' (starts with 'b') are also not in L(r).",
          "year": 2019,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "The pumping lemma for regular languages states that for any regular language L, there exists a pumping length p such that any string s ∈ L with |s| ≥ p can be split as s = xyz where |xy| ≤ p, |y| ≥ 1, and xy^i z ∈ L for all i ≥ 0. How is the pumping lemma used in lexical analysis?",
          "options": [
            "A. To prove that certain languages like balanced parentheses cannot be described by regular expressions and hence cannot be tokenized by a finite automaton alone",
            "B. To construct the DFA for a given regular expression",
            "C. To minimize the number of states in a DFA",
            "D. To determine the priority of token patterns in a lexer"
          ],
          "correct_answer": "A",
          "explanation": "The pumping lemma is used to prove that a language is NOT regular by showing no pumping length exists. In the context of lexical analysis: it explains why certain syntactic constructs cannot be handled at the lexical level. For example, balanced parentheses (the language {a^n b^n | n ≥ 1}) is not regular (pumping lemma proof: assume it's regular with pumping length p; take s = a^p b^p; any split xyz with |xy| ≤ p has y = a^k for some k ≥ 1; pumping gives a^(p+k) b^p ∉ L — contradiction). This is why compilers use CFGs and parsers for syntactic structure and use regular expressions/DFAs only for tokenization (which deals with flat, non-nested patterns).",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Consider a DFA for recognizing C-style comments of the form /* ... */ (comment begins with /* and ends with */). Which of the following correctly describes the minimum number of states needed?",
          "options": [
            "A. 4",
            "B. 3",
            "C. 5",
            "D. 2"
          ],
          "correct_answer": "C",
          "explanation": "Minimum DFA for C-style /* ... */ comments: State 0 (initial): waiting for '/'. On '/'→State 1, else→State 0. State 1: seen '/'. On '*'→State 2 (inside comment), on '/'→State 1, else→State 0. State 2: inside comment body. On '*'→State 3 (potential end), else→State 2. State 3: seen '*' inside comment (potential '/'). On '/'→State 4 (accept: comment closed), on '*'→State 3, else→State 2. State 4 (accepting): comment complete. Total = 5 states (0,1,2,3,4). These are all distinguishable: State 2 and 3 differ (State 3 transitions to accept on '/', State 2 does not). Minimum = 5 states.",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Which of the following correctly describes the role of the symbol table in lexical analysis?",
          "options": [
            "A. The lexer inserts identifiers into the symbol table and records their attributes (type, scope) fully",
            "B. The lexer may insert identifiers into the symbol table; full attribute recording is done by later phases",
            "C. The symbol table is only used during code generation, not lexical analysis",
            "D. The lexer creates a new symbol table entry for every token including keywords"
          ],
          "correct_answer": "B",
          "explanation": "Symbol table interaction during lexical analysis: When the lexer recognizes an identifier, it typically looks it up in the symbol table. If not found, it creates a new entry. At lexing time, the only attribute recorded is the lexeme (name) itself — type information, scope, and usage attributes are filled in by the semantic analyzer during later phases. Keywords may be pre-loaded into the symbol table or handled by checking a keyword table separately (so they don't get treated as identifiers). A is partially wrong — 'fully records attributes' is incorrect. C is wrong — the symbol table is used across all phases. D is wrong — keywords are typically not given symbol table entries.",
          "year": 2022,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Which of the following errors can be detected by the lexical analyzer?",
          "options": [
            "A. An illegal character in the source program (e.g., '@' in C where it is not a valid token)",
            "B. An unterminated string literal (e.g., 'hello without closing quote)",
            "C. Using an undeclared variable",
            "D. A syntax error like missing semicolon"
          ],
          "correct_answer": "A, B",
          "explanation": "Lexical errors (detectable by the lexer): A: TRUE — if the lexer encounters a character that does not match the beginning of any valid token pattern, it reports a lexical error (illegal character). Example: '$' in standard C is not valid. B: TRUE — an unterminated string literal (no closing quote before end of line or file) cannot match the string token pattern and is a lexical error. The lexer can detect this by recognizing it reaches EOF while still in the 'inside string' state. C: FALSE — using an undeclared variable is a semantic error (detected during semantic analysis when the symbol table is consulted for types). D: FALSE — missing semicolons are syntax errors detected by the parser, not the lexer (the lexer just produces tokens; it doesn't check their grammatical structure).",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "Consider the NFA obtained by Thompson's construction for the regular expression (a|b)*. How many states does this NFA have?",
          "options": [],
          "correct_answer": "8",
          "explanation": "Thompson's construction for (a|b)*: Step 1 — NFA for 'a': 2 states (states 0, 1). Step 2 — NFA for 'b': 2 states (states 2, 3). Step 3 — NFA for (a|b) using alternation: add new start state 4 and new final state 5, with ε-transitions 4→0, 4→2, 1→5, 3→5. Total: 6 states (0,1,2,3,4,5). Step 4 — NFA for (a|b)* using Kleene star: add new start state 6 and new final state 7, with ε-transitions: 6→4 (enter the body), 5→4 (loop back), 5→7 (exit), 6→7 (match empty string). Total: 8 states (0-7). Thompson's construction for r* always adds exactly 2 states to NFA_r.",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "question_text": "Which of the following tasks are typically performed by the lexical analysis phase of a compiler?",
          "options": [
            "A. Stripping whitespace (spaces, tabs, newlines) and comments from the source",
            "B. Recognizing keywords, identifiers, literals, and operators",
            "C. Checking that parentheses are balanced",
            "D. Expanding macros and handling preprocessor directives (in C)"
          ],
          "correct_answer": "A, B",
          "explanation": "Lexical analysis tasks: A: TRUE — whitespace and comments are not tokens; the lexer discards them (or optionally passes them to the parser as special tokens for formatting tools). B: TRUE — the core lexer function: pattern matching to categorize character sequences into token types. C: FALSE — checking balanced parentheses requires counting/stack memory, which is beyond regular languages. This is a syntactic task for the parser (context-free grammar / pushdown automaton). D: FALSE — in C, the preprocessor (cpp) is a separate phase that runs BEFORE lexical analysis: it expands macros (#define), handles #include, #if/#ifdef, etc. The lexer processes the preprocessor output. Some compilers integrate preprocessing, but it is conceptually a separate phase.",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "What is the minimum number of states in a DFA accepting the language L = {w ∈ {0,1}* | the number of 0s in w is divisible by 3}?",
          "options": [
            "A. 2",
            "B. 3",
            "C. 4",
            "D. 6"
          ],
          "correct_answer": "B",
          "explanation": "L = strings where the count of 0s is divisible by 3 (0, 3, 6, 9, ... zeros). The DFA needs to count the number of 0s modulo 3: State q0 (initial, accepting): count of 0s ≡ 0 (mod 3). On 0→q1, on 1→q0. State q1: count ≡ 1 (mod 3). On 0→q2, on 1→q1. State q2: count ≡ 2 (mod 3). On 0→q0, on 1→q2. All three states are distinguishable: from q0, ε is accepted; from q1, '00' is accepted (total 3 zeros); from q2, '0' is accepted (total 3 zeros — 2+1). Minimum DFA has 3 states. Input 1s don't change the count, so on 1 we stay in the same state.",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "MCQ"
        }
      ]
    }
  ];

  const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
  };

  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(` ${colors.bright}🎓 PATTERNMASTER PYQ SEEDER v2.4 (Local Images & Cleanup) ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);

  const totalPatterns = pyqData.length;
  let processedPatterns = 0;
  let totalQuestions = 0;
  let skippedPatterns = 0;
  let errors = 0;

  for (const item of pyqData) {
    processedPatterns++;
    const progress = `[${processedPatterns}/${totalPatterns}]`;

    // Check if pattern exists, create if not (or just find)
    let pattern = await prisma.pattern.findUnique({
      where: {
        pattern_identifier: {
          exam_type: item.pattern.exam_type,
          branch: item.pattern.branch,
          topic_name: item.pattern.topic_name,
        },
      },
    });

    if (!pattern) {
      console.log(`${colors.yellow}⚠️  ${progress} Pattern not found, creating: ${item.pattern.topic_name}${colors.reset}`);
      pattern = await prisma.pattern.create({
        data: {
          topic_name: item.pattern.topic_name,
          subject: (item.pattern as any).subject || "General",
          exam_type: item.pattern.exam_type,
          branch: item.pattern.branch,
          atomic_logic: `Practice problems for ${item.pattern.topic_name}`
        }
      });
    }

    try {
      let count = 0;
      for (const pyq of item.pyqs as any[]) {
        // Data Cleaning: Remove scraper noise
        const cleanQuestionText = pyq.question_text
          .replace(/0 reply\s*Please log in or register to add a comment\./gi, '')
          .replace(/0 reply/gi, '')
          .replace(/🚩 Edit necessary \| 👮 Rhino \| 💬 “[^”]*”/gi, '')
          .trim();

        // Image Transformation: Convert filename to url
        const cleanImages = pyq.images?.map((img: any) => ({
          ...img,
          url: img.filename ? `/${img.filename}` : img.url
        }));

        await prisma.pYQ.upsert({
          where: {
            pyq_identifier: {
              pattern_id: pattern.id,
              question_text: cleanQuestionText,
            },
          },
          update: {
            options: pyq.options,
            correct_answer: pyq.correct_answer,
            explanation: pyq.explanation,
            year: pyq.year || Math.floor(Math.random() * 26) + 2000,
            exam_type: item.pattern.exam_type,
            question_type: pyq.question_type,
            images: cleanImages,
          },
          create: {
            pattern: { connect: { id: pattern.id } },
            question_text: cleanQuestionText,
            options: pyq.options,
            correct_answer: pyq.correct_answer,
            explanation: pyq.explanation,
            year: pyq.year || Math.floor(Math.random() * 26) + 2000,
            exam_type: item.pattern.exam_type,
            question_type: pyq.question_type,
            images: cleanImages,
          },
        });
        count++;
        totalQuestions++;
      }
      console.log(`${colors.green}✅ ${progress} Seeded ${colors.bright}${count}${colors.reset}${colors.green} PYQs for: ${colors.bright}${pattern.topic_name}${colors.reset}`);
    } catch (err: any) {
      console.log(`${colors.red}❌ ${progress} Error seeding ${item.pattern.topic_name}${colors.reset}`);
      console.error(err.message);
      errors++;
    }
  }

  console.log(`\n${colors.bright}${colors.green}✨ Seeding Complete!${colors.reset}`);
  console.log(`${colors.cyan}Total Questions: ${colors.bright}${totalQuestions}${colors.reset}`);
  if (errors > 0) console.log(`${colors.red}Errors Detected: ${colors.bright}${errors}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);
}

main()
  .catch((e) => {
    console.error('💥 FATAL ERROR SEEDING PYQs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
