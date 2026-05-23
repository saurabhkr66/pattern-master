import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const project = process.env.GOOGLE_CLOUD_PROJECT || 'project-27ed127f-554a-419a-b39';
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

const ai = new GoogleGenAI({
  vertexai: true,
  project: project,
  location: location
});

const MODEL = 'gemini-2.5-pro'; // Pro is better for complex PDF analysis

async function processBatch(questions: any[], pdfBase64: string, mockId: string, fullQuestions: any[]) {
  if (questions.length === 0) return;

  const questionsList = questions.map((q, i) => `
QUESTION ${i + 1} (ID: ${q.id}):
Text: ${q.question_text}
Options: ${JSON.stringify(q.options)}
Correct Answer: ${q.correct_answer}
`).join('\n---\n');

  const prompt = `
You are an expert examiner. Attached is a PDF containing solutions/explanations for a competitive exam.
Below is a list of questions from a mock test.

TASK:
1. Find the explanation for each question in the provided PDF.
2. Rewrite the explanation in your OWN WORDS. It should be clear, concise, and educational.
3. If the question involves math, use LaTeX format (e.g., $x^2$).
4. Return the result as a JSON array of objects, where each object has "id" and "explanation".

QUESTIONS TO PROCESS:
${questionsList}

IMPORTANT:
- Output ONLY the raw JSON array.
- Do not include markdown code blocks like \`\`\`json.
- If you cannot find an explanation for a specific question, provide a high-quality one yourself based on your knowledge.
`;

  try {
    console.log(`🤖 Sending batch of ${questions.length} questions to Gemini...`);
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: pdfBase64,
                mimeType: "application/pdf"
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = result.text || "";
    // Remove only dangerous control characters, preserving \n, \r, and \t
    const jsonStr = responseText
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "") 
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    
    const updates = JSON.parse(jsonStr);

    console.log(`📝 Received ${updates.length} explanations. Patching DB surgically...`);

    let saved = 0;
    for (const update of updates) {
      const idx = fullQuestions.findIndex(q => q.id === update.id);
      if (idx === -1) continue;

      const q = fullQuestions[idx];
      fullQuestions[idx].explanation = update.explanation;

      console.log(`\n   --------------------------------------------------`);
      console.log(`   ✅ ID: ${q.id}`);
      console.log(`   Q: ${q.question_text.substring(0, 200)}${q.question_text.length > 200 ? '...' : ''}`);
      if (q.options) console.log(`   Options: ${JSON.stringify(q.options)}`);
      console.log(`   Answer:  ${q.correct_answer}`);
      console.log(`   --- EXPLANATION ---`);
      console.log(`   ${update.explanation}`);
      console.log(`   --------------------------------------------------\n`);

      // Surgical JSONB patch — sends ~explanation-size bytes, returns just affected count
      const path = `{${idx},explanation}`;
      await prisma.$executeRaw`
        UPDATE "MockTestTemplate"
        SET questions = jsonb_set(questions, ${path}::text[], to_jsonb(${update.explanation}::text))
        WHERE id = ${mockId}
      `;
      saved++;
    }
    console.log(`💾 Patched ${saved} questions in DB.`);

  } catch (error) {
    console.error('💥 Error in batch processing:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/pdf-mock-explanations.ts <pdf_path> <mock_id>');
    process.exit(1);
  }

  const [pdfPath, mockId] = args;

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF file not found: ${pdfPath}`);
    process.exit(1);
  }

  const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');

  console.log(`🔍 Fetching Mock Test Template: ${mockId}`);
  const template = await prisma.mockTestTemplate.findUnique({
    where: { id: mockId },
    select: { id: true, questions: true }
  });

  if (!template) {
    console.error('❌ Mock Test Template not found.');
    process.exit(1);
  }

  const questions = (template.questions as any[]) || [];
  const missing = questions.filter(q => !q.explanation || q.explanation.trim() === "");

  console.log(`🚀 Found ${questions.length} total questions, ${missing.length} need explanations.`);

  if (missing.length === 0) {
    console.log('✅ All questions already have explanations.');
    process.exit(0);
  }

  // Process in batches of 5 to ensure Gemini Pro can handle the context and PDF complexity
  const BATCH_SIZE = 5;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    console.log(`\n--- Processing Batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(missing.length / BATCH_SIZE)} ---`);
    await processBatch(missing.slice(i, i + BATCH_SIZE), pdfBase64, mockId, questions);
  }

  console.log('\n✨ All explanations generated and saved successfully!');
  await prisma.$disconnect();
}

main();
