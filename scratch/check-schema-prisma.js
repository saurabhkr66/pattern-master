
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log("Checking database schema...");
    
    // Check if PYQ table exists by trying a count
    try {
      const pyqCount = await prisma.pYQ.count();
      console.log(`✅ PYQ table exists. Count: ${pyqCount}`);
    } catch (e) {
      console.log(`❌ PYQ table does not exist or is inaccessible: ${e.message}`);
    }

    // Check columns in Attempt table
    try {
      const attempt = await prisma.attempt.findFirst();
      if (attempt) {
        console.log("✅ Attempt table exists. Columns present:");
        console.log(Object.keys(attempt));
      } else {
        console.log("✅ Attempt table exists but is empty.");
      }
    } catch (e) {
      console.log(`❌ Attempt table error: ${e.message}`);
    }
  } catch (err) {
    console.error("Critical error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
