
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const patterns = await prisma.pattern.findMany({
      select: { topic_name: true, exam_type: true, branch: true },
      take: 10
    });
    console.log('Patterns in DB:');
    console.log(JSON.stringify(patterns, null, 2));
    
    const pyqs = await prisma.pYQ.findMany({
        take: 5
    });
    console.log('PYQs in DB:');
    console.log(JSON.stringify(pyqs, null, 2));
  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
