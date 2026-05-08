import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

async function migrateFakePYQs(subjectName: string, limit = 500) {
  console.log(`🚀 TARGETED MIGRATION: Moving questions from "${subjectName}" to Question Bank...`);
  console.log(`⚠️ SAFETY: This script ONLY touches the 'PYQ' table. 'SubjectPYQ' table is NOT affected.`);
  
  // 1. Fetch only CSE PYQs for the specific subject
  const fakePyqs = await prisma.pYQ.findMany({
    where: { 
      pattern: { 
        branch: "CSE",
        subject: subjectName
      } 
    },
    include: { pattern: true },
    take: limit
  });

  if (fakePyqs.length === 0) {
    console.log(`ℹ️ No questions found for subject "${subjectName}" in the PYQ table.`);
    return;
  }

  console.log(`📦 Found ${fakePyqs.length} questions in "${subjectName}". Starting transfer...`);

  let successCount = 0;

  for (const pyq of fakePyqs) {
    // Generate a unique semantic hash based on the question text
    const hash = createHash('md5').update(pyq.question_text).digest('hex');
    
    try {
      // 2. Create entry in GeneratedQuestion (Question Bank)
      const newQuestion = await prisma.generatedQuestion.upsert({
        where: { semantic_hash: hash },
        update: {}, // If it already exists, just use the existing record
        create: {
          pattern_id: pyq.pattern_id,
          question_text: pyq.question_text,
          question_text_hindi: pyq.question_text_hindi,
          options: pyq.options as any,
          options_hindi: pyq.options_hindi as any,
          correct_answer: pyq.correct_answer,
          explanation: pyq.explanation,
          explanation_hindi: pyq.explanation_hindi,
          difficulty_level: "Medium",
          semantic_hash: hash,
          question_type: pyq.question_type,
          marks: pyq.marks,
          images: pyq.images as any,
          created_at: pyq.created_at,
          topic: pyq.topic
        }
      });

      // 3. Update User Progress & History (Move pointers from pyq_id to question_id)
      await prisma.attempt.updateMany({
        where: { pyq_id: pyq.id },
        data: { pyq_id: null, question_id: newQuestion.id }
      });
      await prisma.bookmark.updateMany({
        where: { pyq_id: pyq.id },
        data: { pyq_id: null, question_id: newQuestion.id }
      });
      await prisma.questionReport.updateMany({
        where: { pyq_id: pyq.id },
        data: { pyq_id: null, question_id: newQuestion.id }
      });

      // 4. Delete the original 'fake' PYQ record
      await prisma.pYQ.delete({ where: { id: pyq.id } });

      console.log(`✅ [${successCount + 1}] Moved to Bank: ${pyq.question_text.substring(0, 40)}...`);
      successCount++;
    } catch (err: any) {
      console.error(`❌ Error migrating ${pyq.id}:`, err.message);
    }
  }

  console.log(`\n🎉 [${subjectName}] Migration Complete!`);
  console.log(`✅ Questions moved: ${successCount}`);
  console.log(`ℹ️ Now checking the Question Bank for this topic...`);
}

// TARGET SUBJECT: "Operating Systems" (There are 113 questions to move)
migrateFakePYQs("Theory of Computation", 500)
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
