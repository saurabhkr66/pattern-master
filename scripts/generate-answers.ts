/**
 * Generate answers for questions in a local JSON file using Gemini API.
 *
 * Usage:
 *   npx tsx scripts/generate-answers.ts --file <path>
 *
 * Example:
 *   npx tsx scripts/generate-answers.ts --file c:\Users\saura\OneDrive\Desktop\projects\examside-scraper\data\output\arpita_ugcnet_english_june2025_shift2.json
 */

import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env" });

const ai = new GoogleGenAI({
  vertexai: true,
  project: "project-27ed127f-554a-419a-b39",
  location: "us-central1",
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processFile(filePath: string) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  const raw: any = JSON.parse(fs.readFileSync(absPath, "utf-8"));

  // Handle both flat array and wrapped format
  const isFlatArray = Array.isArray(raw) && raw.length > 0 && raw[0].question_text;
  const questions: any[] = isFlatArray ? raw : raw.flatMap((item: any) => item.questions || []);

  const missingExplanations = questions.filter((q) => !q.explanation || q.explanation.trim() === "");

  console.log(`\nLoaded ${questions.length} questions from ${absPath}`);
  console.log(`Missing explanations: ${missingExplanations.length}`);

  if (missingExplanations.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < missingExplanations.length; i++) {
    const q = missingExplanations[i];
    console.log(`\n[${i + 1}/${missingExplanations.length}] Generating explanation for: "${q.question_text.substring(0, 60)}..."`);

    try {
      const prompt = `You are an expert professor of English Literature. Provide a concise explanation for this question.

Question: ${q.question_text}
Options: ${JSON.stringify(q.options)}
Correct Answer: ${q.correct_answer}

Rules:
1. The correct answer is 100% correct — provide a clear explanation of why this option is correct based on literary facts or context.
2. Keep it concise: 2-4 lines max.
3. No character-level spacing. Write flowing text.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const explanation = response.text ? response.text.trim() : "";

      if (explanation) {
        q.explanation = explanation;
        console.log(`  -> Explanation generated.`);
        fixed++;
      } else {
        console.log(`  -> Failed to get an explanation.`);
        failed++;
      }


      // Save after each success to prevent data loss
      if (isFlatArray) {
        fs.writeFileSync(absPath, JSON.stringify(questions, null, 2), "utf-8");
      } else {
        fs.writeFileSync(absPath, JSON.stringify(raw, null, 2), "utf-8");
      }

      // Respect rate limits (approx 50 RPM)
      await sleep(1200);

    } catch (error) {
      console.error(`  -> Error generating answer:`, error);
      failed++;
      await sleep(2000);
    }
  }

  console.log(`\nDone! Fixed: ${fixed}, Failed: ${failed}`);
}

// Parse args
const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;

if (!filePath) {
  console.log("Usage: npx tsx scripts/generate-answers.ts --file <path>");
  process.exit(1);
}

processFile(filePath);
