import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('📝 Seeding Premium Vibrant Notes from Markdown files...');

  const notes = [
    {
      topic: "Divide and Conquer",
      filePath: "notes_divide_conquer.md"
    }
  ];

  for (const item of notes) {
    const fullPath = path.join(__dirname, item.filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Markdown file not found: ${fullPath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf8');

    await prisma.pattern.updateMany({
      where: { topic_name: item.topic },
      data: {
        short_notes: content
      }
    });
    console.log(`✅ Updated notes for: ${item.topic}`);
  }

  console.log('✨ Premium notes seeding finished!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding notes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
