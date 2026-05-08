import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pyqCount = await prisma.pYQ.count({
    where: { 
      pattern: { branch: "CSE" } 
    }
  });

  const subjects = await prisma.pYQ.findMany({
    where: { pattern: { branch: "CSE" } },
    select: { pattern: { select: { subject: true } } },
    distinct: ["pattern_id"] // This is a bit slow but gives us an idea
  });

  const subjectCounts: Record<string, number> = {};
  
  // To be more efficient, let's group by subject via patterns
  const patterns = await prisma.pattern.findMany({
    where: { branch: "CSE" },
    include: { _count: { select: { pyqs: true } } }
  });

  patterns.forEach(p => {
    subjectCounts[p.subject] = (subjectCounts[p.subject] || 0) + p._count.pyqs;
  });

  console.log(`TOTAL CSE PYQs (to be moved): ${pyqCount}`);
  console.log("Subject Distribution in PYQ table:");
  Object.entries(subjectCounts).forEach(([subject, count]) => {
    if (count > 0) console.log(`- ${subject}: ${count} questions`);
  });
}

main();
