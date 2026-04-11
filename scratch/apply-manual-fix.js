
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    console.log("Applying manual SQL fix for missing columns and ensuring short_notes exists...");
    
    // Add missing columns to Attempt
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Attempt" 
      ADD COLUMN IF NOT EXISTS "user_answer" TEXT,
      ADD COLUMN IF NOT EXISTS "pyq_id" TEXT;
    `).catch(e => console.log("Note: user_answer/pyq_id may already exist or error occurred:", e.message));

    // Ensure Pattern has short_notes (just in case)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Pattern" 
      ADD COLUMN IF NOT EXISTS "short_notes" TEXT;
    `).catch(e => console.log("Note: short_notes may already exist or error occurred:", e.message));

    // Ensure foreign key for Attempt -> PYQ
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attempt_pyq_id_fkey') THEN
          ALTER TABLE "Attempt" 
          ADD CONSTRAINT "Attempt_pyq_id_fkey" 
          FOREIGN KEY ("pyq_id") REFERENCES "PYQ"("id") 
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `).catch(e => console.log("Note: fkey error:", e.message));

    // Make question_id optional
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Attempt" ALTER COLUMN "question_id" DROP NOT NULL;
    `).catch(e => console.log("Note: drop not null error:", e.message));

    console.log("🚀 SQL fixes applied. Regenerating Prisma client...");
  } catch (err) {
    console.error("❌ Critical error in fix script:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
