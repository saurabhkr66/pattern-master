import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Starting database cleanup for duplicate topics...');
  
  const patterns = await prisma.pattern.findMany();
  let mergedCount = 0;
  let trimmedCount = 0;
  
  for (const pattern of patterns) {
    const trimmedName = pattern.topic_name.trim();
    
    // Check if the name has leading or trailing whitespace
    if (pattern.topic_name !== trimmedName) {
      console.log(`\nFound issue: "${pattern.topic_name}" (ID: ${pattern.id})`);
      
      // Look for the "correct" pattern (one with the same trimmed name)
      const correctPattern = await prisma.pattern.findFirst({
        where: {
          topic_name: trimmedName,
          exam_type: pattern.exam_type,
          branch: pattern.branch,
          subject: pattern.subject
        }
      });

      if (correctPattern && correctPattern.id !== pattern.id) {
        console.log(`🔗 Merging into existing topic: "${trimmedName}" (ID: ${correctPattern.id})`);
        
        // 1. Move all PYQs to the correct pattern
        const pyqResult = await prisma.pYQ.updateMany({
          where: { pattern_id: pattern.id },
          data: { pattern_id: correctPattern.id }
        });
        console.log(`   ✅ Moved ${pyqResult.count} PYQs`);

        // 2. Move all GeneratedQuestions to the correct pattern
        const genQResult = await prisma.generatedQuestion.updateMany({
          where: { pattern_id: pattern.id },
          data: { pattern_id: correctPattern.id }
        });
        console.log(`   ✅ Moved ${genQResult.count} Generated Questions`);

        // 3. Delete the duplicate pattern
        await prisma.pattern.delete({
          where: { id: pattern.id }
        });
        console.log(`   ✅ Deleted duplicate pattern`);
        mergedCount++;
      } else {
        // If no "correct" version exists, just rename this one
        console.log(`📝 No duplicate found, simply trimming name to "${trimmedName}"`);
        await prisma.pattern.update({
          where: { id: pattern.id },
          data: { topic_name: trimmedName }
        });
        trimmedCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(40));
  console.log('✨ Cleanup Complete!');
  console.log(`Topics Merged & Deleted: ${mergedCount}`);
  console.log(`Topics Trimmed:          ${trimmedCount}`);
  console.log('='.repeat(40));
}

main()
  .catch((e) => {
    console.error('❌ Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
