-- CreateTable
CREATE TABLE "Pattern" (
    "id" TEXT NOT NULL,
    "exam_type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic_name" TEXT NOT NULL,
    "atomic_logic" TEXT NOT NULL,

    CONSTRAINT "Pattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedQuestion" (
    "id" TEXT NOT NULL,
    "pattern_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "difficulty_level" TEXT NOT NULL,
    "semantic_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedQuestion_semantic_hash_key" ON "GeneratedQuestion"("semantic_hash");

-- AddForeignKey
ALTER TABLE "GeneratedQuestion" ADD CONSTRAINT "GeneratedQuestion_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "Pattern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
