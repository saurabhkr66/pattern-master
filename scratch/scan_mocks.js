const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.mockTestTemplate.findMany({
    take: 10,
    select: { 
      id: true, 
      title: true, 
      exam_type: true, 
      branch: true,
      total_questions: true,
      max_score: true
    }
  });

  console.log('\n--- MOCK TEST TEMPLATES ---');
  console.log(JSON.stringify(templates, null, 2));
  
  await prisma.$disconnect();
}

main();
