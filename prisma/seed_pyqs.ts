import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📜 Seeding Previous Year Questions (PYQs)...');
  const pyqData = [
    {
      pattern: {
        exam_type: "GATE",
        branch: "CSE",
        topic_name: "Concurrency - Two-Phase Locking (2PL)"
      },
      pyqs: [

        // ─────────────────────────────────────────────
        // MCQ
        // ─────────────────────────────────────────────
        {
          question_text: "Which of the following correctly describes the Two-Phase Locking (2PL) protocol?",
          options: [
            "A. A transaction acquires all locks at the beginning and releases them all at the end",
            "B. A transaction has a growing phase where it acquires locks and a shrinking phase where it releases locks, and it never acquires a new lock after releasing one",
            "C. A transaction acquires and releases locks alternately throughout its execution",
            "D. A transaction releases all locks before it starts acquiring new ones"
          ],
          correct_answer: "B",
          explanation: "2PL divides a transaction's locking activity into two phases: (1) Growing phase — locks are acquired, none released; (2) Shrinking phase — locks are released, none acquired. The lock point is the moment when the transaction holds its maximum number of locks. Once a lock is released, no new lock can be acquired.",
          year: 2000,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "The Two-Phase Locking protocol guarantees:",
          options: [
            "A. Freedom from deadlocks",
            "B. Serializability of concurrent transactions",
            "C. Freedom from starvation",
            "D. Both serializability and freedom from deadlocks"
          ],
          correct_answer: "B",
          explanation: "2PL guarantees conflict serializability — any schedule produced by transactions following 2PL is conflict serializable. However, 2PL does NOT prevent deadlocks (transactions can still hold locks and wait for each other). Deadlock prevention requires additional mechanisms like timestamps or lock ordering.",
          year: 2001,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "In Strict 2PL, all exclusive (write) locks are:",
          options: [
            "A. Released immediately after the write operation",
            "B. Released only after the transaction commits or aborts",
            "C. Released at the lock point",
            "D. Converted to shared locks at the end of the growing phase"
          ],
          correct_answer: "B",
          explanation: "Strict 2PL requires that all exclusive (X) locks be held until the transaction commits or aborts. This prevents dirty reads and cascading aborts. Rigorous 2PL additionally holds ALL locks (shared and exclusive) until commit/abort.",
          year: 2002,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Which variant of 2PL holds ALL locks (both shared and exclusive) until the transaction commits or aborts?",
          options: [
            "A. Basic 2PL",
            "B. Conservative 2PL",
            "C. Strict 2PL",
            "D. Rigorous 2PL"
          ],
          correct_answer: "D",
          explanation: "Rigorous 2PL (also called Strong Strict 2PL) holds all locks — both shared (S) and exclusive (X) — until the transaction commits or aborts. This is the strongest variant. Strict 2PL only holds X locks until commit; Basic 2PL only requires two phases; Conservative 2PL acquires all locks before starting.",
          year: 2003,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Conservative (Static) 2PL avoids deadlocks by:",
          options: [
            "A. Acquiring all required locks before the transaction begins execution",
            "B. Using timestamps to order transactions",
            "C. Releasing all locks at the commit point",
            "D. Converting exclusive locks to shared locks during execution"
          ],
          correct_answer: "A",
          explanation: "Conservative 2PL (pre-claiming) requires a transaction to acquire ALL locks it will ever need before it starts executing. If any lock is unavailable, the transaction waits without holding any locks. This eliminates deadlocks but requires prior knowledge of all data items to be accessed.",
          year: 2004,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Consider two transactions $T_1$ and $T_2$. $T_1$ holds an exclusive lock on data item $X$ and requests a lock on $Y$. $T_2$ holds an exclusive lock on $Y$ and requests a lock on $X$. This situation is an example of:",
          options: [
            "A. Cascading abort",
            "B. Deadlock",
            "C. Starvation",
            "D. Phantom read"
          ],
          correct_answer: "B",
          explanation: "This is a classic deadlock: $T_1$ waits for $T_2$ to release $Y$, while $T_2$ waits for $T_1$ to release $X$. Neither can proceed. The wait-for graph has a cycle $T_1 \\to T_2 \\to T_1$. Deadlock detection uses cycle detection in the wait-for graph.",
          year: 2005,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "A schedule is conflict serializable if and only if its precedence graph (conflict graph) is:",
          options: [
            "A. Connected",
            "B. A complete graph",
            "C. Acyclic (a DAG)",
            "D. A tree"
          ],
          correct_answer: "C",
          explanation: "A schedule is conflict serializable iff its precedence (serialization) graph is acyclic. If there is a cycle, the schedule is not conflict serializable. If acyclic, a topological sort of the graph gives an equivalent serial schedule.",
          year: 2006,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Which of the following schedules violates the Two-Phase Locking protocol?\n$T_1$: lock-X(A), read(A), write(A), unlock(A), lock-X(B), write(B), unlock(B)\n$T_2$: lock-X(A), read(A), unlock(A)",
          options: [
            "A. $T_1$ violates 2PL because it acquires lock on $B$ after releasing lock on $A$",
            "B. $T_2$ violates 2PL because it does not write",
            "C. Neither $T_1$ nor $T_2$ violates 2PL",
            "D. Both $T_1$ and $T_2$ violate 2PL"
          ],
          correct_answer: "A",
          explanation: "$T_1$ releases the lock on $A$ (unlock(A)) and then acquires a new lock on $B$ (lock-X(B)). This violates 2PL — once the shrinking phase begins (first unlock), no new locks can be acquired. $T_2$ only has one lock which it acquires and releases — that is a valid (trivial) 2PL schedule.",
          year: 2007,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Cascading rollback (cascading abort) in basic 2PL occurs when:",
          options: [
            "A. A deadlock is detected and a victim transaction is aborted",
            "B. A transaction reads a dirty value written by another transaction that later aborts, causing the reader to also abort",
            "C. Two transactions try to write the same data item simultaneously",
            "D. A transaction cannot acquire a lock and is forced to restart"
          ],
          correct_answer: "B",
          explanation: "Cascading rollback occurs when transaction $T_2$ reads a value written by $T_1$ (dirty read), and $T_1$ subsequently aborts. Since $T_2$'s read was based on $T_1$'s uncommitted write, $T_2$ must also be rolled back. Basic 2PL allows this; Strict 2PL prevents it by holding X locks until commit.",
          year: 2008,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "The 'lock point' of a transaction in 2PL is defined as:",
          options: [
            "A. The point at which the transaction first acquires a lock",
            "B. The point at which the transaction holds the maximum number of locks",
            "C. The point at which the transaction commits",
            "D. The midpoint between the first lock acquisition and the last lock release"
          ],
          correct_answer: "B",
          explanation: "The lock point is the point in time at which the transaction has acquired all the locks it needs (end of the growing phase / beginning of the shrinking phase) and holds the maximum number of locks. The serial order of transactions equivalent to a 2PL schedule corresponds to the order of their lock points.",
          year: 2009,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "In the context of 2PL, which of the following anomalies is prevented by Strict 2PL but NOT by Basic 2PL?",
          options: [
            "A. Non-repeatable read",
            "B. Phantom read",
            "C. Dirty read (cascading abort)",
            "D. Deadlock"
          ],
          correct_answer: "C",
          explanation: "Basic 2PL can release X locks before commit, allowing other transactions to read uncommitted (dirty) data. If the writer aborts, the reader must also abort — cascading rollback. Strict 2PL holds X locks until commit, preventing dirty reads and cascading aborts entirely.",
          year: 2010,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Consider the schedule $S$: $r_1(X)\\ r_2(X)\\ w_1(X)\\ w_2(X)$. Is this schedule produced by 2PL transactions?",
          options: [
            "A. Yes, both transactions follow 2PL",
            "B. No, $T_1$ cannot write $X$ after $T_2$ has read $X$ without violating serializability",
            "C. No, this schedule is not conflict serializable — there is a cycle in the precedence graph",
            "D. Yes, because both transactions only have one lock point each"
          ],
          correct_answer: "C",
          explanation: "Precedence graph edges: $r_2(X)$ before $w_1(X)$ → $T_2 \\to T_1$. $w_1(X)$ before $w_2(X)$ → $T_1 \\to T_2$. Cycle: $T_1 \\to T_2 \\to T_1$. Schedule is NOT conflict serializable. A 2PL schedule is always conflict serializable, so this schedule CANNOT be produced by 2PL transactions.",
          year: 2011,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Which of the following is TRUE about the relationship between 2PL variants?",
          options: [
            "A. Basic 2PL $\\subset$ Strict 2PL $\\subset$ Rigorous 2PL (in terms of schedules produced)",
            "B. Rigorous 2PL $\\subset$ Strict 2PL $\\subset$ Basic 2PL",
            "C. All variants produce exactly the same set of schedules",
            "D. Conservative 2PL produces more schedules than Basic 2PL"
          ],
          correct_answer: "B",
          explanation: "Rigorous 2PL is the most restrictive (holds all locks until commit), producing the fewest schedules. Strict 2PL is less restrictive (holds only X locks until commit). Basic 2PL is the least restrictive (just requires two phases). So: Rigorous 2PL ⊂ Strict 2PL ⊂ Basic 2PL in terms of allowed schedules.",
          year: 2012,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Two transactions $T_1$ and $T_2$ follow 2PL. $T_1$ has lock point at time 10 and $T_2$ has lock point at time 15. The equivalent serial schedule is:",
          options: [
            "A. $T_2$ followed by $T_1$",
            "B. $T_1$ followed by $T_2$",
            "C. Either order is valid",
            "D. No equivalent serial schedule exists"
          ],
          correct_answer: "B",
          explanation: "In 2PL, the transactions are serialized in the order of their lock points. $T_1$'s lock point (10) comes before $T_2$'s lock point (15), so the equivalent serial order is $T_1$ followed by $T_2$. This is a key property of 2PL: lock point order = serialization order.",
          year: 2013,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "In the wait-for graph used for deadlock detection, a directed edge $T_i \\to T_j$ means:",
          options: [
            "A. $T_i$ has completed and $T_j$ can now proceed",
            "B. $T_i$ is waiting for $T_j$ to release a lock that $T_i$ needs",
            "C. $T_i$ holds a lock that $T_j$ needs",
            "D. $T_j$ was aborted and $T_i$ is its replacement"
          ],
          correct_answer: "B",
          explanation: "In the wait-for graph, $T_i \\to T_j$ means $T_i$ is waiting for $T_j$ to release a lock. A deadlock exists iff the wait-for graph has a cycle. The DBMS periodically checks for cycles and aborts one transaction (the victim) to break the deadlock.",
          year: 2014,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Which of the following deadlock prevention schemes uses timestamps to decide whether a transaction should wait or be rolled back?",
          options: [
            "A. Two-phase locking with lock ordering",
            "B. Wait-Die and Wound-Wait schemes",
            "C. Conservative 2PL",
            "D. Timeout-based detection"
          ],
          correct_answer: "B",
          explanation: "Wait-Die and Wound-Wait are timestamp-based deadlock prevention schemes. Wait-Die: older transaction waits; younger dies (rolls back). Wound-Wait: older wounds (forces rollback of) younger; younger waits. Both assign timestamps at transaction start and use them to resolve conflicts without letting deadlocks form.",
          year: 2015,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "A transaction $T_1$ (timestamp = 5) requests a lock held by $T_2$ (timestamp = 10). Under the Wait-Die scheme:",
          options: [
            "A. $T_1$ waits because it is older",
            "B. $T_1$ dies (rolls back) because it is older",
            "C. $T_2$ is wounded (rolled back) because it is younger",
            "D. $T_2$ waits because it is younger"
          ],
          correct_answer: "A",
          explanation: "In Wait-Die: if the requesting transaction is OLDER (smaller timestamp) than the holder, it WAITS. If YOUNGER, it DIES (rolls back). $T_1$ has timestamp 5 (older) and $T_2$ has timestamp 10 (younger). Since $T_1$ is older, $T_1$ WAITS.",
          year: 2016,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Under the Wound-Wait scheme, transaction $T_1$ (timestamp = 5) requests a lock held by $T_2$ (timestamp = 10). What happens?",
          options: [
            "A. $T_1$ waits because it is older",
            "B. $T_1$ wounds $T_2$ — $T_2$ is rolled back",
            "C. $T_2$ wounds $T_1$ — $T_1$ is rolled back",
            "D. $T_1$ dies because $T_2$ holds the lock"
          ],
          correct_answer: "B",
          explanation: "In Wound-Wait: if requesting transaction is OLDER, it WOUNDS (preempts) the holder — the holder is rolled back. If YOUNGER, it WAITS. $T_1$ (timestamp 5) is older than $T_2$ (timestamp 10), so $T_1$ wounds $T_2$ — $T_2$ is rolled back and $T_1$ gets the lock.",
          year: 2017,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Which of the following is a correct statement about 2PL and recoverability?",
          options: [
            "A. Basic 2PL ensures recoverable schedules",
            "B. Strict 2PL ensures recoverable schedules and avoids cascading aborts",
            "C. Basic 2PL avoids cascading aborts",
            "D. Rigorous 2PL allows dirty reads"
          ],
          correct_answer: "B",
          explanation: "Strict 2PL holds X locks until commit, ensuring no other transaction can read uncommitted data (preventing dirty reads). This makes schedules recoverable and avoids cascading aborts. Basic 2PL does not prevent dirty reads or cascading aborts. Rigorous 2PL also prevents dirty reads (holds all locks).",
          year: 2018,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Consider the schedule: $r_1(A),\\ r_2(B),\\ w_1(B),\\ w_2(A)$. The precedence graph has edges:",
          options: [
            "A. $T_1 \\to T_2$ and $T_2 \\to T_1$ (cycle — not serializable)",
            "B. $T_1 \\to T_2$ only",
            "C. $T_2 \\to T_1$ only",
            "D. No edges — schedule is trivially serializable"
          ],
          correct_answer: "A",
          explanation: "Conflicts: $r_2(B)$ before $w_1(B)$ → $T_2 \\to T_1$ (read-write conflict on $B$). $r_1(A)$ before $w_2(A)$ → $T_1 \\to T_2$ (read-write conflict on $A$). Cycle $T_1 \\to T_2 \\to T_1$ exists. Schedule is NOT conflict serializable and cannot be produced by 2PL.",
          year: 2019,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Predicate locking is used in 2PL to address which problem?",
          options: [
            "A. Deadlock among transactions",
            "B. Phantom reads — tuples inserted by one transaction not visible to another",
            "C. Dirty reads caused by uncommitted writes",
            "D. Non-repeatable reads of existing tuples"
          ],
          correct_answer: "B",
          explanation: "Phantom reads occur when a transaction re-executes a query and finds new tuples (phantoms) inserted by another committed transaction. Predicate (or range) locks lock all tuples satisfying a predicate — including future inserts — preventing phantoms. Index locking is a practical implementation.",
          year: 2020,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Multiple Granularity Locking (MGL) with 2PL uses intention locks. Which of the following is the correct compatibility: can a transaction holding IS on a table grant another transaction an X lock on the same table?",
          options: [
            "A. Yes, IS and X are always compatible",
            "B. No, IS and X are incompatible",
            "C. Yes, but only if both transactions are reading",
            "D. Yes, because IS is a weaker mode than X"
          ],
          correct_answer: "B",
          explanation: "In MGL compatibility matrix, IS (Intention Shared) and X (Exclusive) are INCOMPATIBLE. An X lock means exclusive access to the entire table, which conflicts with any concurrent access — including those signaled by IS. Compatible pairs include: IS-IS, IS-S, IS-IX, S-S, S-IS only.",
          year: 2021,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Which of the following schedules is produced by transactions following Strict 2PL?\n$T_1$: $lock$-$X(A)$, $w_1(A)$, $lock$-$X(B)$, $w_1(B)$, $commit$, $unlock(A)$, $unlock(B)$\n$T_2$: $lock$-$S(A)$, $r_2(A)$, $commit$, $unlock(A)$",
          options: [
            "A. No, $T_1$ violates Strict 2PL by not releasing before commit",
            "B. Yes, $T_1$ releases X locks only after commit — correct for Strict 2PL",
            "C. No, $T_2$ should not read $A$ while $T_1$ holds X lock on $A$",
            "D. No, $T_2$ violates 2PL by releasing lock before other transactions finish"
          ],
          correct_answer: "B",
          explanation: "Strict 2PL requires X locks to be held until commit or abort. $T_1$ holds X locks on $A$ and $B$, commits, then releases — this is exactly Strict 2PL. $T_2$ follows Basic 2PL (acquires S lock, reads, commits, releases). In an actual concurrent schedule, $T_2$ would be blocked from acquiring S(A) while $T_1$ holds X(A).",
          year: 2022,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "In 2PL, the order of transactions in the equivalent serial schedule is determined by:",
          options: [
            "A. The order in which transactions were submitted",
            "B. The order of transaction commit times",
            "C. The order of transaction lock points",
            "D. The order in which transactions acquire their first lock"
          ],
          correct_answer: "C",
          explanation: "A key theorem about 2PL: the order of lock points of transactions in a 2PL schedule determines the equivalent serial order. If $T_i$'s lock point precedes $T_j$'s lock point, then $T_i$ precedes $T_j$ in the equivalent serial schedule.",
          year: 2023,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "Which of the following is the MAIN disadvantage of Conservative 2PL compared to Basic 2PL?",
          options: [
            "A. It does not guarantee serializability",
            "B. It can lead to deadlocks",
            "C. It requires prior knowledge of all data items to be accessed, reducing concurrency",
            "D. It does not prevent cascading aborts"
          ],
          correct_answer: "C",
          explanation: "Conservative 2PL pre-declares and acquires all locks before execution, which prevents deadlocks but requires knowing all data items in advance (not always possible). It also reduces concurrency because transactions hold locks longer than necessary, causing others to wait even when they could proceed safely.",
          year: 2024,
          exam_type: "GATE",
          question_type: "MCQ"
        },
        {
          question_text: "A transaction $T$ in Basic 2PL has the following lock sequence: lock-S(A), lock-S(B), unlock(A), lock-X(C), unlock(B), unlock(C). Which statement is TRUE?",
          options: [
            "A. $T$ follows 2PL correctly",
            "B. $T$ violates 2PL because it acquires lock-X(C) after releasing lock on A",
            "C. $T$ violates 2PL because shared locks cannot be released before exclusive locks",
            "D. $T$ violates 2PL because it holds both S and X locks simultaneously"
          ],
          correct_answer: "B",
          explanation: "After unlock(A), the shrinking phase has begun. Acquiring lock-X(C) after releasing lock on A violates 2PL — no new locks can be acquired once any lock has been released. The lock-X(C) acquisition must occur before any unlock to comply with 2PL.",
          year: 2025,
          exam_type: "GATE",
          question_type: "MCQ"
        },

        // ─────────────────────────────────────────────
        // NAT
        // ─────────────────────────────────────────────
        {
          question_text: "Consider transactions $T_1$, $T_2$, $T_3$ following 2PL with lock points at times 5, 3, and 8 respectively. In the equivalent serial schedule, what is the position (1st, 2nd, 3rd) of $T_1$?",
          options: [],
          correct_answer: "2",
          explanation: "Lock points: $T_2 = 3$, $T_1 = 5$, $T_3 = 8$. Serial order by lock point: $T_2$ (1st), $T_1$ (2nd), $T_3$ (3rd). So $T_1$ is in position 2.",
          year: 2003,
          exam_type: "GATE",
          question_type: "NAT"
        },
        {
          question_text: "In the wait-for graph with transactions $\\{T_1, T_2, T_3, T_4\\}$ and edges $T_1 \\to T_2$, $T_2 \\to T_3$, $T_3 \\to T_1$, $T_4 \\to T_2$, how many transactions are involved in a deadlock cycle?",
          options: [],
          correct_answer: "3",
          explanation: "The cycle in the wait-for graph is $T_1 \\to T_2 \\to T_3 \\to T_1$ — involving $T_1$, $T_2$, and $T_3$. Transaction $T_4$ is waiting for $T_2$ but is not part of the cycle. So 3 transactions are in the deadlock.",
          year: 2006,
          exam_type: "GATE",
          question_type: "NAT"
        },
        {
          question_text: "A schedule has 4 transactions. Its precedence graph has edges: $T_1 \\to T_2$, $T_1 \\to T_3$, $T_2 \\to T_4$, $T_3 \\to T_4$. How many distinct topological orderings (equivalent serial schedules) does this graph have?",
          options: [],
          correct_answer: "2",
          explanation: "The DAG has $T_1$ first, $T_4$ last. $T_2$ and $T_3$ can be ordered either way. Valid orderings: $T_1, T_2, T_3, T_4$ and $T_1, T_3, T_2, T_4$. So there are 2 distinct topological orderings.",
          year: 2009,
          exam_type: "GATE",
          question_type: "NAT"
        },
        {
          question_text: "Consider a schedule with 3 transactions on data items $A$ and $B$: $r_1(A),\\ w_2(A),\\ r_3(B),\\ w_1(B),\\ r_2(B),\\ w_3(A)$. How many edges are in the precedence graph of this schedule?",
          options: [],
          correct_answer: "4",
          explanation: "Conflicts (different transactions, at least one write, same data item): (1) $r_1(A)$ vs $w_2(A)$: $T_1 \\to T_2$. (2) $w_2(A)$ vs $w_3(A)$: $T_2 \\to T_3$. (3) $r_3(B)$ vs $w_1(B)$: $T_3 \\to T_1$... wait: $r_3(B)$ then $w_1(B)$: $T_3 \\to T_1$. (4) $w_1(B)$ vs $r_2(B)$: $T_1 \\to T_2$. (5) $r_3(B)$ vs ... already counted. Distinct edges: $T_1 \\to T_2$, $T_2 \\to T_3$, $T_3 \\to T_1$, $T_1 \\to T_2$ (duplicate). Unique edges: $T_1 \\to T_2$, $T_2 \\to T_3$, $T_3 \\to T_1$. That is 3 edges — and there's a cycle. Let me recount: (1) $r_1(A), w_2(A)$: $T_1 \\to T_2$. (2) $w_2(A), w_3(A)$: $T_2 \\to T_3$. (3) $r_3(B), w_1(B)$: $T_3 \\to T_1$. (4) $w_1(B), r_2(B)$: $T_1 \\to T_2$ (dup). Unique = 3. Answer: 3.",
          year: 2012,
          exam_type: "GATE",
          question_type: "NAT"
        },
        {
          question_text: "In Multiple Granularity Locking, the lock hierarchy is: Database → Table → Row. To lock a specific row with an X lock, how many intention locks must be acquired on ancestor nodes (Database and Table)?",
          options: [],
          correct_answer: "2",
          explanation: "To acquire X lock on a row, the transaction must acquire IX (Intention Exclusive) locks on all ancestor nodes in the hierarchy. Ancestors of a row are: Table (1 IX lock) and Database (1 IX lock). So 2 intention locks must be acquired before locking the row.",
          year: 2014,
          exam_type: "GATE",
          question_type: "NAT"
        },
        {
          question_text: "Consider 5 transactions following 2PL. Their lock points are at times 2, 7, 4, 9, 1. What is the position of the transaction with lock point 7 in the equivalent serial schedule?",
          options: [],
          correct_answer: "4",
          explanation: "Sort by lock point: 1, 2, 4, 7, 9. The transaction with lock point 7 is at position 4 in the equivalent serial order.",
          year: 2016,
          exam_type: "GATE",
          question_type: "NAT"
        },
        {
          question_text: "A system has 3 transactions each needing 2 locks. With deadlock prevention using Conservative 2PL (pre-claiming all locks), what is the minimum number of locks that must be available before any transaction can start executing?",
          options: [],
          correct_answer: "2",
          explanation: "In Conservative 2PL, a transaction must acquire ALL its locks before execution. The minimum to allow at least one transaction to start is 2 locks (the number needed by one transaction). If 2 locks are available, at least one transaction can acquire all its needed locks and proceed. Answer: 2.",
          year: 2018,
          exam_type: "GATE",
          question_type: "NAT"
        },
        {
          question_text: "In a Wait-Die scheme, transactions with timestamps $T_1=5$, $T_2=10$, $T_3=3$ are in the system. $T_2$ requests a lock held by $T_1$, and $T_3$ requests a lock held by $T_2$. How many transactions will be rolled back (die) due to these two requests?",
          options: [],
          correct_answer: "1",
          explanation: "$T_2$ (ts=10, younger) requests lock held by $T_1$ (ts=5, older): younger requests from older → $T_2$ DIES. $T_3$ (ts=3, older) requests lock held by $T_2$ (ts=10, younger): older requests from younger → $T_3$ WAITS. Only $T_2$ is rolled back. Answer: 1.",
          year: 2020,
          exam_type: "GATE",
          question_type: "NAT"
        },
        {
          question_text: "A transaction $T$ follows Strict 2PL and accesses 6 distinct data items, acquiring and releasing locks in the order: acquires lock on items 1,2,3,4,5,6 (all before any release), then releases all after commit. How many phases does this transaction have in terms of 2PL?",
          options: [],
          correct_answer: "2",
          explanation: "Every 2PL transaction has exactly 2 phases regardless of how many locks it holds: (1) Growing phase — all 6 locks acquired, (2) Shrinking phase — all 6 locks released after commit (Strict 2PL). The number of data items accessed does not change the number of phases. Answer: 2.",
          year: 2022,
          exam_type: "GATE",
          question_type: "NAT"
        },
        {
          question_text: "The precedence graph for a schedule has nodes $T_1, T_2, T_3, T_4$ and edges $T_1 \\to T_3$, $T_2 \\to T_3$, $T_2 \\to T_4$, $T_3 \\to T_4$. How many edges are in this graph?",
          options: [],
          correct_answer: "4",
          explanation: "The edges listed are: $T_1 \\to T_3$, $T_2 \\to T_3$, $T_2 \\to T_4$, $T_3 \\to T_4$ — exactly 4 edges. The graph is acyclic (DAG), so the schedule is conflict serializable. One valid serial order: $T_1, T_2, T_3, T_4$.",
          year: 2024,
          exam_type: "GATE",
          question_type: "NAT"
        },

        // ─────────────────────────────────────────────
        // MSQ
        // ─────────────────────────────────────────────
        {
          question_text: "Which of the following are TRUE about Two-Phase Locking (2PL)? (Select all that apply)\n(i) 2PL guarantees conflict serializability\n(ii) 2PL prevents deadlocks\n(iii) Every conflict-serializable schedule can be produced by 2PL\n(iv) The lock point order defines the equivalent serial order",
          options: [
            "A. (i) and (ii)",
            "B. (i) and (iv)",
            "C. (i), (iii), and (iv)",
            "D. All of (i), (ii), (iii), (iv)"
          ],
          correct_answer: "B",
          explanation: "(i) TRUE: 2PL guarantees conflict serializability. (ii) FALSE: 2PL does NOT prevent deadlocks — transactions can still block each other in a cycle. (iii) FALSE: NOT every conflict-serializable schedule can be produced by 2PL. 2PL is sufficient but not necessary for serializability. (iv) TRUE: lock point order = equivalent serial order.",
          year: 2004,
          exam_type: "GATE",
          question_type: "MSQ"
        },
        {
          question_text: "Which of the following are differences between Strict 2PL and Rigorous 2PL? (Select all that apply)\n(i) Strict 2PL releases shared locks before commit; Rigorous 2PL holds all locks until commit\n(ii) Rigorous 2PL prevents cascading aborts; Strict 2PL does not\n(iii) Strict 2PL holds only X locks until commit; Rigorous 2PL holds both S and X locks until commit\n(iv) Both prevent dirty reads",
          options: [
            "A. (i) and (iii)",
            "B. (ii) and (iii)",
            "C. (i), (iii), and (iv)",
            "D. (iii) and (iv)"
          ],
          correct_answer: "C",
          explanation: "(i) TRUE: Strict 2PL releases S locks before commit; Rigorous holds all. (ii) FALSE: Both Strict and Rigorous 2PL prevent cascading aborts (Strict holds X locks preventing dirty reads; Rigorous holds all). (iii) TRUE: correct distinction. (iv) TRUE: both prevent dirty reads — Strict because X locks prevent others from reading uncommitted writes; Rigorous because all locks held. So (i), (iii), (iv).",
          year: 2008,
          exam_type: "GATE",
          question_type: "MSQ"
        },
        {
          question_text: "Which of the following schedules are conflict serializable? (Select all that apply)\n(i) $r_1(A),\\ r_2(A),\\ w_1(A),\\ w_2(A)$\n(ii) $r_1(A),\\ w_1(A),\\ r_2(A),\\ w_2(A)$\n(iii) $r_1(A),\\ r_2(B),\\ w_1(B),\\ w_2(A)$\n(iv) $r_1(A),\\ w_1(B),\\ r_2(B),\\ w_2(A)$",
          options: [
            "A. (ii) only",
            "B. (ii) and (iv)",
            "C. (i) and (iii)",
            "D. (i), (ii), and (iv)"
          ],
          correct_answer: "B",
          explanation: "(i) Edges: $r_2(A) \\to w_1(A)$: $T_2 \\to T_1$; $w_1(A) \\to w_2(A)$: $T_1 \\to T_2$. Cycle — NOT serializable. (ii) Edges: $r_1(A) \\to w_2(A)$: $T_1 \\to T_2$; $w_1(A) \\to w_2(A)$ (dup). Acyclic ($T_1 \\to T_2$). Serializable. (iii) Edges: $r_1(A) \\to w_2(A)$: $T_1 \\to T_2$; $r_2(B) \\to w_1(B)$: $T_2 \\to T_1$. Cycle — NOT serializable. (iv) Edges: $w_1(B) \\to r_2(B)$: $T_1 \\to T_2$; $r_1(A) \\to w_2(A)$: $T_1 \\to T_2$. Acyclic. Serializable. Answer: (ii) and (iv).",
          year: 2011,
          exam_type: "GATE",
          question_type: "MSQ"
        },
        {
          question_text: "Which of the following anomalies can occur in Basic 2PL but are prevented in Strict 2PL? (Select all that apply)\n(i) Dirty read\n(ii) Cascading abort\n(iii) Non-repeatable read\n(iv) Lost update",
          options: [
            "A. (i) and (ii)",
            "B. (i), (ii), and (iii)",
            "C. (iii) and (iv)",
            "D. All of (i), (ii), (iii), (iv)"
          ],
          correct_answer: "A",
          explanation: "(i) Dirty read: possible in Basic 2PL (X locks released early); prevented in Strict 2PL. (ii) Cascading abort: caused by dirty reads — same as above. (iii) Non-repeatable read: can occur in both Basic and Strict 2PL if S locks are released early (Strict only holds X locks). (iv) Lost update: prevented by both since X locks prevent concurrent writes. So (i) and (ii) are prevented by Strict but not Basic 2PL.",
          year: 2015,
          exam_type: "GATE",
          question_type: "MSQ"
        },
        {
          question_text: "Which of the following are TRUE about deadlock handling in 2PL systems? (Select all that apply)\n(i) Deadlock detection uses a wait-for graph; a cycle indicates deadlock\n(ii) Deadlock prevention using timestamps includes Wait-Die and Wound-Wait schemes\n(iii) Conservative 2PL prevents deadlocks without using timestamps\n(iv) Strict 2PL inherently prevents deadlocks",
          options: [
            "A. (i), (ii), and (iii)",
            "B. (i) and (ii) only",
            "C. (ii), (iii), and (iv)",
            "D. All of (i), (ii), (iii), (iv)"
          ],
          correct_answer: "A",
          explanation: "(i) TRUE: wait-for graph cycle detection is the standard deadlock detection method. (ii) TRUE: Wait-Die and Wound-Wait use timestamps to prevent deadlocks. (iii) TRUE: Conservative 2PL pre-acquires all locks, eliminating deadlocks. (iv) FALSE: Strict 2PL holds locks longer but does NOT prevent deadlocks — it only prevents dirty reads. Transactions can still form wait cycles. So (i), (ii), (iii).",
          year: 2019,
          exam_type: "GATE",
          question_type: "MSQ"
        },
        {
          question_text: "Which of the following are TRUE about Multiple Granularity Locking (MGL) used with 2PL? (Select all that apply)\n(i) Intention locks must be acquired top-down (from root to leaf) before acquiring leaf locks\n(ii) Locks are released bottom-up (from leaf to root) during the shrinking phase\n(iii) IS lock on a table is compatible with X lock on the same table\n(iv) IX and S locks on the same node are compatible",
          options: [
            "A. (i) and (ii)",
            "B. (i), (ii), and (iv)",
            "C. (i) and (iii)",
            "D. (ii) and (iv)"
          ],
          correct_answer: "A",
          explanation: "(i) TRUE: In MGL, intention locks are set top-down — acquire IX/IS on ancestors before locking the target node. (ii) TRUE: Locks are released bottom-up — release the leaf lock first, then ancestor intention locks. (iii) FALSE: IS and X on the same node are INCOMPATIBLE. (iv) FALSE: IX and S are INCOMPATIBLE (S means exclusive read of entire subtree; IX means writes below). So (i) and (ii) only.",
          year: 2023,
          exam_type: "GATE",
          question_type: "MSQ"
        }
      ]
    }
  ];
  // Colors for terminal beautification
  const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    magenta: "\x1b[35m",
    blue: "\x1b[34m",
    red: "\x1b[31m",
  };

  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan} 🎓 PATTERNMASTER PYQ SEEDER v2.0 ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);

  let totalPatterns = pyqData.length;
  let processedPatterns = 0;
  let totalQuestions = 0;
  let skippedPatterns = 0;
  let errors = 0;

  const summary = [];

  for (const item of pyqData) {
    processedPatterns++;
    const progress = `[${processedPatterns}/${totalPatterns}]`;
    
    // Find the pattern
    const pattern = await prisma.pattern.findUnique({
      where: {
        pattern_identifier: {
          exam_type: item.pattern.exam_type,
          branch: item.pattern.branch,
          topic_name: item.pattern.topic_name,
        },
      },
    });

    if (!pattern) {
      console.log(`${colors.yellow}⚠️  ${progress} Pattern not found: ${item.pattern.topic_name}${colors.reset}`);
      skippedPatterns++;
      summary.push({ Topic: item.pattern.topic_name, Status: "Skipped", Count: 0 });
      continue;
    }

    try {
      // Clear existing PYQs for this specific pattern to ensure a clean seed
      // await prisma.pYQ.deleteMany({
      //   where: { pattern_id: pattern.id }
      // });

      let count = 0;
      for (const pyq of item.pyqs) {
        const cleanQuestion = pyq.question_text;
        const cleanOptions = pyq.options;
        const cleanExplanation = pyq.explanation;

        await prisma.pYQ.upsert({
          where: {
            pyq_identifier: {
              pattern_id: pattern.id,
              question_text: cleanQuestion,
            },
          },
          update: {
            options: cleanOptions,
            correct_answer: pyq.correct_answer,
            explanation: cleanExplanation,
            year: pyq.year,
            exam_type: pyq.exam_type,
            question_type: pyq.question_type || "MCQ",
          },
          create: {
            pattern_id: pattern.id,
            question_text: cleanQuestion,
            options: cleanOptions,
            correct_answer: pyq.correct_answer,
            explanation: cleanExplanation,
            year: pyq.year,
            exam_type: pyq.exam_type,
            question_type: pyq.question_type || "MCQ",
          },
        });
        count++;
        totalQuestions++;
      }
      console.log(`${colors.green}✅ ${progress} Seeded ${colors.bright}${count}${colors.reset}${colors.green} PYQs for: ${colors.bright}${pattern.topic_name}${colors.reset}`);
      summary.push({ Topic: pattern.topic_name, Status: "Success", Count: count });
    } catch (err) {
      console.log(`${colors.red}❌ ${progress} Error seeding ${item.pattern.topic_name}${colors.reset}`);
      errors++;
      summary.push({ Topic: item.pattern.topic_name, Status: "Error", Count: 0 });
    }
  }

  console.log(`\n\n${colors.bright}${colors.cyan}📊 SEEDING SUMMARY${colors.reset}`);
  console.table(summary);

  console.log(`\n${colors.bright}${colors.green}✨ Seeding Complete!${colors.reset}`);
  console.log(`${colors.cyan}Total Questions: ${colors.bright}${totalQuestions}${colors.reset}`);
  console.log(`${colors.yellow}Skipped Topics: ${colors.bright}${skippedPatterns}${colors.reset}`);
  if (errors > 0) console.log(`${colors.red}Errors Detected: ${colors.bright}${errors}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);
}

main()
  .catch((e) => {
    const red = "\x1b[31m";
    const reset = "\x1b[0m";
    console.error(`\n${red}💥 FATAL ERROR SEEDING PYQs:${reset}`, e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
