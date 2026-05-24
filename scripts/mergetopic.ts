import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function mergeTopics(config: {
    branch: string,
    subject: string,
    targetTopic: string,
    sourceTopics: string[]
}) {
    const { branch, subject, targetTopic, sourceTopics } = config;

    console.log(`\n🔍 Starting Dynamic Merge for ${subject} (${branch})...`);
    console.log(`🎯 Target: "${targetTopic}"`);
    console.log(`📁 Sources to merge: ${sourceTopics.join(", ")}`);

    // 1. Find the target pattern (The one we are keeping)
    let targetPattern = await prisma.pattern.findFirst({
        where: { branch, subject, topic_name: targetTopic }
    });

    // If it doesn't exist, create it using metadata from the first source
    if (!targetPattern) {
        console.log(`✨ Target topic "${targetTopic}" doesn't exist. Creating it now...`);

        const firstSource = await prisma.pattern.findFirst({
            where: { branch, subject, topic_name: { in: sourceTopics } }
        });

        if (!firstSource) {
            console.error(`❌ Error: Could not find any of the source topics to copy metadata from.`);
            return;
        }

        targetPattern = await prisma.pattern.create({
            data: {
                topic_name: targetTopic,
                subject: firstSource.subject,
                exam_type: firstSource.exam_type,
                branch: firstSource.branch,
                atomic_logic: `Master topic for ${targetTopic}. Includes ${sourceTopics.join(", ")}.`,
            }
        });
        console.log(`✅ Created new master topic: ${targetTopic}`);
    }

    // 2. Find all source patterns
    const patternsToMerge = await prisma.pattern.findMany({
        where: {
            branch,
            subject,
            topic_name: { in: sourceTopics },
            id: { not: targetPattern.id } // Don't merge the target into itself
        }
    });

    if (patternsToMerge.length === 0) {
        console.log("ℹ️ No source topics found to merge.");
        return;
    }

    const sourceIds = patternsToMerge.map(p => p.id);
    console.log(`📦 Found ${patternsToMerge.length} source patterns. Migrating questions...`);

    // 3. Move Questions (PYQ table)
    const pyqUpdate = await prisma.pYQ.updateMany({
        where: { pattern_id: { in: sourceIds } },
        data: { pattern_id: targetPattern.id }
    });

    // 4. Move Questions (Question Bank table)
    const qUpdate = await prisma.generatedQuestion.updateMany({
        where: { pattern_id: { in: sourceIds } },
        data: { pattern_id: targetPattern.id }
    });

    // 5. Update User History & Notes (Important for progress)
    const noteUpdate = await prisma.userNote.updateMany({
        where: { pattern_id: { in: sourceIds } },
        data: { pattern_id: targetPattern.id }
    });

    // 6. Delete the old source patterns
    const deleted = await prisma.pattern.deleteMany({
        where: { id: { in: sourceIds } }
    });

    console.log(`\n🎉 Merge Successful!`);
    console.log(`✅ PYQs moved: ${pyqUpdate.count}`);
    console.log(`✅ Question Bank moved: ${qUpdate.count}`);
    console.log(`✅ Notes migrated: ${noteUpdate.count}`);
    console.log(`✅ Topics removed: ${deleted.count}`);
}

async function countTopics(config: {
    branch: string,
    subject: string,
    sourceTopics: string[]
}) {
    const { branch, subject, sourceTopics } = config;

    const patterns = await prisma.pattern.findMany({
        where: { branch, subject, topic_name: { in: sourceTopics } },
        select: { id: true, topic_name: true }
    });

    if (patterns.length === 0) {
        console.log("❌ No matching patterns found.");
        return;
    }

    console.log(`\n📊 Question counts for ${subject} (${branch}):\n`);
    for (const p of patterns) {
        const [pyqs, qs] = await Promise.all([
            prisma.pYQ.count({ where: { pattern_id: p.id } }),
            prisma.generatedQuestion.count({ where: { pattern_id: p.id } }),
        ]);
        console.log(`  "${p.topic_name}"  →  PYQs: ${pyqs}  |  Generated: ${qs}  |  Total: ${pyqs + qs}`);
    }
}

// --- CHANGE THESE VALUES ---
const config = {
    branch: "CSE",
    subject: "Operating Systems",
    targetTopic: "System Call",
    sourceTopics: [
        "System Calls"
    ]
};

async function main() {
    const readline = await import("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

    await countTopics(config);

    console.log(`\n🎯 Target topic: "${config.targetTopic}"`);
    const answer = await ask("\nMerge these into the target? (yes/no): ");
    rl.close();

    if (answer.trim().toLowerCase() === "yes") {
        await mergeTopics(config);
    } else {
        console.log("❌ Merge cancelled.");
    }
}

main()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());