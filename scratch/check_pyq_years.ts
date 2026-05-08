import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pyqs = await prisma.pYQ.findMany({
    where: { exam_type: "GATE" },
    select: { year: true, id: true }
  });

  const yearCounts: Record<number, number> = {};
  pyqs.forEach(q => {
    yearCounts[q.year] = (yearCounts[q.year] || 0) + 1;
  });

  console.log("GATE PYQ Year Distribution:");
  Object.entries(yearCounts).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([year, count]) => {
    console.log(`- Year ${year}: ${count} questions`);
  });
}

main();
