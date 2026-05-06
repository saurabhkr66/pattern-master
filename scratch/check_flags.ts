import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.mockTestTemplate.findMany();
  let count = 0;
  for (const t of templates) {
    const questions = t.questions as any[];
    for (const q of questions) {
      if (q.ai_answer_mismatch) {
        console.log(`Found flagged question: ${q.id} in test ${t.title}`);
        count++;
      }
    }
  }
  console.log(`Total flagged mock questions: ${count}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
