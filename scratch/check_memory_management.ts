import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const topicsToMerge = [
    "Memory Management Basics",
    "Paging",
    "Segmentation",
    "Paging & Segmentation",
    "Page Replacement Algorithms",
    "Virtual Memory"
  ];

  const patterns = await prisma.pattern.findMany({
    where: { 
      branch: "CSE",
      topic_name: { in: topicsToMerge }
    },
    include: {
      _count: {
        select: {
          questions: true,
          pyqs: true
        }
      }
    }
  });

  console.log("Memory Management Sub-topics status:");
  patterns.forEach(p => {
    console.log(`- ${p.topic_name}: ${p._count.pyqs} PYQs, ${p._count.questions} Question Bank`);
  });
}

main();
