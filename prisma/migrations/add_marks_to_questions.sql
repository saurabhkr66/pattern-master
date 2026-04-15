-- Migration: Add marks column to question tables
-- NAT → 2 marks, MSQ → 2 marks, MCQ Hard (generated) → 2 marks, random ~20% of PYQ/SubjectPYQ MCQs → 2 marks

-- Step 1: Add column with default 1
ALTER TABLE "PYQ"                ADD COLUMN IF NOT EXISTS marks INT NOT NULL DEFAULT 1;
ALTER TABLE "GeneratedQuestion"  ADD COLUMN IF NOT EXISTS marks INT NOT NULL DEFAULT 1;
ALTER TABLE "SubjectPYQ"         ADD COLUMN IF NOT EXISTS marks INT NOT NULL DEFAULT 1;

-- Step 2: NAT → 2 marks
UPDATE "PYQ"               SET marks = 2 WHERE question_type = 'NAT';
UPDATE "GeneratedQuestion" SET marks = 2 WHERE question_type = 'NAT';
UPDATE "SubjectPYQ"        SET marks = 2 WHERE question_type = 'NAT';

-- Step 3: MSQ → 2 marks
UPDATE "PYQ"               SET marks = 2 WHERE question_type = 'MSQ';
UPDATE "GeneratedQuestion" SET marks = 2 WHERE question_type = 'MSQ';
UPDATE "SubjectPYQ"        SET marks = 2 WHERE question_type = 'MSQ';

-- Step 4: MCQ — Hard generated questions → 2 marks; random ~20% of PYQ/SubjectPYQ MCQs → 2 marks
UPDATE "GeneratedQuestion" SET marks = 2 WHERE question_type = 'MCQ' AND difficulty_level = 'Hard';
UPDATE "PYQ"               SET marks = 2 WHERE question_type = 'MCQ' AND random() < 0.2;
UPDATE "SubjectPYQ"        SET marks = 2 WHERE question_type = 'MCQ' AND random() < 0.2;
