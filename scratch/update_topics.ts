import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  try {
    const patterns = await prisma.pattern.findMany({
      select: { topic_name: true },
      distinct: ['topic_name'],
      orderBy: { topic_name: 'asc' }
    });

    const topics = patterns.map(p => p.topic_name).join('\n');
    const filePath = path.join(process.cwd(), 'scratch', 'topics.txt');
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, topics);
    console.log(`Successfully updated ${filePath} with ${patterns.length} topics.`);
  } catch (error) {
    console.error('Error updating topics list:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
