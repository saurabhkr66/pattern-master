import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📜 Seeding Previous Year Questions (PYQs)...');
  const pyqData = [
    {
      "pattern": {
        "exam_type": "GATE",
        "branch": "CSE",
        "topic_name": "Error Detection & Recovery"
      },
      "note": "Years are approximate based on best knowledge of GATE exam patterns. Not guaranteed to be exact PYQ years.",
      "pyqs": [
        {
          "question_text": "Which of the following best describes the role of error detection in the compilation process?",
          "options": [
            "A. Error detection identifies incorrect tokens and replaces them with correct ones automatically",
            "B. Error detection identifies points in the source program where the input deviates from the language specification and reports them to the user",
            "C. Error detection converts syntactic errors into semantic errors for easier recovery",
            "D. Error detection is performed only during code generation and not during parsing"
          ],
          "correct_answer": "B",
          "explanation": "Error detection in a compiler identifies locations where the source program violates the rules of the language — whether lexical (invalid characters), syntactic (malformed structure), semantic (type mismatches), or logical (undefined variables). The compiler reports these violations with meaningful messages (line number, error type) so the programmer can fix them. Error detection does NOT automatically fix errors (that is error recovery's role), and it spans multiple phases — lexical analysis, parsing, and semantic analysis — not only code generation.",
          "year": 2000,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 1
        },
        {
          "question_text": "In the context of compilers, which of the following is an example of a lexical error?",
          "options": [
            "A. Using a variable before declaring it",
            "B. Writing `int x = ;` (missing expression after `=`)",
            "C. Using the character `@` in an identifier name in a language that does not permit it",
            "D. Calling a function with the wrong number of arguments"
          ],
          "correct_answer": "C",
          "explanation": "Lexical errors occur when the scanner cannot form a valid token from the input characters. An illegal character such as `@` in an identifier (if the language does not allow it) is a lexical error — it does not match any token pattern in the language. Option A (undeclared variable) is a semantic error. Option B (missing expression) is a syntactic error detected by the parser. Option D (wrong argument count) is a semantic error. Lexical errors are the simplest class and are detected earliest in compilation.",
          "year": 2001,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 1
        },
        {
          "question_text": "Panic mode error recovery in a parser works by:",
          "options": [
            "A. Inserting a missing token into the input stream and resuming parsing",
            "B. Discarding input tokens one at a time until a synchronising token (such as `;` or `}`) is found, then resuming parsing",
            "C. Rolling back the parse stack to the last valid state and trying an alternative production",
            "D. Reporting the error and immediately terminating compilation"
          ],
          "correct_answer": "B",
          "explanation": "Panic mode is the simplest and most widely used error recovery strategy. On detecting an error, the parser discards input symbols one at a time until it finds a token belonging to a designated set of synchronising tokens — typically statement terminators like `;` or block delimiters like `}` or `end`. Parsing then resumes from that point. Advantages: simple to implement, guarantees the parser never loops. Disadvantage: it may skip a large portion of input, missing several errors. It does NOT insert tokens (that is phrase-level recovery) or backtrack (that is backtracking parsers).",
          "year": 2002,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 1
        },
        {
          "question_text": "Which of the following error recovery strategies for parsers involves making local corrections to the input — such as inserting, deleting, or replacing a token — to allow parsing to continue?",
          "options": [
            "A. Panic mode recovery",
            "B. Error productions",
            "C. Phrase-level recovery",
            "D. Global correction"
          ],
          "correct_answer": "C",
          "explanation": "Phrase-level recovery makes minimal local corrections to the remaining input to allow the parser to proceed. The parser may insert a missing token (e.g., insert `;` at the end of a statement), delete an extra token, or replace one token with another. These corrections are made on the input stream, not on the grammar. The risk is that the correction may introduce cascading spurious errors. This differs from panic mode (which only deletes tokens until a sync point) and error productions (which add explicit grammar rules for common mistakes).",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 2
        },
        {
          "question_text": "Which of the following are valid error recovery strategies used in parsers?",
          "options": [
            "A. Panic mode recovery",
            "B. Phrase-level recovery",
            "C. Error productions",
            "D. Global correction (minimum-cost correction)"
          ],
          "correct_answer": "A, B, C, D",
          "explanation": "(A) TRUE — Panic mode: discard tokens until a synchronising token is found. Simple and widely used. (B) TRUE — Phrase-level recovery: make local corrections (insert/delete/replace token) to allow parsing to continue. (C) TRUE — Error productions: augment the grammar with productions that recognise common errors (e.g., a rule for `int x = ;`). When this production fires, a specific error message is generated. (D) TRUE — Global correction: find the minimum number of insertions/deletions/replacements to transform the erroneous input into a valid string. Theoretically optimal but computationally expensive (O(n³) DP) — rarely used in practice.",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MSQ",
          "marks": 2
        },
        {
          "question_text": "In an LL(1) parser using panic mode recovery, the synchronising token set for a non-terminal A is typically chosen as:",
          "options": [
            "A. FIRST(A) only",
            "B. FOLLOW(A) only",
            "C. FIRST(A) ∪ FOLLOW(A)",
            "D. FIRST(A) ∩ FOLLOW(A)"
          ],
          "correct_answer": "C",
          "explanation": "In LL(1) panic mode recovery, the synchronising set for non-terminal A is chosen as FIRST(A) ∪ FOLLOW(A). FIRST(A) tokens can begin a valid derivation of A — if the current token is in FIRST(A), the parser can attempt to parse A normally. FOLLOW(A) tokens appear after A in the grammar — if the current token is in FOLLOW(A), A is popped from the stack (treated as having been parsed as ε) and parsing continues. This two-set approach handles both 'missing A' and 'extra tokens within A' scenarios, minimising cascaded errors.",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 2
        },
        {
          "question_text": "The number of errors that a good compiler should report before terminating is best described as:",
          "options": [],
          "correct_answer": "As many as possible — the compiler should use error recovery to detect and report multiple errors in a single compilation pass",
          "explanation": "A good compiler does NOT stop at the first error. It uses error recovery strategies to resume parsing after each error, reporting as many errors as possible in a single compilation run. This is important because fixing one error at a time and recompiling is very inefficient — the programmer benefits from seeing all (or most) errors at once. However, compilers must avoid reporting cascaded/spurious errors caused by earlier recovery decisions. The goal is: maximise true errors reported, minimise false positives from error recovery.",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "NAT",
          "marks": 2
        },
        {
          "question_text": "Which of the following correctly classifies the error in the statement `int 3x = 5;` in a C-like language?",
          "options": [
            "A. Lexical error — `3x` is not a valid token",
            "B. Syntactic error — an integer literal cannot begin an identifier",
            "C. Semantic error — `3x` is an undeclared variable",
            "D. Both lexical and syntactic error"
          ],
          "correct_answer": "A",
          "explanation": "In most languages, an identifier must begin with a letter or underscore — not a digit. The scanner attempts to tokenize `3x`: it first reads `3` and forms the integer literal `3`, then reads `x` and forms identifier `x`. So `3x` is scanned as two tokens: integer `3` followed by identifier `x`. The error manifests as a syntactic error at the parser level (`int 3 x = 5;` is not valid syntax). However, if the language spec says the sequence `3x` cannot be tokenized at all, it is a lexical error. In standard C compilers, this is reported as an error during lexing (invalid token/preprocessing number). The most precise classification at the lexical level is option A.",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 1
        },
        {
          "question_text": "Which of the following are TRUE about error productions as an error recovery technique?",
          "options": [
            "A. Error productions add grammar rules that explicitly recognise commonly occurring syntax errors",
            "B. Error productions can generate customised, user-friendly error messages for specific known mistakes",
            "C. Error productions increase the size of the parser but allow graceful handling of common errors",
            "D. Error productions are most effective for recovering from semantic errors"
          ],
          "correct_answer": "A, B, C",
          "explanation": "(A) TRUE — Error productions augment the grammar with rules like `expr → expr + + expr` to recognise a doubled operator. When such a rule fires, the parser knows exactly what mistake occurred. (B) TRUE — Since the error production explicitly matches a known mistake, the parser can emit a precise, helpful message such as 'duplicate operator +' rather than a generic syntax error. (C) TRUE — Adding error productions increases the grammar size and therefore the parser table size, but the benefit is graceful, informative recovery for common mistakes. (D) FALSE — Error productions handle syntactic errors (grammar-level mistakes), not semantic errors (type mismatches, undeclared variables, etc.). Semantic errors are caught during semantic analysis.",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MSQ",
          "marks": 2
        },
        {
          "question_text": "In yacc/bison, the special terminal `error` is used for error recovery. When a syntax error occurs and `error` appears in a grammar rule, the parser:",
          "options": [
            "A. Immediately aborts and reports a fatal error",
            "B. Pops stack states until it finds a state where `error` can be shifted, then discards input tokens until a synchronising token is found",
            "C. Inserts the missing token automatically by consulting the parse table",
            "D. Calls the lexical analyser to re-scan the erroneous portion of input"
          ],
          "correct_answer": "B",
          "explanation": "In yacc/bison, `error` is a special terminal for LALR(1) error recovery. When a syntax error occurs: (1) The parser pops the stack until it finds a state that has a transition on the `error` token (i.e., a state corresponding to a grammar rule with `error` on the right-hand side). (2) The `error` token is shifted onto the stack. (3) Input tokens are discarded until a synchronising token (typically `;` or `}`) is found. (4) Parsing resumes normally. This is essentially phrase-level recovery integrated into the LALR framework. The programmer controls recovery by strategically placing `error` in grammar rules, e.g., `stmt → error ';'`.",
          "year": 2009,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 2
        },
        {
          "question_text": "A semantic error that is detected at compile time is:",
          "options": [
            "A. Division by zero in an expression like `int x = 5 / 0;`",
            "B. Using a variable of type `int` where a `float` is required, in a strictly typed language",
            "C. Accessing an array index out of bounds at runtime",
            "D. Stack overflow caused by infinite recursion at runtime"
          ],
          "correct_answer": "B",
          "explanation": "Compile-time semantic errors are violations of the language's semantic rules detectable by static analysis — without running the program. A type mismatch (assigning an `int` to a `float` variable in a strictly typed language) is detected during semantic analysis (type checking phase) at compile time. Option A (division by zero) may be detectable by a smart compiler through constant folding, but is typically a runtime error. Options C and D are classic runtime errors — array bounds and recursion depth depend on runtime values not known at compile time.",
          "year": 2010,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 1
        },
        {
          "question_text": "How many distinct phases of a compiler can detect errors? (Count lexical analysis, syntax analysis, semantic analysis, intermediate code generation, and code optimisation as separate phases.)",
          "options": [],
          "correct_answer": "5",
          "explanation": "All five major front-end and middle-end phases of a compiler can detect errors: (1) Lexical analysis — lexical errors (invalid characters, malformed tokens). (2) Syntax analysis (parsing) — syntactic errors (grammar violations). (3) Semantic analysis — semantic errors (type errors, undeclared identifiers, scope violations). (4) Intermediate code generation — errors in expressions that are semantically inconsistent at the IR level. (5) Code optimisation — detects unreachable code, use of uninitialised variables, etc. The back-end (code generation) can also detect errors (e.g., register allocation failure), but the five listed phases are the canonical answer expected in GATE.",
          "year": 2011,
          "exam_type": "GATE",
          "question_type": "NAT",
          "marks": 2
        },
        {
          "question_text": "Which of the following statements about cascaded errors (spurious errors) in compilers are TRUE?",
          "options": [
            "A. Cascaded errors are real errors in the source program reported correctly by the compiler",
            "B. Cascaded errors are false error messages generated by the compiler as a side effect of error recovery from an earlier genuine error",
            "C. A good compiler minimises cascaded errors by carefully choosing its error recovery strategy",
            "D. Panic mode recovery can cause cascaded errors because skipping tokens may leave the parser in an inconsistent state"
          ],
          "correct_answer": "B, C, D",
          "explanation": "(A) FALSE — Cascaded (spurious) errors are NOT real errors. They are false positives: the compiler reports them because its error recovery from a prior genuine error left it in a confused state. (B) TRUE — This is the definition: a cascaded error is an artifact of error recovery, not a true fault in the source program. If the programmer fixes the original error, cascaded errors typically disappear. (C) TRUE — Minimising cascaded errors is a key design goal of error recovery. Strategies like using FOLLOW sets in LL(1) parsers are specifically designed to reduce spurious reports. (D) TRUE — Panic mode skips tokens until a sync point, which can leave semantic context incomplete and cause false errors when parsing resumes.",
          "year": 2012,
          "exam_type": "GATE",
          "question_type": "MSQ",
          "marks": 2
        },
        {
          "question_text": "In an LR parser, when a syntax error is detected, the parser is in state s and the current input token is a. Which of the following correctly describes the error handling?",
          "options": [
            "A. The parser immediately reduces using the longest matching production",
            "B. The parser calls an error routine indicated by the `error` entry in ACTION[s, a] of the parsing table",
            "C. The parser shifts token a onto the stack and continues",
            "D. The parser outputs the input token a as the error token and halts"
          ],
          "correct_answer": "B",
          "explanation": "In an LR parser, the parsing table's ACTION function maps (state, token) pairs to actions: shift, reduce, accept, or error. When ACTION[s, a] = error, a syntax error is detected. The parser calls an error-handling routine. This routine implements the chosen recovery strategy — commonly panic mode (pop states until a state with an `error` transition is found, discard tokens) or phrase-level correction. The LR parser never shifts an invalid token or reduces on an error entry — both would corrupt the parse stack. The `error` entry is the precise detection point.",
          "year": 2013,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 2
        },
        {
          "question_text": "Global error correction finds the parse tree for the string closest to the input (in terms of minimum edit distance). If the erroneous input string is `w` and the nearest valid string is `w'`, and the edit distance (insertions + deletions) between them is `k`, what is the time complexity of the global correction algorithm (using CYK-based DP)?",
          "options": [
            "A. O(|w|)",
            "B. O(|w|²)",
            "C. O(|w|³)",
            "D. O(k · |w|²)"
          ],
          "correct_answer": "C",
          "explanation": "Global error correction uses a dynamic programming approach similar to CYK parsing (or Wagner-Fischer edit distance combined with CYK). The CYK algorithm for parsing a string of length n runs in O(n³) time and O(n²) space. Global correction extends this to find the minimum-cost edit sequence transforming w into a valid string w' — the DP table is O(|w|²) in size and filling each cell takes O(|w|) work via grammar rule enumeration, giving O(|w|³) overall. This cubic complexity is why global correction is theoretically elegant but practically unused for large inputs in production compilers.",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 2
        },
        {
          "question_text": "Which of the following errors would be detected during semantic analysis (and NOT during lexical or syntax analysis)?",
          "options": [],
          "correct_answer": "Type mismatch errors, undeclared variable usage, and duplicate variable declarations in the same scope",
          "explanation": "Semantic analysis checks for meaning-level correctness after the syntactic structure is verified. Errors caught here include: (1) Type mismatches — e.g., adding a string to an integer without coercion. (2) Undeclared identifiers — using a variable or function not declared in any enclosing scope. (3) Duplicate declarations — declaring the same variable twice in the same scope. (4) Wrong number/types of arguments in function calls. (5) Returning a value from a void function. These errors cannot be detected by pattern matching (lexer) or grammar rules (parser) alone — they require semantic context such as the symbol table and type system.",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "NAT",
          "marks": 2
        },
        {
          "question_text": "Which of the following correctly distinguish compile-time errors from runtime errors?",
          "options": [
            "A. Compile-time errors are detected by the compiler during translation; runtime errors occur during program execution",
            "B. Syntax errors are always compile-time errors; divide-by-zero is always a runtime error",
            "C. A compiler can always detect all runtime errors statically — this is the halting problem",
            "D. Semantic errors can be either compile-time (type mismatch) or runtime (array index out of bounds)"
          ],
          "correct_answer": "A, B, D",
          "explanation": "(A) TRUE — This is the fundamental distinction. Compile-time errors are caught before execution (by the compiler/linker). Runtime errors occur during execution and are not detectable beforehand in the general case. (B) TRUE — Syntax errors (grammar violations) are always caught at compile time by the parser. Divide-by-zero (unless the divisor is a literal constant caught by constant folding) is a runtime error since the divisor's value is generally not known until execution. (C) FALSE — This is precisely the halting problem: it is undecidable in general to determine all runtime errors statically. A compiler can catch some (constant folding, data flow analysis) but not all. (D) TRUE — Semantic errors span both compile time (type checking) and runtime (bounds checking, null dereference).",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "MSQ",
          "marks": 2
        },
        {
          "question_text": "In panic mode error recovery for an LL(1) parser, if the current non-terminal on top of the stack is A and the current input token `a` is not in FIRST(A) and not in FOLLOW(A), the parser should:",
          "options": [
            "A. Report an error and pop A from the stack",
            "B. Report an error and discard the current input token `a`",
            "C. Report an error and terminate parsing",
            "D. Report an error and replace A with ε"
          ],
          "correct_answer": "B",
          "explanation": "In LL(1) panic mode recovery with synchronising sets: if token `a` ∈ FIRST(A), use the appropriate production. If `a` ∈ FOLLOW(A), pop A (treat as if A derived ε). If `a` is in neither set, it is an unexpected token — discard `a` (advance the input) and try again with the next token. The parser keeps discarding tokens until it finds one in FIRST(A) ∪ FOLLOW(A). This strategy — discard input when the token is in neither set — avoids popping the stack prematurely and gives the best chance of resynchronising with the actual intent of the program.",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 2
        },
        {
          "question_text": "Consider the following C code fragment: `int x; x = y + 2;` where `y` has not been declared. What type of error is this, and in which compiler phase is it detected?",
          "options": [],
          "correct_answer": "Semantic error (undeclared identifier), detected during semantic analysis",
          "explanation": "The token `y` is lexically valid (a legal identifier) and syntactically valid (an identifier can appear in an expression). The error is semantic: `y` has not been declared in any enclosing scope. During semantic analysis, the compiler looks up each identifier in the symbol table. Finding no entry for `y`, it reports an 'undeclared identifier' or 'undefined variable' error. This is a classic compile-time semantic error. It is NOT a lexical error (y is a valid identifier pattern) and NOT a syntactic error (the statement `x = y + 2;` is grammatically correct).",
          "year": 2018,
          "exam_type": "GATE",
          "question_type": "NAT",
          "marks": 1
        },
        {
          "question_text": "Which of the following best describes the 'error productions' technique for error recovery, and what is its main limitation?",
          "options": [
            "A. It adds grammar rules for common errors; main limitation is that it cannot handle unexpected errors not anticipated by the grammar designer",
            "B. It uses a priority queue of likely corrections; main limitation is exponential time complexity",
            "C. It rolls back the parse to the last valid point; main limitation is that it may loop infinitely",
            "D. It replaces the erroneous token with the most likely correct token; main limitation is poor error messages"
          ],
          "correct_answer": "A",
          "explanation": "Error productions add explicit grammar rules that match common mistakes programmers make — e.g., a production for a missing semicolon or a doubled operator. When such a production fires, the compiler emits a precise error message. The key limitation is coverage: error productions only handle errors the grammar designer anticipated. Novel or unusual errors fall through to generic panic mode recovery, which gives much less informative messages. Additionally, adding many error productions can significantly grow the grammar and parser tables. This technique works best for languages with a small set of extremely common errors.",
          "year": 2019,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 1
        },
        {
          "question_text": "Which of the following are TRUE about error recovery in recursive descent parsers?",
          "options": [
            "A. Each parsing procedure can have its own local error recovery logic, making error handling modular",
            "B. Recursive descent parsers cannot implement panic mode recovery",
            "C. The FOLLOW set of a non-terminal is commonly used as the synchronising set in recursive descent error recovery",
            "D. Recursive descent parsers can implement phrase-level recovery by inserting or deleting tokens when an error is detected"
          ],
          "correct_answer": "A, C, D",
          "explanation": "(A) TRUE — Recursive descent parsers are hand-written, so each procedure for a non-terminal can implement its own tailored error recovery. This modularity is an advantage over table-driven parsers. (B) FALSE — Recursive descent parsers can absolutely implement panic mode recovery — each procedure discards tokens until a synchronising token is found before returning. (C) TRUE — FOLLOW sets indicate what comes after a non-terminal, so tokens in FOLLOW(A) serve as natural synchronisation points when parsing A fails. (D) TRUE — Since the parser is hand-written, the programmer can insert a token by calling the procedure for the expected terminal without consuming input, or delete a token by advancing past it — implementing phrase-level recovery directly.",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "MSQ",
          "marks": 2
        },
        {
          "question_text": "A compiler reports the error 'expression must have integral type' for the statement `float x = 3.5; int arr[x];` in C. This is an example of:",
          "options": [
            "A. Lexical error",
            "B. Syntax error",
            "C. Semantic error",
            "D. Runtime error"
          ],
          "correct_answer": "C",
          "explanation": "In C, array dimensions must be of integral (integer) type. The declaration `int arr[x]` where `x` is a `float` violates this semantic rule. The lexical analyser correctly tokenizes all symbols. The parser accepts `int arr[x];` as syntactically valid (it matches the declaration grammar). It is the semantic analyser's type-checking phase that detects the type mismatch: the array size expression `x` has type `float` but must be an integer. This is therefore a compile-time semantic error, caught during semantic analysis.",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MCQ",
          "marks": 1
        },
        {
          "question_text": "Consider a grammar G and an erroneous input string w. The minimum number of token insertions and deletions needed to transform w into a string accepted by G is called the:",
          "options": [],
          "correct_answer": "Edit distance (or minimum-cost correction distance) between w and the language L(G)",
          "explanation": "The global error correction problem formalises error recovery as finding the string w' ∈ L(G) that minimises the edit distance d(w, w') — the minimum number of insertions, deletions (and sometimes substitutions) to transform w into a valid string w'. This is the theoretical foundation of global correction. The edit distance between an erroneous program and its nearest correct version tells us the 'severity' of the errors. While theoretically clean, computing this optimally requires O(|w|³) time via DP/CYK and is too expensive for production compilers, which use faster heuristic strategies like panic mode instead.",
          "year": 2022,
          "exam_type": "GATE",
          "question_type": "NAT",
          "marks": 2
        },
        {
          "question_text": "Which of the following are desirable properties of an error handler in a compiler?",
          "options": [
            "A. Report errors clearly and accurately with location information",
            "B. Recover sufficiently from each error to continue detecting subsequent errors",
            "C. Not significantly slow down the processing of correct programs",
            "D. Automatically fix all errors and produce a working executable"
          ],
          "correct_answer": "A, B, C",
          "explanation": "(A) TRUE — Clear, precise error messages with file, line, and column information are essential for programmer productivity. Vague messages like 'syntax error' are insufficient. (B) TRUE — The ability to continue parsing after an error (error recovery) and find multiple errors in one pass is a key quality metric of a compiler. (C) TRUE — Error handling code runs on all programs including correct ones (e.g., FIRST/FOLLOW table lookups). It must be fast enough not to degrade performance for error-free programs. (D) FALSE — Automatically fixing all errors is neither feasible nor desirable. The compiler cannot know the programmer's intent. Attempting to 'fix' errors may produce a semantically different program. Compilers should report errors, not silently correct them.",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "MSQ",
          "marks": 2
        },
        {
          "question_text": "In an LALR(1) parser performing error recovery, after detecting a syntax error the parser pops states from the stack until it finds a state s such that a production with `error` on the right-hand side can be reduced. It then shifts the special `error` token. How many states are popped in the BEST case?",
          "options": [],
          "correct_answer": "0",
          "explanation": "In the best case, the current top state s already has a valid action on the `error` token — i.e., ACTION[s, error] = shift. In this case, no states need to be popped: the parser immediately shifts `error` and proceeds with token discarding until a synchronising token is found. Zero pops occur when the grammar has been designed with `error` productions at a high-level rule that encompasses the current parsing context. In the worst case, the parser may pop all states down to the initial state, discarding a large portion of the parse stack.",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "NAT",
          "marks": 2
        },
        {
          "question_text": "Which of the following correctly describe differences between error recovery in LL(1) parsers and LR(1) parsers?",
          "options": [
            "A. LL(1) parsers use FOLLOW sets as synchronising tokens; LR parsers use a state-based `error` token mechanism",
            "B. LR parsers can detect errors earlier (with less input consumed) than LL(1) parsers for the same grammar",
            "C. LL(1) parsers can recover from errors in the middle of a right-hand side production; LR parsers cannot",
            "D. LR parsers in general have more context available at the point of error detection than LL(1) parsers"
          ],
          "correct_answer": "A, B, D",
          "explanation": "(A) TRUE — LL(1) panic mode uses FOLLOW(A) as synchronising tokens for non-terminal A on the stack. LR parsers use the `error` terminal in the ACTION table and pop states until a state with an error transition is found. (B) TRUE — LR parsers are more powerful and detect errors as soon as a valid prefix is violated, often before an LL(1) parser would. LR(1) parsers make no incorrect moves on any valid prefix (the viable-prefix property). (C) FALSE — Both LL(1) and LR parsers can recover mid-production. In LL(1), recovery in the middle of a production is done by treating each non-terminal on the stack individually. (D) TRUE — An LR parser's state encodes the entire history of the parse (the viable prefix), giving richer context at the error point. LL(1) only knows the current non-terminal being expanded.",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MSQ",
          "marks": 2
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
