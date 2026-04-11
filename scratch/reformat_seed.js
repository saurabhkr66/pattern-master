
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'prisma', 'seed_pyqs.ts');
const content = fs.readFileSync(filePath, 'utf8');

const startMarker = 'const pyqData = ';
const footerMarker = '  // Colors for terminal beautification'; // Using a marker that's likely still there

const startIndex = content.indexOf(startMarker);
const footerIndex = content.indexOf(footerMarker);

if (startIndex === -1) {
    console.error('Could not find start marker');
    process.exit(1);
}

// Since footer was mangled, we search for main() call instead
const mainCallMarker = 'main()';
const mainCallIndex = content.lastIndexOf(mainCallMarker);

const dataEndIndex = content.lastIndexOf('];', mainCallIndex);
const dataStr = content.substring(startIndex + startMarker.length, dataEndIndex + 1);

try {
    const rawData = eval(dataStr);
    
    function extractQuestions(item) {
        let questions = [];
        if (Array.isArray(item)) {
            item.forEach(i => {
                questions = questions.concat(extractQuestions(i));
            });
        } else if (item.pattern && item.pyqs) {
            item.pyqs.forEach(q => {
                questions.push({
                    ...q,
                    topic_name: item.pattern.topic_name || q.topic_name,
                    exam_type: item.pattern.exam_type || q.exam_type,
                    branch: "CSE"
                });
            });
        } else if (item.question_text) {
            questions.push({
                ...item,
                branch: "CSE"
            });
        }
        return questions;
    }

    const allQuestions = extractQuestions(rawData);
    console.log(`Extracted ${allQuestions.length} questions.`);

    const grouped = {};
    allQuestions.forEach(q => {
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
        
        const pyq = { ...q };
        delete pyq.topic_name;
        delete pyq.exam_type;
        delete pyq.branch;
        delete pyq.pattern;
        
        grouped[key].pyqs.push(pyq);
    });

    const newPyqData = Object.values(grouped);
    
    // Construct the FULL file from scratch to be safe
    const newFileContent = `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📜 Seeding Previous Year Questions (PYQs)...');
  const pyqData = ${JSON.stringify(newPyqData, null, 2)};

  // Colors for terminal beautification
  const colors = {
    reset: "\\x1b[0m",
    bright: "\\x1b[1m",
    green: "\\x1b[32m",
    yellow: "\\x1b[33m",
    red: "\\x1b[31m",
    cyan: "\\x1b[36m",
  };

  console.log(\`\\n\${colors.bright}\${colors.cyan}════════════════════════════════════════════════════════════\${colors.reset}\`);
  console.log(\` \${colors.bright}🎓 PATTERNMASTER PYQ SEEDER v2.1 (Branch: CSE) \${colors.reset}\`);
  console.log(\`\${colors.bright}\${colors.cyan}════════════════════════════════════════════════════════════\${colors.reset}\\n\`);

  const totalPatterns = pyqData.length;
  let processedPatterns = 0;
  let totalQuestions = 0;
  let skippedPatterns = 0;
  let errors = 0;

  const summary = [];

  for (const item of pyqData) {
    processedPatterns++;
    const progress = [\${processedPatterns}/\${totalPatterns}];
    
    // Find the pattern
    const pattern = await prisma.pattern.findUnique({
      where: {
        pattern_identifier: {
          exam_type: item.pattern.exam_type,
          branch: item.pattern.branch,
          topic_name: item.pattern.topic_name,
        },
      },
    });

    if (!pattern) {
      console.log(\`\${colors.yellow}⚠️  \${progress} Pattern not found: \${item.pattern.topic_name}\${colors.reset}\`);
      skippedPatterns++;
      summary.push({ Topic: item.pattern.topic_name, Status: "Skipped", Count: 0 });
      continue;
    }

    try {
      let count = 0;
      for (const pyq of item.pyqs) {
        const cleanQuestion = pyq.question_text;
        const cleanOptions = pyq.options;
        const cleanExplanation = pyq.explanation;

        await prisma.pYQ.upsert({
          where: {
            pyq_identifier: {
              pattern_id: pattern.id,
              question_text: cleanQuestion,
            },
          },
          update: {
            options: cleanOptions,
            correct_answer: pyq.correct_answer,
            explanation: cleanExplanation,
            year: pyq.year,
            exam_type: pyq.exam_type,
            question_type: pyq.question_type || "MCQ",
            images: pyq.images,
          },
          create: {
            pattern_id: pattern.id,
            question_text: cleanQuestion,
            options: cleanOptions,
            correct_answer: pyq.correct_answer,
            explanation: cleanExplanation,
            year: pyq.year,
            exam_type: pyq.exam_type,
            question_type: pyq.question_type || "MCQ",
            images: pyq.images,
          },
        });
        count++;
        totalQuestions++;
      }
      console.log(\`\${colors.green}✅ \${progress} Seeded \${colors.bright}\${count}\${colors.reset}\${colors.green} PYQs for: \${colors.bright}\${pattern.topic_name}\${colors.reset}\`);
      summary.push({ Topic: pattern.topic_name, Status: "Success", Count: count });
    } catch (err) {
      console.log(\`\${colors.red}❌ \${progress} Error seeding \${item.pattern.topic_name}\${colors.reset}\`);
      console.error(err);
      errors++;
      summary.push({ Topic: item.pattern.topic_name, Status: "Error", Count: 0 });
    }
  }

  console.log(\`\\n\\n\${colors.bright}\${colors.cyan}📊 SEEDING SUMMARY\${colors.reset}\`);
  console.table(summary);

  console.log(\`\\n\${colors.bright}\${colors.green}✨ Seeding Complete!\${colors.reset}\`);
  console.log(\`\${colors.cyan}Total Questions: \${colors.bright}\${totalQuestions}\${colors.reset}\`);
  console.log(\`\${colors.yellow}Skipped Topics: \${colors.bright}\${skippedPatterns}\${colors.reset}\`);
  if (errors > 0) console.log(\`\${colors.red}Errors Detected: \${colors.bright}\${errors}\${colors.reset}\`);
  console.log(\`\${colors.bright}\${colors.cyan}════════════════════════════════════════════════════════════\${colors.reset}\\n\`);
}

main()
  .catch((e) => {
    const red = "\\x1b[31m";
    const reset = "\\x1b[0m";
    console.error(\`\\n\${red}💥 FATAL ERROR SEEDING PYQs:\${reset}\`, e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

    fs.writeFileSync(filePath, newFileContent);
    console.log('Successfully fully restored and reformatted seed_pyqs.ts with CSE branch');
} catch (e) {
    console.error('Error processing data:', e);
}
