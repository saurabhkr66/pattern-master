import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

async function main() {
  console.log(`${colors.bright}${colors.cyan}📜 Seeding Subject-Level Practice Data...${colors.reset}`);

  const subjectData = [
    {
      subject_name: "Computer Organization & Architecture",
      pyqs: [
        {
          "topic_name": "co-and-architecture",
          "question_text": "Consider the following two statements about interrupt handling mechanisms in a CPU. $\\text{S1}$: In non-vectored interrupt mechanism, it usually takes more time to start the Interrupt Service Routine (ISR) when compared to that in a vectored interrupt mechanism. $\\text{S2}$: In daisy-chain interrupt mechanism, the CPU polls all the input devices individually to determine the source of the interrupt. Which one of the following options is correct with respect to $\\text{S1}$ and $\\text{S2}?$ 0 reply Please log in or register to add a comment.",
          "images": [],
          "options": [
            "A. Both $\\text{S1}$ and $\\text{S2}$ are true",
            "B. Both $\\text{S1}$ and $\\text{S2}$ are false",
            "C. $\\text{S1}$ is true and $\\text{S2}$ is false",
            "D. $\\text{S1}$ is false and $\\text{S2}$ is true"
          ],
          "correct_answer": "C",
          "explanation": "S1: \"Non-vectored takes more time to start ISR than vectored\" Non-vectored: CPU polls to find source first, then jumps to ISR. Vectored: device sends ISR address directly. So non-vectored has extra polling overhead → S1 is TRUE ✅ S2: \"In daisy chain, CPU polls all devices individually\" In daisy-chain, the interrupt request line is shared, and devices are connected in a chain. The CPU acknowledges the interrupt, and the signal passes through devices; the first device that needs service grabs it. No polling by CPU; it's hardware-based. → S2 is FALSE ❌ Answer: (C) S1 true, S2 false",
          "year": 2026,
          "exam_type": "GATE",
          "question_type": "MCQ"
        }
      ]
    }
  ];

  for (const item of subjectData) {
    let subject = await prisma.subjectPattern.findFirst({
      where: { subject_name: item.subject_name },
    });
    if (!subject) {
      subject = await prisma.subjectPattern.create({
        data: { subject_name: item.subject_name },
      });
    }

    console.log(`${colors.blue}📂 Subject: ${colors.bright}${item.subject_name}${colors.reset}`);

    let count = 0;
    const total = item.pyqs.length;

    for (const pyq of item.pyqs) {
      count++;
      const progress = `[${count}/${total}]`;

      // Data Cleaning: Remove scraper noise
      const cleanQuestionText = pyq.question_text
        .replace(/0 reply\s*Please log in or register to add a comment\./gi, '')
        .replace(/0 reply/gi, '')
        .replace(/🚩.*?💬\s*“[^”]*”/gi, '')
        .replace(/See all \d+ Comments[\s\S]*?Please log in or register to add a comment\./gi, '')
        .trim();

      // Transform images to have correct URLs
      const transformedImages = (pyq.images as any[])?.map((img: any) => ({
        ...img,
        url: img.url || (img.filename ? (img.filename.startsWith('/') ? img.filename : `/${img.filename}`) : '')
      }));

      await prisma.subjectPYQ.upsert({
        where: {
          subject_pyq_identifier: {
            subject_pattern_id: subject.id,
            question_text: cleanQuestionText
          }
        },
        update: {
          options: pyq.options,
          correct_answer: pyq.correct_answer,
          explanation: pyq.explanation,
          year: pyq.year,
          question_type: pyq.question_type,
          images: transformedImages
        },
        create: {
          subject_pattern_id: subject.id,
          question_text: cleanQuestionText,
          options: pyq.options,
          correct_answer: pyq.correct_answer,
          explanation: pyq.explanation,
          year: pyq.year,
          question_type: pyq.question_type,
          images: transformedImages
        }
      });

      if (count % 5 === 0 || count === total) {
        console.log(`${colors.green}  ✅ ${progress} Seeded questions for ${item.subject_name}${colors.reset}`);
      }
    }
  }

  console.log(`${colors.bright}${colors.green}✨ Subject Seeding Complete!${colors.reset}`);
}

main()
  .catch((e) => {
    console.error('💥 Error seeding subjects:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
