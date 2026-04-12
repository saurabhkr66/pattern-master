import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Attempting to create TestSession table manually via executeRaw...')
  
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TestSession" (
        "id"              TEXT        NOT NULL PRIMARY KEY,
        "user_id"         TEXT        NOT NULL,
        "score"           DOUBLE PRECISION NOT NULL,
        "max_score"       DOUBLE PRECISION NOT NULL,
        "total_questions" INTEGER     NOT NULL,
        "correct_count"   INTEGER     NOT NULL,
        "wrong_count"     INTEGER     NOT NULL,
        "skipped_count"   INTEGER     NOT NULL,
        "time_taken_secs" INTEGER,
        "answers"         JSONB       NOT NULL,
        "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('✅ Table "TestSession" created or already exists.')

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "TestSession_user_id_created_at_idx"
        ON "TestSession"("user_id", "created_at" DESC);
    `)
    console.log('✅ Index created.')
    
  } catch (error) {
    console.error('❌ Failed to create table:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
