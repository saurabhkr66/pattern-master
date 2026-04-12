import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log("🚀 Running manual table creation via API...");
    
    // Create Table
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
    `);

    // Create Index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "TestSession_user_id_created_at_idx"
        ON "TestSession"("user_id", "created_at" DESC);
    `);

    return NextResponse.json({ success: true, message: "TestSession table and index created successfully." });
  } catch (error: any) {
    console.error("❌ Table creation failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
