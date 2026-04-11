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
    // {
    //   subject_name: "Theory of Computation",
    //   pyqs: [
    //     {
    //       question_text: "Which of the following problems is undecidable?",
    //       images: [],
    //       options: [
    //         "A. Membership problem for CFGs",
    //         "B. Finiteness problem for FSAs",
    //         "C. Totality problem for Turing Machines",
    //         "D. Emptiness problem for PDAs"
    //       ],
    //       correct_answer: "C",
    //       explanation: "The totality problem for Turing Machines (whether a TM accepts all strings) is undecidable (and not even recursively enumerable).",
    //       year: 2024,
    //       question_type: "MCQ"
    //     }
    //   ]
    // },
    {
      subject_name: "Compiler Design",
      pyqs:[
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following grammars is/are ambiguous?",
          "images": [],
          "options": [
            "A. $S \\rightarrow a S b \\mid \\epsilon$",
            "B. $E \\rightarrow E+E|E * E| i d$",
            "C. $S \\rightarrow a S|S a| \\epsilon$",
            "D. $S \\rightarrow a S \\mid \\epsilon$"
          ],
          "correct_answer": "B;C",
          "explanation": "If a string has multiple parse trees for a CFG it is ambiguous",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A lexical analyzer uses the following token definitions ${letter → [A-Za-z]}$ ${digit → [0-9]}$ ${id → letter (letter | digit)^*}$ ${number → digit}$ ${ }^{+}$ ${ws → (blank | tab| newline)}$ ${ }^{+}$ For the string given below, \\[ x1 \\quad 23 \\mathrm{~mm} \\quad 78 \\quad \\text{ y } \\quad 7 z \\quad \\text { zz5 } \\quad 14 A \\quad 8 H \\quad \\text { AaYcD } \\] the number of tokens (excluding ws) that will be produced by the lexical analyzer is $\\_\\_\\_\\_$. (answer in integer) 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "13:13",
          "explanation": "x1 -> id (1) 23mm -> digit , id (3) 78 -> number (4) y -> letter (5) 7z -> digit, letter (7) zz5 -> id (8) 14A -> digit, letter (10) 8H -> digit, letter (12) AaYcD -> id (13) Hence, 13 tokens",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the canonical $L R(0)$ parsing of the grammar below using terminals $\\{a, b, c\\}$ and non-terminals $\\{A, B, C, S\\}$ with $S$ as the start symbol. \\[ \\begin{array}{l} S \\rightarrow A C B \\\\ A \\rightarrow a A \\mid \\epsilon \\\\ C \\rightarrow c C \\mid \\epsilon \\\\ B \\rightarrow b B \\mid b \\end{array} \\] Which one of the following options gives the number of shift-reduce conflicts that will occur in the $L R(0)$ ACTION table? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $2$",
            "B. $3$",
            "C. $4$",
            "D. $5$"
          ],
          "correct_answer": "D",
          "explanation": "....",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the control flow graph given below. Which one of the following options is the set of live variables at the exit point of each basic block?",
          "images": [
            {
              "index": 1,
              "filename": "523111_img1.jpg"
            }
          ],
          "options": [
            "A. $\\mathrm{B} 1:\\{\\mathrm{a}, \\mathrm{b}, \\mathrm{c}, \\mathrm{e}, \\mathrm{f}\\}, \\mathrm{B} 2:\\{\\mathrm{d}, \\mathrm{e}\\}, \\mathrm{B} 3:\\{\\mathrm{b}, \\mathrm{c}, \\mathrm{e}, \\mathrm{f}\\}, \\mathrm{B} 4: \\varnothing$",
            "B. $\\mathrm{B} 1$: $\\varnothing$, $\\mathrm{B} 2$: $\\{$ d, e $\\}$, $\\mathrm{B} 3$: $\\{$ a, c, f $\\}$, $\\mathrm{B} 4$: $\\varnothing$",
            "C. $\\mathrm{B} 1:\\{\\mathrm{a}, \\mathrm{b}, \\mathrm{c}, \\mathrm{e}, \\mathrm{f}\\}, \\mathrm{B} 2:\\{\\mathrm{d}, \\mathrm{e}\\}, \\mathrm{B} 3:\\{\\mathrm{c}, \\mathrm{e}, \\mathrm{f}\\}, \\mathrm{B} 4: \\varnothing$",
            "D. $\\mathrm{B} 1: \\varnothing, \\mathrm{B} 2:\\{\\mathrm{d}, \\mathrm{e}, \\mathrm{f}\\}, \\mathrm{B} 3:\\{\\mathrm{a}, \\mathrm{b}, \\mathrm{c}, \\mathrm{e}, \\mathrm{f}\\}, \\mathrm{B} 4: \\varnothing$"
          ],
          "correct_answer": "A",
          "explanation": "Compiler considers a variable as live if its value is accessed before its being rewritten with an another value. Therefore at end of B1; except d all are live. Now comparing the options we need to choose between option A and C, therefore need to check at end of B3: Clearly a is not live as it is getting overwritten in next block B1, and we can also observe that b and c are live. In case of block B2 and B3 we can note that variable d is also being over written in B2, but e and f is getting accessed in B2 and B3 respectively, hence variable e and f are also live. In case of block B4, variable g is getting overwritten hence not live. Therefore the set of all live variables at the end of block B3 $= \\{b, c, e, f\\} $. Hence, Option A is the PS: For liveness analysis at then end of Block B2 and B4; as after block B4 the program will exit no variable needs to be live after B4 and in case of B2 as only d and e variable are accessed to overwrite variable g, the set of live variables after B2 will be $\\{d,e\\}$",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following C statements: char *str1 = \"Hello; /* Statement S1 */ char *str2 = \"Hello;\"; /* Statement S2 */ int *str3 = \"Hello\"; /* Statement S3 */ Which of the following options is/are correct?",
          "images": [],
          "options": [
            "A. $\\text{S1}$ and $\\text{S2}$ have syntactic errors",
            "B. $\\text{S2}$ has a lexical error and $\\text{S3}$ has a syntactic error",
            "C. $\\text{S1}$ has a lexical error and $\\text{S3}$ has a semantic error",
            "D. $\\text{S1}$ has a syntactic error and $\\text{S3}$ has a semantic error"
          ],
          "correct_answer": "C",
          "explanation": "$\\boxed{\\text{Answer: C) S1 has a lexical error and S3 has a semantic error}}$ Watch detailed discussion on this question char *str1 = \"Hello; /* Statement S1 */ $S1$ has a lexical error: Unterminated String. String literal must be surrounded by double quotes. From Ullman (Dragon Book): Source: https://pages.cs.wisc.edu/~kzhao32/projects/cs536p2scanner.pdf Source: https://www.d.umn.edu/~rmaclin/cs5641/Notes/Lecture12.pdf char *str2 = \"Hello;\"; /* Statement S2 */ This is no error in this statement $S2$. int *str3 = \"Hello\"; /* Statement S3 */ $S3$ has semantic error: type mismatch. Type of $\\text{str3}$ should be char pointer instead of int pointer.",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following statements is/are true? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $\\text{LL(1)}$ parser uses backtracking",
            "B. For a grammar to be $\\text{LL(1)}$, it must be left-recursive",
            "C. For a grammar to be $\\text{LL(1)}$, it must be left-factored",
            "D. The $\\text{LL(1)}$ parsers are more powerful than the SLR parsers"
          ],
          "correct_answer": "C",
          "explanation": "$\\boxed{\\text{Answer: C}}$ Watch detailed discussion on this question $\\text{LL(1)}$ parser uses backtracking. $\\ \\textcolor{red}{\\boxed{\\text{False}}}$ No, $\\text{LL(1)}$ parser is a predictive parser. When expanding a nonterminal, $\\text{LL(1)}$ parser predict the production to use by looking at the next token of the input. The decision is forced. So, $\\text{LL(1)}$ parser is not using backtracking. For a grammar to be $\\text{LL(1)}$, it must be left-recursive. $\\ \\textcolor{red}{\\boxed{\\text{False}}}$ No. In fact for a grammar to be $\\text{LL(1)}$, it must not be left-recursive. Since left-recursive grammar can never be $\\text{LL(1)}$. Proof1 Proof2 For a grammar to be $\\text{LL(1)}$, it must be left-factored. $\\ \\textcolor{blue}{\\boxed{\\text{True}}}$ Yes, because non-left-factored grammar can never be $\\text{LL(1)}$. Proof The $\\text{LL(1)}$ parsers are more powerful than the SLR parsers. $\\ \\textcolor{red}{\\boxed{\\text{False}}}$ No, there are some grammars which $\\text{SLR}$ parser can parse but can't be parsed by $\\text{LL(1)}$ parser. That is, some $\\text{SLR}$ grammar is not $\\text{LL(1)}$. Consider the following grammar which is $\\text{SLR}$ but not $\\text{LL(1)}:$ $$S \\rightarrow S A \\text { | } A$$ $$S \\rightarrow a$$ Actually, there is no relationship between $\\text{LL(1)}$ parsers and $\\text{SLR}$ parsers. That is, neither $\\text{LL(1)}$ parsers are more powerful than the $\\text{SLR}$ parsers nor $\\text{SLR}$ parsers are more powerful than the $\\text{LL(1)}$ parsers. Goodread: Source: https://people.cs.vt.edu/prsardar/classes/cs3304-Spr19/lectures/CS3304-10-LanguageSyntax-3.pdf Source: https://web.stanford.edu/class/archive/cs/cs143/cs143.1128/handouts/090%20Top-Down%20Parsing.pdf Source: https://web.stanford.edu/class/cs143/lectures/lecture07.pdf Source: Modern Compiler Implementation in C by Andrew Appel Source: Ullman (Dragon Book)",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the control flow graph shown in the figure. Which one of the following options correctly lists the set of redundant expressions (common subexpressions) in the basic blocks B$4$ and B$5$? Note: All the variables are integers. 0 reply Please log in or register to add a comment.",
          "images": [
            {
              "index": 1,
              "filename": "523048_img1.jpg"
            }
          ],
          "options": [
            "A. B4: $\\{b+i\\}$ B5: $\\{c+m\\}$",
            "B. B4: $\\{g * k\\}$ B5: $\\{c+m\\}$",
            "C. B4: $\\{g * k, b+i\\}$ B5:$\\{$ $\\}$",
            "D. B4: $\\{g * k\\}$ B5:$\\{$ $\\}$"
          ],
          "correct_answer": "D",
          "explanation": "https://www.youtube.com/watch?v=IUAIytbb2mw&t=16236s https://www.youtube.com/watch?v=oBAqib3LDi4&t=6756s",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following two syntax-directed definitions $\\text{SDD1}$ and $\\text{SDD2}$ for type declarations. \\[ \\renewcommand{\\arraystretch}{1.3} \\begin{array}{|l|l|} \\hline {\\textbf{SDD1}} \\\\ \\hline { \\begin{array}{c} \\textbf{Grammar} \\\\ (G_1) \\end{array}} & {\\textbf{Semantic Rules}} \\\\ \\hline \\hline D \\rightarrow TV & \\begin{array}{l} D.type = T.type \\\\ V.type = T.type \\end{array} \\\\ \\hline T \\rightarrow \\text{int} & T.type = \\text{int} \\\\ \\hline T \\rightarrow \\text{float} & T.type = \\text{float} \\\\ \\hline V \\rightarrow V_1\\ \\text{id} & \\begin{array}{l} V_1.type = V.type \\\\ \\text{put(id.entry, V.type)} \\end{array} \\\\ \\hline V \\rightarrow \\text{id} & \\text{put(id.entry, V.type)} \\\\ \\hline \\end{array} \\] \\[ \\renewcommand{\\arraystretch}{1.3} \\begin{array}{|l|l|} \\hline {\\textbf{SDD2}} \\\\ \\hline { \\begin{array}{c} \\textbf{Grammar} \\\\ (G_2) \\end{array}} & {\\textbf{Semantic Rules}} \\\\ \\hline \\hline D \\rightarrow D_1\\ \\text{id} & \\begin{array}{l} D.type = D_1.type \\\\ \\text{put(id.entry, D_1.type)} \\end{array} \\\\ \\hline D \\rightarrow T\\ \\text{id} & \\begin{array}{l} D.type = T.type \\\\ \\text{put(id.entry, T.type)} \\end{array} \\\\ \\hline T \\rightarrow \\text{int} & T.type = \\text{int} \\\\ \\hline T \\rightarrow \\text{float} & T.type = \\text{float} \\\\ \\hline \\end{array} \\] $D$ is the start symbol, and int, float and id are the three terminals. The non-terminal $V_{1}$ is the same as $V$ and the non-terminal $D_{1}$ is the same as $D$. Here, the subscript is used to differentiate the grammar symbols on the two sides of a production. The function put updates the symbol table with the type information for an identifier. Let $\\text{P}$ and $\\text{Q}$ be the languages specified by grammars $\\text{G1}$ and $\\text{G2}$, respectively. Which of the following statements is/are true? The languages $\\text{P}$ and $\\text{Q}$ are the same $\\text{SDD2}$ is $\\text{S}$-attributed and contains only synthesized attributes $\\text{SDD1}$ is $\\text{L}$-attributed and contains only inherited attributes The specifications of $\\text{SDD1}$ and $\\text{SDD2}$ are such that the same entries get added to the symbol table 0 reply Please log in or register to add a comment.",
          "images": [
            {
              "index": 1,
              "filename": "523037_img1.png"
            },
            {
              "index": 2,
              "filename": "523037_img2.png"
            },
            {
              "index": 3,
              "filename": "523037_img3.png"
            },
            {
              "index": 4,
              "filename": "523037_img4.png"
            },
            {
              "index": 5,
              "filename": "523037_img5.png"
            }
          ],
          "options": [],
          "correct_answer": "A;B;D",
          "explanation": "",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider a pipelined processor in which the execution (EX) stage is shared by all instructions. The execution stage takes different different time for different instructions as mentioned in the original question. A program consists of $100$ instructions, including load, integer add (IADD), floating-point add (FADD) etc. instructions. Assuming that the EX stage can execute only one instruction at a time, how many pipeline stalls occur due to structural hazards in the EX stage?",
          "images": [],
          "options": [],
          "correct_answer": "95",
          "explanation": "",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Q. Consider the following two SDDs. SDD1 $$ \\begin{array}{|c|c|} \\hline \\textbf{Grammar} & \\textbf{Semantic\\ Rule} \\\\ \\hline D \\rightarrow TV & D.type = T.type \\\\ & V.type = T.type \\\\ \\hline T \\rightarrow int & T.type = int \\\\ \\hline T \\rightarrow float & T.type = float \\\\ \\hline V \\rightarrow V_1\\, id & V.type = V_1.type \\\\ & Put(id.entry,\\;V_1.type) \\\\ \\hline V \\rightarrow id & Put(id.entry,\\;V.type) \\\\ \\hline \\end{array} $$ SDD2 $$ \\begin{array}{|c|c|} \\hline \\textbf{Grammar} & \\textbf{Semantic\\ Rule} \\\\ \\hline D \\rightarrow D_1\\, id & D.type = D_1.type \\\\ & Put(id.entry,\\;D_1.type) \\\\ \\hline D \\rightarrow T\\, id & D.type = T.type \\\\ & Put(id.entry,\\;T.type) \\\\ \\hline T \\rightarrow int & T.type = int \\\\ \\hline T \\rightarrow float & T.type = float \\\\ \\hline \\end{array} $$ Which of the following is/are correct?",
          "images": [],
          "options": [
            "A. SDD2 is S-attributed and contains only synthesized attributes.",
            "B. Both SDDs generate the same language.",
            "C. SDD1 is L-attributed and contains only inherited attributes.",
            "D. The specifications of SDD1 and SDD2 are such that the same entries get added to the symbol table."
          ],
          "correct_answer": "A;B;D",
          "explanation": "❌ Statement D Even though language same, The semantic rule structure differs. In SDD1: Type assigned once via T Then propagated to V chain. In SDD2: Each id is added during recursive D reduction. Declaration structure different.",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider a lexical analyzer with the following token specifications: \\[ \\begin{aligned} \\texttt{letter} &\\rightarrow \\texttt{[A-Z a-z]} \\\\ \\texttt{digit} &\\rightarrow \\texttt{[0-9]} \\\\ \\texttt{id} &\\rightarrow \\texttt{letter}\\texttt{[letter}\\mid \\texttt{digit]}^{*} \\\\ \\texttt{no} &\\rightarrow \\texttt{[digit]}^{+} \\\\ \\texttt{ws} &\\rightarrow \\texttt{[blank}\\mid \\texttt{tab}\\mid \\texttt{newline]}^{+} \\end{aligned} \\] Whitespace $(\\texttt{ws})$ is ignored. For the input string \\[ \\texttt{x1 23mm 78 y 7z z25 14A 8H AaycD} \\] how many tokens are generated by the lexical analyzer excluding whitespace ?",
          "images": [],
          "options": [],
          "correct_answer": "13",
          "explanation": "x1 ->id 23 -> no mm ->id 78 ->no (mm and 78 aren't considered as one token due to existence of ws ) y ->letter (not id simply because the rule given first is supposed to be given higher priority ) 7 ->digit z -> letter z25 ->id 14 ->no A -> letter 8 ->digit H -> letter AaycD ->id Ans: 13 tokens",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the control flow graph shown. Which one of the following choices correctly lists the set of live variables at the exit point of each basic block?",
          "images": [
            {
              "index": 1,
              "filename": "521485_img1.png"
            }
          ],
          "options": [
            "A. $\\text{B1: {a, b, c, e, f}, B2: {d, e}, B3: { }, B4: {b, c, e, f}}$",
            "B. $\\text{B1: {a, b, c}, B2: {d, e}, B3: { }, B4: {b, c, e, f}}$",
            "C. $\\text{B1: {a, b, c, e, f}, B2: {d, e}, B3: { }, B4: {e, f}}$",
            "D. $\\text{B1: {a, b, c}, B2: {d, e}, B3: { }, B4: {b, e, f}}$"
          ],
          "correct_answer": "A",
          "explanation": "In this question we have to check a path from exit point where read of that variable happen without any write before it . Block B1 Live variable = { a , b , c, e,f} Block B2 Live variable = {d,e} Block B3 Live variable = {} Bolck B4 Live variable = {b,c,e,f} So option A",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the given grammer $: $ $$ \\begin{aligned} & \\mathrm{S} \\rightarrow \\mathrm{ACB} \\\\ & \\mathrm{A} \\rightarrow \\mathrm{aA} \\mid \\epsilon \\\\ & \\mathrm{C} \\rightarrow \\mathrm{cC} \\mid \\epsilon \\\\ & \\mathrm{B} \\rightarrow \\mathrm{bB} \\mid \\mathrm{b} \\end{aligned} $$ $\\{\\mathrm{S}, \\mathrm{A}, \\mathrm{B}, \\mathrm{C}\\}$ set of non-terminals where $\\mathrm{S}$ is start symbol and $\\{\\mathrm{a}, \\mathrm{b}, \\mathrm{c}\\}$ are the terminals. The number of $\\mathrm{SR}$ conflicts in $\\mathrm{LR(0)}$ is?",
          "images": [],
          "options": [
            "A. $2$",
            "B. $3$",
            "C. $5$",
            "D. $4$"
          ],
          "correct_answer": "C",
          "explanation": "I think the answer for this question should be B i.e 3 conflicts as in the exam it was",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following is ambiguous grammar?",
          "images": [],
          "options": [
            "A. $\\mathrm{S} \\rightarrow \\mathrm{aSb} \\mid \\in$",
            "B. $\\mathrm{S} \\rightarrow \\mathrm{aS} \\mid \\in$",
            "C. $\\mathrm{S} \\rightarrow \\mathrm{aS}\\mid\\mathrm{Sa}\\mid \\in$",
            "D. $\\mathrm{E} \\rightarrow \\mathrm{E}+\\mathrm{E}\\mid\\mathrm{E}* \\mathrm{E}\\mid$ id"
          ],
          "correct_answer": "C;D",
          "explanation": "Where a Both Left and Right Recurssion apperal on same variable then that is ambigious grammer or By defination if a production has more than one parse tree then this imply Ambigious grammer so option C, D is correct",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the given control flow graph. Which of the following options correctly lists the set of redundant expressions (common sub-expressions) in the basic blocks B4 and B5? Note: All the variables are integers.",
          "images": [
            {
              "index": 1,
              "filename": "521259_img1.png"
            }
          ],
          "options": [
            "A. B4: $\\{b+i\\}$ $\\qquad$ B5: $\\{c+m\\}$",
            "B. B4: $\\{g*k\\}$ $\\qquad$ B5: $\\{\\}$",
            "C. B4: $\\{g*k,\\; b+i\\}$ $\\qquad$ B5: $\\{\\}$",
            "D. B4: $\\{g*k\\}$ $\\qquad$ B5: $\\{c+m\\}$"
          ],
          "correct_answer": "B",
          "explanation": "",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following C statements: $\\texttt{char *str1 = \"Hello;}$ $\\quad // \\text{stmt } S_1$ $\\texttt{char *str2 = \"Hello;\";}$ $\\quad // \\text{stmt } S_2$ $\\texttt{int *str3 = \"Hello\";}$ $\\quad // \\text{stmt } S_3$ Which of the following is/are correct? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $S_1$ has lexical error and $S_2$ has a syntax error.",
            "B. $S_2$ has syntax error and $S_3$ has semantic error.",
            "C. $S_1$ has lexical error, and $S_3$ has semantic error",
            "D. $S_1$ has syntax error and $S_3$ has semantic error"
          ],
          "correct_answer": "C",
          "explanation": ": tag msq",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Grammar to be $\\mathrm{LL}(1)$ 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. To be $\\mathrm{LL}(1)$, Grammar must be left recursive",
            "B. To be $\\mathrm{LL}(1)$, Grammar must be left factored",
            "C. $\\mathrm{LL}(1)$ parser uses Backtracking",
            "D. $\\mathrm{LL}(1)$ parser is more powerful than $\\mathrm{SLR}(1)$"
          ],
          "correct_answer": "B",
          "explanation": "The this question is option B. We can only check for LL(1) parser iff the grammer is not left recurssive. we use Backtracking is used in Bottom up parsers and they are more powerfull than Top-Down parsers",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider two grammars $G_{1}$ and $G_{2}$ with the production rules given below: $G_{1} : S \\rightarrow$ $if$ $E$ $then$ $S$ $|$ $if$ $E$ $then$ $S$ $else$ $S$ $|$ $a$ $E \\rightarrow b$ $G_{2} :S \\rightarrow$ $if$ $E$ $then$ $S$ $|$ $M$ $M \\rightarrow$ $if$ $E$ $then$ $M$ $else$ $S$ $|$ $c$ $E \\rightarrow b$ where $if, then, else, a, b, c$ are the terminals. Which of the following option(s) is/are CORRECT?",
          "images": [],
          "options": [
            "A. $G_{1}$ is not $LL(1)$ and $G_{2}$ is $LL(1)$",
            "B. $G_{1}$ is $LL(1)$ and $G_{2}$ is not $LL(1)$",
            "C. $G_{1}$ and $G_{2}$ are not $LL(1)$",
            "D. $G_{1}$ and $G_{2}$ are ambiguous."
          ],
          "correct_answer": "C;D",
          "explanation": "a gammar is not LL(1) iff: It is ambiguous grammar it has left recursive grammar It has common prefixes both the grammar $G_1, G_2$ having common prefixes like \"if E then S\" and \"if E then\" as well as its ambiguous grammar (Dangling else problem) so given grammar $G_1,G_2$ is not LL(1) and ambigious also. Option $(C,D)$ is corret. For details: GATE 1990",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "​​​​Consider the following statements about the use of backpatching in a compiler for intermediate code generation: Which ONE of the folloeing options is CORRECT? Only I is correct Only II is correct Both I and II are correct Neither I nor II is correct",
          "images": [],
          "options": [
            "A. Backpatching can be used to generate code for Boolean expression in one pass.",
            "B. Backpatching can be used to generate code for flow-of-control statements in one pass."
          ],
          "correct_answer": "C",
          "explanation": "$\\text{Both of the options are taken from Ullman Book}$ $\\text{I.}$ $\\text{II.}$ $\\color{red}{\\text{Sourse:}}$ Compiler ullman (Dragon Book) 2nd edition Page. 410",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "​​Given the following syntax directed translation rules: Rule 1: $R \\rightarrow A B\\{B . i=R . i-1 ; A . i=B . i ; R . i=A . i+1 ;\\}$ Rule 2: $P \\rightarrow C D\\{P . i=C . i+D . i ; D . i=C . i+2 ;\\}$ Rule 3: $Q \\rightarrow E F\\{Q . i=E . i+F . i ;\\}$ Which ONE is the CORRECT option among the following?",
          "images": [],
          "options": [
            "A. Rule $1$ is $S$-attributed and $L$-attributed; Rule $2$ is $S$-attributed and not $L$-attributed; Rule $3$ is neither $S$-attributed nor $L$-attributed.",
            "B. Rule $1$ is neither $S$-attributed not $L$-attributed; Rule $2$ is $S$-attributed and $L$-attributed; Rule $3$ is $S$-attributed and $L$-attributed.",
            "C. Rule $1$ is neither $S$-attributed nor $L$-attributed; Rule $2$ is not $S$-attributed and is $L$-attributed; Rule $3$ is $S$-attributed and $L$-attributed.",
            "D. Rule $1$ is $S$-attributed and not $L$-attributed; Rule $2$ is not $S$-attributed and is $L$-attributed; Rule $3$ is $S$-attributed and $L$-attributed."
          ],
          "correct_answer": "C",
          "explanation": "ANS : OPTION C for every non-terminal(CAPITAL LETTER) , there is attribue associated with it. now , that attribute can be either synthesized or inherited. CATCH in this problem : first decide for every non-terminal attribute associated,whether its synthesized/inherited attribute and then apply def. of L/S attributed SDT. Trap: People wrongly think that : .i means inherited attribute and apply half knowledge def. of L/S attributed SDT directly and get WRONG answer. Look at that def., the meaning of \"ONLY SYNTHESIZED ATTRIBUTES\" means,in semantic rule, we consider only LHS (the one which is getting computed), the one which gets used in the rule we dont bother / dont care about it, so JUST FOCUS ON LHS attribute type. observe the below pic, point 1) , attributes here ,it means, it can be either synthesized or inherited attributes. -------------------------------------------------------------------------------------------- Thoughts : Compiler Design: GATE CSE 2020 | Question: 33 here ,they clearly mentioned what kind of attribute .i & .s are, so solving this problem is easy, directly apply def. of L/S attributed and get it done, But this GATE 2025 SET-2 , we need to decide what kind of attribute for every non-terminal and proceed .",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "​​Given a Context-Free Grammar $\\text{G}$ as follows: \\[ \\begin{array}{l} S \\rightarrow A a|b A c| d c \\mid b d a \\\\ A \\rightarrow d \\end{array} \\] Which ONE of the following statements is TRUE?",
          "images": [],
          "options": [
            "A. $\\text{G}$ is neither $\\operatorname{LALR}(1)$ nor $\\operatorname{SLR}(1)$",
            "B. $\\text{G}$ is $\\text{CLR(1)}$, not $\\text{LALR(1)}$",
            "C. $\\text{G}$ is $\\operatorname{LALR}(1), \\operatorname{not} \\operatorname{SLR}(1)$",
            "D. $\\text{G}$ is $\\operatorname{LALR}(1)$, also $\\operatorname{SLR}(1)$"
          ],
          "correct_answer": "C",
          "explanation": "Parsing table for SLR(1) Parser $$ \\begin{array}{|c|c|c|c|c|c|c|c|} \\hline \\text{State} & a & b & c & d & \\$ & S & A \\\\ \\hline I_0 & & s3 & & s4 & & 1 & 2 \\\\ \\hline I_1 & & & & & \\text{acc} & & \\\\ \\hline I_2 & r3 & & & & & & \\\\ \\hline I_3 & & & & s7 & & & 6 \\\\ \\hline I_4 & r4 & & \\color{red}{\\text{s8 / r4}} & & & & \\\\ \\hline I_5 & & & & & r3 & & \\\\ \\hline I_6 & & & s9 & & & & \\\\ \\hline I_7 & \\color{red}{\\text{s10 / r5}} & & r4 & & & & \\\\ \\hline I_8 & & & & & r1 & & \\\\ \\hline I_9 & & & & & r2 & & \\\\ \\hline I_{10} & & & & & r5 & & \\\\ \\hline \\end{array} $$ Has a shift-reduce conflict at I4 Parsing Table for CLR(1), LALR(1) $$ \\begin{array}{|c|c|c|c|c|c|c|c|} \\hline \\text{State} & a & b & c & d & \\$ & S & A \\\\ \\hline I_0 & & s3 & & s4 & & 1 & 2 \\\\ \\hline I_1 & & & & & \\text{acc} & & \\\\ \\hline I_2 & r3 & & & & & & \\\\ \\hline I_3 & & & & s7 & & & 6 \\\\ \\hline I_4 & r4 & & s8 & & & & \\\\ \\hline I_5 & & & & & r3 & & \\\\ \\hline I_6 & & & s9 & & & & \\\\ \\hline I_7 & s10 & & r4 & & & & \\\\ \\hline I_8 & & & & & r1 & & \\\\ \\hline I_9 & & & & & r2 & & \\\\ \\hline I_{10} & & & & & r5 & & \\\\ \\hline \\end{array} $$ No conflicts . $\\therefore$ grammar is LR(1) and LALR(1) $$\\color{lime} \\boxed{\\text{Answer: C}}$$",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which ONE of the following statements is FALSE regarding the symbol table?",
          "images": [],
          "options": [
            "A. Symbol table is responsible for keeping track of the scope of variables.",
            "B. Symbol table can be implemented using a binary search tree.",
            "C. Symbol table is not required after the parsing phase.",
            "D. Symbol table is created during the lexical analysis phase."
          ],
          "correct_answer": "C",
          "explanation": "SO, option C is false.",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which ONE of the following techniques used in compiler code optimization uses live variable analysis? ed Oct 21, 2025 reply Follow flag Live variable analysis is \"Static code optimization technique\" 1 1 reply Share pooja_singh 2 commented Nov 10, 2025 reply Follow flag Answer = B,,, https://correctbrain.com/buy/ 11 11 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Run-time function call management",
            "B. Register assignment to variables",
            "C. Strength reduction",
            "D. Constant folding"
          ],
          "correct_answer": "B",
          "explanation": "Uses of live variable analysis: 1. Used for register allocation: If variable x is live in a basic block b, it is a potential candidate for register allocation. 2. Used for dead code elimination: If variable x is not live after an assignment x = . . ., then the assignment is redundant and can be deleted as dead code. So, option B is the",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following statement(s) is/are TRUE while computing $\\operatorname{First}$ and $\\operatorname{Follow}$ during top down parsing by a compiler?",
          "images": [],
          "options": [
            "A. For a production $A \\rightarrow \\epsilon, \\epsilon$ will be added to $\\operatorname{First}(A)$.",
            "B. If there is any input right end marker, it will be added to $\\text{First(S)}$, where $S$ is the start symbol.",
            "C. For a production $A \\rightarrow \\epsilon, \\epsilon$ will be added to Follow $\\text{(A)}$.",
            "D. If there is any input right end marker, it will be added to $\\operatorname{Follow}(S)$, where $\\text{S}$ is the start symbol."
          ],
          "correct_answer": "A;D",
          "explanation": "$A,D$ Reference link : https://www.cs.uaf.edu/~cs331/notes/FirstFollow.pdf",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Refer to the given $3$-address code sequence. This code sequence is split into basic blocks. The number of basic blocks is ________. (Answer in integer) 1001: i = 1 1002: j = 1 1003: t1 = 10*i 1004: t2 = t1+j 1005: t3 = 8*t2 1006: t4 = t3-88 1007: a[t4] = 0.0 1008: j = j+1 1009: if j <= 10 goto 1003 1010: i = i+1 1011: if i <= 10 goto 1002 1012: i = 1 1013: t5 = i-1 1014: t6 = 88*t5 1015: a[t6] = 1.0 1016: i = i+1 1017: if i <= 10 goto 1013",
          "images": [],
          "options": [],
          "correct_answer": "6:6",
          "explanation": "Basic block is a sequence of consecutive statements in which the control enters at the beginning and leaves only at the end without any branching (or) halting except at the end.. 1. Identify leader (1st statement of a basic block) First statement of a program is a leader. Target of goto is a leader. Next statement after goto is a leader. 2. Group a leader statement with all the consecutive statements upto but not includeing the next leader of a basic block.",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "​​​Consider the following two sets: $$\\begin{array}{|ll|ll|}\\hline & \\textbf{Set X} & & \\textbf{Set Y} \\\\\\hline \\text{ P.} & \\text{Lexical Analyzer } & \\text{1.}& \\text{Abstract Syntax Tree} \\\\\\hline \\text{ Q.}& \\text{Syntax Analyzer} & \\text{2.} & \\text{Token} \\\\\\hline \\text{ R.} & \\text{Intermediate Code Generator} &\\text{3.} & \\text{Parse Tree} \\\\\\hline \\text{ S.} & \\text{Code Optimizer} &\\text{4.} & \\text{Constant Folding} \\\\\\hline \\end{array}$$ Which one of the following options is the CORRECT match from Set $\\boldsymbol{X}$ to Set $\\boldsymbol{Y}$ ? Related Questions : GATE CSE 2009 | Question: 17 GATE CSE 2015 Set 2 | Question: 19 GATE CSE 2016 Set 2 | Question: 19 GATE CSE 1990 | Question: 2-ix GATE CSE 2017 Set 2 | Question: 05",
          "images": [],
          "options": [
            "A. $\\mathrm{P}-4 ; \\mathrm{Q}-1 ; \\mathrm{R}-3 ; \\mathrm{S}-2$",
            "B. $\\mathrm{P}-2 ; \\mathrm{Q}-3 ; \\mathrm{R}-1 ; \\mathrm{S}-4$",
            "C. $\\mathrm{P}-2 ; \\mathrm{Q}-1 ; \\mathrm{R}-3 ; \\mathrm{S}-4$",
            "D. $\\mathrm{P}-4 ; \\mathrm{Q}-3 ; \\mathrm{R}-2 ; \\mathrm{S}-1$"
          ],
          "correct_answer": "B",
          "explanation": "Lexical analysis produces tokens. Syntax analysis generates a parse tree. Intermediate Code Generation (ICG) results in an abstract syntax tree. Code optimization includes techniques such as constant folding, which replaces the value of expressions at compile time. Therefore, Option (B) is correct.",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "​​​​​Which of the following statements is/are FALSE?",
          "images": [],
          "options": [
            "A. An attribute grammar is a syntax-directed definition $\\text{(SDD)}$ in which the functions in the semantic rules have no side effects",
            "B. The attributes in a $\\text{L}$-attributed definition cannot always be evaluated in a depth-first order",
            "C. Synthesized attributes can be evaluated by a bottom-up parser as the input is parsed",
            "D. All $\\text{L}$-attributed definitions based on $\\text{LR(1)}$ grammar can be evaluated using a bottom-up parsing strategy"
          ],
          "correct_answer": "B;D",
          "explanation": "Answer: B, D A : True Source: Page 13 https://www.cse.iitk.ac.in/users/swarnendu/courses/spring2023-cs335/semantic-analysis.pdf B: False Source: https://archive.nptel.ac.in/content/storage2/courses/106104072/chapter_5/5_38.html C: True Source: Page 25 https://cse.iitkgp.ac.in/~bivasm/notes/SDD.pdf D: False Find Screenshot from Ullman",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following context-free grammar where the start symbol is $\\text{S}$ and the set of terminals is $\\{a, b, c, d\\}$. $$ \\begin{array}{l} S \\rightarrow A a A b \\mid B b B a \\\\ A \\rightarrow c S \\mid \\epsilon \\\\ B \\rightarrow d S \\mid \\epsilon \\end{array} $$ The following is a partially-filled $\\text{LL}(1)$ parsing table. $\\begin{array}{|c|c|c|c|c|c|c|}\\hline &a&b&c&d&\\$ \\\\ \\hline S &S\\rightarrow AaAb &S\\rightarrow BbBa &\\text{(1)} & \\text{(2)} & \\\\ \\hline A & A \\rightarrow \\varepsilon &\\text{(3)} & A\\rightarrow cS& & \\\\ \\hline B & \\text{(4)} &{B \\rightarrow \\varepsilon} & &B\\rightarrow dS& \\\\ \\hline \\end{array}$ Which one of the following options represents the CORRECT combination for the numbered cells in the parsing table? Note: In the options, \"blank\" denotes that the corresponding cell is empty.",
          "images": [],
          "options": [
            "A. $(1)$ $S \\rightarrow A a A b$ $(2)$ $S \\rightarrow B b B a$ $(3)$ $A \\rightarrow \\epsilon$ $(4)$ $B \\rightarrow \\epsilon$",
            "B. $(1)$ $S \\rightarrow B b B a$ $(2)$ $S \\rightarrow A a A b$ $(3)$ $A \\rightarrow \\epsilon$ $(4)$ $B \\rightarrow \\epsilon$",
            "C. $(1)$ $S \\rightarrow A a A b$ $(2)$ $S \\rightarrow B b B a$ $(3)$ blank $(4)$ blank",
            "D. $(1)$ $S \\rightarrow B b B a$ $(2)$ $S \\rightarrow A a A b$ $(3)$ blank $(4)$ blank"
          ],
          "correct_answer": "A",
          "explanation": "To complete the given LL(1) table first we have to find the FIRST and FOLLOW of the given grammar, that is: $\\begin{array}{|c|c|c|}\\hline &\\textsf{FIRST}&\\textsf{FOLLOW}\\\\\\hline S \\rightarrow AaAb \\mid BbBa & \\left \\{ a,b,c,d \\right \\} & \\left \\{ \\$,a,b \\right \\} \\\\\\hline A \\rightarrow cS \\mid \\varepsilon & \\left \\{ c,\\varepsilon \\right \\} & \\left \\{ a,b \\right \\} \\\\ \\hline B \\rightarrow dS\\mid \\varepsilon & \\left \\{ d,\\varepsilon \\right \\} & \\left \\{ a,b \\right \\} \\\\\\hline \\end{array}$ Now we can fill the entries in LL(1) table: $\\begin{array}{|c|c|c|c|c|c|c|}\\hline &a&b&c&d&\\$ \\\\ \\hline S &S\\rightarrow AaAb &S\\rightarrow BbBa &\\underset{\\boxed{1}} {S \\rightarrow AaAb}& \\underset{\\boxed{2}} {S \\rightarrow BbBa}& \\\\ \\hline A & A \\rightarrow \\varepsilon &\\underset{\\boxed{3}}{A \\rightarrow \\varepsilon} & A\\rightarrow cS& & \\\\ \\hline B &\\underset{\\boxed{4}}{B \\rightarrow \\varepsilon} &{B \\rightarrow \\varepsilon} & &B\\rightarrow dS& \\\\ \\hline \\end{array}$ The correct Option is (A).",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "​Consider the following expression: $x[i]=(p+r) *-s[i]+u / w$. The following sequence shows the list of triples representing the given expression, with entries missing for triples $(1), (3)$, and $(6)$. $$\\begin{array}{|c|c|c|c|} \\hline(0) & + & p & r \\\\ \\hline(1) & & & \\\\ \\hline(2) & \\text{uminus} & (1) & \\\\ \\hline(3) & & & \\\\ \\hline(4) & / & u & w \\\\ \\hline(5) & + & (3) & (4) \\\\ \\hline(6) & & & \\\\ \\hline(7) & = & (6) & (5) \\\\ \\hline \\end{array}$$ Which one of the following options fills in the missing entries CORRECTLY?",
          "images": [],
          "options": [
            "A. $(1)$ $\\text{=}$$\\text{[ ] s } i \\quad(3)$ $\\text{*}$ $(0)(2) $ $\\quad(6) $$\\text{[ ]=}$ $\\textit{x }i$",
            "B. $(1)$ $\\text{[ ]}$$=\\text{s } i \\quad(3)-(0)(2) \\quad(6) =$$\\text{[ ]}$ $\\textit{x }(5)$",
            "C. $(1)$ $\\text{=}$$\\text{[ ] s } i \\quad(3)$ $\\text{*}$ $(0)(2) $ $\\quad(6) $$\\text{[ ]=}$ $\\textit{x }(5)$",
            "D. $(1)$ $\\text{[ ]}$$=\\text{s } i \\quad(3)-(0)(2) \\quad(6) =$$\\text{[ ]}$ $\\textit{x }i$"
          ],
          "correct_answer": "A",
          "explanation": "We can do this question as option elimination also as @Cxdr suggested on comments. But, let's actually try to build this table. Given expression is: x[i] = (p+r)*-s[i]+u/w. converting x[i] and s[i] is little overwhelming, so try to think like this since, we are using value of s[i] , let's write it in this way, t1 = s[i] ( we have two operands apart from temporary variable and two operator) in triple symbol table it could be written as, =[] s i also, we are putting computed value in x[i], let's write it in this way x[i] = t1 In symbol table it could be written as, []= x i ( we have two operands apart from temporary variable and two operator) Now, everything is easy anyways, let's build the table (0) + p r (1) =[] s i (2) uminus (1) (3) * (0) (2) (4) / u w (5) + (3) (4) (6) []= x i (7) = (6) (5)",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "​​​​Consider a context-free grammar $\\text{G}$ with the following $3$ rules. $$S \\rightarrow a S, S \\rightarrow a S b S , S \\rightarrow c$$ Let $w \\in L(G)$. Let $ n_{a}(w), n_{b}(w), n_{c}(w) $ denote the number of times $a, b, c$ occur in $w$, respectively. Which of the following statements is/are TRUE?",
          "images": [],
          "options": [
            "A. $n_{a}(w)>n_{b}(w)$",
            "B. $n_{a}(w)>n_{c}(w)-2$",
            "C. $n_{c}(w)=n_{b}(w)+1$",
            "D. $n_{c}(w)=n_{b}(w) * 2$"
          ],
          "correct_answer": "B;C",
          "explanation": "The correct options are B and C, we can solve this by taking valid strings and verifying and eliminating options as shown :",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following augmented grammar, which is to be parsed with a $\\text{SLR}$ parser. The set of terminals is $\\{a, b, c, d, \\#, @\\}$ \\[ \\begin{array}{l} S^{\\prime} \\rightarrow S \\\\ S \\rightarrow S S|A a| b A c|B c| b B a \\\\ A \\rightarrow d \\# \\\\ B \\rightarrow @ \\end{array} \\] Let $I_{0}=\\operatorname{CLOSURE}\\left(\\left\\{S^{\\prime} \\rightarrow \\bullet S\\right\\}\\right)$. The number of items in the set $\\operatorname{GOTO}\\left(I_{0}, S\\right)$ is __________.",
          "images": [],
          "options": [],
          "correct_answer": "9",
          "explanation": "From above DFA we can see that Goto$\\text{(closure}(I_{0}),S)$ contains $9$ items. Similar types of questions are",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following is/are Bottom-Up Parser(s)?",
          "images": [],
          "options": [
            "A. Shift-reduce Parser",
            "B. Predictive Parser",
            "C. LL$(1)$ Parser",
            "D. LR Parser"
          ],
          "correct_answer": "A;D",
          "explanation": "From the above classifications of parsers, it is clear that LR(k) and shift-reduce parse are types of bottom-up parsers while LL(1) and recursive descent parsers belong to top-down parsers. Option $(A,D)$ is correct.",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the operator precedence and associativity rules for the integer arithmetic operators given in the table below. $$\\begin{array}{|c|l|}\\hline \\textbf{Operator} & \\textbf{Precedence} & \\textbf{Associativity} \\\\\\hline \\text{$+$} & \\text{Highest} & \\text{Left} \\\\\\hline \\text{$-$} & \\text{High} & \\text{Right} \\\\\\hline \\text{$*$} & \\text{Medium} & \\text{Right} \\\\\\hline \\text{$/$} & \\text{Low} & \\text{Right} \\\\\\hline \\end{array}$$ The value of the expression $3+1+5 * 2 / 7+2-4-7-6 / 2$ as per the above rules is ________.",
          "images": [],
          "options": [],
          "correct_answer": "6",
          "explanation": "The given expression is evaluated as follows: $\\implies \\underbrace{\\underbrace{3+1}+5}*2/\\underbrace{7+2}-4-7-6/2\\; [ \\text{As '+' has higher predence with left associative in the operators present in the expression.}]$ $\\implies(3+1)+5*2/7+2-4-7-6/2$ $\\implies(4+5)*2/7+2-4-7-6/2$ $\\implies9*2/(7+2)-4-7-6/2$ $\\implies9*2/\\underbrace{9-\\underbrace{4-\\underbrace{7-6}}}/2\\; [ \\text{As '-' has higher predence with right associative in the operators present in the expression.}]$ $\\implies9*2/9-4-(7-6)/2$ $\\implies9*2/9-(4-1)/2$ $\\implies9*2/(9-3)/2$ $\\implies \\underbrace{9*2}/6/2 \\; [ \\text{As '*' has higher predence with right associative in the operators present in the expression.}]$ $\\implies(9*2)/6/2$ $\\implies \\underbrace{18/\\underbrace{6/2}} \\; [ \\text{As '/' has higher predence with right associative in the operators present in the expression.}]$ $\\implies18/(6/2)$ $\\implies18/3=6$ Similar kind of questions",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "​Consider the following syntax-directed definition $\\text{(SDD)}$. $$\\begin{array}{|l|l|} \\hline \\text{$S \\rightarrow D H T U$} & \\text{$ \\left\\{S.v a l = D.val + H.val + T.val + U.val;\\right\\}$} \\\\ \\hline D \\rightarrow ^{\"} \\mathrm{M}^{\"} D_1 & \\left\\{D.val =5+D_{1}.val; \\right\\} \\\\ \\hline D \\rightarrow \\epsilon & \\left\\{D.val = -5; \\right\\} \\\\ \\hline H \\rightarrow ^{\"}\\mathrm{L}^{\"} H_1 & \\left\\{H.val = 5^{*} 10+H_{1}.v a l;\\right\\} \\\\ \\hline H \\rightarrow \\epsilon & \\left\\{H.val = -10; \\right\\} \\\\ \\hline T \\rightarrow \\text {\"C\" } T_1 & \\left\\{T.v a l=5^{*} 100+T_{1}. val;\\right\\} \\\\ \\hline T \\rightarrow \\epsilon & \\left\\{T . v a l= - 5;\\right\\} \\\\ \\hline U \\rightarrow \\text{\"K\"} & \\left\\{U . v a l= 5;\\right\\} \\\\ \\hline \\end{array}$$ Given $\\text{\"MMLK\"}$ as the input, which one of the following options is the $\\text{CORRECT}$ value computed by the $\\text{SDD}$ (in the attribute $S.val$ )?",
          "images": [],
          "options": [
            "A. $45$",
            "B. $50$",
            "C. $55$",
            "D. $65$"
          ],
          "correct_answer": "A",
          "explanation": "Answer : 45",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following grammar $G$, with $S$ as the start symbol. The grammar $G$ has three incomplete productions denoted by $(1), (2)$, and $(3)$. $$\\begin{aligned} & S \\rightarrow d a T \\mid \\quad(1) \\\\ & T \\rightarrow a S|b T| \\quad(2) \\\\ & R \\rightarrow(3) \\mid \\epsilon\\end{aligned}$$ The set of terminals is $\\{a, b, c, d, f\\}$. The FIRST and FOLLOW sets of the different non-terminals are as follows. $\\begin{aligned} & \\operatorname{FIRST}(S)=\\{c, d, f\\}, \\operatorname{FIRST}(T)=\\{a, b, \\epsilon\\}, \\operatorname{FIRST}(R)=\\{c, \\epsilon\\} \\\\ & \\operatorname{FOLLOW}(S)=\\operatorname{FOLLOW}(T)=\\{c, f, \\$\\}, \\operatorname{FOLLOW}(R)=\\{f\\}\\end{aligned}$ Which one of the following options CORRECTLY fills in the incomplete productions?",
          "images": [],
          "options": [
            "A. (1) $S \\rightarrow R f$ (2) $T \\rightarrow \\epsilon$ (3) $R \\rightarrow c T R$",
            "B. (1) $S \\rightarrow f R$ (2) $T \\rightarrow \\epsilon$ (3) $R \\rightarrow c T R$",
            "C. (1) $S \\rightarrow f R$ (2) $T \\rightarrow c T$ (3) $R \\rightarrow c R$",
            "D. (1) $S \\rightarrow R f$ (2) $T \\rightarrow c T$ (3) $R \\rightarrow c R$"
          ],
          "correct_answer": "A",
          "explanation": "Option $(C,D)$ is incorrect as if we substitute $T\\rightarrow cT$ in $(2)$ it gives $FIRST(T)=a,b,c$ which is wrong because in question it is given that $FIRST(T)=a,b,\\epsilon$ Option $(B)$ is incorrect as if we substitute $S\\rightarrow fR$ in $(1)$ it gives $FIRST(S)=f,d$ which is wrong because terminal $c$ is missing. So correct Option is $(A)$. $\\begin{array}{|c|c|c|}\\hline &\\textsf{FIRST}&\\textsf{FOLLOW}\\\\\\hline S \\rightarrow daT \\mid Rf & \\left \\{ c,d,f \\right \\} & \\left \\{ \\$,c,f \\right \\} \\\\\\hline T \\rightarrow aS \\mid bS\\mid \\varepsilon & \\left \\{ a,b,\\varepsilon \\right \\} & \\left \\{ \\$,c,f \\right \\} \\\\ \\hline R \\rightarrow cTR\\mid \\varepsilon & \\left \\{ c,\\varepsilon \\right \\} & \\left \\{ f \\right \\} \\\\\\hline \\end{array}$",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following pseudo-code. L 1: t1 = -1 L 2: t2 = 0 L 3: t3 = 0 L 4: t4 = 4 * t3 L 5: t5 = 4 * t2 L 6: t6 = t5 * M L 7: t7 = t4 + t6 L 8: t8 = a[t7] L 9: if t8 <= max goto L11 L 10: t1 = t8 L 11: t3 = t3 + 1 L 12: if t3 < M goto L4 L 13: t2 = t2 + 1 L 14: if t2 < N goto L3 L 15: max = t1 Which one of the following options CORRECTLY specifies the number of basic blocks and the number of instructions in the largest basic block, respectively?",
          "images": [],
          "options": [
            "A. $6$ and $6$",
            "B. $6$ and $7$",
            "C. $7$ and $7$",
            "D. $7$ and $6$"
          ],
          "correct_answer": "D",
          "explanation": "Basic block : The collection of 3AC statements from the leader to the next leader without including the next leader is known as the basic block. Steps to find the basic blocks: Identify the leader first. (The first statement of 3AC is the leader.) The address of conditional, unconditional goto is the leader. (target location of goto) immediate next line of goto is the leader. Now construct the basic block from leader to line before the next leader. In the given 3AC $7$ leaders are there: $1,3,4,10,11,13,15$ There are $7$ basic block are there: Block $B_1$: statement $1-2$ Block $B_2$: statement $3$ Block $B_3$: statement $4-9$ Block $B_4$: statement $10$ Block $B_5$: statement $11-12$ Block $B_6$: statement $13-14$ Block $B_7$: statement $15$ So the total number of basic blocks is $7$ and the largest basic block is $B_3$ which contains a total of $6$ instruction. Correct option is $(D)$ Ref: Basic Block",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Let $G=(V, \\Sigma, S, P)$ be a context-free grammar in Chomsky Normal Form with $\\Sigma=\\{a, b, c\\}$ and $V$ containing $10$ variable symbols including the start symbol $S$. The string $w=a^{30} b^{30} c^{30}$ is derivable from $S$. The number of steps (application of rules) in the derivation $S \\rightarrow^* w$ is __________.",
          "images": [],
          "options": [],
          "correct_answer": "179",
          "explanation": "Video Solution: https://youtu.be/ugeRQ0LHcHo Chomsky Normal Form: A Context-Free Grammar $G$ is in Chomsky Normal Form(CNF) if all productions are of the form $X \\rightarrow YZ$ or $X \\rightarrow a.$ Some Important Results about CNF ( Explained with Proof HERE ): Let $G$ be a CFG in Chomsky Normal Form, & $w \\in L(G)$ with $|w| = n \\geq 1.$ 1. EVERY derivation of string $w$ contains Exactly $2n-1$ steps. (NOTE: Every leftmost derivation, every rightmost derivation, every other derivation, EACH derivation of string $w$ contains Exactly $2n-1$ steps. ) 2. The Parse Trees (Derivation Tress) of strings generated by a CNF grammar are Always Binary Trees. 3. EVERY Parse Tree of string $w$ has Exactly $2n-1$ Internal Nodes, Exactly $3n-1$ total nodes. (If CNF grammar is Ambiguous, $w$ may have more than $1$ parse trees, & EACH parse tree will have exactly $2n-1$ internal nodes, exactly $3n-1$ total nodes.) Greibach Normal Form: A Context-Free Grammar $G$ is in Greibach Normal Form(GNF) if all productions are of the form $V_1 \\rightarrow aV^*.$ Some Important Results about GNF ( Explained with Proof HERE ): Let $G$ be a CFG in Greibach Normal Form, & $w \\in L(G)$ with $|w| = n \\geq 1.$ 1. EVERY derivation of string $w$ contains Exactly $n$ steps. (NOTE: Every leftmost derivation, every rightmost derivation, every other derivation, EACH derivation of string $w$ contains Exactly $n$ steps. ) 2. The Parse Trees (Derivation Tress) of strings generated by a GNF grammar may not be binary trees. 3. EVERY Parse Tree of string $w$ has Exactly $n$ Internal Nodes, Exactly $2n$ total nodes. (If GNF grammar is Ambiguous, $w$ may have more than $1$ parse trees, & EACH parse tree will have exactly $n$ internal nodes, exactly $2n$ total nodes.) ALL About Chomsky, Greibach Normal Form , with PROOF & Complete Analysis , explained here: https://youtu.be/p8zObnBahVc",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following statements regarding the front-end and back-end of a compiler. S1: The front-end includes phases that are independent of the target hardware. S2: The back-end includes phases that are specific to the target hardware. S3: The back-end includes phases that are specific to the programming language used in the source code. Identify the CORRECT option. 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Only $\\mathbf{S 1}$ is TRUE.",
            "B. Only $\\mathbf{S 1}$ and $\\mathbf{S 2}$ are TRUE.",
            "C. $\\mathbf{S 1}, \\mathbf{S 2}$, and $\\mathbf{S 3}$ are all TRUE.",
            "D. Only $\\mathbf{S 1}$ and $\\mathbf{S 3}$ are TRUE."
          ],
          "correct_answer": "B",
          "explanation": "Answer: Option B. A compiler is a program that takes as input a program written in one language (the source language) and translates it into a functionally equivalent program in another language (the target language) without changing the meaning of the code. Compiler process goes through lexical, syntax, and semantic analysis at the front end, and code generation and optimization at a back-end. Front end and Back end of compiler: The front end of a compiler is the part that takes the source language and produces an intermediate representation. This stage of compilation aims to detect any programmatic errors with the source code. It does this by performing lexical analysis, parsing (or syntax analysis) and semantic analysis. The output of the front end is an intermediate representation of the code, which can be passed to the middle end. The front end is also called analysis. The back end is designed to produce a program for a target computer from the intermediate representation. It includes the code optimization phase and final code generation phase, along with the necessary error handling and symbol table operations. Back end phase of the compiler consists of those phases which depend on the target machine and are independent of the source program . So, answer is Option B.",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following program: int main() { f1 (); f2(2); f3(); return (0); } int f1 () { return(1); } int f2 (int X) { f3(); if (X==1); return f1 (); else return (X * f2 (X - 1)); } int f3 () { return (5); } Which one of the following options represents the activation tree corresponding to the main function? 🚩 Edit necessary | 👮 Rhino | 💬 “Remove semicolon after if statement in routine f2. I have checked in original question paper.”",
          "images": [
            {
              "index": 1,
              "filename": "399285_img1.png"
            },
            {
              "index": 2,
              "filename": "399285_img2.png"
            },
            {
              "index": 3,
              "filename": "399285_img3.png"
            },
            {
              "index": 4,
              "filename": "399285_img4.png"
            }
          ],
          "options": [],
          "correct_answer": "A",
          "explanation": "The correct execution sequence is given in the above figure. inside main() we have $3$ function call as $f_1(),f_2(),f_3()$. $f_1(),f_3()$ will return but $f_2()$ will take $x=2$ and evaluate it. when $X=2$ it will call $f_3()$ and else part. in next time when $x$ value became $1$ again it will call $f_3()$ and if part of given code. after that, it will return. Option (A) is correct.",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the control flow graph shown. Which one of the following choices correctly lists the set of live variables at the exit point of each basic block?",
          "images": [
            {
              "index": 1,
              "filename": "399284_img1.png"
            }
          ],
          "options": [
            "A. $\\text{B1: { }, B2: {a}, B3: {a}, B4: {a}}$",
            "B. $\\text{B1: {i, j}, B2: {a}, B3: {a}, B4: {i}}$",
            "C. $\\text{B1: {a, i, j}, B2: {a, i, j}, B3: {a, i}, B4: {a}}$",
            "D. $\\text{B1: {a, i, j}, B2: {a, j}, B3: {a, j}, B4: {a, i, j}}$"
          ],
          "correct_answer": "D",
          "explanation": "Eventhough this is answered well, I post this to emphasize the initialization of Basic Block B2 which I have shown below. \\(\\begin{array}{|l|c|c|c|} \\hline \\textbf{Initialization}&\\textbf{Pass 1} & \\textbf{Pass 2} & \\textbf{Pass 3} \\\\ \\hline \\begin{array}{l} \\textbf{B}_\\textbf{1} \\\\\\\\ \\begin{array}{ll} \\text{Successor}[B_1]&=\\left \\{ B_2 \\right \\} \\\\ \\text{USE}[B_1]&=\\left \\{ m, n \\right \\} \\\\ \\text{DEF}[B_1]&=\\left \\{ a, i, j\\right \\} \\\\ \\text{IN}[B_1] &=\\phi \\\\ \\text{OUT}[B_1]&=\\text{IN}[B_2]\\\\ &=\\phi\\\\ \\end{array} \\end{array} & \\begin{array}{lll} \\text{IN}[B_1] &=\\left \\{ m, n\\right \\}\\\\ \\text{OUT}[B_1]&=\\left \\{ i, j\\right \\} \\\\ \\end{array} & \\begin{array}{lll} \\text{IN}[B_1] &=\\left \\{ m, n\\right \\} \\\\ \\text{OUT}[B_1]&=\\left \\{a, i, j \\right \\} \\\\ \\end{array} & \\begin{array}{lll} \\text{IN}[B_1] &=\\left \\{m, n \\right \\} \\\\ \\text{OUT}[B_1]&=\\left \\{a, i, j \\right \\} \\\\ \\end{array} \\\\ \\hline \\begin{array}{l} \\textbf{B}_\\textbf{2} \\\\\\\\ \\begin{array}{ll} \\text{Successor}[B_2]&=\\left \\{ B_3, B_4 \\right \\} \\\\ \\text{USE}[B_2]&=\\left \\{ i, j \\right \\} \\\\ \\text{DEF}[B_2]&=\\phi \\\\ \\text{IN}[B_2] &=\\phi \\\\ \\text{OUT}[B_2]&=\\text{IN}[B_3]\\cup \\text{IN}[B_4]\\\\ &=\\phi\\\\ \\end{array} \\end{array} & \\begin{array}{lll} \\text{IN}[B_2] &=\\left \\{ i, j\\right \\} \\\\ \\text{OUT}[B_2]&=\\left \\{ a\\right \\} \\\\ \\end{array} & \\begin{array}{lll} \\text{IN}[B_2] &=\\left \\{a, i, j \\right \\} \\\\ \\text{OUT}[B_2]&=\\left \\{a, j \\right \\} \\\\ \\end{array} & \\begin{array}{lll} \\text{IN}[B_2] &=\\left \\{a, i, j \\right \\} \\\\ \\text{OUT}[B_2]&=\\left \\{a, j \\right \\} \\\\ \\end{array} \\\\ \\hline \\begin{array}{l} \\textbf{B}_\\textbf{3} \\\\\\\\ \\begin{array}{ll} \\text{Successor}[B_3]&=\\left \\{B_4 \\right \\} \\\\ \\text{USE}[B_3]&=\\phi \\\\ \\text{DEF}[B_3]&=\\left \\{a \\right \\} \\\\ \\text{IN}[B_3] &=\\phi \\\\ \\text{OUT}[B_3]&=\\text{IN}[B_4]\\\\ &=\\phi\\\\ \\end{array} \\end{array} & \\begin{array}{lll} \\text{IN}[B_3] &=\\phi \\\\ \\text{OUT}[B_3]&=\\left \\{ a\\right \\} \\\\ \\end{array} & \\begin{array}{lll} \\text{IN}[B_3] &=\\phi \\\\ \\text{OUT}[B_3]&=\\left \\{a, j \\right \\} \\\\ \\end{array} & \\begin{array}{lll} \\text{IN}[B_3] &=\\left \\{j \\right \\} \\\\ \\text{OUT}[B_3]&=\\left \\{a, j \\right \\} \\\\ \\end{array} \\\\ \\hline \\begin{array}{l} \\textbf{B}_\\textbf{4} \\\\\\\\ \\begin{array}{ll} \\text{Successor}[B_4]&=\\left \\{B_2, \\text{EXIT} \\right \\} \\\\ \\text{USE}[B_4]&=\\left \\{a \\right \\} \\\\ \\text{DEF}[B_4]&=\\left \\{i \\right \\} \\\\ \\text{IN}[B_4] &=\\phi \\\\ \\text{OUT}[B_4]&=\\text{IN}[B_2]\\cup \\text{IN[EXIT]}\\\\ &=\\phi\\\\ \\end{array} \\end{array} & \\begin{array}{lll} \\text{IN}[B_4] &=\\left \\{a \\right \\} \\\\ \\text{OUT}[B_4]&=\\left \\{i, j \\right \\} \\\\ \\end{array} & \\begin{array}{lll} \\text{IN}[B_4] &=\\left \\{ a, j \\right \\} \\\\ \\text{OUT}[B_4]&=\\left \\{a, i, j \\right \\} \\\\ \\end{array} & \\begin{array}{lll} \\text{IN}[B_4] &=\\left \\{a, j \\right \\} \\\\ \\text{OUT}[B_4]&=\\left \\{a, i, j \\right \\} \\\\ \\end{array} \\\\ \\hline \\end{array}\\) Note that initialization of \\(\\text{DEF}[B_2]=\\phi\\) and not \\(\\cancel{\\text{DEF}[B_2]=\\left \\{i, j\\right\\}}\\) See \\(\\text{Example 9.13 : B2 does not define i or j, since they are used before definition}\\). More importantly this is corrected statement in errata of the Compilers by Aho, 2nd edition Pass 4 is same as Pass 3 and so the answer is OPTION (D)",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the syntax directed translation given by the following grammar and semantic rules. Here $N, I, F$ and $B$ are non-terminals. $N$ is the starting non-terminal, and $\\#, \\mathbf{0}$ and $\\mathbf{1}$ are lexical tokens corresponding to input letters $\\text{“#\", “0\" and “1\"},$ respectively. $X.val$ denotes the synthesized attribute (a numeric value) associated with a non-terminal $X. \\;I_{1}$ and $F_{1}$ denote occurrences of $I$ and $F$ on the right hand side of a production, respectively. For the tokens $\\mathbf{0}$ and $\\mathbf{1}, \\mathbf{0} . v a l=0$ and $\\mathbf{1}.val =1$. \\[ \\begin{array}{ll} N \\rightarrow I \\# F & N.val =I . v a l+F . v a l \\\\ I\\rightarrow I_{1} B & I.val =\\left(2 I_{1} . v a l\\right)+B.val \\\\ I \\rightarrow B & I.val =\\text { B.val } \\\\ F \\rightarrow B F_{1} & F.val =\\frac{1}{2}\\left(B . v a l+F_{1} . v a l\\right) \\\\ F \\rightarrow B & \\text { F.val }=\\frac{1}{2} B.val \\\\ B \\rightarrow \\mathbf{0} & B . v a l=\\mathbf{0} . v a l \\\\ B \\rightarrow \\mathbf{1} & B . v a l=\\mathbf{1} . v a l \\\\ \\end{array} \\] The value computed by the translation scheme for the input string $$10\\#011$$ is ____________. (Rounded off to three decimal places)",
          "images": [],
          "options": [],
          "correct_answer": "2.375",
          "explanation": "The $2.375$",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which one of the following statements is $\\text{TRUE}?$",
          "images": [],
          "options": [
            "A. The $\\textit{LALR}(1)$ parser for a grammar $\\textit{G}$ cannot have reduce-reduce conflict if the $\\textit{LR}(1)$ parser for $\\textit{G}$ does not have reduce-reduce conflict.",
            "B. Symbol table is accessed only during the lexical analysis phase.",
            "C. Data flow analysis is necessary for run-time memory management.",
            "D. $\\textit{LR}(1)$ parsing is sufficient for deterministic context-free languages."
          ],
          "correct_answer": "D",
          "explanation": "Answer D $\\text{Option A}$ Connsider a LR(1) DFA with no RR Conflicts. Take two states, say, I3 and I5 in such LR(1) DFA. I3 : $[A \\rightarrow \\alpha.\\color{red}{, a}, B \\rightarrow \\beta.\\color{blue}{, b}]$ and I5: $[A \\rightarrow \\alpha.\\color{blue}{, b}, B \\rightarrow \\beta.\\color{red}{, a}]$ Since the core items are same, we will merge $I_3$ and $I_5$ in LALR, say merged state is $I_{35}$ $I_{35}$ : $[A \\rightarrow \\alpha.\\color{red}{, a}\\color{blue}{, b} \\text{ } B \\rightarrow \\beta.\\color{red}{, a}\\color{blue}{, b}]$ A common confusion: $I_{35}$ has RR conflict on $a \\text{ and } b$.​ $\\text{Do } I_{35} \\text{ really has any conflict? }$ – Yes. See one example – here $\\text{Option B}$ Symbol table is accessed among all phases. For example – “int x”, here lexical analyzer will assign 2 tokens, but lexical analyzer won’t know whether x is of type int since it reads int and x as two different tokens. Syntax analyzer will feed type of x to symbol table. C. It is optional D. LR(1) = DCFL Ref: https://cs.stackexchange.com/questions/43/language-theoretic-comparison-of-ll-and-lr-grammars",
          "year": 2022,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the augmented grammar with $\\{ +, {\\ast}, (,),\\text{id} \\}$ as the set of terminals. $S’ \\rightarrow S$ $S \\rightarrow S + R\\; |\\; R$ $R \\rightarrow R {\\ast} P \\;| \\;P$ $P \\rightarrow (S)\\; |\\; \\text{id} $ If $I_{0}$ is the set of two $\\textit{LR}(0)$ items $\\{ [S’ \\rightarrow S.], [S \\rightarrow S. + R] \\}$, then $\\textit{goto(closure}(I_{0}), +)$ contains exactly ______________ items.",
          "images": [],
          "options": [],
          "correct_answer": "5",
          "explanation": "So Goto$\\text{(closure}(I_{0}),+)$ contains exactly $5$ items.",
          "year": 2022,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following grammar along with translation rules. $$\\begin{aligned} & S \\rightarrow S_{1} \\# T \\qquad \\{S._{\\text{val}} =S_{1}. _{\\text{val}} \\; ^{\\ast} T._{\\text{val}}\\}\\\\ & S \\rightarrow T \\qquad \\qquad \\{S._{\\text{val}} = T._{\\text{val}}\\}\\\\ & T \\rightarrow T_{1} \\% R \\qquad \\{T._{\\text{val}} =T_{1}._{\\text{val}} ÷ R._{\\text{val}}\\}\\\\ & T \\rightarrow R \\qquad \\qquad \\{T._{\\text{val}} = R._{\\text{val}}\\} \\\\ & R \\rightarrow \\text{id} \\qquad \\qquad \\{R._{\\text{val}} = \\text{id}._{\\text{val}}\\} \\end{aligned}$$ Here $\\#$ and $\\%$ are operators and $\\text{id}$ is a token that represents an integer and $\\text{id}._{\\text{val}}$ represents the corresponding integer value. The set of non-terminals is $\\{\\text{S, T, R, P}\\}$ and a subscripted non-terminal indicates an instance of the non-terminal. Using this translation scheme, the computed value of $S._{\\text{val}}$ for root of the parse tree for the expression $20 \\# 10 \\% 5 \\# 8 \\% 2 \\% 2$ is ________________.",
          "images": [],
          "options": [],
          "correct_answer": "80",
          "explanation": "Final Answer: $80$ General Rules Operators which are deeper in the parse tree have higher precedence , since they are tried by the parser first. Left-recursive rules indicate left associativity . Right-recursive rules indicate right associativity . Mapping of Operators $\\#$ corresponds to operation $*$ $\\%$ corresponds to operation $\\div$ Both $*$ and $\\div$ are left associative , and $\\div$ has higher precedence . Given Expression $20\\#10\\%5\\#8\\%2\\%2$ Replacing operators with their actual meanings: $\\equiv 20 * (10 \\div 5) * ((8 \\div 2) \\div 2)$ Evaluation using Precedence and Associativity $\\equiv 20 * \\underbrace{(10 \\div 5)}_{\\text{= 2}} * \\underbrace{((8 \\div 2) \\div 2)}_{\\text{= (4 ÷ 2) = 2}}$ $\\Rightarrow 20 * 2 * 2$ $\\Rightarrow \\underbrace{(20 * 2)}_{\\text{= 40}} * 2$ $\\Rightarrow 80$ Final Computed Value $\\boxed{S.val = 80}$ Hence, the value of the given expression is $80$. Concept Summary Operator precedence is governed by depth in the parse tree . Left recursion ⟶ Left associativity Right recursion ⟶ Right associativity $\\div$ binds tighter than $*$, hence evaluated first.",
          "year": 2022,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "State whether the following statements are True or False with reasons for your answer A symbol declared as ‘external’ in an assembly language program is assigned an address outside the program by the assembler itself.",
          "images": [],
          "options": [],
          "correct_answer": "0",
          "explanation": "$\\textsf{extern}$ symbol in an assembler $($or $C)$ compilation unit (a file and all its included ones) is used to refer to $\\textsf{global}$ symbols (either variables or functions) in other parts of the program including any shared libraries. Now, an assembler at the time of assembling has no information about the address of these extern symbols. It is the job of the linker to resolve them once assembling is over. So, $\\textsf{FALSE}.$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following $\\text{ANSI C}$ program: int main () { Integer x; return 0; } Which one of the following phases in a seven-phase $C$ compiler will throw an error?",
          "images": [],
          "options": [
            "A. Lexical analyzer",
            "B. Syntax analyzer",
            "C. Semantic analyzer",
            "D. Machine dependent optimizer"
          ],
          "correct_answer": "C",
          "explanation": "This question is difficult to answer from a practical point of view because most of the C compilers (even other language compilers) do not follow the classical ordering of compilation phases. Since this is a one-mark question ignoring the practical implementations and going by just theory answer will be syntax error. Because there are no lexical errors and “Integer” and “x” get read as identifiers as shown in the following output. arjun@Armi:~$ cat p1.c int main() { Integer x; return 0; } arjun@Armi:~$ clang p1.c -c -Xclang -dump-tokens int 'int' [StartOfLine] Loc=<p1.c:1:1> identifier 'main' [LeadingSpace] Loc=<p1.c:1:5> l_paren '(' Loc=<p1.c:1:9> r_paren ')' Loc=<p1.c:1:10> l_brace '{' [StartOfLine] Loc=<p1.c:2:1> identifier 'Integer' [StartOfLine] [LeadingSpace] Loc=<p1.c:3:2> identifier 'x' [LeadingSpace] Loc=<p1.c:3:10> semi ';' Loc=<p1.c:3:11> return 'return' [StartOfLine] [LeadingSpace] Loc=<p1.c:4:2> numeric_constant '0' [LeadingSpace] Loc=<p1.c:4:9> semi ';' Loc=<p1.c:4:10> r_brace '}' [StartOfLine] Loc=<p1.c:5:1> eof '' Loc=<p1.c:5:2> Now, when this stream of tokens get passed to the syntax analyser – we have an identifier followed by another identifier which is not valid in C syntax – so syntax error . And this must be the answer here though we can argue for semantic error as well as follows. Now consider a typedef usage like “typedef int Integer”. Now, this can be implemented by the compiler in multiple ways. One option is to immediately change the token type of “Integer” from identifier to the given “type”. Otherwise the syntax check can go with the AST generation. But if we go by the classical meaning of the compilation phases here we are matching a string which means it is a semantic phase. Analysis/Semantic analysis More read: https://stackoverflow.com/questions/66290247/integer-x-is-syntactic-error-or-semantic-error Official answer given in GATE key is “Semantic analysis” – but even the best compiler professors won’t conclude on that. Though this was a bad question and even worse answer key, lets use it to learn something useful. The following three flags will force cc (C compiler) to check that your code complies to the relevant international standard, often referred to as the ANSI standard, though strictly speaking it is an ISO standard. -Wall Enable all the warnings which the authors of cc believe are worthwhile. Despite the name, it will not enable all the warnings cc is capable of. -ansi Turn off most, but not all, of the non-ANSI C features provided by cc . Despite the name, it does not guarantee strictly that your code will comply to the standard. -pedantic Turn off all cc 's non-ANSI C features. Without these flags, cc will allow you to use some of its non-standard extensions to the standard. Some of these are very useful, but will not work with other compilers—in fact, one of the main aims of the standard is to allow people to write code that will work with any compiler on any system. This is known as portable code . https://docs.freebsd.org/en_US.ISO8859-1/books/developers-handbook/tools-compiling.html",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "In the context of compilers, which of the following is/are $\\text{NOT}$ an intermediate representation of the source program?",
          "images": [],
          "options": [
            "A. Three address code",
            "B. Abstract Syntax Tree $\\text{(AST)}$",
            "C. Control Flow Graph $\\text{(CFG)}$",
            "D. Symbol table"
          ],
          "correct_answer": "D",
          "explanation": "Symbol table is a data structure created and maintained by compilers in order to store info about occurrences of various entities like variable names, function names, objects, classes and interface. Various forms of intermediate representation of code include Postfix Notation , Three address code ( x = y op z ), Syntax Tree , DAG. Abstract Syntax Tree is a condensed version of syntax tree / parse tree more to with program than the compiler. Parse Tree and Syntax Tree: Control Flow Graph is used in optimization phase of compiler,each basic block consists of linear code , the next block to access is determined by the last instruction of the current block. An Example, goto L2 L1: t0 := 3 >> x t1 := y / t0 x := t1 if y == 0 goto L3 t2 := x - 3 print t2 L3: L2: t4 := 4 * y x := t4 < t5 if t5 != 0 goto L1 See: https://cs.lmu.edu/~ray/notes/ir/ https://www2.cs.arizona.edu/~collberg/Teaching/453/2009/Handouts/Handout-15.pdf http://pages.cs.wisc.edu/~fischer/cs536.s06/course.hold/html/NOTES/4.SYNTAX-DIRECTED-TRANSLATION.html",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "​​​​​​Consider the following $\\text{ANSI C}$ code segment: z=x + 3 + y->f1 + y->f2; for (i = 0; i < 200; i = i + 2) { if (z > i) { p = p + x + 3; q = q + y->f1; } else { p = p + y->f2; q = q + x + 3; } } Assume that the variable $y$ points to a $\\textsf{struct}$ (allocated on the heap) containing two fields $\\textsf{f1}$ and $\\textsf{f2}$, and the local variables $\\textsf{x, y, z, p, q,}$ and $\\textsf{i}$ are allotted registers. Common sub-expression elimination $\\text{(CSE)}$ optimization is applied on the code. The number of addition and the dereference operations (of the form $\\textsf{ y ->f1}$ or $\\textsf{y ->f2}$) in the optimized code, respectively, are:",
          "images": [],
          "options": [
            "A. $403$ and $102$",
            "B. $203$ and $2$",
            "C. $303$ and $102$",
            "D. $303$ and $2$"
          ],
          "correct_answer": "D",
          "explanation": "t1 = x + 3; // 1 addition t2 = y -> f1; // 1 dereference t3 = y -> f2; // 1 dereference z = t1 + t2 + t3; // 2 additions for (i = 0; i < 200; i += 2) { // 100 additions if (z > i) { p = p + t1; // 1 addition q = q + t2; // 1 addition } else { p = p + t3; // 1 addition q = q + t1; // 1 addition } } So, in total we get $1 + 2 + 100 + 100 * 2 = 303$ additions and $ 2$ defrerences. Since all the variables are mentioned to be in registers and any way p and q are not struct objects there is no pointer aliasing issue (say if y was pointing to object p or q, we cannot move the sub expression out of the loop – they are no longer loop invariant. Option D Not t2 = y -> f1; t3 = y -> f2; z = t1 + t2 + t3; for (i = z+1 + (z%2); i < 200; i += 2) { p = p + t1; q = q + t2; } for (i = 0; i <= z; i += 2) { p = p + t3; q = q + t1; } } The above optimization is loop splitting. The advantage here is now we have one less branch inside the loop – less chance of branch miss prediction and more expected instruction level parallelism – remember pipeline stalls due to branch instructions in COA. Also, now we can optimize the code even further as follows: t1 = x + 3; t2 = y -> f1; t3 = y -> f2; z = t1 + t2 + t3; p = p + ((200-z-1-(z%2))/2) * t1; q = q + ((200-z-1-(z%2))/2) * t2; p = p + ((z+1)/2) * t3; q = q + ((z+1)/2)* t1; Again doing sub-expression elimination: t1 = x + 3; t2 = y -> f1; t3 = y -> f2; z = t1 + t2 + t3; t4 = ((200-z-1-(z%2))/2); p = p + t4 * t1; q = q + t4 * t2; //previous t4 usage is dead here t4 = ((z+1)/2); p = p + t4 * t3; q = q + t4 * t1; So, finally, $4$ multiplications, $3$ divisions/mod, $11$ additions/subtractions. That's what compiler does freely for you :)",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "For a statement $S$ in a program, in the context of liveness analysis, the following sets are defined: $\\text{USE}(S)$ : the set of variables used in $S$ $\\text{IN}(S)$ : the set of variables that are live at the entry of $S$ $\\text{OUT}(S)$ : the set of variables that are live at the exit of $S$ Consider a basic block that consists of two statements, $S_1$ followed by $S_2$. Which one of the following statements is correct?",
          "images": [],
          "options": [
            "A. $\\text{OUT($S_1$)} = \\text{IN ($S_2$)}$",
            "B. $\\text{OUT ($S_1$)} = \\text{IN ($S_1$)} \\cup \\text{ USE ($S_1$)}$",
            "C. $\\text{OUT ($S_1$)} = \\text{IN ($S_2$) }\\cup \\text{ OUT ($S_2$)}$",
            "D. $\\text{OUT ($S_1$)} = \\text{USE ($S_1$)} \\cup \\text{IN ($S_2$)}$"
          ],
          "correct_answer": "A",
          "explanation": "Given: Let’s assume the following two statements: S1: a = b + c + d S2: z = b + c + m Note: Since S1 is followed directly by S2 with nothing in between, OUT(S1) = IN(S2) by definition of basic blocks in liveness analysis. Also, OUT(S1) and OUT(S2) can be any subset of variables used in S1 or S2 , respectively , depending on what variables are live after those statements. That’s why we are free to assume reasonable values for them during elimination. Now, we evaluate each option: Option B : OUT(S1) = IN(S1) ∪ USE(S1) LHS = OUT(S1) Assume OUT(S1) = {b} (as explained above) RHS = IN(S1) ∪ USE(S1) IN(S1) = {b} (assumed) USE(S1) = {b, c, d} RHS = {b} ∪ {b, c, d} = {b, c, d} LHS = {b} RHS = {b, c, d} LHS ≠ RHS → Incorrect Option C : OUT(S1) = IN(S2) ∪ OUT(S2) LHS = OUT(S1) Assume OUT(S1) = {b, d} RHS = IN(S2) ∪ OUT(S2) IN(S2) = {b, d} (from previous logic) OUT(S2) = {b, c, m} (assumed live variables) RHS = {b, d} ∪ {b, c, m} = {b, c, d, m} LHS = {b, d} RHS = {b, c, d, m} LHS ≠ RHS → Incorrect Option D : OUT(S1) = USE(S1) ∪ IN(S2) LHS = OUT(S1) Assume OUT(S1) = {d} RHS = USE(S1) ∪ IN(S2) USE(S1) = {b, c, d} IN(S2) = {d} RHS = {b, c, d} ∪ {d} = {b, c, d} LHS = {d} RHS = {b, c, d} LHS ≠ RHS → Incorrect Option A : OUT(S1) = IN(S2) LHS = OUT(S1) RHS = IN(S2) Since S1 is immediately followed by S2 , we know OUT(S1) = IN(S2) directly LHS = RHS → Correct Answer",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following augmented grammar with $\\{ \\#, @, <, >, a, b, c \\}$ as the set of terminals. $$\\begin{array}{l} S’ \\rightarrow S \\\\ S \\rightarrow S \\# cS \\\\ S \\rightarrow SS \\\\ S \\rightarrow S @ \\\\ S \\rightarrow < S > \\\\ S \\rightarrow a \\\\ S \\rightarrow b \\\\ S \\rightarrow c \\end{array}$$Let $I_0 = \\text{CLOSURE}(\\{S’ \\rightarrow \\bullet S\\})$. The number of items in the set $\\text{GOTO(GOTO}(I_0<), <)$ is ___________",
          "images": [],
          "options": [],
          "correct_answer": "8 : 8",
          "explanation": "We can count the items in the third collection. Answer : 8",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following statements. $S_1:$ The sequence of procedure calls corresponds to a preorder traversal of the activation tree. $S_2:$ The sequence of procedure returns corresponds to a postorder traversal of the activation tree. Which one of the following options is correct?",
          "images": [],
          "options": [
            "A. $S_1$ is true and $S_2$ is false",
            "B. $S_1$ is false and $S_2$ is true",
            "C. $S_1$ is true and $S_2$ is true",
            "D. $S_1$ is false and $S_2$ is false"
          ],
          "correct_answer": "C",
          "explanation": "$S_1$: Is true because to perform procedure calls, first parent function will call child functions and hence it resembles preorder . $S_2$: Is true because to return parent function , we must return child functions first. Hence it resembles post order.",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following statements. $S_1:$ Every $\\text{SLR(1)}$ grammar is unambiguous but there are certain unambiguous grammars that are not $\\text{SLR(1)}$. $S_2:$ For any context-free grammar, there is a parser that takes at most $O(n^3)$ time to parse a string of length $n$. Which one of the following options is correct?",
          "images": [],
          "options": [
            "A. $S_1$ is true and $S_2$ is false",
            "B. $S_1$ is false and $S_2$ is true",
            "C. $S_1$ is true and $S_2$ is true",
            "D. $S_1$ is false and $S_2$ is false"
          ],
          "correct_answer": "C",
          "explanation": "Correct option is C. Both statements are correct. An unambiguous grammar is not necessarily $\\text{SLR}(1).$ But every $\\text{SLR}(1)$ grammar is unambiguous. We do have $\\text{CYK}$ algorithm which takes $O(n^3)$ time (assuming size of the context-free grammar $|G|$ to be a constant) to parse any string of length $n$ using a context-free grammar $G.$",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "​​​Consider the following grammar (that admits a series of declarations, followed by expressions) and the associated syntax directed translation $\\text{(SDT)}$ actions, given as pseudo-code $\\begin{array}{lll} P & \\rightarrow & D^* E^* \\\\ D & \\rightarrow & \\textsf{int ID} \\{ \\text{record that } \\textsf{ID.} \\text{lexeme is of type} \\textsf{ int\\}} \\\\ D & \\rightarrow & \\textsf{bool ID} \\{ \\text{record that } \\textsf{ID.} \\text{lexeme is of type} \\textsf{ bool\\}} \\\\ E& \\rightarrow & E_1 +E_2 \\{ \\text{check that } E_1. \\text{type}=E_2. \\text{type} = \\textsf{int}; \\text{set } E.\\text{type }:= \\textsf{int} \\} \\\\ E & \\rightarrow & !E_1 \\{ \\text{check that } E_1. \\text{type} = \\textsf{bool}; \\text{ set } E.\\text{type} := \\textsf{bool} \\} \\\\ E & \\rightarrow & \\textsf{ID} \\{ \\text{set } E. \\text{type } := \\textsf{int} \\} \\end{array}$ With respect to the above grammar, which one of the following choices is correct?",
          "images": [],
          "options": [
            "A. The actions can be used to correctly type-check any syntactically correct program",
            "B. The actions can be used to type-check syntactically correct integer variable declarations and integer expressions",
            "C. The actions can be used to type-check syntactically correct boolean variable declarations and boolean expressions.",
            "D. The actions will lead to an infinite loop"
          ],
          "correct_answer": "B",
          "explanation": "A) False bcz it only checks Boolean and integer for ex : if we've any other arithmatic operation on Integer like multiplication or subtraction or division then it can't be valid . B) True bcz this rule check integer expressions E → E1 + E2 {check if( E1.type = E2.type == int) set E.type = int; } and this rule checks integer variable declaration E → ID {set E.type:= int} C) False bcz this rule only check boolean expressions E → !E1 {check if( E1.type == bool) set E.type = bool;} and what if in the expression we'll have multiplication of booleans or addition of booleans means any expression is given then we these rule will be invalid. Option C wrong because it says that this grammar is used for type check synthetically correct Boolean variable declaration and Boolean expression But in given grammar we have only rule to check Boolean expressions (E = !E1 it only check Boolean expression) If this rule also given in grammar E = ID ( set E . type := Boolean ) then option C also correct D) False bcz its simply declaration and expression rules so not any infinite looping here.",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following context-free grammar where the set of terminals is $\\{a,b,c,d,f\\}$. $$\\begin{array}{lll} \\text{S} & \\rightarrow & d \\: a \\: \\text{T} \\mid \\text{R} \\: f \\\\ \\text{T} & \\rightarrow & a \\: \\text{S} \\: \\mid \\: b \\: a \\: \\text{T} \\: \\mid \\epsilon \\\\ \\text{R} & \\rightarrow & c \\: a \\: \\text{T} \\: \\text{R} \\: \\mid \\epsilon \\end{array}$$ The following is a partially-filled $\\textsf{LL(1)}$ parsing table.$$\\begin{array} {c c c } & a & b & c & d & f & \\$ \\\\\\hline \\text{S} & & & \\boxed{1} & \\text{S} \\rightarrow da \\text{T} & \\boxed{2} & \\\\\\hline \\text{T} & \\text{T} \\rightarrow a\\text{S} & \\text{T} \\rightarrow ba\\text{T} & \\boxed{3} & & \\text{T} \\rightarrow \\varepsilon & \\boxed{4}\\\\\\hline \\text{R} & & & \\text{R} \\rightarrow ca\\text{T}\\text{R} & & \\text{R} \\rightarrow \\varepsilon & \\end{array}$$ Which one of the following choices represents the correct combination for the numbered cells in the parsing table (“blank” denotes that the corresponding cell is empty)?",
          "images": [],
          "options": [
            "A. $\\boxed{1}\\;\\text{S} \\rightarrow \\text{R}f \\qquad \\boxed{2}\\;\\text{S} \\rightarrow \\text{R}f \\qquad \\boxed{3}\\; \\text{T} \\rightarrow \\varepsilon \\qquad \\boxed{4}\\;\\text{T} \\rightarrow \\varepsilon$",
            "B. $\\boxed{1}\\;\\text{blank} \\qquad \\boxed{2}\\;\\text{S} \\rightarrow \\text{R}f \\qquad \\boxed{3}\\; \\text{T} \\rightarrow \\varepsilon \\qquad \\boxed{4}\\;\\text{T} \\rightarrow \\varepsilon$",
            "C. $\\boxed{1}\\;\\text{S} \\rightarrow \\text{R}f \\qquad \\boxed{2}\\;\\text{blank} \\qquad \\boxed{3}\\; \\text{blank} \\qquad \\boxed{4}\\;\\text{T} \\rightarrow \\varepsilon$",
            "D. $\\boxed{1}\\;\\text{blank} \\qquad \\boxed{2}\\;\\text{S} \\rightarrow \\text{R}f \\qquad \\boxed{3}\\; \\text{blank} \\qquad \\boxed{4}\\;\\text{blank} $"
          ],
          "correct_answer": "A",
          "explanation": "$\\begin{array}{|c|c|c|}\\hline &\\textsf{FIRST}&\\textsf{FOLLOW}\\\\\\hline S \\rightarrow daT \\mid Rf & \\left \\{ d,c,f \\right \\} & \\left \\{ c,f,\\$ \\right \\} \\\\\\hline T \\rightarrow aS \\mid baT \\mid \\varepsilon & \\left \\{ a,b,\\varepsilon \\right \\} & \\left \\{ c,f,\\$ \\right \\} \\\\ \\hline R \\rightarrow caTR\\mid \\varepsilon & \\left \\{ c,\\varepsilon \\right \\} & \\left \\{ f \\right \\} \\\\\\hline \\end{array}$ $\\begin{array}{|c|c|c|c|c|c|c|}\\hline &a&b&c&d&f&\\$ \\\\ \\hline S & & &\\underset{\\boxed{1}} {S \\rightarrow Rf}& S \\rightarrow daT &\\underset{\\boxed{2}}{S \\rightarrow Rf}& \\\\ \\hline T & T \\rightarrow aS & T \\rightarrow baT & \\underset{\\boxed{3}}{T \\rightarrow \\varepsilon} &&T \\rightarrow \\varepsilon & \\underset{\\boxed{4}}{T \\rightarrow \\varepsilon} \\\\ \\hline R & && R \\rightarrow caTR && R \\rightarrow \\varepsilon \\\\ \\hline \\end{array}$ Ans: A (1) $S \\rightarrow Rf\\quad$ (2) $S \\rightarrow Rf\\quad$ (3) $T \\rightarrow \\varepsilon \\quad$ (4) $T \\rightarrow \\varepsilon $",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following $C$ code segment: a = b + c; e = a + 1; d = b + c; f = d + 1; g = e + f; In a compiler, this code segment is represented internally as a directed acyclic graph $\\text{(DAG)}$. The number of nodes in the $\\text{DAG}$ is _____________",
          "images": [],
          "options": [],
          "correct_answer": "6 : 6",
          "explanation": "Here $a$ and $d$ are same as both add same values $(bc)$ (common sub-expression elimination) Since $a$ and $d$ are same $f$ and $e$ are also same as they compute $a+1$ and $d+1$ respectively. $a = d =b+c$ $e = f = a+1$ $g = e + e$ ($f$ and $e$ being same) So total no of nodes is $6$ $( a, b, c, e, 1,g)$ Ans $:6$ nodes",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following statements. Which of the above statements is/are TRUE? I only I and III only Ⅱ only None of Ⅰ, Ⅱ and Ⅲ",
          "images": [],
          "options": [
            "A. Symbol table is accessed only during lexical analysis and syntax analysis.",
            "B. Compilers for programming languages that support recursion necessarily need heap storage for memory allocation in the run-time environment.",
            "C. Errors violating the condition ‘ any variable must be declared before its use ’ are detected during syntax analysis."
          ],
          "correct_answer": "D",
          "explanation": "1. False. The symbol table is accessed by most phases of a compiler, beginning with lexical analysis , and continuing through optimization. Symbol table is accessed during other stages also. Ref: https://en.m.wikipedia.org/wiki/Symbol_table 2. Not essential, any one of heap and stack is enough to support recursion. Dynamic allocation of activation records is essential to implement recursion. Remember the stack size can also grow dynamical (see C memory layout). 3. Syntax analyser uses CFL which cannot check for this, we need power of Context sensitive language which is available in semantic analysis phase. So this error is detected only during semantic analysis phase. So D is correct.",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following grammar. $S \\rightarrow aSB \\mid d$ $B \\rightarrow b$ The number of reduction steps taken by a bottom-up parser while accepting the string $aaadbbb$ is ___________. See all 4 Comments 4 4 Comments reply palashbehra5 commented Oct 27, 2021 reply Follow flag | Stack | Input | Action | | ------- | ----- | ---------------- | | $aaad | bbb$ | | | $aaaS | bbb$ | reduction S->d | | $aaaSb | bb$ | reduction B->b | | $aaaSB | bb$ | reduction S->aSB | | $aaSb | b$ | reduction B->b | | $aaSB | b$ | reduction S->aSB | | $aSb | $ | reduction B->b | | $S | $ | reduction S->aSB | Note : Skipped shift steps. 4 4 reply Share Gajanan Purud commented Sep 17, 2023 reply Follow flag Nice question 0 0 reply Share js__ commented Nov 3, 2025 reply Follow flag can we say like this total length of the string will be total no. of reductions ? 0 0 reply Share js__ commented Nov 30, 2025 reply Follow flag No. Because RHS lengths vary. S → A B C A → a a a a B → b b C → c c c string :- aaaabbccc Total reductions = 4 Even though string length = 9 . 1 1 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "7",
          "explanation": "In parse tree, all the non terminals are reductions. So total 7 reductions.",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the productions $A \\rightarrow PQ$ and $A \\rightarrow XY$. Each of the five non-terminals $A, P, Q, X,$ and $Y$ has two attributes: $s$ is a synthesized attribute, and $i$ is an inherited attribute. Consider the following rules. Rule $1: P . i = A.i + 2, \\: Q.i = P. i + A.i,$ and $A.s = P.s +Q. s$ Rule $2: X.i = A.i + Y.s$ and $Y. i = X. s +A .i$ Which one of the following is TRUE?",
          "images": [],
          "options": [
            "A. Both Rule $1$ and Rule $2$ are $L$-attributed.",
            "B. Only Rule $1$ is $L$-attributed.",
            "C. Only Rule $2$ is $L$-attributed.",
            "D. Neither Rule $1$ nor Rule $2$ is $L$-attributed."
          ],
          "correct_answer": "B",
          "explanation": "Answer : B. In L-attributed definitions, A parent can take its attribute values from any child (which is $S-$attributed and Every $S-$attributed is also $L-$Attributed). A child can take its attribute values from the parent as well as from any left sibling but not from any right sibling. Based on these properties, only Rule-1 is $L-$attributed. Rule-2 is failed for the production $A \\to XY,$ and defintion $X.i =A.i +Y.s$ since $X$ take value from its sibling $Y,$ which is present in its right in the production.",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which one of the following kinds of derivation is used by LR parsers?",
          "images": [],
          "options": [
            "A. Leftmost",
            "B. Leftmost in reverse",
            "C. Rightmost",
            "D. Rightmost in reverse"
          ],
          "correct_answer": "D",
          "explanation": "A bottom-up parser traces a rightmost derivation in reverse. Answer (D) .",
          "year": 2019,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the grammar given below: $S \\rightarrow Aa$ $A \\rightarrow BD$ $B \\rightarrow b \\mid \\epsilon $ $D \\rightarrow d \\mid \\epsilon $ Let $a,b,d$ and $\\$$ be indexed as follows:$$\\begin{array}{|l|l|l|l|} \\hline a & b & d & \\$ \\\\ \\hline 3 & 2 & 1 & 0 \\\\ \\hline \\end{array}$$Compute the FOLLOW set of the non-terminal B and write the index values for the symbols in the FOLLOW set in the descending order.(For example, if the FOLLOW set is $(a,b,d, \\$)$ , then the answer should be $3210$)",
          "images": [],
          "options": [],
          "correct_answer": "31",
          "explanation": "For $\\text{Follow(B)} \\implies \\text{First(D)} = \\{ d, \\epsilon \\}$ Put $\\epsilon$ in $II$ production $\\text{Follow (B)} = \\text{ Follow (A)} = \\{ a\\}$ $\\text{Follow (B)} = \\{ d,a \\}$ According to the question writing Follow set in decreasing order:$$\\begin{array}{|l|l|} \\hline a & d \\\\ \\hline 3 & 1 \\\\ \\hline \\end{array}$$Hence $31$ is correct answer",
          "year": 2019,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following grammar and the semantic actions to support the inherited type declaration attributes. Let $X_1, X_2, X_3, X_4, X_5$, and $X_6$ be the placeholders for the non-terminals $D, T, L$ or $L_1$ in the following table: $$\\begin{array}{|l|l|} \\hline \\text{Production rule} & \\text{Semantic action} \\\\ \\hline D \\rightarrow T L & X_1.\\text{type} = X_2.\\text{type} \\\\ \\hline T \\rightarrow \\text{int} & T.\\text{type} = \\text{int} \\\\ \\hline T \\rightarrow \\text{float} & T.\\text{type} = \\text{float} \\\\ \\hline L \\rightarrow L_1, id & X_3.\\text{type}= X_4.\\text{type} \\\\ &\\text{addType}(id. \\text{entry}, X_5.\\text{type})\\\\ \\hline L \\rightarrow id & \\text{addType}(id. \\text{entry}, X_6.\\text{type}) \\\\ \\hline \\end{array}$$ Which one of the following are appropriate choices for $X_1, X_2, X_3$ and $X_4$?",
          "images": [],
          "options": [
            "A. $X_1=L, \\: X_2=T, \\: X_3=L_1, \\: X_4 = L$",
            "B. $X_1=T, \\: X_2=L, \\: X_3=L_1, \\: X_4 = T$",
            "C. $X_1=L, \\: X_2=L, \\: X_3=L_1, \\: X_4 = T$",
            "D. $X_1=T, \\: X_2=L, \\: X_3=T, \\: X_4 = L_1$"
          ],
          "correct_answer": "A",
          "explanation": "A node in a parse tree can $\\text{INHERIT}$ an attribute either from its parent or its siblings. This means for a production $$S \\to AB,$$ $A$ can inherit values from either $S$ or $B$ and similarly $B$ can inherit values from either $S$ or $A.$ In the given productions, for $L \\to L_1, id,$ $L_1$ can inherit from $L$ or $,$ or $id$ with only $L$ being a non-terminal. So, this means $X_3$ must be $L_1$ and $X_4$ must be $L$ as $X_i$ is a placeholder for non-terminals. Only option A matches this.",
          "year": 2019,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the augmented grammar given below: $S’ \\rightarrow S$ $S \\rightarrow \\langle L \\rangle \\mid id$ $L \\rightarrow L, S \\mid S$ Let $I_0 = \\text{CLOSURE} (\\{[S’ \\rightarrow \\cdot S ]\\}).$ The number of items in the set $\\text{GOTO} (I_0, \\langle \\: )$ is______",
          "images": [],
          "options": [],
          "correct_answer": "5",
          "explanation": "Total $5$ items",
          "year": 2019,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following parse tree for the expression a#b$\\$$c$\\$$d#e#f, involving two binary operators $\\$$ and #. Which one of the following is correct for the given parse tree?",
          "images": [
            {
              "index": 1,
              "filename": "204112_img1.jpg"
            }
          ],
          "options": [
            "A. $ has higher precedence and is left associative; # is right associative",
            "B. # has higher precedence and is left associative; $ is right associative",
            "C. $ has higher precedence and is left associative; # is left associative",
            "D. $ has higher precedence and is right associative; # is left associative"
          ],
          "correct_answer": "A",
          "explanation": "Inorder $:\\{a\\#[((b\\$c)\\$d)\\#(e\\#f)]\\}$ (given in question) If we observe, first evaluation is $ b\\$c$ So, (\\$) has higher priority. Therefore, either option (A) or (C) is correct $\\underline{\\text{Option A}}$ $\\$$ has higher precedence and $\\#$ is right associative. From tree, it is clear that $(e\\#f)$ is evaluating first which is to the right side of the root. Therefore, $\\#$ is Right Associative. So, Option A is correct $\\underline{\\text{Option C}}$ $\\$$ has higher precedence and $\\#$ is left associative. This is wrong.",
          "year": 2018,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A lexical analyzer uses the following patterns to recognize three tokens $T_1, T_2$, and $T_3$ over the alphabet $\\{a, b, c\\}$. $T_1: a?(b \\mid c)^\\ast a$ $T_2: b?(a \\mid c)^\\ast b$ $T_3: c?(b \\mid a)^\\ast c$ Note that ‘$x?$’ means $0$ or $1$ occurrence of the symbol $x.$ Note also that the analyzer outputs the token that matches the longest possible prefix. If the string $bbaacabc$ is processed by the analyzer, which one of the following is the sequence of tokens it outputs?",
          "images": [],
          "options": [
            "A. $T_1T_2T_3$",
            "B. $T_1T_1T_3$",
            "C. $T_2T_1T_3$",
            "D. $T_3T_3$"
          ],
          "correct_answer": "D",
          "explanation": "Option D is the You can think $T_3$ as $\\left ( \\varepsilon + c \\right )\\left ( b+a \\right )^{*}c$ Given string is $bbaacabc$ The longest matching prefix $\\text{bbaac}$ { from regex $T3$ you can easily derive $\\text{bbaac}$ } Now the remaining $\\text{abc}$ { This can also be derived from $T3$ } Hence $T3T3$ is the answer.",
          "year": 2018,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which one of the following statements is FALSE?",
          "images": [],
          "options": [
            "A. Context-free grammar can be used to specify both lexical and syntax rules",
            "B. Type checking is done before parsing",
            "C. High-level language programs can be translated to different Intermediate Representations",
            "D. Arguments to a function can be passed using the program stack"
          ],
          "correct_answer": "B",
          "explanation": "A. Since Lexical rules are nothing but regular expressions, we can use CFGs to represent such rules.(Every Type-$3$ grammar is Type-$2$ grammar) Additionally, syntax rules can be represented by CFGs. (True) B. Type checking is done during Semantic Analysis phase which comes after Parsing. (False) C. We have various types of Intermediate Code Representations, ex $3$-address code, Postfix notation, Syntax trees. (True) D. Program stack holds the activation record of the function called, which stores function parameters, return value, return address etc.(True) $B$",
          "year": 2018,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the expression $(a-1) * (((b+c)/3)+d)$. Let $X$ be the minimum number of registers required by an optimal code generation (without any register spill) algorithm for a load/store architecture, in which ​​​​​​​The value of $X$ is _____________ . ed Nov 29, 2022 reply Follow flag @svas7246 If intermediate result is stored in memory then we don’t need an additional register to store it and it minimizes the registers used. 2 2 reply Share aashish1406 commented Jan 15, 2024 i",
          "images": [],
          "options": [
            "A. only load and store instructions can have memory operands and",
            "B. arithmetic instructions can have only register or immediate operands."
          ],
          "correct_answer": "2",
          "explanation": "Load $R1,b$ Load $R2,c$ ADD $R1,R2$ Div $R1,3$ Load $R2,d$ Add $R1,R2$ Load $R2,a$ Sub $R2,1$ Mul $R2,R1$ hence minimum $2$ registers required",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Match the following according to input (from the left column) to the compiler phase (in the right column) that processes it: $$\\begin{array}{|l|l|}\\hline \\text{P. Syntax tree} & \\text{i. Code generator} \\\\\\hline \\text{Q. Character stream} & \\text{ii. Syntax analyser} \\\\\\hline \\text{R. Intermediate representation} & \\text{iii. Semantic analyser} \\\\\\hline \\text{S. Token stream} & \\text{iv. Lexical analyser} \\\\\\hline \\end{array}$$ Related Questions : GATE CSE 2009 | Question: 17 GATE CSE 2015 Set 2 | Question: 19 GATE CSE 2016 Set 2 | Question: 19 GATE CSE 1990 | Question: 2-ix GATE CSE 2024 | Set 2 | Question: 11",
          "images": [],
          "options": [
            "A. $\\text{P-ii; Q-iii; R-iv; S-i}$",
            "B. $\\text{P-ii; Q-i; R-iii; S-iv}$",
            "C. $\\text{P-iii; Q-iv; R-i; S-ii}$",
            "D. $\\text{P-i; Q-iv; R-ii; S-iii}$"
          ],
          "correct_answer": "C",
          "explanation": "Correct Option: $C$ $\\text{Q - iv}$ because Character stream is given as input to lexical analyser $\\text{P - iii}$ Syntax tree is given as input to semantic analyser $\\text{R - i }$Intermediate code given as input to code generator $\\text{S - ii }$ Token stream given as input to syntax analyser",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following expression grammar $G$: $E \\rightarrow E-T \\mid T$ $T \\rightarrow T + F \\mid F$ $F \\rightarrow (E) \\mid id$ Which of the following grammars is not left recursive, but is equivalent to $G$?",
          "images": [],
          "options": [
            "A. $E \\rightarrow E-T \\mid T$ $T \\rightarrow T +F \\mid F$ $F \\rightarrow (E) \\mid id$",
            "B. $E \\rightarrow TE’$ $E’ \\rightarrow -TE’ \\mid \\epsilon$ $T \\rightarrow T + F \\mid F$ $F \\rightarrow (E) \\mid id$",
            "C. $E \\rightarrow TX $ $X \\rightarrow -TX \\mid \\epsilon$ $T \\rightarrow FY$ $Y \\rightarrow +FY \\mid \\epsilon$ $F \\rightarrow (E) \\mid id$",
            "D. $E \\rightarrow TX \\mid (TX)$ $X \\rightarrow -TX \\mid +TX \\mid \\epsilon$ $T \\rightarrow id$"
          ],
          "correct_answer": "C",
          "explanation": "Since, the grammar given in the question is left recursive, we need to remove left recursion , If Grammar is of form $A \\rightarrow Aα \\mid β$ then after removal of left recursion it should be written as $A \\rightarrow βA'$ $A' \\rightarrow αA' \\mid \\epsilon$ Since the grammar is : $E \\rightarrow E - T \\mid T$ $($Here $α$ is '$-T$' and $β$ is $T$$)$ $T \\rightarrow T + F \\mid F$ $($Here $α$ is '$+F$' and $β$ is $F$$)$ $F \\rightarrow (E) \\mid id$ $($It is not having left recursion$)$ Rewriting after removing left recursion : $E \\rightarrow TE'$ $E' \\rightarrow -TE' \\mid \\epsilon$ $T \\rightarrow FT'$ $T' \\rightarrow +FT' \\mid \\epsilon $ $F \\rightarrow (E) \\mid id$ Now replace $E'$ with $X$ and $T'$ with $Y$ to match with Option C. $E \\rightarrow TX $ $X \\rightarrow -TX \\mid \\epsilon$ $T \\rightarrow FY$ $Y \\rightarrow +FY \\mid \\epsilon$ $F \\rightarrow (E) \\mid id$ Hence C is correct.",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following statements about parser is/are CORRECT? I only II only III only II and III only",
          "images": [],
          "options": [
            "A. $\\text{Canonical LR}$ is more powerful than $\\text{SLR}$",
            "B. $\\text{SLR}$ is more powerful than $\\text{LALR}$",
            "C. $\\text{SLR}$ is more powerful than $\\text{Canonical LR}$"
          ],
          "correct_answer": "A",
          "explanation": "For a parser more power means it can parse more strings. So, here only the first statement is correct. $A$",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following grammar: stmt $\\rightarrow$ if expr then expr else expr; stmt | $Ò$ expr $\\rightarrow$ term relop term | term term $\\rightarrow$ id | number id $\\rightarrow$ a | b | c number $\\rightarrow [0-9]$ where relop is a relational operator $($e.g., $< , >,\\ldots),$ $Ò$ refers to the empty statement, and if , then , else are terminals. Consider a program $P$ following the above grammar containing ten if terminals. The number of control flow paths in $P$ is________ . For example. the program if $e_1$ then $e_2$ else $e_3$ has $2$ control flow paths. $e_1 \\rightarrow e_2$ and $e_1 \\rightarrow e_3$. See all 7 Comments 7 7 Comments reply Show 4 previous comments usher commented Nov 22, 2024 reply Follow flag for 2 if statements there are 4 control flow graph thus, for 10 if statement there are 2^10 control flow graphs. 11 11 reply Share Rish@bh_shukl@ commented Sep 9, 2025 reply Follow flag Possible silly mistake = doing 2*10 instead of 2^10. 6 6 reply Share coderatul commented Jan 16 i | | Let's look at the first IF: v < Decision 1: Mood okay? > / \\ (Yes/True) (No/False) / \\ v v [ Action: Study ] [ Action: Chillax ] | | | | The first IF is done. The first IF is done. Now everyone moves to Now everyone moves to the second IF: | v v < Decision 2: Is it Jan? > < Decision 2: Is it Jan? > / \\ / \\ (Yes/True) (No/False) (Yes/True) (No/False) / \\ / \\ v v v v [LEAF 1] [LEAF 2] [LEAF 3] [LEAF 4] (Study anyway) (Regret) (Study anyway) (Regret) 2 2 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "1024",
          "explanation": "This question is picked from area of Counting in Combinatorics . Given: if $e_1$ then $e_2$ else $e_3$ has $2$ control flow paths $e_1 \\rightarrow e_2$ and $e_1 \\rightarrow e_3$. (Meaning of \"how many control flow\" for if structure is clearly mentioned) What is asked: Number of control flow paths for $10$ if terminals? Solution: To get $10$ if's we need to use grammar to get, if <expr> then <expr> else <expr> ; stmt if <expr> then <expr> else <expr> ; if <expr> then <expr> else <expr> ; stmt .............. .............. .............. (keep doing it $10$ times to get $10$ if's) Observe that there is a semi-colon after every if structure . We know that every if structure has $2$ control flows as given in question. Hence, We have $2$ control flow choices for $1$st if terminal. We have $2$ control flow choices for $2$nd if terminal. ............ ............ ............ We have $2$ control flow choices for $10$th if terminal. By using multiplicative law of counting we get, Total choices as $2*2*2*2*2$......$10$ times $= 2^{10} = 1024$ Once again, one need not know \"what control flow\" is, but needs to know \"how many control flows\" are in if structure which is given in question.",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following grammar: $P\\rightarrow xQRS$ $Q\\rightarrow yz\\mid z$ $R\\rightarrow w\\mid \\varepsilon$ $S\\rightarrow y$ What is FOLLOW($Q$)?",
          "images": [],
          "options": [
            "A. $\\left \\{ R \\right \\}$",
            "B. $\\left \\{ w \\right \\}$",
            "C. $\\left \\{ w,y \\right \\}$",
            "D. $\\left \\{ w,\\$ \\right \\}$"
          ],
          "correct_answer": "C",
          "explanation": "Follow of $Q$ is first of $R$ so we get $\\{w\\}$ but since $R$ can be Null so we have to check first of $S$ which is $\\{y\\}$ so FOLLOW $Q=\\{w,y\\}$ Correct option ( C )",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following intermediate program in three address code p = a - b q = p * c p = u * v q = p + q Which one of the following corresponds to a static single assignment form of the above code?",
          "images": [],
          "options": [
            "A. p1 = a - b q1 = p1 * c p1 = u * v q1 = p1 + q1",
            "B. p3 = a - b q4 = p3 * c p4 = u * v q5 = p4 + q4",
            "C. p1 = a - b q1 = p2 * c p3 = u * v q2 = p4 + q3",
            "D. p1 = a - b q1 = p * c p2 = u * v q2 = p + q"
          ],
          "correct_answer": "B",
          "explanation": "References: https://en.wikipedia.org/wiki/Static_single_assignment_form http://www.cse.iitd.ernet.in/~nvkrishna/courses/winter07/ssa.pdf https://www.cs.cmu.edu/~fp/courses/15411-f08/lectures/09-ssa.pdf http://www.seas.harvard.edu/courses/cs252/2011sp/slides/Lec04-SSA.pdf So, B is ans.",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "What is printed by following program, assuming call-by reference method of passing parameters for all variables in the parameter list of procedure P? program Main(inout, output); var a, b:integer; procedure P(x, y, z:integer); begin y:=y+1 z:=x+x end P; begin a:=2; b:=3; p(a+b, a, a); Write(a) end. 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "10",
          "explanation": "let variable \"$a$\" has address $100$ and \"$b$\" has $200$ . and a variable in which \"$a+b$\" is stored has address $300$. now $p(300,100,100)$ which represent $x,y,z$ $y:=y+1$ // it makes $a=3$; $z:=x+x$ // x means the value contained at address $300$ i.e. $5$ $5+5 =10$ hence value at address $100$ i.e. variable \"$a$\" will get the value $10$ . Hence the value of $a$ i.e. $10$ will be printed.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following expression grammar. The semantic rules for expression evaluation are stated next to each grammar production.$$\\begin{array}{l|l} E\\rightarrow number & E.val = {number.val} \\\\\\qquad \\mid \\ E \\ \\ ‘+\\text{'} \\ E & E^{(1)}.val = E^{(2)}.val + E^{(3)}.val \\\\\\qquad \\mid \\ E \\ \\ ‘\\times\\text{'} \\ E & E^{(1)}.val = E^{(2)}.val \\times E^{(3)}.val \\end{array}$$ Assume the conflicts of this question are resolved using yacc tool and an LALR(1) parser is generated for parsing arithmetic expressions as per the given grammar. Consider an expression $3 \\times 2 + 1$. What precedence and associativity properties does the generated parser realize?",
          "images": [],
          "options": [
            "A. Equal precedence and left associativity; expression is evaluated to $7$",
            "B. Equal precedence and right associativity; expression is evaluated to $9$",
            "C. Precedence of ‘$\\times$’ is higher than that of ‘$+$’, and both operators are left associative; expression is evaluated to $7$",
            "D. Precedence of ‘$+$’ is higher than that of ‘$\\times$’, and both operators are left associative; expression is evaluated to $9$"
          ],
          "correct_answer": "B",
          "explanation": "LALR Parser is type of Bottom up Parser which uses Right most Derivation For $3×2+1$ $E \\rightarrow E * E$ (Both shift and reduce possible but yacc prefers shift) $ \\rightarrow E * E + E$ $ \\rightarrow E * E + 1$ $ \\rightarrow E * 2 + 1$ $ \\rightarrow E * 3$ $ \\rightarrow 3 * 3$ $ \\rightarrow 9$ All the productions are in same level therefore all have same precedence Therefore Ans is B. Equal precedence and right associativity; expression is evaluated to 9.",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "State whether the following statements are TRUE or FALSE with reason: The Link-load-and-go loading scheme required less storage space than the link-and-go loading scheme. 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "1",
          "explanation": "TRUE. In link and go scheme the linkage editor coexists with program in main memory while performing linking task whereas link,load and go scheme the linkage editor does not coexists with program in main memory while performing linking task source : http://www.answers.com/Q/What_are_link_and_go_and_link_load_and_go_loader_schemes",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "For the program given below what will be printed by the write statements marked $(1)$ and $(2)$ in the program if the variables are dynamically scoped? Var x, y:interger; procedure P(n:interger); begin x := (n+2)/(n-3); end; procedure Q Var x, y:interger; begin x:=3; y:=4; P(y); Write(x); __(1) end; begin x:=7; y:=8; Q; Write(x); __(2) end.",
          "images": [],
          "options": [
            "A. $3, 6$",
            "B. $6, 7$",
            "C. $3, 7$",
            "D. None of the above"
          ],
          "correct_answer": "B",
          "explanation": "Using Static Scoping: First, procedure Q is called from the main procedure. Q has local variables x and y with values 3 and 4 respectively. This local variable y (value 4 ) is being passed to procedure P during call, and received in local variable n inside procedure P . Now, as P does not have any local definition for variable x , it will assign the evaluated value of (n+2)/(n-3) i.e. (4+2)/(4-3)=6 to the global variable x , which was previously 7 . After the call of procedure P , procedure Q writes the value of local variable x which is still 3 . Lastly, the main procedure writes the value of global variable x which has been changed to 6 inside procedure P . So, the output will be 3, 6 . Using Dynamic Scoping: The same sequence of statements will be executed using dynamic scoping. However, as there is no local definition of variable x in procedure P , it will consider the recent definition in the calling sequence; as P is being called from procedure Q , definition of x from Q will be used, and value of x will be changed to 6 from 3 . Now, when Q writes local variable x , 6 will be printed. The write global variable x from main procedure will print 7 (as value of the global variable x has not been changed). So, the output will be 6, 7 . $B$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Study the following program written in a block-structured language: Var x, y:interger; procedure P(n:interger); begin x:=(n+2)/(n-3); end; procedure Q Var x, y:interger; begin x:=3; y:=4; P(y); Write(x) __(1) end; begin x:=7; y:=8; Q; Write(x); __(2) end. What will be printed by the write statements marked $(1)$ and $(2)$ in the program if the variables are statically scoped? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $3, 6$",
            "B. $6, 7$",
            "C. $3, 7$",
            "D. None of the above."
          ],
          "correct_answer": "A",
          "explanation": "Using Static Scoping: First, procedure Q is called from the main procedure. Q has local variables x and y with values 3 and 4 respectively. This local variable y (value 4 ) is being passed to procedure P during call, and received in local variable n inside procedure P . Now, as P does not have any local definition for variable x , it will assign the evaluated value of (n+2)/(n-3) i.e. (4+2)/(4-3)=6 to the global variable x , which was previously 7 . After the call of procedure P , procedure Q writes the value of local variable x which is still 3 . Lastly, the main procedure writes the value of global variable x which has been changed to 6 inside procedure P . So, the output will be 3, 6 . Using Dynamic Scoping: The same sequence of statements will be executed using dynamic scoping. However, as there is no local definition of variable x in procedure P , it will consider the recent definition in the calling sequence; as P is being called from procedure Q , definition of x from Q will be used, and value of x will be changed to 6 from 3 . Now, when Q writes local variable x , 6 will be printed. The write global variable x from main procedure will print 7 (as value of the global variable x has not been changed). So, the output will be 6, 7 . $A$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Using longer identifiers in a program will necessarily lead to:",
          "images": [],
          "options": [
            "A. Somewhat slower compilation",
            "B. A program that is easier to understand",
            "C. An incorrect program",
            "D. None of the above"
          ],
          "correct_answer": "A",
          "explanation": "Answer : Option A ) is Correct because lex will take more time to recognize the longer identifiers.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "An operator precedence parser is a 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Bottom-up parser.",
            "B. Top-down parser.",
            "C. Back tracking parser.",
            "D. None of the above."
          ],
          "correct_answer": "A",
          "explanation": "A. Bottom-up parser. An operator-precedence parser is a simple shift-reduce parser that is capable of parsing a subset of $\\text{LR(1)}$ grammars. More precisely, the operator-precedence parser can parse all $\\text{LR(1)}$ grammars where two consecutive non-terminals and epsilon never appear in the right-hand side of any rule.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A context-free grammar is ambiguous if:",
          "images": [],
          "options": [
            "A. The grammar contains useless non-terminals.",
            "B. It produces more than one parse tree for some sentence.",
            "C. Some production has two non terminals side by side on the right-hand side.",
            "D. None of the above."
          ],
          "correct_answer": "B",
          "explanation": "An ambiguous grammar produces more than one parse tree for any string.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "In a compiler the module that checks every character of the source text is called: Related Questions : GATE CSE 2011 | Question: 1",
          "images": [],
          "options": [
            "A. The code generator.",
            "B. The code optimiser.",
            "C. The lexical analyser.",
            "D. The syntax analyser."
          ],
          "correct_answer": "C",
          "explanation": "lexical analyser phase checks every character of text to identify tokens.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The grammar $S\\rightarrow AC\\mid CB$ $C\\rightarrow aCb\\mid \\epsilon$ $A\\rightarrow aA\\mid a$ $B\\rightarrow Bb\\mid b$ generates the language $ L=\\left \\{ a^{i}b^{j}\\mid i\\neq j \\right \\}$. In this grammar what is the length of the derivation (number of steps starting from $S$) to generate the string $a^{l}b^{m}$ with $l\\neq m$",
          "images": [],
          "options": [
            "A. $\\max (l,m) + 2$",
            "B. $l + m + 2$",
            "C. $l + m + 3$",
            "D. $\\max (l,m) + 3$"
          ],
          "correct_answer": "A",
          "explanation": "$L =a^lb^m; l \\neq m$ means either $l > m$ or $l < m$ Case I [l > m]: if $l >m ,a^lb^m$ can be written as $\\mathbf{a^{l-m}a^{m}b^{m}} [l-m$ cannot be $0$ as $l$ should be $> m]$ $S \\rightarrow AC $, one step $a^{l-m}$ use $l-m$ steps using productions of $A$ [as $l-m = 1$ , one step $A \\rightarrow a$ $l-m =2$ , two steps $A \\rightarrow aA \\rightarrow aa$ $l-m = 3$ , three steps , $A\\rightarrow aA \\rightarrow aaA \\rightarrow aaa \\ldots$ so on] $a^mb^m$ will be generate in $m + 1$ steps using production $C$ [ as $m = 0$ one step C $\\rightarrow$ $\\epsilon$ $m= 1$ , two steps $C \\rightarrow aCb \\rightarrow ab$ $m= 2$, three steps $C \\rightarrow aCb \\rightarrow aaCbb \\rightarrow aabb \\ldots $ so on ] So if $l>m,$ total steps $= 1+l-m +m+1 = l +2$ Case II [l<m]: Simillarly if $l< m , a^lb^m$ can be written as $\\mathbf{a^{l}b^{l}b^{m-l}}$ [$m-l$ cannot be $0$ as $m$ should be $> l ]$ $S \\rightarrow CB$ one step $a^lb^l$ will be derived using $l+1$ steps $b^{m-l}$ will be derived using $m- l$ steps Total steps $= 1 +l+1+m-l = m +2$ So $L =a^lb^m ;l \\neq m$ will take $\\text{max}(l,m)+2$ steps",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The following program fragment is written in a programming language that allows global variables and does not allow nested declarations of functions. global int i=100, j=5; void P(x) { int i=10; print(x+10); i=200; j=20; print (x); } main() {P(i+j);} If the programming language uses dynamic scoping and call by name parameter passing mechanism, the values printed by the above program are",
          "images": [],
          "options": [
            "A. $115, 220$",
            "B. $25, 220$",
            "C. $25, 15$",
            "D. $115, 105$"
          ],
          "correct_answer": "X",
          "explanation": "Answer: No Option is correct. The answer to this question can be found in Example $6$ below. The \"Call by name\" parameter passing technique is used by imperative languages like Algol $W,$ and is used by several functional languages like Haskell. We'll see how the \"Call by name\" parameter passing technique works (theoretical idea for understanding its working), Not how it is actually implemented(practical implementation). How \"Call by name\" works (Idea of this technique): In general, the effect of pass-by-name is to textually substitute the argument expressions(actual parameters) in a procedure call for the corresponding parameters(formal parameters) in the body of the called procedure.* i.e. Direct Substitution of actual parameters in the place of the formal parameter in the called procedure.* (* means that it is not a complete definition/statement and some technical details are missing and as we go on, we'll fill in these details.) Example 1: What will be the output if the \"Call by name\" parameter passing technique is used. Given Program : void P(x) { print(x+10); print (x); } main() { int j = 10; P(j); } Answer: Since the \"Call by name\" parameter passing technique is used, we can re-write the program as follows: void P(x) { print(j+10); print (j); } main() { int j = 10; P(j); } Hence, output $: 20,10$ NOTE 1 (Technical Detail 1) : It does Not matter which Scoping is used(static or dynamic), once we substitute actual arguments in the place of formal parameters in the called function, for those variables in the actual arguments, environment of caller function will be applicable. Hence, in the above example $1,$ in function $P, j$ refers to the $j$ of the caller function i.e. main function. Example $2$ will illustrate Note $1.$ Example 2: What will be the output if the \"Call by name\" parameter passing technique is used in the case of static and dynamic scoping? global int j=100; void P(x) { print(x+10); print (x); } main() { int j = 10; P(j); } Answer: Since the \"Call by name\" parameter passing technique is used, we can re-write the program as follows: global int j=100; void P(x) { print(j+10); print (j); } main() { int j = 10; P(j); } In case of Dynamic scoping $: 20,10 $ In case of Static scoping $: 20,10 $ Note that in the case of Static scoping, $j$ in function $P$ does not refer to the global variable But $j$ refers to the caller function, more precisely, Once we substitute Actual arguments in the place of formal parameters in the called function, for those variables in the actual arguments, Environment of caller function will be applicable. Hence, $j$ in $P$ will be accessed/updated according to caller function's environment, and since, caller function i.e. main function here, has a local variable $j$, so, this $j$ will be accessed/updated by the function $P.$ Example 3: What will be the output if the \"Call by name\" parameter passing technique is used in the case of static and dynamic scoping? global int j=100; void P(x) { print(x+10); print (x); } main() { P(j); } Answer: Since the \"Call by name\" parameter passing technique is used, we can re-write the program as follows: global int j=100; void P(x) { print(j+10); print (j); } main() { P(j); } In case of Dynamic scoping $: 110,100 $ In case of Static scoping $: 110,100$ Again, once we substitute actual arguments in the place of formal parameters in the called function, for those variables in the actual arguments, environment of caller function will be applicable. Hence, $j$ in $P$ will be accessed/updated according to the caller function's environment and since, caller function i.e., main function here, does not have a local variable $j$, environment of function main for variable $j$ would depend on the scoping used, But this scoping will be seen from the perspective of caller function i.e. function main, not from the perspective of called function i.e. function P. So, it is like accessing variable $j$ in the main function, not in $P$ function. Hence, for this example $3,$ in both scoping, the main function will be using Global variable $j.$ Example 4: What will be the output if \"Call by name\" parameter passing technique is used in the case of static and dynamic scopings? global int j = 100, i = 300; void Q(x) { print(x+10); print (x); } void P(x) { print(x+10); Q(i); print (x); } main() { int i = 500; int j = 10; P(j); } Answer: Since \"Call by name\" parameter passing technique is used, we can re-write the program as follows: global int j = 100, i = 300; void Q(x) { print(i+10); // this i refers to i in the caller function i.e. P function's environment print (i); } // this i refers to i in the caller function i.e. P function's environment void P(x) { print(j+10); // this j refers to j in the caller function i.e. main function's environment Q(i); print (j); // this j refers to j in the caller function i.e. main function's environment } main() { int i = 500; int j = 10; P(j); } In case of Dynamic scoping $: 20,510,500,10$ In case of Static scoping $: 20,310,300,10$ In Static scoping, variable $i$ in $P$ function's environment refers to the global variable $i$. In Dynamic scoping, variable $i$ in $P$ function's environment refers to the main function's $i.$ NOTE 2 (Technical Detail 2) : if any of the local variables in the called procedure clash with the caller's variables, they (called function's clashing variables) must be renamed uniquely before substitution. Example 5: What will be the output if the \"Call by name\" parameter passing technique is used? Given Program : void P(x) { int j=100; print(x+10); print(j); print (x); } main() { int j = 10; P(j); } Answer: Since \"Call by name\" parameter passing technique is used, we can re-write the program as follows: Caller function's actual argument contains variable $j$ which clashes with called function $P$'s local variable $j,$ hence, we rename called function $P$'s local variable $j$ and change it to $j'.$ void P(x) { int j'=100; print(j+10); // this j refers to j in the caller function i.e. main function's environment print(j'); // this j' refers to the local variable j' in P. print (j); // this j refers to j in the caller function i.e. main function's environment } main() { int j = 10; P(j); } Hence, output $: 20,100, 10.$ Coming to the actual GATE question, we'll call it to example $6.$ Example 6: What will be the output if the \"Call by name\" parameter passing technique is used, in the case of static and dynamic scopings? global int i=100, j=5; void P(x) { int i=10; print(x+10); i=200; j=20; print (x); } main() {P(i+j);} Answer: Since the \"Call by name\" parameter passing technique is used, we can re-write the program as follows: Caller function's Actual argument contains variable $i$ which clashes with called function $P$'s local variable $i,$ hence, we rename called function $P$'s local variable $i$ and change it to $i'.$ global int i=100, j=5; void P(x) { int i'=10; // this i' refers to the local variable i' in function P. print(i+j+10); // this i,j refers to i,j in the caller function i.e. main function's environment i'=200; // this i' refers to the local variable i' in function P. j=20; // this j refers to j in the caller function i.e. main function's environment print (i+j); // this i,j refers to i,j in the caller function i.e. main function's environment } main() {P(i+j);} In case of Static scoping $: 115, 120$ In case of Dynamic scoping$: 115, 120$ Note that there are no local variable $i,j$ in the main function, so, when we say that $i,j$ refer to the $i,j$ in the main's environment, we mean that If $i,j$ were accessed/updated in the main function then depending on the scoping, which $i,j$ would they refer. Here, in this question, in both static and dynamic scoping cases, $i,j$ will refer to the Global variables. And in function $P$, in the $4$th statement $(\\text{i.e.}\\; j = 20)$, the Global variable $j$ will be updated. Hence, No Option is correct for the actual above GATE question. Example 7: What will be the output if the \"Call by name\" parameter passing technique is used in the case of static and dynamic scopings? global int j = 100, i = 300; void Q(x) { print(x+10); print (x); } void P(x) { int i = 400; int j = 600; print(x+10); Q(i); Q(j); print (x); } main() { int i =500; Q(i); int j =10; P(j); } Answer : in both scoping, for this question, output $: 510,500,20,410,400,610,600,10.$ Note that When main calls $P(j)$, then Caller function main's Actual argument contains variable $j$ which clashes with called function $P$'s local variable $j,$ hence, we rename called function $P$'s local variable $j$ and change it to $j'.$ So, in function P, the 5th statement becomes $Q(j').$ Also note that when main calls $Q(i)$, then $x$ in $Q$ is replaced with $i.$ When $P$ calls $Q(i),$ then $x$ in $Q$ is replaced with $i.$ When $P$ calls $Q(j')$, then $x$ in $Q$ is replaced with $j'.$ Note that \"Direct Substitution of actual parameters in the place of the formal parameter in the called procedure\" is only the Idea of Call-by-name, Not the actual practical implementation. The compiler does Not do Direct Substitution blindly. Pass-by-name is difficult to implement. Argument expressions must be compiled to special parameter-less procedures called thunks . These thunks are passed into the called procedure and used whenever necessary to evaluate or re-evaluate the argument. But we do not need to go into practical implementation details because the Idea remains the same. Hence, we can solve all the questions using the above idea of call-by-name. NOTE 3 (Technical Detail 3) : if any of the variables in the called procedure clash with the caller's variables, they(called function's clashing variables) must be renamed uniquely before substitution. Clashing variables need not be local variables of the called function. But remember that when we rename a variable, we don't really rename it. We rename it just to eliminate the possibility of confusion. So, when we rename $j $ to $j'$, we must not forget that $j'$ is actually $j$ only in the first place. The following example will illustrate this point : Example 8: What will be the output if the \"Call by name\" parameter passing technique is used in the case of static and dynamic scoping? global int j=100, i = 300; void Q(x) { print(i); print(j); print(x+10); print (x); } void P(x) { int i = 400; int j = 600; print(x+10); Q(i); Q(j); print (x); } main() { int i =500; int j =10; Q(i); P(j); } Answer : In case of Static scoping $: 300, 100, 510, 500, 20, 300, 100, 410, 400, 300, 100, 610, 600, 10$ In case of Dynamic scoping $: 500, 10, 510, 500, 20, 400, 600, 410, 400, 400, 600, 610, 600, 10$ global int j = 100, i = 300; void Q(x) { print(i); // this i refers to the Global i in case of static scoping and in case of dynamic scoping, according to the calling function in the stack. print(j); // this j refers to the Global j in case of static scoping and in case of dynamic scoping, according to the calling function in the stack. print(x+10); // variables that are substituted here, refer to the corresponding variables in the caller function's environment print (x); } // variables that are substituted here, refer to the corresponding variables in the caller function's environment void P(x) { int i = 400; int j = 600; print(x+10); // variables that are substituted here, refer to the corresponding variables in the caller function's environment Q(i); Q(j); print (x); // variables that are substituted here, refer to the corresponding variables in the caller function's environment } main() { int i =500; int j =10; Q(i); P(j); } When main calls $Q(i) ,$ we substitute $i$ in place of $x$ and it(Q) becomes: void Q(x) { print(i′); // This is renamed as i′ and it refers to //global variable i in case of static scoping and //in case of dynamic scoping it refers to //variable i in main function. print(j); print(i+10); print (i); } Hence, the two different $i's$ should be distinguished properly. https://www2.cs.sfu.ca/~cameron/Teaching/383/PassByName.html https://www2.cs.arizona.edu/classes/cs520/spring06/06parameters.pdf",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the CFG with $\\left\\{S, A, B\\right\\}$ as the non-terminal alphabet, $\\{a, b\\}$ as the terminal alphabet, $S$ as the start symbol and the following set of production rules: $S \\rightarrow aB$ $S \\rightarrow bA$ $B \\rightarrow b$ $A \\rightarrow a$ $B \\rightarrow bS$ $A \\rightarrow aS$ $B \\rightarrow aBB$ $A \\rightarrow bAA$ For the string $aabbab$, how many derivation trees are there?",
          "images": [],
          "options": [
            "A. $1$",
            "B. $2$",
            "C. $3$",
            "D. $4$"
          ],
          "correct_answer": "B",
          "explanation": "$S \\rightarrow aB$ $ \\rightarrow aaBB$ $ \\rightarrow aabB$ $ \\rightarrow aabbS$ $ \\rightarrow aabbaB$ $ \\rightarrow aabbab$ $S \\rightarrow aB$ $ \\rightarrow aaBB$ (till now, only $1$ choice possible) $ \\rightarrow aabSB$ $($last time we took $B \\rightarrow b$, now taking $B \\rightarrow bS)$ $ \\rightarrow aabbAB$ $ \\rightarrow aabbaB$ $ \\rightarrow aabbab$ So, totally $2$ possible derivation trees. $B$",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "For the grammar below, a partial $LL(1)$ parsing table is also presented along with the grammar. Entries that need to be filled are indicated as $E1, E2,$ and $E3$. $\\varepsilon$ is the empty string, \\$ indicates end of input, and, $ \\mid $ separates alternate right hand sides of productions. $ S \\rightarrow a A b B \\mid b A a B \\mid \\varepsilon $ $ A \\rightarrow S $ $ B \\rightarrow S $ $$\\begin{array}{|l|l|}\\hline \\text{} & \\textbf{a} & \\textbf{b} & \\textbf{\\$} \\\\\\hline \\text{$S$} & \\text{E1} & \\text{E2} & \\text{$S\\rightarrow \\varepsilon $} \\\\\\hline \\text{$A$} & \\text{$A\\rightarrow S$} & \\text{$A\\rightarrow S$} & \\text{error} \\\\\\hline \\text{$B$} & \\text{$B\\rightarrow S$} & \\text{$B\\rightarrow S$} & \\text{$E3$} \\\\\\hline \\end{array}$$The appropriate entries for $E1, E2,$ and $E3$ are",
          "images": [],
          "options": [
            "A. $ E1 : S \\rightarrow aAbB, A\\rightarrow S$ $ E2 : S \\rightarrow bAaB, B\\rightarrow S $ $ E3 : B \\rightarrow S$",
            "B. $ E1 : S \\rightarrow aAbB, S \\rightarrow \\varepsilon$ $ E2 : S \\rightarrow bAaB, S \\rightarrow \\varepsilon$ $ E3 : S \\rightarrow \\varepsilon$",
            "C. $ E1 : S \\rightarrow aAbB, S \\rightarrow \\varepsilon$ $ E2 : S \\rightarrow bAaB, S \\rightarrow \\varepsilon$ $ E3 : B \\rightarrow S$",
            "D. $ E1 : A \\rightarrow S, S \\rightarrow \\varepsilon$ $ E2 : B \\rightarrow S, S \\rightarrow \\varepsilon$ $ E3 : B \\rightarrow S$"
          ],
          "correct_answer": "C",
          "explanation": "To make $LL(1)$ parsing table first we have to find $\\text{FIRST}$ and $\\text{FOLLOW}$ sets from the given grammar. $\\text{FIRST}(S)=\\{a,b,\\epsilon\\}$ $\\text{FIRST}(A)=\\{a,b,\\epsilon\\}$ $\\text{FIRST}(B)=\\{a,b,\\epsilon\\}$ $\\text{FOLLOW}(S)= \\{a,b,\\$\\}$ $\\text{FOLLOW}(A)= \\{a,b\\}$ $\\text{FOLLOW}(B)= \\{a,b,\\$\\}$ Now lets make $LL(1)$ parse table $$\\begin{array}{|c|l|l|l|}\\hline \\textbf{Non Terminal} & \\textbf{a} & \\textbf{b} & \\textbf{\\$} \\\\\\hline \\text{$S$} & \\text{$S \\rightarrow aAbB$},&\\text{$S \\rightarrow bAbB$},& \\text{$S\\rightarrow \\varepsilon $}\\\\ & \\text{$S \\rightarrow \\epsilon$} & \\text{$S \\rightarrow \\epsilon$} & \\\\\\hline \\text{$A$} & \\text{$A\\rightarrow S$} & \\text{$A\\rightarrow S$} & \\text{} \\\\\\hline \\text{$B$} & \\text{$B\\rightarrow S$} & \\text{$B\\rightarrow S$} & \\text{$B \\rightarrow S$} \\\\\\hline \\end{array}$$ Here is the explanation of entries",
          "year": 2012,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The following code segment is executed on a processor which allows only register operands in its instructions. Each instruction can have atmost two source operands and one destination operand. Assume that all variables are dead after this code segment. c = a + b; d = c * a; e = c + a; x = c * c; if (x > a) { y = a * a; } else { d = d * d; e = e * e; } What is the minimum number of registers needed in the instruction set architecture of the processor to compile this code segment without any spill to memory? Do not apply any optimization other than optimizing register allocation. ed Dec 6, 2024 reply Follow flag 1 1 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. 3",
            "B. 4",
            "C. 5",
            "D. 6"
          ],
          "correct_answer": "B",
          "explanation": "Here, we are told not to do code motion. So, we start with 3 registers c = a + b; //a, c in register d = c * a; //a, c, d in register e = c + a; //a, c, e in register, d spilled. So, now we try with 4 registers c = a + b; //a, c in register d = c * a; //a, c, d in register e = c + a; //a, c, d, e in register x = c * c; //a, x, d, e in register if (x > a) { y = a * a; } else { d = d * d; e = e * e; } No spilling. So, 4 is the minimum number of registers needed for avoiding spilling. (If code motion was allowed, we need only 3 registers for avoiding spilling).",
          "year": 2013,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "What will be the output of the following pseudo-code when parameters are passed by reference and dynamic scoping is assumed? a = 3; void n(x) { x = x * a; print (x); } void m(y) { a = 1 ; a = y - a; n(a); print (a); } void main () { m(a); }",
          "images": [],
          "options": [
            "A. $6,2$",
            "B. $6,6$",
            "C. $4,2$",
            "D. $4,4$"
          ],
          "correct_answer": "D",
          "explanation": "It is a bit confusing as variable declaration is not explicit. But we can see that \"$a=3$\" and \"$a=1$\" are declaring new variables, one in global and other in local space. Main is calling $m(a)$. Since there is no local '$a$', '$a$' here is the global one. In m, we have \"$a = 1$\" which declares a local \"$a$\" and gives $1$ to it. \"$a = y-a$\" assigns $3-1 = 2$ to '$a$'. Now, in $n(x)$, '$a$' is used and as per dynamic scoping this '$a$' comes from '$m()$' and not the global one. So, \"$x=x*a$\" assigns \"$2*2 = 4$\" to \"$x$\" and $4$ is printed. Being passed by reference, \"$a$\" in $m()$ also get updated to $4$. So, D is the answer here.",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following Syntax Directed Translation Scheme $( SDTS )$, with non-terminals $\\{S,A \\}$ and terminals $\\{a,b \\}$. $S \\to aA \\quad \\{\\text{print }1\\}$ $S \\to a \\quad \\{\\text{print }2\\}$ $A \\to Sb \\quad \\{\\text{print }3\\}$ Using the above $SDTS$ , the output printed by a bottom-up parser, for the input $aab$ is:",
          "images": [],
          "options": [
            "A. $1 \\ 3 \\ 2 $",
            "B. $2 \\ 2 \\ 3 $",
            "C. $2 \\ 3 \\ 1 $",
            "D. syntax error"
          ],
          "correct_answer": "C",
          "explanation": "$\\bf{aab}$ could be derived as follows by the bottom up parser: $S \\rightarrow a$$\\color{blue}{\\mathbf A}$ prints $\\color{blue}{1}$ $\\quad \\rightarrow a$$\\color{blue}{\\mathbf S}$$b$ prints $\\color{blue}{3}$ $\\quad \\rightarrow aab$ prints $\\color{blue}{2}$ Now since the bottom-up parser will work in reverse of rightmost derivation, so it will print in bottom-up fashion i.e., $231$ which is option C . Note that this can be easily visualized by drawing the derivation tree.",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The attribute of three arithmetic operators in some programming language are given below. $$\\begin{array}{|c|l|}\\hline \\textbf{OPERATOR} & \\textbf{PRECEDENCE} & \\textbf{ASSOCIATIVITY} & \\textbf{ARITY} \\\\\\hline \\text{$+$} & \\text{High} & \\text{Left} & \\text{Binary} \\\\\\hline \\text{$-$} & \\text{Medium} & \\text{Right} & \\text{Binary} \\\\\\hline \\text{$*$} & \\text{Low} & \\text{Left} & \\text{Binary} \\\\\\hline \\end{array}$$ The value of the expression $2-5+1-7*3$ in this language is ________.",
          "images": [],
          "options": [],
          "correct_answer": "9",
          "explanation": "$2 - 5 + 1 - 7 * 3$ will be evaluated according to the precedence and associativity as given in the question as follows: $((2 - ((5 + 1) - 7)) * 3) \\Rightarrow ((2 - (-1))*3) \\Rightarrow 9$",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following code segment. x = u - t; y = x * v; x = y + w; y = t - z; y = x * y; The minimum number of total variables required to convert the above code segment to static single assignment form is __________.",
          "images": [],
          "options": [],
          "correct_answer": "10",
          "explanation": "In Static Single Assignment when we assign the values, the variables to which the value is being assigned should be unique. $T1 = u - t$ $T2 = T1 \\ast v$ $T3 = T2 +w$ $T4 = t-z$ $T5 = t3 \\ast t4$ So $T1 \\ldots T5 =5 + (u,t,v,w,z)=5$ Total 10 variables. Note: RHS of the operation can use the previously used variables, but LHS in SSA must always be unique.",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A student wrote two context-free grammars G1 and G2 for generating a single C-like array declaration. The dimension of the array is at least one. For example, int a[10] [3]; The grammars use D as the start symbol, and use six terminal symbols int ; id [ ] num. $$\\begin{array}{l|l} \\text{Grammar } \\textbf{G1} & \\text{Grammar } \\textbf{G2} \\\\\\hline \\text{D} \\rightarrow \\textbf{int L;} & \\text{D} \\rightarrow \\textbf{int L;}\\\\ \\text{L} \\rightarrow \\textbf{id [E} & \\text{L} \\rightarrow \\textbf{id E}\\\\ \\text{E} \\rightarrow \\textbf{num ]} & \\text{E} \\rightarrow \\textbf{E [num]}\\\\ \\text{E} \\rightarrow \\textbf{num ] [E} & \\text{E} \\rightarrow \\textbf{[num]}\\\\ \\end{array}$$Which of the grammars correctly generate the declaration mentioned above?",
          "images": [],
          "options": [
            "A. Both G1 and G2",
            "B. Only G1",
            "C. Only G2",
            "D. Neither G1 nor G2"
          ],
          "correct_answer": "A",
          "explanation": "Correct Option: A (Both $G1$ and $G2$)",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which one of the following grammars is free from left recursion?",
          "images": [],
          "options": [
            "A. $S \\rightarrow AB$ $A \\rightarrow Aa \\mid b$ $B \\rightarrow c$",
            "B. $S \\rightarrow Ab \\mid Bb \\mid c$ $A \\rightarrow Bd \\mid \\epsilon$ $B \\rightarrow e$",
            "C. $S \\rightarrow Aa \\mid B$ $A \\rightarrow Bb \\mid Sc \\mid \\epsilon$ $ B \\rightarrow d$",
            "D. $S \\rightarrow Aa \\mid Bb \\mid c$ $A \\rightarrow Bd \\mid \\epsilon$ $B \\rightarrow Ae \\mid \\epsilon$"
          ],
          "correct_answer": "B",
          "explanation": "Option (A) has immediate left recursion.\"$A \\rightarrow Aa$\" Option (C) has indirect left recursion \"$S\\rightarrow Aa \\stackrel{A\\rightarrow Sc}{\\Longrightarrow} Sca$\" Option (D) has indirect left recursion \"$A\\rightarrow Bd \\stackrel{B\\rightarrow Ae}{\\Longrightarrow} Aed$\" Option (B) is free from left recursion. No direct left recursion. No indirect left recursion. Correct Option: B",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Match the following:$$\\begin{array}{|ll|ll|}\\hline \\text{(P)} & \\text{Lexical analysis} & \\text{(i)} & \\text{Leftmost derivation} \\\\\\hline \\text{(Q)} & \\text{Top down parsing} & \\text{(ii)}& \\text{Type checking} \\\\\\hline \\text{(R)}& \\text{Semantic analysis} & \\text{(iii)} & \\text{Regular expressions} \\\\\\hline \\text{(S)} & \\text{Runtime environment} &\\text{(iv)} & \\text{Activation records} \\\\\\hline \\end{array}$$ Related Questions : GATE CSE 2009 | Question: 17 GATE CSE 2015 Set 2 | Question: 19 GATE CSE 1990 | Question: 2-ix GATE CSE 2017 Set 2 | Question: 05 GATE CSE 2024 | Set 2 | Question: 11 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $\\text{P $\\leftrightarrow$ i, Q $\\leftrightarrow$ ii, R $\\leftrightarrow$ iv, S $\\leftrightarrow$ iii}$",
            "B. $\\text{P $\\leftrightarrow$ iii, Q $\\leftrightarrow$ i, R $\\leftrightarrow$ ii, S $\\leftrightarrow$ iv}$",
            "C. $\\text{P $\\leftrightarrow$ ii, Q $\\leftrightarrow$ iii, R $\\leftrightarrow$ i, S $\\leftrightarrow$ iv}$",
            "D. $\\text{P $\\leftrightarrow$ iv, Q $\\leftrightarrow$ i, R $\\leftrightarrow$ ii, S $\\leftrightarrow$ iii}$"
          ],
          "correct_answer": "B",
          "explanation": "Correct Option: B Lexical Analysis phase uses regular expressions. LMD is involved in top down parsing. Type checking is done in semantic analysis phase. Activation records are related to Run Time Environments.",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "In which of the following case(s) is it possible to obtain different results for call-by-reference and call-by-name parameter passing?",
          "images": [],
          "options": [
            "A. Passing an expression as a parameter",
            "B. Passing an array as a parameter",
            "C. Passing a pointer as a parameter",
            "D. Passing as array element as a parameter"
          ],
          "correct_answer": "A;D",
          "explanation": "Answer A, D. A is correct as call-by-name works like a macro and substitution happens only during use time. For example if we pass $2+3$ to the below function int foo(int x) { return x * x; } we get $2+3*2+3$ which will be $11$ due to the higher precedence for $*.$ But, call by reference will return $5*5 = 25.$ (For call by reference, when an expression is passed, a temporary variable is created and passed to the function) D is also correct: Passing an array element as a parameter See the below example: void m(int x,int y){ for(int k = 0;k < 10;k++){ y = 0; x++; } } int main(){ int j; int A[10]; j = 0; m(j,A[j]); return 0; } For the above example if we use 'Call by name' its initialize all the array elements with $0.$ But if we apply ' Call by Reference ' it will only initialize $A[0]$ with $0.$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following grammar G $S \\rightarrow F \\mid H$ $F \\rightarrow p \\mid c$ $H \\rightarrow d \\mid c$ Where $S$, $F$, and $H$ are non-terminal symbols, $p, d$, and $c$ are terminal symbols. Which of the following statement(s) is/are correct? S1: LL(1) can parse all strings that are generated using grammar G S2: LR(1) can parse all strings that are generated using grammar G",
          "images": [],
          "options": [
            "A. Only S1",
            "B. Only S2",
            "C. Both S1 and S2",
            "D. Neither S1 and S2"
          ],
          "correct_answer": "D",
          "explanation": "A parser works on the basis of given grammar. It takes the grammar as it is. Parser does not work on the basis of the yield of the grammar. Also, while constructing the LL(1) parser table, that entry for terminal 'c' will contain multiple entries. So, LL(1) parser cannot be constructed for the given grammar. $S \\rightarrow F | H$ $F \\rightarrow p | c$ $H \\rightarrow d | c$ That $\\{p, d, c\\}$ are the strings generated by the grammar is absolutely correct. But LL(1) and LR(1) can parse these strings successfully only if the grammar is unambiguous and like given below... $S \\rightarrow P | D | C$ $P \\rightarrow p$ $D \\rightarrow d$ $C \\rightarrow c$ Please note the difference between these two grammars. Both derive the same strings, but in different manner. With the grammar given in the question, both top-down and bottom-up parsers will get confused while deriving \"$c$\". Top-down parser will get confused between $F \\rightarrow c$ and $H \\rightarrow c$. Similarly, bottom-up parser will get confused while reducing \"$c$\". This confusion in case of bottom-up parsing is technically termed as \"reduce-reduce\" conflict. While top-down parsing, first(F) and first(H) are not disjoint, so the grammar cannot be LL(1). Therefore, LL(1) parser cannot parse it. Hence, the answer should be option ( D ). Neither S1 nor S2.",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Among simple LR (SLR), canonical LR, and look-ahead LR (LALR), which of the following pairs identify the method that is very easy to implement and the method that is the most powerful, in that order? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. SLR, LALR",
            "B. Canonical LR, LALR",
            "C. SLR, canonical LR",
            "D. LALR, canonical LR"
          ],
          "correct_answer": "C",
          "explanation": "Answer is C . SLR is the simplest to implement and Canonical LR is the most powerful. http://en.wikipedia.org/wiki/LALR_parser_generator",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The least number of temporary variables required to create a three-address code in static single assignment form for the expression $q + r / 3 + s - t * 5 + u * v/w$ is__________________.",
          "images": [],
          "options": [],
          "correct_answer": "8",
          "explanation": "Answer is $8$. In compiler design, static single assignment form (often abbreviated as SSA form or simply SSA ) is a property of an intermediate representation (IR), which requires that each variable is assigned exactly once, and every variable is defined before it is used. Existing variables in the original IR are split into versions , new variables. We will need a temporary variable for storing the result of each binary operation as SSA (Static Single Assignment) implies the variable cannot be repeated on LHS of assignment. $q + r / 3 + s - t * 5 + u * v/w $ $t1 = r/3;$ $t2 = t*5;$ $t3 = u*v;$ $t4 = t3/w;$ $t5 = q + t1;$ $t6 = t5 + s;$ $t7 = t6 - t2;$ $t8 = t7 + t4$ http://web.stanford.edu/class/archive/cs/cs143/cs143.1128/handouts/240%20TAC%20Examples.pdf",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A variable $x$ is said to be live at a statement $s_{i}$ in a program if the following three conditions hold simultaneously: The variables which are live both at the statement in basic block $2$ and at the statement in basic block $3$ of the above control flow graph are $\\text{p, s, u}$ $\\text{r, s, u}$ $\\text{r, u}$ $\\text{q, v}$",
          "images": [
            {
              "index": 1,
              "filename": "8356_img1.jpg"
            }
          ],
          "options": [
            "A. There exists a statement $S_{j}$ that uses $x$",
            "B. There is a path from $S_{i}$ to $S_{j}$ in the flow graph corresponding to the program",
            "C. The path has no intervening assignment to $x$ including at $S_{i}$ and $S_{j}$"
          ],
          "correct_answer": "C",
          "explanation": "r, u. p, and s are assigned to in $1$ and there is no intermediate use of them before that. Hence p, and s are not live in both $2$ and $3$. q is assigned to in 4 and hence is not live in both $2$ and $3$. v is live at $3$ but not at $2$. u is live at $3$ and also at $2$ if we consider a path of length $0$ from $2 - 2$. So, r, u is the answer.",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which one of the following is TRUE at any valid state in shift-reduce parsing?",
          "images": [],
          "options": [
            "A. Viable prefixes appear only at the bottom of the stack and not inside",
            "B. Viable prefixes appear only at the top of the stack and not inside",
            "C. The stack contains only a set of viable prefixes",
            "D. The stack never contains viable prefixes"
          ],
          "correct_answer": "C",
          "explanation": "Answer - C Explanation: A handle is actually the one which is always on the top of the stack. A viable prefix(prefix of the Right-hand side of a production or productions), is actually a prefix of the handle and so can never extend past the right end of the handle(i.e. the top of the stack). The structure of the stack can be considered as a set of viable prefixes - $Stack = \\{Prefix_1 Prefix_2 Prefix_3 \\ldots Prefix_{n-1} Prefix_{n} \\}$ and so it is not wrong to say that the stack contains a set of viable prefixes.",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the intermediate code given below. (1) i=1 (2) j=1 (3) t1 = 5 * i (4) t2 = t1 + j (5) t3 = 4 * t2 (6) t4 = t3 (7) a[t4] = -1 (8) j = j + 1 (9) if j <= 5 goto (3) (10) i = i +1 (11) if i < 5 goto (2) The number of nodes and edges in control-flow-graph constructed for the above code, respectively, are",
          "images": [],
          "options": [
            "A. $5$ and $7$",
            "B. $6$ and $7$",
            "C. $5$ and $5$",
            "D. $7$ and $8$"
          ],
          "correct_answer": "B",
          "explanation": "Answer is $6,7$ if we add an explicit start and end nodes. This follows from the definition of CFG in the below IITM link http://www.cse.iitm.ac.in/~krishna/cs3300/pm-lecture1.pdf But many of the standard books/universities don't follow this definition.",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Match the following:$$\\begin{array}{|ll|ll|}\\hline \\text{P.} & \\text{Lexical analysis} & \\text{1.} & \\text{Graph coloring} \\\\\\hline \\text{Q.} & \\text{Parsing} & \\text{2.}& \\text{DFA minimization} \\\\\\hline \\text{R.}& \\text{Register allocation} & \\text{3.} & \\text{Post-order traversal} \\\\\\hline \\text{S.} & \\text{Expression evaluation} &\\text{4.} & \\text{Production tree} \\\\\\hline \\end{array}$$ Related Questions : GATE CSE 2009 | Question: 17 GATE CSE 2016 Set 2 | Question: 19 GATE CSE 1990 | Question: 2-ix GATE CSE 2017 Set 2 | Question: 05 GATE CSE 2024 | Set 2 | Question: 11 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $\\text{P-2, Q-3, R-1, S-4}$",
            "B. $\\text{P-2, Q-1, R-4, S-3}$",
            "C. $\\text{P-2, Q-4, R-1, S-3}$",
            "D. $\\text{P-2, Q-3, R-4, S-1}$"
          ],
          "correct_answer": "C",
          "explanation": "Regular expression uses FA & Regular Sets. Expression can be evaluated with postfix Traversals. Register allocation can be modeled by graph coloring. The parser constructs a production tree. So, answer is C.",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "For computer based on three-address instruction formats, each address field can be used to specify which of the following: (S1) A memory operand (S2) A processor register (S3) An implied accumulator register ed Dec 14, 2025 reply Follow flag change the tag to addressing mode or atleast add it too along with cd intermediate code 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Either $S1$ or $S2$",
            "B. Either $S2$ or $S3$",
            "C. Only $S2$ and $S3$",
            "D. All of $S1$, $S2$ and $S3$"
          ],
          "correct_answer": "A",
          "explanation": "Three address Instruction Computer with three addresses instruction format can use each address field to specify either processor register or memory operand. e.g., $X = (A + B) * (C + A)$ Equivalent Three address Instructions $$\\begin{array}{ll} \\text{ADD } R1, A, B & ;\\qquad R1 \\leftarrow M [A] + M [B]\\\\ \\text{ADD }R2, C, D & ;\\qquad R2 \\leftarrow M [C] + M [D]\\\\ \\text{MUL } X, R1, R2 & ;\\qquad M [X] \\leftarrow R1 * R2 \\end{array}$$The advantage of the three address formats is that it results in short program when evaluating arithmetic expression. The disadvantage is that the binary-coded instructions require too many bits to specify three addresses. $A$",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "In the context of abstract-syntax-tree (AST) and control-flow-graph (CFG), which one of the following is TRUE?",
          "images": [],
          "options": [
            "A. In both AST and CFG, let node $N_2$ be the successor of node $N_1$. In the input program, the code corresponding to $N_2$ is present after the code corresponding to $N_1$",
            "B. For any input program, neither AST nor CFG will contain a cycle",
            "C. The maximum number of successors of a node in an AST and a CFG depends on the input program",
            "D. Each node in AST and CFG corresponds to at most one statement in the input program"
          ],
          "correct_answer": "C",
          "explanation": "Option ( C ) is Correct is false, In CFG, code of $N_2$ may be present before $N_1$ when there is a loop or Goto. is false, CFG contains a cycle when the input program has a loop. is true, successors in AST and CFG depend on the Input program. is false, In CFG a single node may belong to a block of statements.",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the grammar rule $E \\rightarrow E1 – E2$ for arith­metic expressions. The code generated is targeted to a CPU having a single user register. The sub­traction operation requires the first operand to be in the register. If $E1$ and $E2$ do not have any com­mon sub expression, in order to get the shortest possible code ed Dec 7, 2025 reply Follow flag https://youtu.be/o2CLMvdC4Lo?si=7PZ1_aIZZIoDzWvk . Best answer I found... 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $E1$ should be evaluated first",
            "B. $E2$ should be evaluated first",
            "C. Evaluation of $E1$ and $E2$ should necessarily be interleaved",
            "D. Order of evaluation of $E1$ and $E2$ is of no consequence"
          ],
          "correct_answer": "B",
          "explanation": "$E2$ should be evaluated first After evaluating $E2$ first and then $E1$, we will have $E1$ in the register and thus we can simply do SUB operation with $E2$ which will be in memory (as we have only a single register). If we do $E1$ first and then $E2$, we must move $E2$ to memory and $E1$ back to register before doing SUB, which will increase the code size. for more expalianation see this discussion https://gateoverflow.in/4069/gate-cse-2004-question-10?show=100621#c100621",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider line number $3$ of the following C-program. int main() { /*Line 1 */ int I, N; /*Line 2 */ fro (I=0, I<N, I++); /*Line 3 */ } Identify the compiler’s response about this line while creating the object-module:",
          "images": [],
          "options": [
            "A. No compilation error",
            "B. Only a lexical error",
            "C. Only syntactic errors",
            "D. Both lexical and syntactic errors"
          ],
          "correct_answer": "A",
          "explanation": "C language allows only certain words in it- these are called tokens. If we input any invalid tokens it causes lexical error. eg: $44a44$ causes lexical error as in C as an alphabet cannot come in between digits. Syntactic error is caused by bad combination of tokens. For example, we cannot have a constant on the left hand side of an assignment statement, a for loop must have two expressions inside $()$ separated by semi colon etc. In the given question, line $3$ won't cause a lexical error or syntactic error. The statement will be treated as a function call with three arguments. Function definition being absent will cause link time error, but the question asks only for compile-time errors. So, $(a)$ must be the answer. PS: Implicit function declaration was removed from $C99$ standard onwards. As per current standard, we should not use a function without declaration. Still, we cannot guarantee \"compilation error\"- just expect compiler warnings in C. In C++ this should produce a compilation (semantic) error. The output of compiling the above code using different standards are given below: arjun@linux:~$ gcc -c chk.c chk.c: In function ‘main’: chk.c:3:2: warning: implicit declaration of function ‘fro’ [-Wimplicit-function-declaration] fro (I=0, I<N, I++); /*Line 3 */ ^ arjun@linux:~$ gcc -c -ansi chk.c arjun@linux:~$ gcc -c -std=c99 chk.c chk.c: In function ‘main’: chk.c:3:2: warning: implicit declaration of function ‘fro’ [-Wimplicit-function-declaration] fro (I=0, I<N, I++); /*Line 3 */ ^ arjun@linux:~$ gcc -c -std=c11 chk.c chk.c: In function ‘main’: chk.c:3:2: warning: implicit declaration of function ‘fro’ [-Wimplicit-function-declaration] fro (I=0, I<N, I++); /*Line 3 */ http://stackoverflow.com/questions/15570553/lexical-and-semantic-errors-in-c",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The correct matching for the following pairs is $$\\begin{array}{|ll|ll|} \\hline \\text{(A)}&\\text{Activation record} & \\text{(1)} &\\text{Linking loader} \\\\\\hline \\text{(B)} &\\text{Location counter} & \\text{(2)} &\\text{Garbage collection} \\\\\\hline \\text{(C)}& \\text{Reference counts} & \\text{(3)} &\\text{Subroutine call} \\\\\\hline \\text{(D)}& \\text{Address relocation} & \\text{(4)}& \\text{Assembler} \\\\\\hline \\end{array}$$ 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $\\text{A-3 B-4 C-1 D-2}$",
            "B. $\\text{A-4 B-3 C-1 D-2}$",
            "C. $\\text{A-4 B-3 C-2 D-1}$",
            "D. $\\text{A-3 B-4 C-2 D-1}$"
          ],
          "correct_answer": "D",
          "explanation": "(D) Option Each time a sub routine is called, its activation record is created. An assembler uses location counter value to give address to each instruction which is needed for relative addressing as well as for jump labels. Reference count is used by garbage collector to clear the memory whose reference count becomes $0$. Linker Loader is a loader which can load several compiled codes and link them together into a single executable. Thus it needs to do relocation of the object codes.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following macros can put a macro assembler into an infinite loop? (ii) only (i) only both (i) and (ii) None of the above",
          "images": [],
          "options": [
            "A. .MACRO M1, X .IF EQ, X ;if X=0 then M1 X + 1 .ENDC .IF NE, X ;if X ≠ O then .WORD X ;address (X) is stored here .ENDC .ENDM",
            "B. .MACRO M2, X .IF EQ, X M2 X .ENDC .IF NE, X .WORD X + 1 .ENDC .ENDM"
          ],
          "correct_answer": "A",
          "explanation": "If $M2$ macro is called with $X=0$, then the macro assembler will go into an infinite loop. For $M1$ the argument is incremented for the recursive call and so the macro expansion will happen maximum $2$ times. Hence, correct option: A .",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The grammar whose productions are $\\langle\\text{stmt}\\rangle \\to\\text{ if id then } \\langle\\text{stmt}\\rangle$ $\\langle\\text{stmt}\\rangle\\to\\text{ if id then } \\langle\\text{stmt}\\rangle\\text{ else } \\langle\\text{stmt}\\rangle$ $\\langle\\text{stmt}\\rangle \\to\\text{ id }:=\\text{ id}$ is ambiguous because (a) the sentence if a then if b then c:= d has more than two parse trees (b) the left most and right most derivations of the sentence if a then if b then c:= d give rise to different parse trees (c) the sentence if a then if b then c:= d else c:= f has more than two parse trees (d) the sentence if a then if b then c:= d else c:= f has two parse trees See all 3 Comments 3 3 Comments reply Satbir commented Aug 24, 2019 reply Follow flag https://gateoverflow.in/86869/gate1990-16a 1 1 reply Share svas7246 commented Nov 15, 2021 reply Follow flag The key word more than two parse trees plays a major rule 1 1 reply Share Pm1508 commented Dec 3, 2024 reply Follow flag Dangling-else ambiguity The dangling else problem in syntactic ambiguity. It occurs when we use nested if . When there are multiple “if” statements, the “else” part doesn’t get a clear view with which “ if ” it should combine. For example: if (condition) { } if (condition 1) { } if (condition 2) { } else { } In the above example, there are multiple “ ifs” with multiple conditions and here we want to pair the outermost if with the else part. But the else part doesn’t get a clear view with which “ if” condition it should pair. This leads to inappropriate results in programming. The Problem of Dangling-else: Dangling else can lead to serious problems. It can lead to wrong interpretations by the compiler and ultimately lead to wrong results. For example: Initialize k=0 and o=0 if(ch>=3) if(ch<=10) k++; else o++; In this case, we don’t know when the variable “ o ” will get incremented. Either the first “ if ” condition might not get satisfied or the second “ if ” condition might not get satisfied. Even the first “ if ” condition gets satisfied, the second “ if” condition might fail which can lead to the execution of the “ else” part. Thus it leads to wrong results. To solve the issue the programming languages like C, C++, Java combine the “ else” part with the innermost “ if” statement. But sometimes we want the outermost “ if” statement to get combined with the “ else” part. Resolving Dangling-else Problem The first way is to design non-ambiguous programming languages. Secondly , we can resolve the dangling-else problems in programming languages by using braces and indentation. For example: if (condition) { if (condition 1) { if (condition 2) {} } } else { } In the above example, we are using braces and indentation so as to avoid confusion. Third , we can also use the “if – else if – else” format so as to specifically indicate which “ else” belongs to which “ if” . For example : if(condition) { } else if(condition-1) { } else if(condition-2){ } else{ } 1 1 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "D",
          "explanation": "(d) the sentence if a then if b then c: = d else c:= f has two parse trees as follows: if a then (if b then c:= d) else c:= f if a then (if b then c:=d else c:= f) $$\\begin{align*} \\pmb{\\text{Ambiguity - “dangling else\"}} \\end{align*}$$ stmt -> if expr then stmt | if expr then stmt else stmt | other stmts $$\\mathtt{\\text{if $E_1$ then if $E_2$ then $S_1$ else $S_2$ }}$$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The pass numbers for each of the following activities respectively are $1, 2, 1, 2$ $2, 1, 2, 1$ $2, 1, 1, 2$ $1, 2, 2, 2$ Related Questions : GATE CSE 1992 | Question: 03,ii",
          "images": [],
          "options": [
            "A. object code generation",
            "B. literals added to literal table",
            "C. listing printed",
            "D. address resolution of local symbols that occur in a two pass assembler"
          ],
          "correct_answer": "B",
          "explanation": "Correct Option: B T he functions performed in pass $1$ and pass $2$ in $2$ pass assembler are Pass $1$ Assign addresses to all statements in the program. Save the values assigned to all labels for use in pass $2$ Perform some processing of assembler directives. Pass $2$ Assemble instructions. Generate data values defined by BYTE, WORD etc. Perform processing of assembler directives not done during pass $1$. Write the program and the assembling listing",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A shift reduce parser carries out the actions specified within braces immediately after reducing with the corresponding rule of grammar $S \\rightarrow xxW \\;\\text{{print“1\"}}$ $S \\rightarrow y \\;\\text{{print“2\"}}$ $W \\rightarrow Sz\\; \\text{{print“3\"}}$ What is the translation of $xxxxyzz$ using the syntax directed translation scheme described by the above rules?",
          "images": [],
          "options": [
            "A. $23131$",
            "B. $11233$",
            "C. $11231$",
            "D. $33211$"
          ],
          "correct_answer": "A",
          "explanation": "Making a tree and performing post-order traversal will yield an answer as A. $S \\rightarrow xx W\\; (\\text{print }“1”)$ $W \\rightarrow S z\\; (\\text{print }“3”)$ $S \\rightarrow x x W\\; (\\text{print }“1”)$ $W \\rightarrow S z\\; (\\text{print }“3”)$ $S \\rightarrow y\\; (\\text{print }“2”)$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "What is the value of $X$ printed by the following program? program COMPUTE (input, output); var X:integer; procedure FIND (X:real); begin X:=sqrt(X); end; begin X:=2 FIND(X); writeln(X); end. 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $2$",
            "B. $\\sqrt{2}$",
            "C. Run time error",
            "D. None of the above"
          ],
          "correct_answer": "A",
          "explanation": "Answer should be A . As per call by value concept. $X$ in the procedure FIND is a local variable and so no change will be reflected in the global var $X$.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A linker is given object modules for a set of programs that were compiled separately. What information need not be included in an object module? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Object code",
            "B. Relocation bits",
            "C. Names and locations of all external symbols defined in the object module",
            "D. Absolute addresses of internal symbols"
          ],
          "correct_answer": "C",
          "explanation": "is trivially there is an object module. must be there if we need to have relocation capability. For linker to link external symbols (for example in C, to link an extern variable in one module to a global variable in another module), it must know the location of all external symbols. In C external symbols includes all global variables and function names. is no way needed.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "What are $x$ and $y$ in the following macro definition? macro Add x, y Load y Mul x Store y end macro See all 3 Comments 3 3 Comments reply rishi71662data4 commented Nov 26, 2017 reply Follow flag formal parameter — the identifier used in a method to stand for the value that is passed into the method by a caller. For example, amount is a formal parameter of processDeposit actual parameter — the actual value that is passed into the method by a caller. For example, the 200 used when processDeposit is called is an actual parameter. actual parameters are often called arguments An identifier is a name used for a class, a variable, a method, or a parameter Source of informtion 7 7 reply Share smsubham commented Dec 24, 2019 reply Follow flag If you are wondring what amount and processDeposit mentioned above is. Here is the code class CheckingAccount { . . . . private int balance; . . . . public void processDeposit( int amount ) { balance = balance + amount ; } } class CheckingAccountTester { public static void main( String[] args ) { CheckingAccount bobsAccount = new CheckingAccount( \"999\", \"Bob\", 100 ); bobsAccount. processDeposit( 200 ) ; . . . . . . } } Source: https://chortle.ccsu.edu/Java5/Notes/chap34A/ch34A_2.html 0 0 reply Share theredeepakb commented Dec 4, 2021 reply Follow flag This type of question is in syllabus 2022? 1 1 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Variables",
            "B. Identifiers",
            "C. Actual parameters",
            "D. Formal parameters"
          ],
          "correct_answer": "D",
          "explanation": "ans is D formal parameter — the identifier used in a method to stand for the value that is passed into the method by a caller. For example, amount is a formal parameter of calculate actual parameter — the actual value that is passed into the method by a caller. For example, the 800 used when calculate is called is an actual parameter. actual parameters are often called arguments float calculate (float amount) { return amount * 1.2; } int main() { ... float final = calculate(800); ... }",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider a grammar with the following productions $S \\rightarrow a \\alpha b \\mid b \\alpha c \\mid aB$ $S \\rightarrow \\alpha S\\mid b$ $S \\rightarrow \\alpha b b\\mid ab$ $S \\alpha \\rightarrow bd b\\mid b$ The above grammar is:",
          "images": [],
          "options": [
            "A. Context free",
            "B. Regular",
            "C. Context sensitive",
            "D. $LR(k)$"
          ],
          "correct_answer": "X",
          "explanation": "$S\\alpha \\to$ This violates the condition of context-free grammar that the $\\text{LHS}$ must be a single non-terminal symbol. $S\\alpha \\to b$ This violates even the weaker requirement for CSG that the length of $\\text{RHS}$ of a production must be at least same as that of $\\text{LHS}$. So, the grammar is not even context-sensitive. Ref: https://stackoverflow.com/questions/8236422/context-free-grammars-versus-context-sensitive-grammars",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "State whether the following statements are True or False with reasons for your answer A subroutine cannot always be used to replace a macro in an assembly language program.",
          "images": [],
          "options": [],
          "correct_answer": "1",
          "explanation": "$\\textsf{TRUE}.$ A macro is evaluated at compile time whereas a function call happens at runtime. So, we can write a macro to rename any symbol which is not possible to be replaced by a simple subroutine call. For example consider the following $C$ code. #define type int type foo (type arg1) { ... } #undef type In the above code a macro is used to define a type which is used as the return and argument types for the function $\\textsf{foo}.$ This is not possible to be implemented as a simple subroutine call (but can be done using $\\textsf{typedef}$ is the language supports it).",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "State whether the following statements are True or False with reasons for your answer: Coroutine is just another name for a subroutine. See all 2 Comments 2 2 Comments reply vishalshrm539 commented Sep 18, 2018 i yield 1; yield 2; yield 3; } print foo(); print foo(); print foo(); Prints: 1 2 3 Note: Coroutines may use a return, and behave just like a subroutine coroutine foo { return 1; return 2; //Dead code return 3; } print foo(); print foo(); print foo(); Prints: 1 1 1 Source - Stack Overflow 8 8 reply Share pavansan commented Nov 16, 2024 reply Follow flag now i am getting confusion so both are nsot same? 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [],
          "correct_answer": "1",
          "explanation": "True. The subroutine is a special case of a co-routine. A co-routine is a generalized form of a subroutine which is non-preemptive multitasking. https://en.wikipedia.org/wiki/Coroutine",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following features cannot be captured by context-free grammars? Related Questions : GATE CSE 2008 | Question: 51 GATE CSE 2002 | Question: 2.18",
          "images": [],
          "options": [
            "A. Syntax of if-then-else statements",
            "B. Syntax of recursive procedures",
            "C. Whether a variable has been declared before its use",
            "D. Variable names of arbitrary length"
          ],
          "correct_answer": "C",
          "explanation": "Correct Option: C Since CFG's are used to show syntactic rules while designing compiler, and syntactic rules don't check for meaningful things such as if a variable has been declared before its use or not. Such things are meant to be handled by Semantic Analysis phase (requires power of a context sensitive grammar). For D, a regular expression does not restrict the string length. Languages have restriction for variable name length for storing purpose like in symbol table. For A, Syntax of if-then-else statements can be represented in CFG in unambigous manner .",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Generation of intermediate code based on an abstract machine model is useful in compilers because",
          "images": [],
          "options": [
            "A. it makes implementation of lexical analysis and syntax analysis easier",
            "B. syntax-directed translations can be written for intermediate code generation",
            "C. it enhances the portability of the front end of the compiler",
            "D. it is not possible to generate code for real machines directly from high level language programs"
          ],
          "correct_answer": "C",
          "explanation": "C. stating the actual use of the Intermediate Code. Also optimizations can be done on intermediate code enhancing the portability of the optimizer.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The grammar $ S \\to aSa \\mid bS \\mid c$ is",
          "images": [],
          "options": [
            "A. LL(1) but not LR(1)",
            "B. LR(1) but not LL(1)",
            "C. Both LL(1) and LR(1)",
            "D. Neither LL(1) nor LR(1)"
          ],
          "correct_answer": "C",
          "explanation": "The $\\textsf{LL(1)}$ parsing table for the given grammar is: $\\begin{array}{|c|c|c|} \\hline & a&b&c \\\\ \\hline S& S\\to aSa & S\\to b & S \\to c \\\\ \\hline \\end{array}$ For any given input symbol $a,b$ or $c,$ the parser has a unique move from the start and the only state – so no conflicts. As there is no conflict in $\\text{LL(1)}$ parsing table, the given grammar is $\\textsf{LL(1)}$ and since every $\\textsf{LL(1)}$ is also $\\textsf{LR(1)},$ the given grammar is $\\textsf{LL(1)}$ as well as $\\textsf{LR(1)}.$",
          "year": 2010,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The program below uses six temporary variables $a, b, c, d, e, f$. a = 1 b = 10 c = 20 d = a + b e = c + d f = c + e b = c + e e = b + f d = 5 + e return d + f Assuming that all operations take their operands from registers, what is the minimum number of registers needed to execute this program without spilling? ed Oct 29, 2025 i",
          "images": [],
          "options": [
            "A. $2$",
            "B. $3$",
            "C. $4$",
            "D. $6$"
          ],
          "correct_answer": "B",
          "explanation": "Here in these types of compiler questions, idea is \"map/assign multiple temporaries to one registers.\" here $a, b,$ and $c$ all are having $3$ different values so i need atleast $3$ registers $r1$, $r2$ and $r3$. $a$ is mapped to $r1$, $b$ to $r2$ and $c$ to $r3$. $d = a + b$, after this line if u notice '$a$' is never present on right hand side, so I can map (register of $a$ which is $r1$ ) $d$ to $r1$. $e = c + d$, after this line '$d$' is never present on rhs, so I can map (register of $d$ which is $r1$ ) $e$ to $r1$. at this time mapping is $r1 --- e$ $r2 --- b$ $r3 --- c$ (at this moment I have registers for $e, b$ and $c$. if I introduce new variable then I may need different register) now at this point if u see $f = c + e$ $b = c + e$ these two are essentially doing same thing, after these two line '$b$' and '$f$' are same so I can skip computing '$f$'. and whereever $f$ is present I will replace it with '$b$'. (because neither of '$f$' and '$b$' are changing after these two lines, so value of these will be '$c+e$' forever) (seems like I introduced one more variable $f$, and register is needed for that, but actually I did not really introduce '$f$'. I am skipping computation of '$f$') now at second last line \"$d = 5 + e$\" here I introduced '$d$', I can map it to any of the register $r1$ or $r3$, because after this line neither of '$e$' or '$c$' is required. (value of '$b$' is required because I need to return '$d+f$', and '$f$' is essentially equal to '$b$') finally code becomes $r1 = 1$ $r2 = 10$ $r3 = 20$ $r1 = r1 + r2$ $r1 = r3 + r1$ (skipping '$f$' computation) $r2 = r3 + r1$ $r2 = r3 + r1$ $r1 = r2 + r2$ $r3 = 5 + r1$ return $r3 + r2$ Therefore minimum $3$ registers needed. $B$",
          "year": 2010,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A part of the system software which under all circumstances must reside in the main memory is:",
          "images": [],
          "options": [
            "A. text editor",
            "B. assembler",
            "C. linker",
            "D. loader",
            "E. none of the above"
          ],
          "correct_answer": "D",
          "explanation": "Answer: D The loader is a program that loads the object program from the secondary memory into the main memory for execution of the program. The loader resides in the main memory.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A simple two-pass assembler does the following in the first pass:",
          "images": [],
          "options": [
            "A. It allocates space for the literals.",
            "B. It computes the total length of the program.",
            "C. It builds the symbol table for the symbols and their values.",
            "D. It generates code for all the load and store register instructions.",
            "E. None of the above."
          ],
          "correct_answer": "A;B;C",
          "explanation": "A, B, C are TRUE. https://gateoverflow.in/?qa=blob&qa_blobid=2337905098612945492",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The expression $( a * b) * c \\; op \\dots$ where ‘op’ is one of ‘$+$’, ‘$*$’ and ‘$\\uparrow$’ (exponentiation) can be evaluated on a CPU with single register without storing the value of ($a * b$) if ed Nov 1, 2019 reply Follow flag +11votes answered Nov 3, 2017 by Shatadru RC (257 points) Let say, the expression is one of the below: (a*b)*c+d (a*b)*c*d (a*b)*c^d In any case, brackets has the highest priority always. So I have to compute brackets first. Now, for + and *, I can do the rest of the operation and save results in the same register. But for exponentiation, I have to store the result of a*b, then do the computation of c^d, then multiply these two results. So option A is correct 5 5 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $\\text{‘op’}$ is ‘$+$’ or ‘$*$’",
            "B. $\\text{‘op’}$ is ‘$\\uparrow$’ or ‘$*$’",
            "C. $\\text{‘op’}$ is ‘$\\uparrow$’ or ‘$+$’",
            "D. not possible to evaluate without storing"
          ],
          "correct_answer": "A",
          "explanation": "Correct Option: A $\\uparrow$ has higer precedence than $\\{*,+,-,/ \\}$ So, if op $ = \\uparrow$ implies, we need to evaluate the right hand side of $\\uparrow$ first and then do the lhs part, which would definitely require us to store the value of lhs but if its a '$+$' or '$*$' , we don't need to store the values evaluated, and on the go can do the operation directly on one register.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Heap allocation is required for languages. ed Oct 13, 2018 reply Follow flag same question",
          "images": [],
          "options": [
            "A. that support recursion",
            "B. that support dynamic data structure",
            "C. that use dynamic scope rules",
            "D. None of the above"
          ],
          "correct_answer": "B",
          "explanation": "Memory is taken from heap for dynamic allocation. So, option ( B ) is correct.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The conditional expansion facility of macro processor is provided to",
          "images": [],
          "options": [
            "A. test a condition during the execution of the expanded program",
            "B. to expand certain model statements depending upon the value of a condition during the execution of the expanded program",
            "C. to implement recursion",
            "D. to expand certain model statements depending upon the value of a condition during the process of macro expansion"
          ],
          "correct_answer": "D",
          "explanation": "Macro is expanded during the process of macro expansion. Hence, be (d).",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A language $L$ allows declaration of arrays whose sizes are not known during compilation. It is required to make efficient use of memory. Which one of the following is true? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. A compiler using static memory allocation can be written for $L$",
            "B. A compiler cannot be written for $L$; an interpreter must be used",
            "C. A compiler using dynamic memory allocation can be written for $L$",
            "D. None of the above"
          ],
          "correct_answer": "C",
          "explanation": "C . Using dynamic memory allocation, memory will be allocated to array at runtime.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "In the following grammar $X ::= X \\oplus Y \\mid Y$ $Y::= Z * Y \\mid Z$ $Z::= id $ Which of the following is true?",
          "images": [],
          "options": [
            "A. $\\text{‘}\\oplus\\text{’}$ is left associative while $\\text{‘}*\\text{’}$ is right associative",
            "B. Both $\\text{‘}\\oplus\\text{’}$ and $\\text{‘}*\\text{’}$ are left associative",
            "C. $\\text{‘}\\oplus\\text{’}$ is right associative while $\\text{‘}*\\text{’}$ is left associative",
            "D. None of the above"
          ],
          "correct_answer": "A",
          "explanation": "It will be A. For multiple '$\\oplus$', the derivation is possible only via '$X$' which is on left side of '$\\oplus$' in the production. Hence it is left associative. For multiple '$*$', the derivation is possible only via '$Y$' which is on the right side of '$*$' in the production. Hence it is right associative. If both left and right derivations were possible, the grammar would have been ambiguous and we couldn't have given associativity.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which languages necessarily need heap allocation in the runtime environment?",
          "images": [],
          "options": [
            "A. Those that support recursion.",
            "B. Those that use dynamic scoping.",
            "C. Those that allow dynamic data structure.",
            "D. Those that use global variables."
          ],
          "correct_answer": "C",
          "explanation": "Those that allow dynamic data structure. malloc etc uses memory from heap area.",
          "year": 2010,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which data structure in a compiler is used for managing information about variables and their attributes?",
          "images": [],
          "options": [
            "A. Abstract syntax tree",
            "B. Symbol table",
            "C. Semantic stack",
            "D. Parse table"
          ],
          "correct_answer": "B",
          "explanation": "$(B)$ Symbol table is the answer. It can be implemented by using an array, hash table, tree and even some time with the help of the Iinked list!",
          "year": 2010,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "For the grammar below, a partial $LL(1)$ parsing table is also presented along with the grammar. Entries that need to be filled are indicated as $E1, E2,$ and $E3$. $\\varepsilon$ is the empty string, \\$ indicates end of input, and, $\\mid$ separates alternate right hand sides of productions. $ S\\rightarrow a A b B \\mid b A a B \\mid \\varepsilon $ $ A\\rightarrow S $ $ B\\rightarrow S $ $$\\begin{array}{|l|l|}\\hline \\text{} & \\textbf{a} & \\textbf{b} & \\textbf{\\$} \\\\\\hline \\text{$S$} & \\text{E1} & \\text{E2} & \\text{$S\\rightarrow \\varepsilon $} \\\\\\hline \\text{$A$} & \\text{$A\\rightarrow S$} & \\text{$A\\rightarrow S$} & \\text{error} \\\\\\hline \\text{$B$} & \\text{$B\\rightarrow S$} & \\text{$B\\rightarrow S$} & \\text{$E3$} \\\\\\hline \\end{array}$$ The FIRST and FOLLOW sets for the non-terminals $A$ and $B$ are",
          "images": [],
          "options": [
            "A. $ \\text{FIRST}(A) = \\{a, b, \\varepsilon\\} =\\text{FIRST}(B) $ $ \\text{FOLLOW}(A) = \\{a, b\\} $ $ \\text{FOLLOW}(B) = \\{a, b, \\$\\} $",
            "B. $ \\text{FIRST}(A) = \\{a, b, \\$\\} $ $ \\text{FIRST}(B) = \\{a, b, \\varepsilon\\} $ $ \\text{FOLLOW}(A) = \\{a, b\\} $ $ \\text{FOLLOW}(B) = \\{\\$\\} $",
            "C. $ \\text{FIRST}(A) = \\{a, b, \\varepsilon\\} =\\text{FIRST}(B) $ $ \\text{FOLLOW}(A) =\\{a, b\\} $ $ \\text{FOLLOW}(B) = \\varnothing $",
            "D. $ \\text{FIRST}(A) = \\{a, b\\} = \\text{FIRST}(B) $ $ \\text{FOLLOW}(A) = \\{a, b\\} $ $ \\text{FOLLOW}(B) =\\{a, b\\} $"
          ],
          "correct_answer": "A",
          "explanation": "$\\text{First}(S) = \\text{First}(A) = \\text{First}(B) = \\{a,b,\\epsilon\\}$ $\\text{Follow}(A) = \\{a,b\\}$ $\\text{Follow}(B) = \\text{Follow}(S) = \\{a,b,\\$\\}$ So, the answer to question 52 is option A.",
          "year": 2012,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider evaluating the following expression tree on a machine with load-store architecture in which memory can be accessed only through load and store instructions. The variables $a, b, c, d,$ and $e$ are initially stored in memory. The binary operators used in this expression tree can be evaluated by the machine only when operands are in registers. The instructions produce result only in a register. If no intermediate results can be stored in memory, what is the minimum number of registers needed to evaluate this expression? ed Jan 16 reply Follow flag @Sherlock_Holmes put leaf nodes = 1 do recursively till you reach root of the tree if $m==n$: then $root$ = ($m+1) or (n+1)$ if $m \\ne n$: then $root$ = $max(m,n$ value of root of the tree is the min no. of registers required w/o spilling 1 1 reply Share Please log in or register to add a comment.",
          "images": [
            {
              "index": 1,
              "filename": "2138_img1.jpg"
            }
          ],
          "options": [
            "A. $2$",
            "B. $9$",
            "C. $5$",
            "D. $3$"
          ],
          "correct_answer": "D",
          "explanation": "Given is Load Store Architecture, that means we can access memory using Load and Store Instructions. Key Idea:- Pick new register only when it is required. We want to add c and d , and initially both are in memory, therefore copy these into registers. load $R1, c$ $(R1 \\leftarrow c)$ load $R2, d$ $(R2 \\leftarrow d)$ (here no compensation can be done, we need two registers) add $R1, R1, R2 \\ ( R1 \\leftarrow R1 + R2)$ (at this point $R1$ is holding $\\mathbf{c+d}$ and $R2$ is holding $\\mathbf{d}$, i.e. $R1 \\leftarrow \\mathbf{c+d}$ and $R2 \\leftarrow \\mathbf{d})$ Now, $\\mathbf{e}$ comes into picture and my question is, Can i make use of $R1$ or $R2$ to store $\\mathbf{e}$? I can not use R1 to store e as its value will be needed later but I can use R2. load $R2, e$ (currently $R1 \\leftarrow \\mathbf{c+d}$ and $R2 \\leftarrow \\mathbf{e})$ Sub $R1, R2, R1$ $(R1 \\leftarrow R2 - R1)$ Doing this all gives, final value of right sub-tree is stored in $R1$, and $R2$ stores $\\mathbf{e}$. Now, coming to left subtree, to perform \"$a-b$\" we need to copy both variables in registers. We can copy one of the variable in $R2$, but we can not obviously copy in $R1$ as value of $R1$ will be required later. Load $R2, a$ Load $R3, b$ ( here comes extra register, and we can not avoid using it .) Current mapping is $R2 \\leftarrow a$, $R3 \\leftarrow b$ and $R1$ contains final value of Right subtree. SUB $R2, R2, R3 (R2 \\leftarrow R2 - R3)$ ADD $R1, R1 , R2$ Hence answer is $3$ i.e. D",
          "year": 2011,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider two binary operators $\\text{‘} \\uparrow \\text{’}$ and $\\text{‘} \\downarrow \\text{’}$ with the precedence of operator $\\downarrow$ being lower than that of the operator $\\uparrow$. Operator $\\uparrow$ is right associative while operator $\\downarrow$ is left associative. Which one of the following represents the parse tree for expression $(7 \\downarrow 3 \\uparrow 4 \\uparrow 3 \\downarrow 2)$",
          "images": [
            {
              "index": 1,
              "filename": "2129_img1.png"
            },
            {
              "index": 2,
              "filename": "2129_img2.png"
            },
            {
              "index": 3,
              "filename": "2129_img3.png"
            },
            {
              "index": 4,
              "filename": "2129_img4.png"
            }
          ],
          "options": [],
          "correct_answer": "B",
          "explanation": "Answer is B. To make the parse tree start compiling the identifiers into blocks based on associativity and precedence. Grouping : $(7 \\downarrow (3 \\uparrow(4 \\uparrow 3))) \\downarrow2 $ Tree can be made by opening inner braces and move towards braces.",
          "year": 2011,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The lexical analysis for a modern computer language such as Java needs the power of which one of the following machine models in a necessary and sufficient sense?",
          "images": [],
          "options": [
            "A. Finite state automata",
            "B. Deterministic pushdown automata",
            "C. Non-deterministic pushdown automata",
            "D. Turing machine"
          ],
          "correct_answer": "A",
          "explanation": "Answer - A In compiler lexical analyzer categorizes character sequence into lexemes and produces tokens as output for parser. And tokens are expressed in regular expressions so a simple Finite Automata is sufficient for it.",
          "year": 2011,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "In a compiler, keywords of a language are recognized during Related Questions : GATE CSE 1987 | Question: 1-xi",
          "images": [],
          "options": [
            "A. parsing of the program",
            "B. the code generation",
            "C. the lexical analysis of the program",
            "D. dataflow analysis"
          ],
          "correct_answer": "C",
          "explanation": "Typically, the lexical analysis phase of compilation breaks the input text up into sequences of lexemes that each belongs to some particular token type that's useful in later analysis. Consequently, keywords are usually first recognized during lexical analysis in order to make parsing easier. Since parsers tend to be implemented by writing context-free grammars of tokens rather than of lexemes (that is, the category of the lexeme rather than the contents of the lexeme), it is significantly easier to build a parser when keywords are marked during lexing. Any identifier is also a token so it is recognized in lexical Analysis . Hence, option C is True. ref@ http://stackoverflow.com/questions/5202709/phases-of-a-compiler",
          "year": 2011,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the basic block given below. a = b + c c = a + d d = b + c e = d - b a = e + b The minimum number of nodes and edges present in the DAG representation of the above basic block respectively are",
          "images": [],
          "options": [
            "A. $6$ and $6$",
            "B. $8$ and $10$",
            "C. $9$ and $12$",
            "D. $4$ and $4$"
          ],
          "correct_answer": "A",
          "explanation": "A normal DAG construction will give $8$ nodes and $10$ edges as shown below. Since, this question asks for minimum possible, we can assume algebraic simplification is allowed. So, $d = b + c, e = d - b$; can be simplified to $d = b + c$; $e = c$; Similarly, $e = d - b$; $a = e + b$; can be simplified to $a = d$. This gives the following DAG with $6$ nodes and $6$ edges. Reference: https://cs.nyu.edu/~gottlieb/courses/2000s/2006-07-fall/compilers/lectures/lecture-14.html $A$",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following statements are CORRECT? $1$ and $2$ only $2$ and $3$ only $3$ and $4$ only $1$ and $3$ only",
          "images": [],
          "options": [
            "A. Static allocation of all data areas by a compiler makes it impossible to implement recursion.",
            "B. Automatic garbage collection is essential to implement recursion.",
            "C. Dynamic allocation of activation records is essential to implement recursion.",
            "D. Both heap and stack are essential to implement recursion."
          ],
          "correct_answer": "D",
          "explanation": "It will be D . option $2$ is wrong because it is not necessary to have automatic garbage collection to implement recursion. option $4$ is wrong because it says that both are required to implement recursion, which is wrong. Either of them will suffice.",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "One of the purposes of using intermediate code in compilers is to ed Dec 17, 2019 reply Follow flag @Rhythm Nope. Register Allocation is part of Code Generation. 2 2 reply Share gopal_gate commented Jun 8, 2025 reply Follow flag Register allocation is machine-dependent since registers reside in the CPU, while intermediate code remains independent of both machine and source programs. Therefore, option D is incorrect. 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. make parsing and semantic analysis simpler.",
            "B. improve error recovery and error reporting.",
            "C. increase the chances of reusing the machine-independent code optimizer in other compilers.",
            "D. improve the register allocation."
          ],
          "correct_answer": "C",
          "explanation": "C. that is the actual use of intermediate code generator in a compiler.",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The minimum number of arithmetic operations required to evaluate the polynomial $P(X) = X^5+4X^3+6X+5$ for a given value of $X$, using only one temporary variable is ______.",
          "images": [],
          "options": [],
          "correct_answer": "7",
          "explanation": "$P(X) = x^5 + 4x^3 + 6x + 5$ $=x(x^4 + 4x^2 + 6) +5$ $=x( x ( x^3 + 4x) + 6) + 5$ $=x( x ( x (x^2 + 4)) + 6) + 5$ $=x( x ( x (x(x) + 4)) + 6) + 5$ mul = pair of brackets $4$ add = num of signs $3$ total $7$",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the expression tree shown. Each leaf represents a numerical value, which can either be $0$ or $1$. Over all possible choices of the values at the leaves, the maximum possible value of the expression represented by the tree is ___.",
          "images": [
            {
              "index": 1,
              "filename": "1999_img1.jpg"
            }
          ],
          "options": [],
          "correct_answer": "6",
          "explanation": "$A = B + C$ For $A$ to be maximum, both $B$ and $C$ should be maximum $B = D - E$ For $B$ to be maximum, $D$ should be maximum and $E$ should be minimum $C = F + G$ For $C$ to be maximum, both $F$ and $G$ should be maximum The maximum value of $D$ is $2\\;( 1 + 1 = 2 )$ The minimum value of $E$ is $-1 \\;( 0 - 1 = -1 )$ The maximum value of $F$ is $1 \\;( 1 - 0 = 1 )$ The maximum value of $G$ is $2 \\;( 1 + 1 = 2 )$ $B = 2 - ( -1 ) = 2 + 1 = 3$ $C = 1 + 2 = 3$ $A = B + C = 3 + 3 = 6$ $6$ is the answer",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "For a C program accessing $\\mathbf{X[i] [j] [k]}$, the following intermediate code is generated by a compiler. Assume that the size of an integer is $32$ bits and the size of a character is $8$ bits. t0 = i ∗ 1024 t1 = j ∗ 32 t2 = k ∗ 4 t3 = t1 + t0 t4 = t3 + t2 t5 = X[t4] Which one of the following statements about the source code for the C program is CORRECT?",
          "images": [],
          "options": [
            "A. $\\mathbf{X}$ is declared as \"int $\\mathbf{X[32] [32] [8]}$ ” .",
            "B. $\\mathbf{X}$ is declared as \"int $\\mathbf{X[4] [1024] [32]}$ ” .",
            "C. $\\mathbf{X}$ is declared as \"char $\\mathbf{X[4] [32] [8]}$ ” .",
            "D. $\\mathbf{X}$ is declared as \"char $\\mathbf{X[32] [16] [2]}$ ” ."
          ],
          "correct_answer": "A",
          "explanation": "$k$ is multiplied by $4$, means sizeof(dataype) is int. $j$ is multiplied by $32$, means the inner most dimension of array is $32/4 = 8$ (we have to divide by the size of the inner dimension- which here is a simple integer) $i$ is multiplied by $1024$, means the second dimension of array is $1024/32 = 32$ ($32 = 8*4$ is the size of the inner dimension here) So, ( A ) is correct. The first dimension is not needed for code generation and that is why in C language while passing an array to a function, we can omit the value of the first dimension but not any others. We can also do as follows: $X[i][j][k] = *(*(*(X + i) + j) + k)$ In Integer arithmetic, this equals $*(*(*(X + i * sizeof(*X) ) + j * sizeof(**X) + k * sizeof(***X) )$ as for every add to a pointer we have to multiply the size of the pointed value (to get a valid address) So, from the given code we get $sizeof(***X) = 4, -$ int $sizeof(**X) = 32 -$ int array of size $8$ $sizeof(*X) = 1024 - 2$ $D$ int array of size $[32]$ havinf size of inner $1D$ array $32$. So, the inner dimensions must be $32$ and $8$ and type must be integer. So, only option A matches.",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which one of the following is NOT performed during compilation? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Dynamic memory allocation",
            "B. Type checking",
            "C. Symbol table management",
            "D. Inline expansion"
          ],
          "correct_answer": "A",
          "explanation": "Dynamic means- at runtime. Dynamic memory allocation happens during the execution time and hence ( A ) is the answer.",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the grammar defined by the following production rules, with two operators $∗$ and $+$ $S\\:\\to\\:T∗P$ $T\\:\\to\\:U\\mid T∗U$ $P\\:\\to\\:Q+P\\mid Q$ $Q\\:\\to Id$ $U\\:\\to Id$ Which one of the following is TRUE?",
          "images": [],
          "options": [
            "A. $ +$ is left associative, while $∗$ is right associative",
            "B. $ +$ is right associative, while $∗$ is left associative",
            "C. Both $+$ and $∗$ are right associative",
            "D. Both $+$ and $∗$ are left associative"
          ],
          "correct_answer": "B",
          "explanation": "$P \\rightarrow Q+P$ here $P$ is to right of $+$ So, $+$ is right associative Similarly, for $T \\rightarrow T *U$ $*$ is left associative as $T$ is to left of $*$ So, answer is B",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which one of the following grammars generates the language $ L=\\left \\{ a^{i}b^{j}\\mid i\\neq j \\right \\}$?",
          "images": [],
          "options": [
            "A. $S\\rightarrow AC\\mid CB$ $C\\rightarrow aCb\\mid a\\mid b$ $A\\rightarrow aA\\mid \\varepsilon$ $B\\rightarrow Bb\\mid \\varepsilon$",
            "B. $S\\rightarrow aS\\mid Sb \\mid a\\mid b$",
            "C. $S\\rightarrow AC\\mid CB$ $C\\rightarrow aCb\\mid \\varepsilon$ $A\\rightarrow aA\\mid \\varepsilon$ $B\\rightarrow Bb\\mid \\varepsilon$",
            "D. $S\\rightarrow AC\\mid CB$ $C\\rightarrow aCb\\mid \\varepsilon$ $A\\rightarrow aA\\mid a$ $B\\rightarrow Bb\\mid b$"
          ],
          "correct_answer": "D",
          "explanation": "Lets consider options one by one. Option A $C\\Rightarrow a$ or, $C \\Rightarrow b $ or, $C \\Rightarrow aCb \\Rightarrow aaCbb \\Rightarrow aaaCbbb \\ldots $ so on and at last we have to put either $C\\rightarrow a$ or $C\\rightarrow b$ So production starting with $C$ is used to derive $a^{n+1}b^{n}$ or $a^{n}b^{n+1} ; n \\geq 0$ $S\\rightarrow AC [Aa^nb^{n+1}]$ can make $a^{n+1}b^{n+1}$ as a single $a$ can be derived from $A [A \\Rightarrow aA \\Rightarrow a$ as $A\\rightarrow \\varepsilon$], similarly $S\\rightarrow CB$ In a simple way, $ab$ can be derived from grammar as $S\\Rightarrow AC \\Rightarrow aAC \\Rightarrow aC\\Rightarrow ab$ option A is wrong Option B Corresponding language is $a^{+}b^{\\ast}$ or $a^{\\ast}b^{+},$ and $ab$ can be derived as $S\\Rightarrow aS \\Rightarrow ab$ option B is wrong Option C $C \\Rightarrow \\varepsilon$ or $C \\Rightarrow aCb \\Rightarrow aaCbb \\Rightarrow aaaCbbb \\ldots$ so on and at last need to put $C \\rightarrow \\varepsilon$ Production $C$ will generate $a^{n}b^{n} ; n \\geq 0$ $S\\rightarrow AC$ can generate $a^{n}b^{n}$ as $A$ can be $\\epsilon,$ similarly $S \\rightarrow CB$ option C is wrong Option D . Production $C$ is used to generate $a^{n}b^{n}$ as in option $C$ $S\\rightarrow AC$ will increase no of $a$'s before $a^{n}b^{n}$ as $A$ will generate $a$ or $aa$ or $aaa \\ldots i,e., a^+,$ so $S\\rightarrow AC$ will generate $a^{+}a^{n}b^{n} , i.e., a^{i}b^{j} ; i>j$ $S \\rightarrow CB$ will generate $a^{n}b^{n}b^{+}\\; i.e., a^{i}b^{j} ; i<j$ option D is right .",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following C code segment. for (i = 0, i < n; i++) { for (j = 0; j < n; j++) { if (i%2) { x += (4*j + 5*i); y += (7 + 4*j); } } } Which one of the following is false? Related Questions : ISRO-DEC2017-67",
          "images": [],
          "options": [
            "A. The code contains loop invariant computation",
            "B. There is scope of common sub-expression elimination in this code",
            "C. There is scope of strength reduction in this code",
            "D. There is scope of dead code elimination in this code"
          ],
          "correct_answer": "D",
          "explanation": "4 * j is used at two places- so common subexpression elimination is possible $\\text{i%2}$ is loop invariant for the inner loop $5*i$ is also loop invariant for inner loop $\\text{x += 5 * i}$ can be replaced by $\\text{x += p;}$ $\\text{p += 5;}$ ($p$ must be initialized to $0$ before the loop). Thus replacing $*$ with $+$ gives strength reduction. The code does not contain unreachable or dead code. because all statements inside the loops are reachable during the execution of the loops. So, only $(D)$ is false here.",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following translation scheme. $ S\\rightarrow ER$ $ R\\rightarrow *E\\left \\{ \\text{print}(\\text{‘}*\\text{’}); \\right \\} R\\mid \\varepsilon $ $ E\\rightarrow F+E\\left \\{ \\text{print}(\\text{‘}+\\text{’}); \\right \\}\\mid F $ $ F\\rightarrow (S)\\mid id \\left \\{ \\text{print}(id.value); \\right \\} $ Here $id$ is a token that represents an integer and $id.value$ represents the corresponding integer value. For an input $\\text{‘}2 * 3 + 4\\text{’},$ this translation scheme prints",
          "images": [],
          "options": [
            "A. $2 * 3 + 4$",
            "B. $2 * +3 \\ 4$",
            "C. $2 \\ 3 * 4 +$",
            "D. $2 \\ 3 \\ 4+*$"
          ],
          "correct_answer": "D",
          "explanation": "Correct Option: D Make a tree and perform post order evaluation.",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following grammar: $S\\rightarrow FR$ $ R\\rightarrow * S\\mid \\varepsilon $ $ F\\rightarrow id $ In the predictive parser table $M$ of the grammar the entries $M[S,id]$ and $M[R,\\$]$ respectively are 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $ \\left \\{ S\\rightarrow FR \\right \\} $ and $ \\left \\{ R\\rightarrow \\varepsilon \\right \\} $",
            "B. $ \\left \\{ S\\rightarrow FR \\right \\} $ and $ \\left \\{ \\right \\} $",
            "C. $ \\left \\{ S\\rightarrow FR \\right \\} $ and $ \\left \\{ R\\rightarrow {*}S\\right \\} $",
            "D. $ \\left \\{ F\\rightarrow id \\right \\} $ and $ \\left \\{ R\\rightarrow \\varepsilon \\right \\} $"
          ],
          "correct_answer": "A",
          "explanation": "First $S = \\{ id \\}$ Follow $R = \\{ \\$ \\}$ so $M[S,id] = S \\rightarrow FR$ $M[R,\\$] = R \\rightarrow \\epsilon$ So ans is A",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider these two functions and two statements S1 and S2 about them. int work1(int *a, int i, int j) { int x = a[i+2]; a[j] = x+1; return a[i+2] - 3; } int work2(int *a, int i, int j) { int t1 = i+2; int t2 = a[t1]; a[j] = t2+1; return t2 - 3; } S1: The transformation form work1 to work2 is valid, i.e., for any program state and input arguments, work2 will compute the same output and have the same effect on program state as work1 S2: All the transformations applied to work1 to get work2 will always improve the performance (i.e reduce CPU time) of work2 compared to work1",
          "images": [],
          "options": [
            "A. S1 is false and S2 is false",
            "B. S1 is false and S2 is true",
            "C. S1 is true and S2 is false",
            "D. S1 is true and S2 is true"
          ],
          "correct_answer": "A",
          "explanation": "Consider an array a = 1 2 3 4 5 and condition i + 2 =j. Lets take i =0 and j =2 for this example. Work 1, x = a[0+2] = 3 a[2] = 3 + 1 = 4; which means a = 1 2 4 4 5 return a[0+2] - 3 = 4 -3 = 1 Work 2 t1 = 0 + 2 = 2 t2 = a[2] = 3 a[2] = 3 + 1 = 4, which means a = 1 2 4 4 5 again return t2 - 3 = 3 -3 =0 Hence S1 is false when i + 2 =j. S2 will also be false, since we cant explicitly say the performance of work2 will always be better than work1. Hence answer is A",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A canonical set of items is given below $S \\to L .> R $ $Q \\to R.$ On input symbol $<$ the set has",
          "images": [],
          "options": [
            "A. a shift-reduce conflict and a reduce-reduce conflict.",
            "B. a shift-reduce conflict but not a reduce-reduce conflict.",
            "C. a reduce-reduce conflict but not a shift-reduce conflict.",
            "D. neither a shift-reduce nor a reduce-reduce conflict."
          ],
          "correct_answer": "D",
          "explanation": "The question is",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which one of the following is FALSE ?",
          "images": [],
          "options": [
            "A. A basic block is a sequence of instructions where control enters the sequence at the beginning and exits at the end.",
            "B. Available expression analysis can be used for common subexpression elimination.",
            "C. Live variable analysis can be used for dead code elimination.",
            "D. $x=4*5 \\Rightarrow x=20$ is an example of common subexpression elimination."
          ],
          "correct_answer": "D",
          "explanation": "A basic block is a sequence of instructions where control enters the sequence at the beginning and exits at the end, which is TRUE. Available expression analysis can be used for common subexpression elimination is TRUE. Available expressions is an analysis algorithm that determines for each point in the program the set of expressions that need not be recomputed. Available expression analysis is used to do global common subexpression elimination (CSE). If an expression is available at a point, there is no need to re-evaluate it. Live variable analysis can be used for dead code elimination is TRUE. $x = 4 ∗ 5 \\Rightarrow x = 20$ is an example of common subexpression elimination is FALSE. Common subexpression elimination (CSE) refers to compiler optimization replaces identical expressions (i.e., they all evaluate to the same value) with a single variable holding the computed value when it is worthwhile to do so Source: Geeksforgeeks $D$",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the program given below, in a block-structured pseudo-language with lexical scoping and nesting of procedures permitted. Program main; Var ... Procedure A1; Var ... Call A2; End A1 Procedure A2; Var ... Procedure A21; Var ... Call A1; End A21 Call A21; End A2 Call A1; End main. Consider the calling chain$: \\text{Main} \\rightarrow \\text{A1} \\rightarrow \\text{A2} \\rightarrow \\text{A21}\\rightarrow \\text{A1}$ The correct set of activation records along with their access links is given by:",
          "images": [
            {
              "index": 1,
              "filename": "1758_img1.jpg"
            }
          ],
          "options": [],
          "correct_answer": "D",
          "explanation": "Activation record: Access link: to access non-local data The calling chain$: \\text{Main} \\rightarrow \\text{A1} \\rightarrow \\text{A2} \\rightarrow \\text{A21}\\rightarrow \\text{A1}$ PROCEDURE non-local data present A1 outside procedure A1 body i.e. in main procedure So, A1---> main A2 outside procedure A2 body i.e. in main procedure So, A2---> main A21 outside procedure A21 body i.e. in A2 procedure So, A21---> A2 $$\\begin{array}{c|c}\\hline \\textbf{PROCEDURE} & \\textbf{non-local data present} \\\\\\hline \\text{A1} & \\text{outside procedure A1 body i.e. in main procedure} \\\\ & \\text{So, A1} \\rightarrow \\text{main} \\\\\\hline \\text{A2} & \\text{outside procedure A2 body i.e. in main procedure} \\\\ & \\text{So, A2} \\rightarrow \\text{main} \\\\\\hline \\text{A21} & \\text{outside procedure A21 body i.e. in A2 procedure} \\\\ & \\text{So, A21} \\rightarrow \\text{A2} \\\\\\hline \\end{array}$$ https://www.youtube.com/watch?v=mMK-TlvH5c4&t=1093s @18:00",
          "year": 2012,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Faster access to non-local variables is achieved using an array of pointers to activation records called a",
          "images": [],
          "options": [
            "A. stack",
            "B. heap",
            "C. display",
            "D. activation tree"
          ],
          "correct_answer": "C",
          "explanation": "Correct Option: C Properties of displays Use a pointer array to store the activation records along the static chain. Fast access for non-local but may be complicated to maintain. Calling a subprogram in the same level – simply replace and restore. Calling a subprogram in the higher level – add an entry and may need to save the old pointers. Calling a subprogram in the lower level – shrink the pointer and restore it when the subprogram returns. http://users.dickinson.edu/~wahlst/356/ch10.pdf",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A linker reads four modules whose lengths are $200, 800, 600$ and $500$ words, respectively. If they are loaded in that order, what are the relocation constants? 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $0, 200, 500, 600$",
            "B. $0, 200, 1000, 1600$",
            "C. $200, 500, 600, 800$",
            "D. $200, 700, 1300, 2100$"
          ],
          "correct_answer": "B",
          "explanation": "answer - B first module loaded starting at address $0$. Size is $200$. hence it will occupy first $200$ address (last address being $199$). Second module will be present from $200$ and so on.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Type checking is normally done during 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. lexical analysis",
            "B. syntax analysis",
            "C. syntax directed translation",
            "D. code optimization"
          ],
          "correct_answer": "C",
          "explanation": "The answer is c . The use of syntax analyser is used to create parse Tree. But along with Grammar as input to Syntax Analyser we add even semantic rules which form the basis of Syntax Directed Translation That help us in Evaluation of Expression .Remember that Syntax Directed Translation is used in following cases Conversion of infix to Postfix Calculation of infix expression For creating a Acyclic graph Type Checking Conversion of Binary number to Decimal Counting the numbers of bits (0 or 1 ) in a binary number Creation of syntax tree To generate Intermediate code Storing the data into Symbol table",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following statements is true? 🚩 Edit necessary | 👮 Umesh Shelke | 💬 “Option D required edit \"Canonical CR\" Should be => \"Canonical LR\"”",
          "images": [],
          "options": [
            "A. SLR parser is more powerful than LALR",
            "B. LALR parser is more powerful than Canonical LR parser",
            "C. Canonical LR parser is more powerful than LALR parser",
            "D. The parsers SLR, Canonical CR, and LALR have the same power"
          ],
          "correct_answer": "C",
          "explanation": "$\\text{SLR}$ parser is more powerful than $\\text{LALR}$ . False . $\\text{LALR}$ parser is more powerful than $\\text{Canonical LR}$ parser . False . $\\text{Canonical LR}$ parser is more powerful than $\\text{LALR}$ parser. True. The parsers $\\text{SLR, Canonical CR,}$ and $\\text{LALR}$ have the same power. False. $C$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "In a resident – OS computer, which of the following systems must reside in the main memory under all situations?",
          "images": [],
          "options": [
            "A. Assembler",
            "B. Linker",
            "C. Loader",
            "D. Compiler"
          ],
          "correct_answer": "C",
          "explanation": "(C ) is answer. In many operating systems the loader is permanently resident in memory, although some operating systems that support virtual memory may allow the loader to be located in a region of memory that is pageable . Reference: Loader",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The following code segment is executed on a processor which allows only register operands in its instructions. Each instruction can have atmost two source operands and one destination operand. Assume that all variables are dead after this code segment. c = a + b; d = c * a; e = c + a; x = c * c; if (x > a) { y = a * a; } else { d = d * d; e = e * e; } Q.48 Suppose the instruction set architecture of the processor has only two registers. The only allowed compiler optimization is code motion, which moves statements from one place to another while preserving correctness. What is the minimum number of spills to memory in the compiled code?",
          "images": [],
          "options": [
            "A. 0",
            "B. 1",
            "C. 2",
            "D. 3"
          ],
          "correct_answer": "B",
          "explanation": "We can do code motion as follows: c = a + b; //a and b in register and b replaced by the result c after the instruction x = c * c; //x replaces c in register and c is spilled (moved to memory) if (x > a) { //x and a in registers y = a * a; d = c * a; //spilled c taken from memory and replaces x in register. e = c + a; } else { d = c * a; //spilled c taken from memory and replaces x in register. d replaces a in register d = d * d; //c and d in register e = c + a; //a taken from memory and e replaces c in register (a taken from memory is not a spill, it is a fill. The reason is a is not modified till this point.) e = e * e; } So, we need minimum 1 spill in the compiled code. https://en.wikipedia.org/wiki/Register_allocation",
          "year": 2013,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following two sets of $\\textsf{LR(1)}$ items of an $\\textsf{LR(1)}$ grammar.$$\\begin{array}{l|l} X \\rightarrow c.X, c∕d &X → c.X, \\$\\\\ X \\rightarrow .cX, c∕ d& X → .cX, \\$\\\\ X \\rightarrow .d, c∕ d & X → .d, \\$ \\end{array}$$Which of the following statements related to merging of the two sets in the corresponding $\\textsf{LALR}$ parser is/are FALSE ? $1$ only $2$ only $1$ and $4$ only $\\text{1, 2, 3}$ and $4$",
          "images": [],
          "options": [
            "A. Cannot be merged since look aheads are different.",
            "B. Can be merged but will result in $\\textsf{S-R}$ conflict.",
            "C. Can be merged but will result in $\\textsf{R-R}$ conflict.",
            "D. Cannot be merged since $\\textsf{goto}$ on $c$ will lead to two different sets."
          ],
          "correct_answer": "D",
          "explanation": "The TRUE statements are about merging of two states for $\\textsf{LALR(1)}$ parser from $\\textsf{LR(1)}$ parser. The given two states can be merged because kernel of these are same, look aheads don't matter in merging. The two states do not contain shift reduce conflict, so after merging the merged states cannot contain any $\\textsf{S-R}$ conflict. There is no final item in both states, so no $\\textsf{R-R}$ conflict. Merging of states does not depend on further $\\textsf{GOTO}$ part on any terminal. Therefore, all the given statements in question are FALSE. Option ( D ) is correct.",
          "year": 2013,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A grammar that is both left and right recursive for a non-terminal, is",
          "images": [],
          "options": [
            "A. Ambiguous",
            "B. Unambiguous",
            "C. Information is not sufficient to decide whether it is ambiguous or unambiguous",
            "D. None of the above"
          ],
          "correct_answer": "C",
          "explanation": "Let grammar be like this : $S \\rightarrow a$ $A \\rightarrow AbA$ This grammar is left as well as right recursive but still unambiguous. A is a useless production but still part of grammar.. A grammar having both left as well as right recursion may or may not be ambiguous. Let's take a grammar say $S\\rightarrow SS$ Now, according to the link https://en.wikipedia.org/wiki/Formal_grammar For a grammar G, if we have L(G) then all the strings/sentences in this language can be produced after some finite number of steps . But, for the grammar $$S\\rightarrow SS$$ Can we produce any string after a finite number of steps? NO, and hence the language of this grammar is empty set {} . Hence, If a grammar is having both left and right recursion, then grammar may or may not be ambiguous. $C$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following is the most powerful parsing method?",
          "images": [],
          "options": [
            "A. LL (1)",
            "B. Canonical LR",
            "C. SLR",
            "D. LALR"
          ],
          "correct_answer": "B",
          "explanation": "$\\text{Canonical LR}$ is most powerful parsing method. $LR > LALR > SLR$ So, ans is $B$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "What is the maximum number of reduce moves that can be taken by a bottom-up parser for a grammar with no epsilon and unit-production (i.e., of type $A \\rightarrow \\epsilon$ and $A \\rightarrow a$) to parse a string with $n$ tokens?",
          "images": [],
          "options": [
            "A. $n/2$",
            "B. $n-1$",
            "C. $2n-1$",
            "D. $2^{n}$"
          ],
          "correct_answer": "B",
          "explanation": "Ans will be B $A \\rightarrow BC$ $B \\rightarrow aa$ $C \\rightarrow bb$ Now suppose string is $aabb.$ Then $A \\rightarrow BC$ (reduction $3$) $\\quad \\rightarrow aaC$ (reduction $2$) $\\quad \\rightarrow aabb$ (reduction $1$) $n = 4$ and number of reductions is $3.$ So, $n-1$",
          "year": 2013,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Statement for Linked Answer Questions 83a & 83b: Consider the following expression grammar. The semantic rules for expression evaluation are stated next to each grammar production. $$\\begin{array}{l|l} E\\rightarrow number & E.val = {number.val} \\\\\\qquad \\mid \\ E \\ \\ ‘+\\text{'} \\ E & E^{(1)}.val = E^{(2)}.val + E^{(3)}.val \\\\\\qquad \\mid \\ E \\ \\ ‘\\times\\text{'} \\ E & E^{(1)}.val = E^{(2)}.val \\times E^{(3)}.val \\end{array}$$ The above grammar and the semantic rules are fed to a yaac tool (which is an LALR(1) parser generator) for parsing and evaluating arithmetic expressions. Which one of the following is true about the action of yaac for the given grammar?",
          "images": [],
          "options": [
            "A. It detects recursion and eliminates recursion",
            "B. It detects reduce-reduce conflict, and resolves",
            "C. It detects shift-reduce conflict, and resolves the conflict in favor of a shift over a reduce action",
            "D. It detects shift-reduce conflict, and resolves the conflict in favor of a reduce over a shift action"
          ],
          "correct_answer": "C",
          "explanation": "Given grammar: $\\begin{align*} &E \\rightarrow \\text{num} \\\\ &E \\rightarrow E + E\\mid E*E \\\\ \\end{align*}$ First $LR(1) \\text{ item}:E^{\\prime} \\rightarrow \\bullet E \\ \\text{,} \\$ $ $\\textbf{YACC default action on SR: Choose SHIFT action}$ While parsing $3*2+1,$ at some point of time stack content $ :\\begin{array}{|c|} \\hline 1\\\\+\\\\ 2\\\\ *\\\\3\\\\ \\hline\\end{array}$ Then reduce handles one by one to generate output $=9.$ num does not create any conflict. Additionally here no states differ by lookahead symbols only. $\\Rightarrow$ $\\text{LALR(1) and LR(1)}$ tables are same. $LR(1)$ table only for state0 and state1: So total $2+2 = 4$ SR conflict originated in two states of the DFA. Shift-reduce conflict: Yacc’s default action in the case of a shift-reduce conflict is to choose the shift action. Reduce-reduce conflict : Yacc’s default action in the case of a reduce-reduce conflict is to reduce using the production that comes first, textually, in the input grammar specification. and LEX-YACC-gcc output after implementing the given grammar : As we can see from the output reduction on $E \\rightarrow \\text{num}$ is carried out as soon as top of stack contains a num. So, no conflict related to $E \\rightarrow num$. one example : Because of YACC shift preference, even if $3*2$ ($E*E$) handle found on top of the stack at some point of time, it will shift on reading $+$ instead of reducing with $E\\rightarrow E * E$. In this way, the complete input will be pushed into the stack. After that only reduce work starts as shown below. Equal precedence because of the given grammar $E\\rightarrow E+E \\ | \\ E*E$ , (single level) and Right associativity : How YACC handles conflicts Here are the required files ( calc.l and calc.y ) to regenerate the above interpreter. $C$",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the grammar: $$S \\rightarrow (S) \\mid a$$ Let the number of states in SLR (1), LR(1) and LALR(1) parsers for the grammar be $n_1, n_2$ and $n_3$ respectively. The following relationship holds good:",
          "images": [],
          "options": [
            "A. $n_1 < n_2 < n_3$",
            "B. $n_1 = n_3 < n_2$",
            "C. $n_1 = n_2 = n_3$",
            "D. $n_1 \\geq n_3 \\geq n_2$"
          ],
          "correct_answer": "B",
          "explanation": "ans B Both in SLR(1) and LALR(1), states are the LR(0) items (LALR uses LR(1) items to form the states but then merges the ones having same items and different lookaheads) while in LR(1) the states are LR(1) set of items. Number of LR(0) items can never be greater than number of LR(1) items. So, $n_1 = n_3 \\leq n_2$, B choice. If we construct the states for the grammar we can replace $\\leq$ with $<$. Reference: https://gatecse.in/lr-parsing-part-4-slr-clr-lalr-and-summary/",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the grammar: $$E \\rightarrow E + n \\mid E \\times n \\mid n$$ For a sentence $n + n \\times n$, the handles in the right-sentential form of the reduction are:",
          "images": [],
          "options": [
            "A. $n, E + n$ and $E + n \\times n$",
            "B. $n, E + n$ and $E + E \\times n$",
            "C. $n, n + n$ and $n + n \\times n$",
            "D. $n, E + n$ and $E \\times n$"
          ],
          "correct_answer": "D",
          "explanation": "$\\color{red}{n}$$+n*n$ $\\color{red}{E+n}$$*n$ $\\color{red}{E*n}$ $E$ String in $\\color{red}{\\text{RED}}$ indicates handle here So, answer is D",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The grammar $A \\rightarrow AA \\mid (A) \\mid \\epsilon$ is not suitable for predictive-parsing because the grammar is:",
          "images": [],
          "options": [
            "A. ambiguous",
            "B. left-recursive",
            "C. right-recursive",
            "D. an operator-grammar"
          ],
          "correct_answer": "A",
          "explanation": "both A and B can be answers but A is a better answer. Because we have standard procedure for removing left-recursion but ambiguity is not easy to remove. - checking if a given CFG is ambiguous is a undecidable problem.",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following statements are TRUE? I and II I and IV III and IV I, III and IV",
          "images": [],
          "options": [
            "A. There exist parsing algorithms for some programming languages whose complexities are less than $\\Theta(n^3)$",
            "B. A programming language which allows recursion can be implemented with static storage allocation.",
            "C. No L-attributed definition can be evaluated in the framework of bottom-up parsing.",
            "D. Code improving transformations can be performed at both source language and intermediate code level."
          ],
          "correct_answer": "B",
          "explanation": "Answer is B . Yes there does exist parsing algorithms (e.g. CYK algorithm) which run in $\\Theta(n^3)$. It cannot be implemented with static storage allocation. It needs dynamic memory allocation. Every S-attributed definition is also an L-attributed definition and can be evaluated in the framework of bottom up parsing. True.",
          "year": 2009,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Match all items in Group 1 with the correct options from those given in Group 2.$$\\begin{array}{|ll|ll|}\\hline \\rlap{\\textbf{Group 1}} & & \\rlap{\\textbf{Group 2}} \\\\\\hline \\text{P.} & \\text{Regular Expression} & \\text{1.} & \\text{Syntax analysis} \\\\\\hline \\text{Q.} & \\text{Pushdown automata} & \\text{2.}& \\text{Code generation} \\\\\\hline \\text{R.}& \\text{Dataflow analysis} & \\text{3.} & \\text{Lexical analysis} \\\\\\hline \\text{S.} & \\text{Register allocation} &\\text{4.} & \\text{Code optimization} \\\\\\hline \\end{array}$$ Related Questions : GATE CSE 2015 Set 2 | Question: 19 GATE CSE 2016 Set 2 | Question: 19 GATE CSE 1990 | Question: 2-ix GATE CSE 2017 Set 2 | Question: 05 GATE CSE 2024 | Set 2 | Question: 11 ed Jan 21, 2025 reply Follow flag Generally they need to specify in the question itself. For this question, by matching other options, we would left with only one choice. 0 0 reply Share Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. $\\text{P-4, Q-1, R-2, S-3}$",
            "B. $\\text{P-3, Q-1, R-4, S-2}$",
            "C. $\\text{P-3, Q-4, R-1, S-2}$",
            "D. $\\text{P-2, Q-1, R-4, S-3}$"
          ],
          "correct_answer": "B",
          "explanation": "Correct Option: B Regular expressions are used in lexical analysis. Pushdown automata is related to context free grammar which is related to syntax analysis. Dataflow analysis is done in code optimization. Register allocation is done in code generation.",
          "year": 2009,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the CFG with $\\left\\{S, A, B\\right\\}$ as the non-terminal alphabet, $\\{a, b\\}$ as the terminal alphabet, $S$ as the start symbol and the following set of production rules: $S \\rightarrow aB$ $S \\rightarrow bA$ $B \\rightarrow b$ $A \\rightarrow a$ $B \\rightarrow bS$ $A \\rightarrow aS$ $B \\rightarrow aBB$ $A \\rightarrow bAA$ Which of the following strings is generated by the grammar?",
          "images": [],
          "options": [
            "A. $aaaabb$",
            "B. $aabbbb$",
            "C. $aabbab$",
            "D. $abbbba$"
          ],
          "correct_answer": "C",
          "explanation": "$S \\rightarrow aB$ $ \\rightarrow aaBB$ $ \\rightarrow aabB$ $ \\rightarrow aabbS$ $ \\rightarrow aabbaB$ $ \\rightarrow aabbab$ $C$",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following two statements: P: Every regular grammar is LL(1) Q: Every regular set has a LR(1) grammar Which of the following is TRUE ?",
          "images": [],
          "options": [
            "A. Both P and Q are true",
            "B. P is true and Q is false",
            "C. P is false and Q is true",
            "D. Both P and Q are false"
          ],
          "correct_answer": "C",
          "explanation": "Answer: option C LL Grammar: Grammars which can be parsed by an LL parser. LL parser: Parses the input from L eft to right, and constructs a L eftmost derivation of the sentence(i.e. it is always the leftmost non-terminal which is rewritten). LL parser is a top-down parser for a subset of context-free languages . An LL parser is called an LL(k) parser if it uses k tokens of lookahead when parsing a sentence and can do it without backtracking. Consider a Grammar $G$: $S \\rightarrow a\\mid aa$ This grammar is Regular but cannot be parsed by a LL(1) parser w/o backtracking, because here, lookahead is of 1 symbol only and in the grammar for both productions, parser while looking at just one(first) symbol, which is $a$, fails to select the correct rule for parsing. Hence, not every Regular grammar is LL(1); Statement P is False. LR Grammar: Grammars which can be parsed by LR parsers. LR Parser: They are a type of bottom-up parsers that efficiently handle deterministic context-free languages(DCFL) in guaranteed linear time. All Regular Languages are also DCFL. Hence, they all can be parsed by a LR(1) grammar. Hence, Statement Q is True.",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the grammar with non-terminals $N=\\left\\{S,C,S_1\\right\\}$, terminals $T=\\left\\{a, b, i, t, e\\right\\}$, with $S$ as the start symbol, and the following set of rules: $S \\rightarrow iCtSS_1 \\mid a$ $S_1 \\rightarrow eS \\mid \\epsilon$ $C \\rightarrow b$ The grammar is NOT LL(1) because:",
          "images": [],
          "options": [
            "A. it is left recursive",
            "B. it is right recursive",
            "C. it is ambiguous",
            "D. it is not context-free"
          ],
          "correct_answer": "C",
          "explanation": "Here, we can expand any one of $S_1$ to $\\in$ and other to $ea$, but which one will it be need not matter, because in the end we will still get the same string. This means that the Grammar is Ambiguous. $\\text{LL(1)}$ cannot be ambiguous. Here's a Proof for that $${\\color{Magenta}{\\underline{\\textbf{LL(1) Derivations}}}} $$ ${\\color{Blue}{\\textbf{L}} }$eft to Right Scan of input ${\\color{Blue}{\\textbf{L}} }$eftmost Derivation ${\\color{Blue}{\\textbf{(1)}} }$ look ahead $1$ token at each step $\\text{Alternative characterization of LL(1) Grammars:}$ Whenever $A \\rightarrow \\alpha \\mid \\beta \\in G$ $\\text{FIRST}(\\alpha) \\cap \\text{FIRST}(\\beta) = \\{\\},$ and If $\\alpha \\overset{\\ast}{\\implies} \\varepsilon$ then $\\text{FIRST}(\\beta) \\cap \\text{FOLLOW}(A) = \\{\\}.$ $\\textbf{Corollary:}$ No Ambiguous Grammar is $\\text{LL(1)}.$",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which one of the following is a top-down parser?",
          "images": [],
          "options": [
            "A. Recursive descent parser.",
            "B. Operator precedence parser.",
            "C. An LR(k) parser.",
            "D. An LALR(k) parser."
          ],
          "correct_answer": "A",
          "explanation": "Recursive descent parser-TOP DOWN PARSER Operator precedence parser-BOTTOM UP PARSER An LR(k) parser.-BOTTOM UP PARSER An LALR(k) parser-BOTTOM UP PARSER",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following grammar G: $S \\rightarrow bS \\mid aA \\mid b$ $A \\rightarrow bA \\mid aB$ $B \\rightarrow bB \\mid aS \\mid a$ Let $N_a(w)$ and $N_b(w)$ denote the number of a’s and b’s in a string $\\omega$ respectively. The language $L(G)$ over $\\left\\{a, b\\right\\}^+$ generated by $G$ is",
          "images": [],
          "options": [
            "A. $\\left\\{w \\mid N_a(w) > 3N_b(w)\\right\\}$",
            "B. $\\left\\{w \\mid N_b(w) > 3N_a(w)\\right\\}$",
            "C. $\\left\\{w \\mid N_a(w) = 3k, k \\in \\left\\{0, 1, 2, …\\right\\}\\right\\}$",
            "D. $\\left\\{w \\mid N_b(w) = 3k, k \\in \\left\\{0, 1, 2, …\\right\\}\\right\\}$"
          ],
          "correct_answer": "C",
          "explanation": "above CFG generate string $b$, $aaa$.. $b$ will eliminate options A and D $aaa$ eliminate options B. C is answer i.e. number of $a = 3k, k =0,1,2$....",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the grammar with the following translation rules and $E$ as the start symbol$$\\begin{array}{lll} E \\rightarrow E_ 1\\# \\: T & \\qquad\\left\\{E.value = E_1.value * T.value\\right\\}\\\\ \\qquad\\mid T & \\qquad \\{E.value = T.value\\}\\\\ T \\rightarrow T_1 \\& \\: F &\\qquad \\{T.value = T_1.value + F.value\\}\\\\ \\qquad\\mid F&\\qquad \\{T.value = F.value\\}\\\\ F \\rightarrow \\text{num}&\\qquad \\{F.value=num.value\\} \\end{array}$$Compute E.value for the root of the parse tree for the expression:$2$ # $3$ & $5$ # $6$ & $4$",
          "images": [],
          "options": [
            "A. $200$",
            "B. $180$",
            "C. $160$",
            "D. $40$"
          ],
          "correct_answer": "C",
          "explanation": "Here # is multiplication and & is addition by semantics rules given in the question. By observation of productions, here &(+) is higher precedence than #(*), because & is far from starting symbol both &,# are left associative So, we can solve the expression as $((2*(3+5))*(6+4)) =160$ Answer is ( C ).",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider a program $P$ that consists of two source modules $M_1$ and $M_2$ contained in two different files. If $M_1$ contains a reference to a function defined in $M_2$ the reference will be resolved at",
          "images": [],
          "options": [
            "A. Edit time",
            "B. Compile time",
            "C. Link time",
            "D. Load time"
          ],
          "correct_answer": "C",
          "explanation": "answer - C . Each module is compiled separately and then linked together to make the executable. The below commands shows how to do this for two modules $c1.c$ and $c2.c$ using $gcc$. gcc -c c1.c -o c1.o gcc -c c2.c -o c2.o gcc c1.o c2.o -o C.exe",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following grammar rules violate the requirements of an operator grammar? $P, Q, R$ are nonterminals, and $r, s, t$ are terminals. (I) only (I) and (III) only (II) and (III) only (III) and (IV) only",
          "images": [],
          "options": [
            "A. $P \\rightarrow Q R$",
            "B. $P \\rightarrow Q s R$",
            "C. $P \\rightarrow \\: \\varepsilon$",
            "D. $P \\rightarrow Q t R r $"
          ],
          "correct_answer": "B",
          "explanation": "answer is B . Operator grammar cannot contain Nullable variable Two adjacent non-terminal on $\\text{RHS}$ of production",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following function void swap(int a, int b) { int temp; temp = a; a = b; b = temp; } In order to exchange the values of two variables $x$ and $y$.",
          "images": [],
          "options": [
            "A. call $swap(x, y)$",
            "B. call $swap(\\&x, \\&y)$",
            "C. $swap (x, y)$ cannot be used as it does not return any value",
            "D. $swap (x, y)$ cannot be used as the parameters are passed by value"
          ],
          "correct_answer": "D",
          "explanation": "ans ( D ). Option A will not exchange the values of $x$ and $y$ because parameters are passed by value in C. i.e., the code is exchanging $x'$ and $y'$ which are having the values of $x$ and $y$ respectively. Option B will not swap the value void swap(int a, int b) Here, it is wrong to pass in address (int*) as the parameters are of int type, even sizeof int and int* varies depending on the compiler. Now, even if ignoring this error, the given code would not exchange the values of $x$ and $y$ as it is merely exchanging $p_1'$ and $p_2'$ where $p_1'$ and $p_2'$ are containing the copies of the addresses of $x$ and $y$ respectively. (Even addresses are passed by value in C language). Option C is false, return value is not required for exchanging the variables. Option D is correct. We cannot use $swap(x,y)$ because parameters are passed by value. Only way now to exchange the variables are by passing their addresses and then modifying the contents using the de-referencing operator $(*).$",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following statements about the context free grammar $$G = \\left \\{ S \\rightarrow SS, S \\rightarrow ab, S \\rightarrow ba, S \\rightarrow \\epsilon \\right \\} $$ Which combination below expresses all the true statements about $G$? I only I and III only II and III only I, II and III",
          "images": [],
          "options": [
            "A. $G$ is ambiguous",
            "B. $G$ produces all strings with equal number of $a$’s and $b$’s",
            "C. $G$ can be accepted by a deterministic PDA."
          ],
          "correct_answer": "B",
          "explanation": "True. $G$ is ambiguous. E.g. the string $ab$ has multiple derivation trees like $S \\rightarrow SS \\rightarrow abS \\rightarrow ab$, and $S \\rightarrow ab$. False. $G$ does not produce all strings with equal no. of $a$`s and $b$`s. ($aabb$ cannot be generated). True. The given grammar $G$ generates the language $(ab+ba)^*$, which is Regular and therefore also DCFL. So, a D-PDA can be designed for $G$. Hence, the answer is option B .",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following is NOT an advantage of using shared, dynamically linked libraries as opposed to using statistically linked libraries?",
          "images": [],
          "options": [
            "A. Smaller sizes of executable files",
            "B. Lesser overall page fault rate in the system",
            "C. Faster program startup",
            "D. Existing programs need not be re-linked to take advantage of newer versions of libraries"
          ],
          "correct_answer": "C",
          "explanation": "option C: DLL takes more time in program setup (in loading and linking phase to set up the global offset table and load and link the required libraries) Since DLLs are separated from executable, the size of executable becomes smaller. Since DLLs are shared among multiple executables, the total memory usage of the system goes down and hence overall page fault rate decreases. Dynamic linking takes place during program runtime. So, if a DLL is replaced to a new version, it will automatically get linked during runtime. There is no explicit relinking required as in the case of static linking. (This works by linking the DLL calls to Global Offset Table and the contents of this table is filled during program run. A simple jump in static linking becomes an indirect jump in dynamic linking). Refer: Galvin section 8.1.5, Dynamic Linking and Shared Libraries",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the syntax directed definition shown below.$$\\begin{array}{ll} S \\rightarrow \\mathbf{ id :=} E&\\qquad \\{gen(\\mathbf{ id}.place = E.place;);\\}\\\\ E \\rightarrow E_1 + E_2 &\\qquad \\{t = newtemp();\\\\ &\\qquad gen(t = E_1.place + E_2.place;);\\\\ &\\qquad E.place = t;\\}\\\\ E \\rightarrow id&\\qquad \\{E.place = \\mathbf{id}.place;\\} \\end{array}$$Here, $gen$ is a function that generates the output code, and $newtemp$ is a function that returns the name of a new temporary variable on every call. Assume that $t_i'$s are the temporary variable names generated by $newtemp$. For the statement $\\text{‘}X : = Y + Z\\text{'},$ the $3$-address code sequence generated by this definition is",
          "images": [],
          "options": [
            "A. $X = Y + Z$",
            "B. $t_1 = Y+Z; X=t_1$",
            "C. $t_1 =Y; t_2=t_1 +Z; X=t_2$",
            "D. $t_1 =Y; t_2=Z; t_3=t_1+t_2; X=t_3$"
          ],
          "correct_answer": "B",
          "explanation": "Answer (B)",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the translation scheme shown below. $S \\rightarrow T\\;R$ $R \\rightarrow + T \\{\\text{print}(‘+’);\\} R\\mid \\varepsilon$ $T \\rightarrow$ num $\\{\\text{print}$( num. val)$;\\}$ Here num is a token that represents an integer and num .val represents the corresponding integer value. For an input string ‘$9 + 5 + 2$’, this translation scheme will print",
          "images": [],
          "options": [
            "A. $9 + 5 + 2$",
            "B. $9 \\ 5 + 2 +$",
            "C. $9 \\ 5 \\ 2 + +$",
            "D. $+ + 9 \\ 5 \\ 2$"
          ],
          "correct_answer": "B",
          "explanation": "Correct Option: B $9\\ 5+2+$",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the grammar shown below. $S \\rightarrow C \\ C$ $C \\rightarrow c \\ C \\mid d$ This grammar is",
          "images": [],
          "options": [
            "A. LL(1)",
            "B. SLR(1) but not LL(1)",
            "C. LALR(1) but not SLR(1)",
            "D. LR(I) but not LALR(1)"
          ],
          "correct_answer": "A",
          "explanation": "ans is A $First(S)=First(C)=\\{c,d\\}$ There are no multiple entries in single row of parsing table hence grammar is LL1 Note : If we have $A \\rightarrow B\\mid C,$ for grammar to be LL(1) first(B) intersection First(C) should be null otherwise grammar is not LL1. If First(B) contains $\\epsilon$ then Follow(A) intersection First(C) should be null. Using this we can say grammar is LL(1) or not without constructing parsing table. An $\\epsilon$ free LL(1) grammar is also SLR(1) and hence LALR(1) and LR(1) too.",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the grammar shown below $S \\rightarrow i E t S S’ \\mid a$ $S’ \\rightarrow e S \\mid \\epsilon$ $E \\rightarrow b$ In the predictive parse table, $M,$ of this grammar, the entries $M[S’ , e]$ and $M[S’ , \\$]$ respectively are",
          "images": [],
          "options": [
            "A. $\\{S’ \\rightarrow e S\\}$ and $\\{S’ \\rightarrow \\epsilon\\}$",
            "B. $\\{S’ \\rightarrow e S\\}$ and $\\{ \\}$",
            "C. $\\{S’ \\rightarrow \\epsilon\\}$ and $\\{S’ \\rightarrow \\epsilon\\}$",
            "D. $\\{S’ \\rightarrow e S, S’ \\rightarrow \\varepsilon$} and $\\{S’ \\rightarrow \\epsilon\\}$"
          ],
          "correct_answer": "D",
          "explanation": "$\\text{FIRST} (S)=\\{i,a\\}$ $\\text{FIRST}(S')=\\{e, \\epsilon\\}$ $\\text{FIRST}(E)=\\{b\\}$ $\\text{FOLLOW}(S')=\\{e,\\$\\}$ Only when $\\text{FIRST}$ contains $\\epsilon,$ we need to consider $\\text{FOLLOW}$ for getting the parsing table entry. $M[S',e]=\\{S' \\rightarrow eS(\\text{FIRST}),S' \\rightarrow \\epsilon \\;(\\text{considering }\\text{FOLLOW})\\}$ $M[S',\\$]=\\{S \\rightarrow \\epsilon\\}$ $$\\begin{array}{|l|c|c|c|l|c|c|} \\hline \\text{} & \\text{$a$} & \\text{$i$} & \\text{$b$} & \\text{$e$} & \\text{$t$} & \\text{\\$} \\\\\\hline \\text{$S$} & \\text{$S \\rightarrow a$} &\\text{$S \\rightarrow ietSS'$} &\\text{} &\\text{} &\\text{} \\\\\\hline \\text{$S'$} & \\text{} & \\text{} & \\text{} & \\text{$S' \\rightarrow eS$} ,&\\\\ &&&& \\text{$S' \\rightarrow \\epsilon$} & \\text{} & \\text{$S' \\rightarrow \\epsilon$} \\\\\\hline E & \\text{} & \\text{} & \\text{$E \\rightarrow b$} & \\text{} & \\text{} & \\text{} \\\\\\hline \\end{array}$$ Answer is D",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "In a bottom-up evaluation of a syntax directed definition, inherited attributes can",
          "images": [],
          "options": [
            "A. always be evaluated",
            "B. be evaluated only if the definition is L-attributed",
            "C. be evaluated only if the definition has synthesized attributes",
            "D. never be evaluated"
          ],
          "correct_answer": "B",
          "explanation": "is false. If the grammar is not L-attributed; we cannot evaluate the inherited attributes in a bottom-up parse. In fact even for some L-attributed grammar, bottom-up parse is not possible for inherited attributes. http://infolab.stanford.edu/~ullman/dragon/slides2.pdf https://gateoverflow.in/?qa=blob&qa_blobid=14587629398289520039 is true. Is there any non L-attributed grammar which can be parsed by a bottom-up parser? No, as shown in the above link. In fact only for the L-attributed grammar made from a LL(1) grammar, we can always guarantee a bottom-up parsing. Even for LR(1) grammar, bottom-up parsing is not a guarantee for all inherited attributes. is false. Some L-attributed grammars (including those with no synthesized attributes) can be evaluated by a bottom-up parser. is false for above-told reasons. A nice PDF for the same :- https://acm.sjtu.edu.cn/w/images/a/a1/Compiler2013-lec07.pdf",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Assume that the SLR parser for a grammar G has $n_1$ states and the LALR parser for G has $n_2$ states. The relationship between $n_1$ and $n_2$ is",
          "images": [],
          "options": [
            "A. $n_1$ is necessarily less than $n_2$",
            "B. $n_1$ is necessarily equal to $n_2$",
            "C. $n_1$ is necessarily greater than $n_2$",
            "D. None of the above"
          ],
          "correct_answer": "B",
          "explanation": "no. of states in $\\text{SLR}$ and $\\text{LALR}$ are equal. and no. of states in $\\text{SLR}$ and $\\text{LALR}$ are less than or equal to $\\text{LR(1).}$ $B$",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following suffices to convert an arbitrary CFG to an LL(1) grammar?",
          "images": [],
          "options": [
            "A. Removing left recursion alone",
            "B. Factoring the grammar alone",
            "C. Removing left recursion and factoring the grammar",
            "D. None of the above"
          ],
          "correct_answer": "D",
          "explanation": "$LL(1)$ parser is top down parser. For top down parsers, the grammar should be unambiguous, deterministic and should not be left recursive. All the $3$ conditions must be satisfied for $LL(1)$ parsers. Now, even if all $3$ conditions are satisfied we cannot get an $LL(1)$ or even $LL(k)$ (for any $k$) grammar for even a $DCFG. $This is because there are $DCFLs $ which does not have an $LL(k)$ grammar (see ref below). On the other hand for any $DCFL,$ we can always have an $LR(1)$ grammar. http://mathoverflow.net/questions/31733/can-i-have-an-ll-grammar-for-every-deterministic-context-free-language So, Option $D$ is correct.",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the following grammar $S \\rightarrow S * E$ $S \\rightarrow E$ $E \\rightarrow F + E$ $E \\rightarrow F$ $F \\rightarrow id$ Consider the following LR(0) items corresponding to the grammar above Given the items above, which two of them will appear in the same set in the canonical sets-of-items for the grammar? i and ii ii and iii i and iii None of the above",
          "images": [],
          "options": [
            "A. $S \\rightarrow S *.E$",
            "B. $E \\rightarrow F. + E$",
            "C. $E \\rightarrow F + .E$"
          ],
          "correct_answer": "D",
          "explanation": "$\\Rightarrow$ NOT possible for these three items to be in same state $D$",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Dynamic linking can cause security concerns because",
          "images": [],
          "options": [
            "A. Security is dynamic",
            "B. The path for searching dynamic libraries is not known till runtime",
            "C. Linking is insecure",
            "D. Cryptographic procedures are not available for dynamic linking"
          ],
          "correct_answer": "B",
          "explanation": "Nonsense option, No idea why it is here. The path for searching dynamic libraries is not known till runtime -> This seems most This is not true. Linking in itself not insecure. There is no relation between Cryptographic procedures & Dynamic linking.",
          "year": 2002,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "To evaluate an expression without any embedded function calls",
          "images": [],
          "options": [
            "A. One stack is enough",
            "B. Two stacks are needed",
            "C. As many stacks as the height of the expression tree are needed",
            "D. A Turing machine is needed in the general case"
          ],
          "correct_answer": "A",
          "explanation": "Expression without any calls in it $\\implies 1+2\\ast3-4$ Expression with embedded calls $\\implies 1 + \\text{fun}1(a,b,c) \\ast \\text{fun}2(3.4,58) - \\text{fun}3(x,yz)$; First we can convert Infix to Postfix using single stack (Using it as operator stack) Then we can evaluate that expression using Single stack.",
          "year": 2002,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following statements is false?",
          "images": [],
          "options": [
            "A. An unambiguous grammar has same leftmost and rightmost derivation",
            "B. An LL(1) parser is a top-down parser",
            "C. LALR is more powerful than SLR",
            "D. An ambiguous grammar can never be LR(k) for any k"
          ],
          "correct_answer": "A",
          "explanation": "Correct Option: A (A) We can not have different Left Most Derivation and Right Most Derivation parse trees BUT we can certainly have different LMD and RMD for a given string. (LMD and RMD here refer to the order of various productions used for derivation which could be different.) (D) is wrong w.r.t. question because IT IS TRUE that any LR(k) IS NEVER AMBIGUOUS, so an ambiguous can never be an LR(K) for any k, no matter how large k becomes. (B) and (C) can not be the answer because LL(1) is a top-down parser, and LALR is more powerful than SLR. So both are TRUE.",
          "year": 2001,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The process of assigning load addresses to the various parts of the program and adjusting the code and the data in the program to reflect the assigned addresses is called",
          "images": [],
          "options": [
            "A. Assembly",
            "B. parsing",
            "C. Relocation",
            "D. Symbol resolution"
          ],
          "correct_answer": "C",
          "explanation": "Relocation is the process of assigning load addresses to position-dependent code of a program and adjusting the code and data in the program to reflect the assigned addresses. Hence Option C is Ans Symbol resolution is the process of searching files and libraries to replace symbolic references or names of libraries with actual usable addresses in memory before running a program.",
          "year": 2001,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Given the following expression grammar: $$\\begin{align} E &\\to E * F \\mid F + E \\mid F \\\\[1em] F &\\to F - F \\mid id \\end{align}$$ Which of the following is true?",
          "images": [],
          "options": [
            "A. $*$ has higher precedence than $+$",
            "B. $-$ has higher precedence than $*$",
            "C. $+$ and $-$ have same precedence",
            "D. $+$ has higher precedence than $*$"
          ],
          "correct_answer": "B",
          "explanation": "Correct Option: B operator which is at a lower level in the grammar is termed to have higher precedence.",
          "year": 2000,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following derivations does a top-down parser use while parsing an input string? The input is scanned from left to right.",
          "images": [],
          "options": [
            "A. Leftmost derivation",
            "B. Leftmost derivation traced out in reverse",
            "C. Rightmost derivation",
            "D. Rightmost derivation traced out in reverse"
          ],
          "correct_answer": "A",
          "explanation": "Top-down parser - Leftmost derivation Bottom-Up parser - Reverse of rightmost derivation $A$",
          "year": 2000,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "The number of tokens in the following C statement is printf(\"i=%d, &i=%x\", i, &i); Related Questions : ISRO CSE 2020 | Question: 13",
          "images": [],
          "options": [
            "A. $3$",
            "B. $26$",
            "C. $10$",
            "D. $21$"
          ],
          "correct_answer": "C",
          "explanation": "answer - C Tokens are: printf ( \"i=%d, &i=%x\" , i , & i ) ;",
          "year": 2000,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "If $G$ is a context free grammar and $w$ is a string of length $l$ in $L(G)$, how long is a derivation of $w$ in $G$, if $G$ is in Chomsky normal form?",
          "images": [],
          "options": [
            "A. $2l$",
            "B. $2l +1$",
            "C. $2l -1$",
            "D. $l$"
          ],
          "correct_answer": "C",
          "explanation": "Chomsky Normal Form (If all of its production rules are of the form): $A \\rightarrow BC$ or $A \\rightarrow a$ or $S \\rightarrow \\varepsilon$ where $A, B$ and $C$ are nonterminal symbols, $a$ is a terminal symbol ($a$ symbol that represents a constant value), $S$ is the start symbol, and $\\varepsilon$ is the empty string. Also, neither $B$ nor $C$ may be the start symbol, and the third production rule can only appear if $\\varepsilon$ is in $L(G)$, namely, the language produced by the context-free grammar $G$. Applying productions of the first form will increase the number of nonterminals from $k$ to $k + 1$, since you replace one nonterminal $(-1)$ with two nonterminals $(+2)$ for a net gain of $+1$ nonterminal. Since you start with one nonterminal, this means you need to do $l - 1$ productions of the first form. You then need $l$ more of the second form to convert the nonterminals to terminals, giving a total of $l + (l - 1) = 2l - 1$ productions. $C$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Consider the $\\text{SLR(1)}$ and $\\text{LALR (1)}$ parsing tables for a context free grammar. Which of the following statement is/are true?",
          "images": [],
          "options": [
            "A. The goto part of both tables may be different.",
            "B. The shift entries are identical in both the tables.",
            "C. The reduce entries in the tables may be different.",
            "D. The error entries in tables may be different"
          ],
          "correct_answer": "B;C;D",
          "explanation": "Goto part & shift entries must be the same. Reduce entries & error entries may be different due to conflicts. , C, D.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "For a context free grammar, FOLLOW(A) is the set of terminals that can appear immediately to the right of non-terminal $A$ in some \"sentential\" form. We define two sets LFOLLOW(A) and RFOLLOW(A) by replacing the word \"sentential\" by \"left sentential\" and \"right most sentential\" respectively in the definition of FOLLOW (A). 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. FOLLOW(A) and LFOLLOW(A) may be different.",
            "B. FOLLOW(A) and RFOLLOW(A) are always the same.",
            "C. All the three sets are identical.",
            "D. All the three sets are different."
          ],
          "correct_answer": "A;B",
          "explanation": "Ans - A,B, $\\textsf{LFOLLOW}$ may be different from $\\textsf{FOLLOW}$ but $\\textsf{RFOLLOW}$ and $\\textsf{FOLLOW}$ will be the same Consider the following grammar $S \\rightarrow AB$ $A \\rightarrow a$ $B \\rightarrow b$ Now the only string derivable is $\\{ ab \\}$. Let's find $\\textsf{FOLLOW}$(A) in all cases : $\\textsf{FOLLOW}(A):$ set of terminals that can appear immediately to the right of non-terminal $A$ in some \"sentential \" form $S \\rightarrow AB \\rightarrow Ab \\rightarrow ab$ Here, we notice only '$b$' can appear to the right of $A$. $\\textsf{FOLLOW}$$(A) = \\{ b \\}$ $\\textsf{LFOLLOW}(A):$ set of terminals that can appear immediately to the right of non-terminal $A$ in some \"left sentential\" form $S \\rightarrow AB \\rightarrow aB \\rightarrow ab$ Here, we notice no terminal can appear to the right of $A$. $\\textsf{LFOLLOW}(A) = \\{\\}$ $\\textsf{RFOLLOW}(A):$ set of terminals that can appear immediately to the right of non-terminal $A$ in some \"right most sentential\" form $S \\rightarrow AB \\rightarrow Ab \\rightarrow ab$ Here, we notice only '$b$' can appear to the right of $A$. $\\textsf{RFOLLOW}(A) = \\{ b \\}$ The above example proves that $\\textsf{LFOLLOW}$ may not always be the same as $\\textsf{FOLLOW}$ but does not prove that $\\textsf{RFOLLOW}$ and $\\textsf{FOLLOW}$ will always be the same. In $\\textsf{FOLLOW}(A),$ we add all terminals which appear on the immediate right of A in some sentential form. In $\\textsf{RFOLLOW}(A),$ we add all terminals which appear on the immediate right of A in some right sentential form. Since a right sentential form is also a sentential form, it is clear that $\\textsf{FOLLOW}(A) \\supseteq \\textsf{RFOLLOW}(A) \\to (1)$ Now, we have to prove $\\textsf{RFOLLOW}(A) \\supseteq \\textsf{FOLLOW}(A) $ for which we need to show that any terminal which gets added to $\\textsf{FOLLOW}(A)$ must also be added to $\\textsf{RFOLLOW}(A).$ Or in other words, any terminal which can appear on the immediate right of a non-terminal in some sentential form (a sentential form can be either left sentential or right sentential or neither) must also appear to the immediate-right of the same non-terminal in some $\\textbf{right-sentential}$ form. A terminal $t$ can appear on the immediate right of a non-terminal $A$ in a sentential form if $t$ is already like that in the grammar production (say $S \\to \\dots At\\dots$ it $t$ produced by some reduction (say $S\\to \\dots AB \\dots, B \\to t)$ Now, since we are looking at $\\textsf{immediate right}$ terminal in the sentential form, it means leftmost derivations cannot produce the terminal we need, since here $A$ will be reduced before we do reduction for the non-terminal to its immediate right. In fact the only way we can get this terminal $t$ in a sentential form is if we reduce the immediate right non-terminal of $A.$ If we do the rightmost derivation we are guaranteed to do this and rightmost derivation also ensures that all non-terminals to the right of $A$ are already derived and so we get all possible terminals to the right even in cases where the immediate right non-terminal derives empty string. Thus, $\\textsf{RFOLLOW}(A) \\supseteq \\textsf{FOLLOW}(A) \\to (2)$ From (1) and (2), we get $\\textsf{FOLLOW}(A) = \\textsf{RFOLLOW}(A).$",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Indicate all the true statements from the following:",
          "images": [],
          "options": [
            "A. Recursive descent parsing cannot be used for grammar with left recursion.",
            "B. The intermediate form for representing expressions which is best suited for code optimization is the postfix form.",
            "C. A programming language not supporting either recursion or pointer type does not need the support of dynamic memory allocation.",
            "D. Although C does not support call-by-name parameter passing, the effect can be correctly simulated in C",
            "E. No feature of Pascal typing violates strong typing in Pascal."
          ],
          "correct_answer": "A;D",
          "explanation": "is TRUE. Left recursive grammars if used directly in recursive descent parsing causes an infinite loop. So, left recursion must be removed before giving to a recursive descent parser. is a strong statement- but I do not have any proof or reference for this- so for now I consider this FALSE. is false. The language can have dynamic data types which requires dynamically growing memory when data type size increases. is true and using macro we can do this. out of syllabus now.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "A “link editor” is a program that:",
          "images": [],
          "options": [
            "A. matches the parameters of the macro-definition with locations of the parameters of the macro call",
            "B. matches external names of one program with their location in other programs",
            "C. matches the parameters of subroutine definition with the location of parameters of subroutine call.",
            "D. acts as a link between text editor and the user",
            "E. acts as a link between compiler and the user program"
          ],
          "correct_answer": "B",
          "explanation": "Link editor or (linker ) performs external symbol resolution relocation. ANS: B Matches external names of one program with their location in other programs.",
          "year": 0,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "An LALR(1) parser for a grammar G can have shift-reduce (S-R) conflicts if and only if",
          "images": [],
          "options": [
            "A. The SLR(1) parser for G has S-R conflicts",
            "B. The LR(1) parser for G has S-R conflicts",
            "C. The LR(0) parser for G has S-R conflicts",
            "D. The LALR(1) parser for G has reduce-reduce conflicts"
          ],
          "correct_answer": "B",
          "explanation": "Both LALR(1) and LR(1) parser uses LR(1) set of items to form their parsing tables. And LALR(1) states can be found by merging LR(1) states of LR(1) parser that have the same set of first components of their items. i.e. if LR(1) parser has $2$ states I and J with items $A \\rightarrow a.bP$,$x$ and $A \\rightarrow a.bP$,$y$ respectively, where $x$ and $y$ are look ahead symbols, then as these items are same with respect to their first component, they can be merged together and form one single state, let’s say $K$. Here we have to take union of look ahead symbols. After merging, State $K$ will have one single item as $A \\rightarrow a.bP$,$x$,$y$ . This way LALR(1) states are formed ( i.e. after merging the states of LR(1) ). Now, $S-R$ conflict in LR(1) items can be there whenever a state has items of the form : A-> a.bB , p C-> d. , b i.e. it is getting both shift and reduce at symbol b, hence a conflict. Now, as LALR(1) have items similar to LR(1) in terms of their first component, shift-reduce form will only take place if it is already there in LR(1) states. If there is no S-R conflict in LR(1) state it will never be reflected in the LALR(1) state obtained by combining LR(1) states. $B$",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following are true? II and V only I, III and IV only I, II and V only II, III and V only",
          "images": [],
          "options": [
            "A. A programming language which does not permit global variables of any kind and has no nesting of procedures/functions, but permits recursion can be implemented with static storage allocation",
            "B. Multi-level access link (or display) arrangement is needed to arrange activation records only if the programming language being implemented has nesting of procedures/functions",
            "C. Recursion in programming languages cannot be implemented with dynamic storage allocation",
            "D. Nesting procedures/functions and recursion require a dynamic heap allocation scheme and cannot be implemented with a stack-based allocation scheme for activation records",
            "E. Programming languages which permit a function to return a function as its result cannot be implemented with a stack-based storage allocation scheme for activation records"
          ],
          "correct_answer": "A",
          "explanation": "False. Recursion cannot be implemented using static allocation. True. Yes, we do need multi level access link in case of nested functions. Each level to traverse ARB of same level of nesting. False. Recursion can only be implemented using dynamic memory allocation. False. Recursion is done using memory in stack (ARBs in stack), not in heap. True. Yes, they cannot, once a function returns its activation record is no longer valid, so we cannot return a function as a result. So, option ( A ) is correct.",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Some code optimizations are carried out on the intermediate code because",
          "images": [],
          "options": [
            "A. They enhance the portability of the compiler to the target processor",
            "B. Program analysis is more accurate on intermediate code than on machine code",
            "C. The information from dataflow analysis cannot otherwise be used for optimization",
            "D. The information from the front end cannot otherwise be used for optimization"
          ],
          "correct_answer": "A",
          "explanation": "Answer: A Option (B) is also true. But the main purpose of doing some code-optimization on intermediate code generation is to enhance the portability of the compiler to target processors. So Option A) is more suitable here. Intermediate code is machine/architecture independent code. So a compiler can optimize it without worrying about the architecture on which the code is going to execute (it may be the same or the other). So that kind of compiler can be used by multiple different architectures. In contrast to that, suppose code optimization is done on target code, which is machine/architecture dependent, then the compiler has be specific about the optimizations on that kind of code. In this case the compiler can't be used by multiple different architectures, because the target code produced on different architectures would be different. Hence portability reduces here. ref- http://quiz.geeksforgeeks.org/code-generation-and-optimization/",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following describes a handle (as applicable to LR-parsing) appropriately?",
          "images": [],
          "options": [
            "A. It is the position in a sentential form where the next shift or reduce operation will occur",
            "B. It is non-terminal whose production will be used for reduction in the next step",
            "C. It is a production that may be used for reduction in a future step along with a position in the sentential form where the next shift or reduce operation will occur",
            "D. It is the production $p$ that will be used for reduction in the next step along with a position in the sentential form where the right hand side of the production may be found"
          ],
          "correct_answer": "D",
          "explanation": "A sentential form is the start symbol $S$ of a grammar or any string in $(V \\cup T)^*$ that can be derived from $S$. Consider the linear grammar $(\\{S, B\\}, \\{a, b\\}, S, \\{S \\rightarrow aS, S \\rightarrow B, B \\rightarrow bB, B \\rightarrow \\lambda \\})$. A derivation using this grammar might look like this: $S \\Rightarrow aS \\Rightarrow aB \\Rightarrow abB \\Rightarrow abbB \\Rightarrow abb$ Each of $\\{S, aS, aB, abB, abbB, abb\\}$ is a sentential form. Because this grammar is linear, each sentential form has at most one variable. Hence there is never any choice about which variable to expand next. Here, in option D the sentential forms are same but generated differently coz we are using here Bottom Up production. Handle: for example the grammar is: $$\\begin{align*} E &\\rightarrow E+n\\\\ E &\\rightarrow E*n\\\\ E &\\rightarrow n \\end{align*}$$ Then say to derive string $n+n*n$: these are three different handles shown in $3$ different colors = $\\left\\{ n, E+n, E*n \\right \\}$ that's what option D says",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "compiler-design",
          "question_text": "Which of the following statements are true? I, II, III and IV II, III and IV only I, III and IV only I, II and IV only",
          "images": [],
          "options": [
            "A. Every left-recursive grammar can be converted to a right-recursive grammar and vice-versa",
            "B. All $\\epsilon$-productions can be removed from any context-free grammar by suitable transformations",
            "C. The language generated by a context-free grammar all of whose productions are of the form $X \\rightarrow w$ or $X \\rightarrow wY$ (where, $w$ is a string of terminals and $Y$ is a non-terminal), is always regular",
            "D. The derivation trees of strings generated by a context-free grammar in Chomsky Normal Form are always binary trees"
          ],
          "correct_answer": "C",
          "explanation": "Answer is C: Statement $1$ is true : Using GNF we can convert Left recursive grammar to right recursive and by using reversal of CFG and GNF we can convert right recursive to left recursive. Statement $2$ is false : because if $\\epsilon$ is in the language then we can't remove $\\epsilon$ production from Start symbol. (For example $L = a^*$) Statement $3$ is true because right linear grammar generates regular set Statement $4$ is true , only two non-terminals are there in each production in CNF. So it always form a binary tree.",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        }
      ]
    }
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
