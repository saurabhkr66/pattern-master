import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📝 Seeding Premium Vibrant Notes...');

  const notes = [
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
