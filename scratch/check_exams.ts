import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mockExams = await prisma.mockTestTemplate.groupBy({
    by: ['exam_type'],
    _count: { id: true }
  });
  console.log('Mock Test Exams:', mockExams);

  const pyqExams = await prisma.pYQ.groupBy({
    by: ['exam_type'],
    _count: { id: true }
  });
  console.log('PYQ Exams:', pyqExams);

  const subjectPyqExams = await prisma.subjectPattern.groupBy({
    by: ['exam_type'],
    _count: { id: true }
  });
  console.log('Subject Patterns Exams:', subjectPyqExams);
}

main().finally(() => prisma.$disconnect());
