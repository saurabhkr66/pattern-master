-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL DEFAULT 'guest_user',
    "question_id" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "GeneratedQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
