
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addImageColumn() {
  try {
    console.log("Applying manual SQL for images column...");
    
    // Add images column to PYQ
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PYQ" 
      ADD COLUMN IF NOT EXISTS "images" JSONB;
    `).catch(e => console.log("Note: PYQ images column may already exist or error occurred:", e.message));

    // Add images column to GeneratedQuestion
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "GeneratedQuestion" 
      ADD COLUMN IF NOT EXISTS "images" JSONB;
    `).catch(e => console.log("Note: GeneratedQuestion images column may already exist or error occurred:", e.message));

    console.log("🚀 SQL migration applied.");
  } catch (err) {
    console.error("❌ Critical error in migration script:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

addImageColumn();
