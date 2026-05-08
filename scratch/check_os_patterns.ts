import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const patterns = await prisma.pattern.findMany({
    where: { branch: "CSE", exam_type: "GATE", subject: "Operating Systems" },
    select: { topic_name: true }
  });

  console.log("OS Topics in DB:");
  patterns.forEach(p => console.log(`- ${p.topic_name}`));
}

main();
