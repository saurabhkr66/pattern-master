
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'prisma', 'seed_pyqs.ts');
const content = fs.readFileSync(filePath, 'utf8');

console.log('File size:', content.length, 'bytes');

function extractRobustly(text) {
    const lines = text.split('\n');
    let inArray = false;
    let arrayLines = [];
    const allArrays = [];

    for (let line of lines) {
        if (line.includes('const pyqData = [')) {
            inArray = true;
            arrayLines = ['['];
            continue;
        }

        if (inArray) {
            arrayLines.push(line);
            // Look for the end of the array definition "];" at the start of a line (roughly)
            if (line.trim() === '];') {
                inArray = false;
                allArrays.push(arrayLines.join('\n'));
            }
        }
    }
    return allArrays;
}

const allDataStrings = extractRobustly(content);
console.log(`Found ${allDataStrings.length} candidate arrays.`);

function extractQuestions(item) {
    let questions = [];
    if (Array.isArray(item)) {
        item.forEach(i => {
            questions = questions.concat(extractQuestions(i));
        });
    } else if (item && typeof item === 'object') {
        if (item.pattern && item.pyqs) {
            item.pyqs.forEach(q => {
                const subQuestions = extractQuestions(q);
                subQuestions.forEach(sq => {
                    questions.push({
                        ...sq,
                        topic_name: item.pattern.topic_name || sq.topic_name,
                        exam_type: item.pattern.exam_type || sq.exam_type,
                        branch: "CSE"
                    });
                });
            });
        } else if (item.question_text) {
            questions.push({
                ...item,
                branch: item.branch || "CSE"
            });
        } else if (item.pyqs && Array.isArray(item.pyqs)) {
            // Handle double nesting like { pyqs: [ { pyqs: [...] } ] }
            item.pyqs.forEach(q => {
                questions = questions.concat(extractQuestions(q));
            });
        }
    }
    return questions;
}

const allQuestions = [];
for (let dataStr of allDataStrings) {
    try {
        const data = eval(dataStr);
        allQuestions.push(...extractQuestions(data));
        console.log(`Extracted questions from an array.`);
    } catch (e) {
        console.error(`Failed to parse a data block:`, e.message);
    }
}

console.log(`Total questions collected: ${allQuestions.length}`);

if (allQuestions.length === 0) {
    console.error('No questions found!');
    process.exit(1);
}

// De-duplicate questions
const uniqueQuestions = {};
allQuestions.forEach(q => {
    if (!q.question_text) return;
    const key = `${q.topic_name}|${q.question_text.trim().substring(0, 200)}`;
    if (!uniqueQuestions[key]) {
        uniqueQuestions[key] = q;
    }
});

const dedupedQuestions = Object.values(uniqueQuestions);
console.log(`After de-duplication: ${dedupedQuestions.length} questions.`);

const grouped = {};
dedupedQuestions.forEach(q => {
    const topic = q.topic_name || "Unknown Topic";
    const exam = q.exam_type || "GATE";
    const key = `${topic}|${exam}|CSE`;

    if (!grouped[key]) {
        grouped[key] = {
            pattern: {
                topic_name: topic,
                exam_type: exam,
                branch: "CSE",
            },
            pyqs: []
        };
    }
    
    grouped[key].pyqs.push({
        question_text: q.question_text,
        options: Array.isArray(q.options) ? q.options : [],
        correct_answer: q.correct_answer || "A",
        explanation: q.explanation || "",
        year: q.year || 2026,
        question_type: q.question_type || "MCQ",
        images: q.images || null
    });
});

const finalPyqData = Object.values(grouped);

const newFileContent = `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📜 Seeding Previous Year Questions (PYQs)...');
  const pyqData = ${JSON.stringify(finalPyqData, null, 2)};

  const colors = {
    reset: "\\x1b[0m",
    bright: "\\x1b[1m",
    green: "\\x1b[32m",
    yellow: "\\x1b[33m",
    red: "\\x1b[31m",
    cyan: "\\x1b[36m",
  };

  console.log(\`\\n\${colors.bright}\${colors.cyan}════════════════════════════════════════════════════════════\${colors.reset}\`);
  console.log(\` \${colors.bright}🎓 PATTERNMASTER PYQ SEEDER v2.3 (Robust Restore) \${colors.reset}\`);
  console.log(\`\${colors.bright}\${colors.cyan}════════════════════════════════════════════════════════════\${colors.reset}\\n\`);

  const totalPatterns = pyqData.length;
  let processedPatterns = 0;
  let totalQuestions = 0;
  let skippedPatterns = 0;
  let errors = 0;

  for (const item of pyqData) {
    processedPatterns++;
    const progress = \`[\${processedPatterns}/\${totalPatterns}]\`;
    
    // Check if pattern exists, create if not (or just find)
    let pattern = await prisma.pattern.findUnique({
      where: {
        pattern_identifier: {
          exam_type: item.pattern.exam_type,
          branch: item.pattern.branch,
          topic_name: item.pattern.topic_name,
        },
      },
    });

    if (!pattern) {
      console.log(\`\${colors.yellow}⚠️  \${progress} Pattern not found, creating: \${item.pattern.topic_name}\${colors.reset}\`);
      pattern = await prisma.pattern.create({
        data: {
            topic_name: item.pattern.topic_name,
            exam_type: item.pattern.exam_type,
            branch: item.pattern.branch,
        }
      });
    }

    try {
      let count = 0;
      for (const pyq of item.pyqs) {
        await prisma.pYQ.upsert({
          where: {
            pyq_identifier: {
              pattern_id: pattern.id,
              question_text: pyq.question_text,
            },
          },
          update: {
            options: pyq.options,
            correct_answer: pyq.correct_answer,
            explanation: pyq.explanation,
            year: pyq.year,
            exam_type: item.pattern.exam_type,
            question_type: pyq.question_type,
            images: pyq.images,
          },
          create: {
            pattern_id: pattern.id,
            question_text: pyq.question_text,
            options: pyq.options,
            correct_answer: pyq.correct_answer,
            explanation: pyq.explanation,
            year: pyq.year,
            exam_type: item.pattern.exam_type,
            question_type: pyq.question_type,
            images: pyq.images,
          },
        });
        count++;
        totalQuestions++;
      }
      console.log(\`\${colors.green}✅ \${progress} Seeded \${colors.bright}\${count}\${colors.reset}\${colors.green} PYQs for: \${colors.bright}\${pattern.topic_name}\${colors.reset}\`);
    } catch (err) {
      console.log(\`\${colors.red}❌ \${progress} Error seeding \${item.pattern.topic_name}\${colors.reset}\`);
      console.error(err.message);
      errors++;
    }
  }

  console.log(\`\\n\${colors.bright}\${colors.green}✨ Seeding Complete!\${colors.reset}\`);
  console.log(\`\${colors.cyan}Total Questions: \${colors.bright}\${totalQuestions}\${colors.reset}\`);
  if (errors > 0) console.log(\`\${colors.red}Errors Detected: \${colors.bright}\${errors}\${colors.reset}\`);
  console.log(\`\${colors.bright}\${colors.cyan}════════════════════════════════════════════════════════════\${colors.reset}\\n\`);
}

main()
  .catch((e) => {
    console.error('💥 FATAL ERROR SEEDING PYQs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

fs.writeFileSync(filePath, newFileContent);
console.log('Successfully recovered and reformatted seed_pyqs.ts');
