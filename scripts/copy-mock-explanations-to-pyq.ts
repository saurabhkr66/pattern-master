/**
 * copy-mock-explanations-to-pyq.ts
 *
 * Finds questions that appear in BOTH a MockTestTemplate AND the PYQ/SubjectPYQ tables
 * (100% match on question_text + all options), then copies the mock explanation to the PYQ.
 *
 * Usage:
 *   npx tsx scripts/copy-mock-explanations-to-pyq.ts
 *
 * Steps:
 *   1. Count & preview matches (dry run)
 *   2. Confirm → write explanations to DB
 */

import { PrismaClient } from "@prisma/client";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ── CONFIG ──────────────────────────────────────────────────────────────────
const MOCK_TEST_ID = ""; // Leave empty to scan ALL mock tests, or paste one ID
const ONLY_COPY_IF_PYQ_EMPTY = true; // true = only overwrite blank explanations
// ────────────────────────────────────────────────────────────────────────────

// Strip ALL math and formatting — returns plain words only
function toPlainText(s: string): string {
    return s
        .replace(/\$\$[\s\S]*?\$\$/g, " ")          // remove $$...$$
        .replace(/\$[^$\n]*?\$/g, " ")               // remove $...$
        .replace(/\\[a-zA-Z]+\s*\{[^}]*\}/g, " ")   // remove \cmd{...}
        .replace(/\\[a-zA-Z]+/g, " ")                // remove \cmd
        .replace(/[{}^_\\()\[\]|]/g, " ")            // remove LaTeX punctuation
        .replace(/[^a-z0-9\s]/gi, " ")               // keep only alphanum + space
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

// Convert options (array OR object) → sorted plain-text values joined
function normalizeOptions(options: unknown): string {
    let values: string[] = [];

    if (Array.isArray(options)) {
        // ["A. text", "B. text", ...] or ["text", "text", ...]
        values = options.map(v =>
            toPlainText(String(v).replace(/^[A-Da-d][.)]\s*/u, ""))
        );
    } else if (typeof options === "object" && options !== null) {
        // { A: "text", B: "text" } or { "0": "text", "1": "text" }
        values = Object.entries(options as Record<string, string>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, v]) => toPlainText(String(v).replace(/^[A-Da-d][.)]\s*/u, "")));
    } else if (typeof options === "string") {
        // Sometimes stored as a raw JSON string
        try {
            return normalizeOptions(JSON.parse(options));
        } catch { }
    }

    // Sort values so order differences don't break matching
    return values.sort().join("|||");
}

function normalizeText(s: string): string {
    return toPlainText(s);
}

type MatchResult = {
    mockTestId: string;
    mockTestTitle: string;
    mockQuestionId: string;
    mockExplanation: string;
    pyqTable: "PYQ";
    pyqId: string;
    pyqExplanation: string;
    questionText: string;
};

async function findMatches(): Promise<MatchResult[]> {
    const mockTests = await prisma.mockTestTemplate.findMany({
        where: MOCK_TEST_ID ? { id: MOCK_TEST_ID } : undefined,
        select: { id: true, title: true, questions: true },
    });

    console.log(`\n🔍 Scanning ${mockTests.length} mock test(s)...`);

    // Load all PYQs with non-empty explanations into memory for fast lookup
    const pyqs = await prisma.pYQ.findMany({
        select: { id: true, question_text: true, options: true, correct_answer: true, explanation: true },
        where: ONLY_COPY_IF_PYQ_EMPTY ? { explanation: "" } : undefined,
    });

    console.log(`📚 Loaded ${pyqs.length} PYQs (with empty explanations) for matching.`);

    // Build lookup maps: normalizedText+options → row
    type PyqRow = { id: string; question_text: string; options: unknown; correct_answer: string; explanation: string };
    const makeLookup = (rows: PyqRow[]) => {
        const map = new Map<string, PyqRow>();
        for (const row of rows) {
            const key = normalizeText(row.question_text) + "|||" + normalizeOptions(row.options);
            map.set(key, row);
        }
        return map;
    };

    const pyqLookup = makeLookup(pyqs as PyqRow[]);

    const matches: MatchResult[] = [];

    for (const mock of mockTests) {
        const questions = mock.questions as any[];
        for (const mq of questions) {
            const mockExplanation: string = mq.explanation?.trim() ?? "";
            if (!mockExplanation) continue; // mock has no explanation — nothing to copy

            const key = normalizeText(mq.question_text ?? "") + "|||" + normalizeOptions(mq.options);

            const pyqMatch = pyqLookup.get(key);
            if (pyqMatch) {
                matches.push({
                    mockTestId: mock.id,
                    mockTestTitle: mock.title,
                    mockQuestionId: mq.id,
                    mockExplanation,
                    pyqTable: "PYQ",
                    pyqId: pyqMatch.id,
                    pyqExplanation: pyqMatch.explanation,
                    questionText: mq.question_text?.substring(0, 80) ?? "",
                });
            }
        }
    }

    return matches;
}

async function applyMatches(matches: MatchResult[]) {
    let copied = 0;
    for (const m of matches) {
        await prisma.pYQ.update({ where: { id: m.pyqId }, data: { explanation: m.mockExplanation } });
        copied++;
        process.stdout.write(`\r  ✅ Copied ${copied}/${matches.length}`);
    }
    console.log();
}

async function main() {
    const matches = await findMatches();

    // ── Save JSON report regardless of match count ───────────────────────────
    const outPath = path.join(process.cwd(), "scripts", "mock-pyq-matches.json");
    const byMockJson: Record<string, { count: number; questions: object[] }> = {};
    for (const m of matches) {
        const key = `${m.mockTestTitle} (${m.mockTestId})`;
        if (!byMockJson[key]) byMockJson[key] = { count: 0, questions: [] };
        byMockJson[key].count++;
        byMockJson[key].questions.push({
            pyqTable: m.pyqTable,
            pyqId: m.pyqId,
            pyqWasEmpty: m.pyqExplanation === "",
            mockQuestionId: m.mockQuestionId,
            questionText: m.questionText,
            mockExplanation: m.mockExplanation,
        });
    }
    fs.writeFileSync(outPath, JSON.stringify({ totalMatches: matches.length, byMock: byMockJson }, null, 2));
    console.log(`\n💾 Match report saved → scripts/mock-pyq-matches.json`);
    // ────────────────────────────────────────────────────────────────────────

    if (matches.length === 0) {
        console.log("✅ No matches found — nothing to copy.");
        return;
    }

    // ── Console summary ──────────────────────────────────────────────────────
    console.log(`\n📊 Total matches: ${matches.length}\n`);
    for (const [mockLabel, data] of Object.entries(byMockJson)) {
        console.log(`  📝 ${mockLabel} — ${data.count} match(es)`);
        for (const q of data.questions as any[]) {
            const emptyTag = q.pyqWasEmpty ? " [empty]" : " [has explanation]";
            console.log(`     • [${q.pyqTable}]${emptyTag} "${q.questionText}..."`);
        }
    }
    // ────────────────────────────────────────────────────────────────────────

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

    const answer = await ask(`\nCopy ${matches.length} explanation(s) from mock → PYQ? (yes/no): `);
    rl.close();

    if (answer.trim().toLowerCase() !== "yes") {
        console.log("❌ Cancelled.");
        return;
    }

    console.log("\n📋 Writing...");
    await applyMatches(matches);
    console.log(`\n🎉 Done! ${matches.length} explanation(s) copied.`);
}

main()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
