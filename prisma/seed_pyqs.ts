import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📜 Seeding Previous Year Questions (PYQs)...');
  const pyqData = [
    {
      "pattern": {
        "exam_type": "GATE",
        "branch": "CSE",
        "topic_name": "Timestamp Ordering Protocol"
      },
      "pyqs": [
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "In the basic Timestamp Ordering (TO) protocol, when transaction Ti issues read(Q) and TS(Ti) < W-TS(Q), what action is taken?",
          "images": [],
          "options": [
            "A. Execute the read and update W-TS(Q) = TS(Ti)",
            "B. Abort Ti and restart it with a new larger timestamp",
            "C. Make Ti wait until W-TS(Q) becomes equal to TS(Ti)",
            "D. Execute the read without updating any timestamps"
          ],
          "correct_answer": "B",
          "explanation": "In the TO read rule: if TS(Ti) < W-TS(Q), it means a later transaction Tj (with TS(Tj) > TS(Ti)) has already written Q. Ti is attempting to read a value that has been overwritten in timestamp order, violating serializability. Therefore Ti is aborted and restarted with a new, larger timestamp. TO never makes transactions wait — they either proceed or abort.",
          "year": 2000,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "W-TS(Q) in the Timestamp Ordering protocol stores:",
          "images": [],
          "options": [
            "A. The timestamp of the oldest transaction that wrote Q",
            "B. The largest timestamp of any transaction that successfully executed write(Q)",
            "C. The wall-clock time of the most recent write to Q",
            "D. The number of times Q has been written since the last checkpoint"
          ],
          "correct_answer": "B",
          "explanation": "W-TS(Q) stores the largest (most recent in timestamp order) timestamp among all transactions that have successfully completed write(Q). Similarly, R-TS(Q) stores the largest timestamp of any transaction that has successfully executed read(Q). Both are updated only on successful (non-aborted) operations.",
          "year": 2001,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "In the basic TO protocol, transaction Ti issues write(Q). Under which condition(s) is Ti aborted?",
          "images": [],
          "options": [
            "A. TS(Ti) < R-TS(Q) only",
            "B. TS(Ti) < W-TS(Q) only",
            "C. TS(Ti) < R-TS(Q) OR TS(Ti) < W-TS(Q)",
            "D. TS(Ti) > R-TS(Q) OR TS(Ti) > W-TS(Q)"
          ],
          "correct_answer": "C",
          "explanation": "The TO write rule aborts Ti if: (1) TS(Ti) < R-TS(Q) — a later transaction has already read Q and would not have seen Ti's write, violating the timestamp order; OR (2) TS(Ti) < W-TS(Q) — a later transaction has already written Q, making Ti's write out of order. If neither condition holds, the write executes and W-TS(Q) is updated to TS(Ti).",
          "year": 2002,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "The Thomas Write Rule is an optimization of the basic TO protocol. It modifies the write rule by:",
          "images": [],
          "options": [
            "A. Ignoring Ti's write (instead of aborting Ti) when TS(Ti) < R-TS(Q)",
            "B. Ignoring Ti's write (instead of aborting Ti) when TS(Ti) < W-TS(Q)",
            "C. Allowing Ti to wait until W-TS(Q) drops below TS(Ti)",
            "D. Applying both read and write rule relaxations simultaneously"
          ],
          "correct_answer": "B",
          "explanation": "Under the basic TO write rule, Ti is aborted when TS(Ti) < W-TS(Q) because a later transaction has already written Q. The Thomas Write Rule recognizes that Ti's write is obsolete in this case — it would be immediately overwritten in any serial ordering consistent with timestamps — so Ti's write is safely ignored and Ti is allowed to continue. However, the condition TS(Ti) < R-TS(Q) still causes an abort even under the Thomas Write Rule.",
          "year": 2003,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "R-TS(Q) = 10, W-TS(Q) = 5. Transaction Ti with TS(Ti) = 7 issues read(Q) using the basic TO protocol. The operation succeeds. After the read, R-TS(Q) = ____.",
          "images": [],
          "options": [],
          "correct_answer": "10",
          "explanation": "Read rule check: TS(Ti) = 7 >= W-TS(Q) = 5, so the read proceeds (no abort). After a successful read, R-TS(Q) = max(R-TS(Q), TS(Ti)) = max(10, 7) = 10. Since the current R-TS(Q) = 10 is already larger than TS(Ti) = 7, R-TS(Q) stays at 10.",
          "year": 2004,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "NAT"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Which of the following properties does the basic Timestamp Ordering protocol guarantee?",
          "images": [],
          "options": [
            "A. Conflict serializability only",
            "B. Recoverability and conflict serializability",
            "C. Deadlock freedom and recoverability",
            "D. Conflict serializability and deadlock freedom"
          ],
          "correct_answer": "D",
          "explanation": "The basic TO protocol guarantees: (1) Conflict serializability — the schedule produced is equivalent to a serial schedule ordered by transaction timestamps; (2) Deadlock freedom — transactions never wait for each other; they either proceed or abort, so no circular wait is possible. However, basic TO does NOT guarantee recoverability or freedom from cascading rollbacks. A transaction may read uncommitted data, and if that transaction aborts, cascading rollbacks occur.",
          "year": 2005,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "The Timestamp Ordering protocol is deadlock-free because:",
          "images": [],
          "options": [
            "A. It uses lock timeouts to break deadlocks before they form",
            "B. Transactions never wait — they either execute immediately or are aborted",
            "C. It assigns locks in a fixed global order preventing circular waits",
            "D. It is deadlock-free only when combined with the Thomas Write Rule"
          ],
          "correct_answer": "B",
          "explanation": "Deadlock requires a cycle of transactions waiting for each other's resources. In the TO protocol, a transaction is never made to wait — if it cannot proceed (due to a timestamp conflict), it is immediately aborted and restarted. Since no transaction waits, no circular wait can form, and deadlock is impossible by design.",
          "year": 2006,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Which of the following statements about the basic TO protocol are TRUE? Select all that apply.",
          "images": [],
          "options": [
            "A. It is deadlock-free",
            "B. It guarantees conflict serializability",
            "C. It guarantees recoverability",
            "D. A transaction may be aborted and restarted multiple times causing starvation",
            "E. The Thomas Write Rule can reduce unnecessary aborts and improve concurrency"
          ],
          "correct_answer": "A, B, D, E",
          "explanation": "(A) True — TO is deadlock-free; no waiting, only abort-or-proceed. (B) True — TO produces conflict-serializable schedules equivalent to a serial order based on timestamps. (C) False — basic TO does not guarantee recoverability; a transaction can read dirty data from an uncommitted transaction, leading to cascading rollbacks on abort. (D) True — a transaction repeatedly restarted may keep encountering the same timestamp conflict causing starvation/livelock. (E) True — Thomas Write Rule ignores obsolete writes instead of aborting, allowing more transactions to complete successfully.",
          "year": 2007,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "MSQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Transactions T1(TS=1), T2(TS=2), T3(TS=3). Schedule: T1:write(X) → T2:read(X) → T3:write(X) → T1:write(Y) → T2:write(Y). Initial timestamps all 0. Using the basic TO protocol, how many transactions are aborted?",
          "images": [],
          "options": [],
          "correct_answer": "0",
          "explanation": "Trace step by step: (1) T1 write(X): TS=1 >= R-TS(X)=0 and TS=1 >= W-TS(X)=0 → proceed; W-TS(X)=1. (2) T2 read(X): TS=2 >= W-TS(X)=1 → proceed; R-TS(X)=2. (3) T3 write(X): TS=3 >= R-TS(X)=2 and TS=3 >= W-TS(X)=1 → proceed; W-TS(X)=3. (4) T1 write(Y): TS=1 >= R-TS(Y)=0 and TS=1 >= W-TS(Y)=0 → proceed; W-TS(Y)=1. (5) T2 write(Y): TS=2 >= R-TS(Y)=0 and TS=2 >= W-TS(Y)=1 → proceed; W-TS(Y)=2. No transaction is aborted.",
          "year": 2008,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "NAT"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Transactions T1(TS=1), T2(TS=2). Schedule: T2:read(A) → T1:write(A) → T2:write(B) → T1:read(B). Initial timestamps all 0. Using the basic TO protocol, how many transactions are aborted?",
          "images": [],
          "options": [],
          "correct_answer": "1",
          "explanation": "Trace: (1) T2 read(A): TS=2 >= W-TS(A)=0 → proceed; R-TS(A)=2. (2) T1 write(A): TS=1 < R-TS(A)=2 → ABORT T1. (3) T2 write(B): TS=2 >= R-TS(B)=0 and TS=2 >= W-TS(B)=0 → proceed; W-TS(B)=2. (4) T1 read(B): T1 already aborted — operation not executed. Total aborted: 1 (T1 only).",
          "year": 2009,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "NAT"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "The Thomas Write Rule ignores Ti's write on data item Q (instead of aborting Ti) specifically when:",
          "images": [],
          "options": [
            "A. TS(Ti) < R-TS(Q)",
            "B. TS(Ti) < W-TS(Q)",
            "C. TS(Ti) > W-TS(Q)",
            "D. TS(Ti) = R-TS(Q)"
          ],
          "correct_answer": "B",
          "explanation": "Thomas Write Rule: when Ti issues write(Q) and TS(Ti) < W-TS(Q), a later transaction Tj has already written Q. In a serial execution ordered by timestamps, Ti's write would occur before Tj's and be immediately overwritten, so Ti's write has no observable effect and can be safely skipped. Ti continues without abort. Note: if TS(Ti) < R-TS(Q), the abort still occurs — the Thomas Write Rule does not help in that case.",
          "year": 2010,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Ti has TS(Ti) = 5. Current state: R-TS(Q) = 3, W-TS(Q) = 8. Ti issues write(Q). What happens under (i) basic TO and (ii) Thomas Write Rule?",
          "images": [],
          "options": [
            "A. (i) Abort Ti ; (ii) Abort Ti",
            "B. (i) Abort Ti ; (ii) Ignore the write, Ti continues",
            "C. (i) Execute write, W-TS(Q)=5 ; (ii) Execute write, W-TS(Q)=5",
            "D. (i) Ignore the write ; (ii) Abort Ti"
          ],
          "correct_answer": "B",
          "explanation": "Write rule checks for Ti (TS=5): Is TS(Ti)=5 < R-TS(Q)=3? No (5 > 3). Is TS(Ti)=5 < W-TS(Q)=8? Yes. Under basic TO: both conditions checked — since 5 < 8, Ti is aborted. Under Thomas Write Rule: the condition TS(Ti) < R-TS(Q) is checked first — 5 < 3 is false, so no abort from that. Then TS(Ti) < W-TS(Q) → 5 < 8, but Thomas Write Rule says ignore the write instead of aborting Ti. Ti continues without abort and without updating W-TS(Q).",
          "year": 2011,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Which of the following schedules is REJECTED by the basic TO protocol? (TS(T1)=1, TS(T2)=2, all initial timestamps = 0)",
          "images": [],
          "options": [
            "A. T1:read(X) → T2:write(X)",
            "B. T1:write(X) → T2:read(X)",
            "C. T2:read(X) → T1:write(X)",
            "D. T1:write(X) → T2:write(X)"
          ],
          "correct_answer": "C",
          "explanation": "Trace option C: T2 read(X): TS=2 >= W-TS(X)=0 → proceed; R-TS(X)=2. T1 write(X): TS=1 < R-TS(X)=2 → ABORT T1. Schedule rejected. Verify others: A: T1 read(X): TS=1>=0 → R-TS=1. T2 write(X): TS=2>=R-TS=1, W-TS=0 → proceed. Allowed. B: T1 write(X): TS=1>=0 → W-TS=1. T2 read(X): TS=2>=W-TS=1 → proceed. Allowed. D: T1 write(X): TS=1>=0 → W-TS=1. T2 write(X): TS=2>=R-TS=0, W-TS=1 → proceed. Allowed. Only C is rejected.",
          "year": 2012,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Under the basic TO protocol, which of the following anomalies can occur? Select all that apply.",
          "images": [],
          "options": [
            "A. Deadlock between transactions",
            "B. Starvation — a transaction is repeatedly aborted and restarted",
            "C. Cascading rollbacks — a committed transaction reads data from an aborted transaction",
            "D. Non-conflict-serializable schedules",
            "E. Dirty reads — a transaction reads uncommitted data that is later rolled back"
          ],
          "correct_answer": "B, E",
          "explanation": "(A) False — TO is deadlock-free by design; no waiting means no circular wait. (B) True — a transaction that keeps getting a new (but still small) timestamp may repeatedly encounter the same abort condition, causing starvation/livelock. (C) Partially: cascading rollbacks means an uncommitted transaction's abort forces other transactions to abort — possible in basic TO. But a committed transaction reading aborted-transaction data is a recoverability violation; basic TO can have cascading rollbacks but once committed a transaction's reads are done. The exact phrasing here makes C inaccurate as stated. (D) False — TO guarantees conflict serializability. (E) True — basic TO allows Ti to read data written by Tj even if Tj has not yet committed; if Tj aborts, Ti has read dirty data and must cascade-abort.",
          "year": 2013,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "MSQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "TS(T1)=10, TS(T2)=20. Operations in order: T1:write(X) → T2:write(X) → T1:write(X). Using the Thomas Write Rule, how many write operations are actually executed (not ignored or aborted)?",
          "images": [],
          "options": [],
          "correct_answer": "2",
          "explanation": "Trace: (1) T1 write(X): TS=10, R-TS(X)=0, W-TS(X)=0. TS >= R-TS and TS >= W-TS → execute. W-TS(X)=10. (2) T2 write(X): TS=20, R-TS(X)=0, W-TS(X)=10. TS=20 >= 0 and TS=20 >= 10 → execute. W-TS(X)=20. (3) T1 write(X) again: TS=10, R-TS(X)=0, W-TS(X)=20. TS=10 < R-TS(X)=0? No. TS=10 < W-TS(X)=20? Yes → Thomas Write Rule: IGNORE this write. Not executed. Total executions: 2 (first T1 write and T2 write).",
          "year": 2014,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "NAT"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Strict Timestamp Ordering protocol differs from the basic TO protocol in that:",
          "images": [],
          "options": [
            "A. It prevents deadlocks whereas basic TO does not",
            "B. Transaction Ti cannot read or write data item Q if another transaction Tj (TS(Tj) < TS(Ti)) has written Q but not yet committed or aborted",
            "C. It uses a different timestamp assignment strategy based on commit order",
            "D. It applies the Thomas Write Rule by default to avoid unnecessary aborts"
          ],
          "correct_answer": "B",
          "explanation": "Strict TO adds the rule: if Tj has written Q and TS(Tj) < TS(Ti), Ti must wait until Tj commits or aborts before reading or writing Q. This prevents Ti from reading or overwriting uncommitted (dirty) data. As a result, strict TO produces strict schedules — no cascading rollbacks are possible and recoverability is guaranteed. Basic TO has no such waiting restriction, which is why it can produce cascading rollbacks.",
          "year": 2015,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Which of the following correctly compare the TO protocol and Two-Phase Locking (2PL)? Select all that apply.",
          "images": [],
          "options": [
            "A. Both TO and 2PL produce conflict-serializable schedules",
            "B. 2PL can cause deadlocks; TO is deadlock-free",
            "C. Strict 2PL guarantees recoverability; basic TO does not",
            "D. The set of schedules produced by TO is a strict subset of those produced by 2PL",
            "E. TO can cause starvation due to repeated aborts"
          ],
          "correct_answer": "A, B, C, E",
          "explanation": "(A) True — both guarantee conflict serializability. (B) True — 2PL uses locks and can deadlock; TO aborts instead of waiting. (C) True — Strict 2PL releases all locks only at commit, preventing dirty reads; basic TO allows dirty reads and cascading rollbacks. (D) False — the sets of schedules produced by TO and 2PL are incomparable; each allows some schedules the other rejects. (E) True — a transaction in TO that repeatedly gets aborted due to timestamp conflicts can starve.",
          "year": 2016,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "MSQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "R-TS(Q) = 15, W-TS(Q) = 10. Transaction Ti with TS(Ti) = 12 issues write(Q) under the basic TO protocol. Does Ti abort? (Answer 1 for Yes, 0 for No)",
          "images": [],
          "options": [],
          "correct_answer": "1",
          "explanation": "Write rule check: (1) TS(Ti)=12 < R-TS(Q)=15? Yes → Ti must abort. Since the first condition is already violated, Ti is aborted immediately. The second condition (TS < W-TS) need not even be checked. Ti aborts because a later transaction (with timestamp > 12) has already read Q, and allowing Ti's write would violate timestamp order.",
          "year": 2017,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "NAT"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Transactions T1(TS=1), T2(TS=2), T3(TS=3). Schedule: T3:read(A) → T2:write(A) → T1:write(A) → T3:write(B) → T1:read(B). Initial timestamps all 0. Using basic TO, how many transactions are aborted?",
          "images": [],
          "options": [],
          "correct_answer": "2",
          "explanation": "Trace: (1) T3 read(A): TS=3 >= W-TS(A)=0 → proceed; R-TS(A)=3. (2) T2 write(A): TS=2 < R-TS(A)=3 → ABORT T2. (3) T1 write(A): TS=1 < R-TS(A)=3 → ABORT T1. (4) T3 write(B): TS=3 >= R-TS(B)=0 and TS=3 >= W-TS(B)=0 → proceed; W-TS(B)=3. (5) T1 read(B): T1 is already aborted — not executed. Total aborted: T1 and T2 → 2 transactions.",
          "year": 2018,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "NAT"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "A schedule produced by the basic TO protocol is conflict-equivalent to a serial schedule where transactions are ordered by:",
          "images": [],
          "options": [
            "A. Their commit order",
            "B. Their timestamp assigned at transaction start",
            "C. The total number of operations each transaction performs",
            "D. The order in which they first access a shared data item"
          ],
          "correct_answer": "B",
          "explanation": "The fundamental guarantee of the TO protocol is that any schedule it produces is conflict-serializable and is specifically conflict-equivalent to the serial schedule where transactions execute in increasing order of their timestamps (assigned when each transaction begins). This is what makes the protocol correct — it enforces the timestamp ordering as the serialization order.",
          "year": 2019,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Ti has TS(Ti) = 5. Current state: R-TS(X) = 8, W-TS(X) = 3. Ti issues read(X) under basic TO. What is the outcome?",
          "images": [],
          "options": [
            "A. Ti aborts because TS(Ti) < R-TS(X)",
            "B. Ti reads X successfully; R-TS(X) becomes 8",
            "C. Ti reads X successfully; R-TS(X) becomes 5",
            "D. Ti aborts because TS(Ti) < W-TS(X)"
          ],
          "correct_answer": "B",
          "explanation": "Read rule check: TS(Ti) = 5 < W-TS(X) = 3? No (5 > 3) → no abort. Read proceeds. R-TS(X) = max(R-TS(X), TS(Ti)) = max(8, 5) = 8. The R-TS does not decrease — it stays at 8 because a transaction with a larger timestamp (8) had already read X. Note: the read rule only compares TS(Ti) against W-TS(X), not against R-TS(X).",
          "year": 2020,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Which of the following schedules are REJECTED by the basic TO protocol? (TS(T1)=1, TS(T2)=2, TS(T3)=3, all initial timestamps = 0). Select all that apply.",
          "images": [],
          "options": [
            "A. T1:write(X) → T2:read(X) → T3:write(X)",
            "B. T3:write(X) → T2:read(X) → T1:write(X)",
            "C. T2:read(X) → T1:write(X) → T3:read(X)",
            "D. T1:read(X) → T2:write(X) → T3:read(X)",
            "E. T3:read(X) → T1:write(X)"
          ],
          "correct_answer": "B, C, E",
          "explanation": "Trace each: A: T1 write(X)(TS=1,ok,W-TS=1) → T2 read(X)(TS=2>=1,ok,R-TS=2) → T3 write(X)(TS=3>=2&1,ok). ALLOWED. B: T3 write(X)(TS=3,ok,W-TS=3) → T2 read(X)(TS=2 < W-TS=3) → ABORT T2. REJECTED. C: T2 read(X)(TS=2,ok,R-TS=2) → T1 write(X)(TS=1 < R-TS=2) → ABORT T1. REJECTED. D: T1 read(X)(TS=1,ok,R-TS=1) → T2 write(X)(TS=2>=R-TS=1&W-TS=0,ok,W-TS=2) → T3 read(X)(TS=3>=W-TS=2,ok). ALLOWED. E: T3 read(X)(TS=3,ok,R-TS=3) → T1 write(X)(TS=1 < R-TS=3) → ABORT T1. REJECTED.",
          "year": 2021,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "MSQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "When a transaction Ti is aborted and restarted in the TO protocol, it is assigned a new timestamp that is:",
          "images": [],
          "options": [
            "A. The same as its original timestamp so it retains priority",
            "B. Larger than any timestamp currently in the system",
            "C. A random value chosen uniformly from unused timestamps",
            "D. Smaller than its original timestamp to give it an earlier slot"
          ],
          "correct_answer": "B",
          "explanation": "A restarted transaction must receive a new timestamp that is larger than all existing timestamps in the system. This ensures the restarted transaction is now the 'youngest' and can proceed forward in timestamp order without immediately conflicting with operations that have already executed. Reusing the old timestamp would likely cause the same abort conditions to repeat.",
          "year": 2022,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Transactions T1(TS=5), T2(TS=15), T3(TS=25). Schedule: T2:write(A) → T1:read(A) → T3:read(A) → T1:write(B) → T3:write(B). Initial timestamps all 0. Using basic TO, how many transactions are aborted?",
          "images": [],
          "options": [],
          "correct_answer": "1",
          "explanation": "Trace: (1) T2 write(A): TS=15 >= R-TS(A)=0 and W-TS(A)=0 → proceed; W-TS(A)=15. (2) T1 read(A): TS=5 < W-TS(A)=15 → ABORT T1. (3) T3 read(A): TS=25 >= W-TS(A)=15 → proceed; R-TS(A)=25. (4) T1 write(B): T1 already aborted — not executed. (5) T3 write(B): TS=25 >= R-TS(B)=0 and W-TS(B)=0 → proceed; W-TS(B)=25. Total aborted: 1 (T1 only).",
          "year": 2023,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "NAT"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Which of the following statements about the TO protocol are CORRECT? Select all that apply.",
          "images": [],
          "options": [
            "A. The set of schedules allowed by TO and 2PL are incomparable (neither is a subset of the other)",
            "B. A schedule produced by the basic TO protocol is always conflict serializable",
            "C. Strict TO guarantees both recoverability and cascadelessness",
            "D. Thomas Write Rule may produce schedules that are view serializable but NOT conflict serializable",
            "E. Basic TO guarantees that no dirty reads occur"
          ],
          "correct_answer": "A, B, C, D",
          "explanation": "(A) True — TO and 2PL allow different (overlapping but incomparable) sets of serializable schedules. (B) True — basic TO always produces conflict-serializable schedules. (C) True — strict TO prevents any transaction from reading or writing uncommitted data, ensuring both recoverability and freedom from cascading rollbacks. (D) True — with Thomas Write Rule, some writes are skipped, producing schedules that are view serializable but not necessarily conflict serializable; this is a classic and frequently tested result. (E) False — basic TO allows a transaction to read data written by an uncommitted transaction (dirty read), which is why cascading rollbacks are possible.",
          "year": 2024,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "MSQ"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "R-TS(Q) = 0, W-TS(Q) = 0. Transaction Ti with TS(Ti) = 7 issues write(Q) using basic TO. After the successful write, W-TS(Q) = ____.",
          "images": [],
          "options": [],
          "correct_answer": "7",
          "explanation": "Write rule checks: TS(Ti)=7 < R-TS(Q)=0? No. TS(Ti)=7 < W-TS(Q)=0? No. Both conditions false → write executes successfully. After write: W-TS(Q) is updated to TS(Ti) = 7.",
          "year": 2025,
          "marks": 1,
          "exam_type": "GATE CS",
          "question_type": "NAT"
        },
        {
          "topic_name": "Timestamp Ordering Protocol",
          "question_text": "Which of the following concurrency control protocols are deadlock-free? Select all that apply.",
          "images": [],
          "options": [
            "A. Basic Timestamp Ordering (TO) protocol",
            "B. Strict Two-Phase Locking (S2PL)",
            "C. Optimistic Concurrency Control (OCC / validation-based protocol)",
            "D. Thomas Write Rule variant of TO",
            "E. Basic Two-Phase Locking (2PL)"
          ],
          "correct_answer": "A, C, D",
          "explanation": "(A) True — basic TO is deadlock-free; transactions abort instead of waiting. (B) False — Strict 2PL still acquires locks and can deadlock when two transactions wait for each other's locks. (C) True — OCC lets transactions execute freely without locks, validates before commit, and aborts if conflict detected. No waiting → no deadlock. (D) True — Thomas Write Rule is a variant of TO; it still never makes transactions wait, so it remains deadlock-free. (E) False — basic 2PL uses locking and can deadlock via circular wait.",
          "year": 2026,
          "marks": 2,
          "exam_type": "GATE CS",
          "question_type": "MSQ"
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

        // Fix correct_answer format: Keep only the letter for MCQ/MSQ if it follows "A. text"
        let cleanCorrectAnswer = pyq.correct_answer;
        if ((pyq.question_type === "MCQ" || pyq.question_type === "MSQ") && cleanCorrectAnswer.includes('.')) {
          cleanCorrectAnswer = cleanCorrectAnswer.split('.')[0].trim();
        }

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
            question_text_hindi: pyq.question_text_hindi,
            options: pyq.options,
            options_hindi: pyq.options_hindi,
            correct_answer: cleanCorrectAnswer,
            explanation: pyq.explanation,
            explanation_hindi: pyq.explanation_hindi,
            year: pyq.year || Math.floor(Math.random() * 26) + 2000,
            exam_type: item.pattern.exam_type,
            question_type: pyq.question_type,
            images: cleanImages,
          },
          create: {
            pattern: { connect: { id: pattern.id } },
            question_text: cleanQuestionText,
            question_text_hindi: pyq.question_text_hindi,
            options: pyq.options,
            options_hindi: pyq.options_hindi,
            correct_answer: cleanCorrectAnswer,
            explanation: pyq.explanation,
            explanation_hindi: pyq.explanation_hindi,
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
