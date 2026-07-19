/**
 * audit-math-errors.ts — read-only sweep of every math-bearing field in the DB.
 *
 * For each field it runs the REAL transformMathContent pipeline, extracts each
 * $…$ / $$…$$ span, and renders it with KaTeX (throwOnError:true). A throw here
 * is exactly what renders as a red error blob in the app (rehype-katex default
 * throwOnError:false). Output: grouped console summary + scripts/math-errors.csv.
 *
 * Run over the open tunnel (localhost:5433). Read-only — safe.
 *   npx tsx scripts/audit-math-errors.ts
 */
import { PrismaClient } from "@prisma/client";
import katex from "katex";
import fs from "fs";
import path from "path";
import { transformMathContent } from "@/lib/math/transform";

const p = new PrismaClient();

interface Finding {
  source: string;   // table / mock title
  ref: string;      // id or id#index
  field: string;    // which field
  message: string;  // katex error (normalized for grouping)
  rawMessage: string;
  span: string;     // the offending latex span
  snippet: string;  // surrounding raw field, truncated
}
const findings: Finding[] = [];

// Recursively collect every string inside a value (handles Json options / arrays / objects).
function collectStrings(v: unknown, out: string[]): void {
  if (typeof v === "string") { if (v.includes("$") || /\\[a-zA-Z]/.test(v)) out.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectStrings(x, out));
}

// Same span extraction the transform uses for its final pass.
function extractSpans(transformed: string): string[] {
  const spans: string[] = [];
  const noDisplay = transformed.replace(/\$\$([\s\S]*?)\$\$/g, (_m, b) => { spans.push(b); return " "; });
  noDisplay.replace(/\$([^$\n]+?)\$/g, (_m, b) => { spans.push(b); return " "; });
  return spans;
}

function normalizeMsg(m: string): string {
  return m
    .replace(/KaTeX parse error:\s*/i, "")
    .replace(/ at position \d+[\s\S]*$/, "")
    .replace(/'[^']*'/g, (q) => (q.length > 3 ? "'…'" : q))
    .trim();
}

function checkField(source: string, ref: string, field: string, raw: string): void {
  let transformed: string;
  try { transformed = transformMathContent(raw); }
  catch (e: any) {
    findings.push({ source, ref, field, message: "transform threw: " + e.message, rawMessage: e.message, span: "", snippet: raw.slice(0, 200) });
    return;
  }
  for (const span of extractSpans(transformed)) {
    try { katex.renderToString(span, { throwOnError: true, strict: false }); }
    catch (e: any) {
      findings.push({
        source, ref, field,
        message: normalizeMsg(e.message),
        rawMessage: e.message,
        span: span.slice(0, 300),
        snippet: raw.slice(0, 200),
      });
    }
  }
}

async function auditColumnModel(
  name: string,
  fetchPage: (skip: number, take: number) => Promise<any[]>,
  textFields: string[],
  jsonFields: string[],
) {
  const TAKE = 500;
  let skip = 0;
  let n = 0;
  for (;;) {
    const rows = await fetchPage(skip, TAKE);
    if (rows.length === 0) break;
    for (const r of rows) {
      n++;
      for (const f of textFields) {
        const val = r[f];
        if (typeof val === "string" && val) checkField(name, r.id, f, val);
      }
      for (const f of jsonFields) {
        const strs: string[] = [];
        collectStrings(r[f], strs);
        strs.forEach((s, i) => checkField(name, r.id, `${f}[${i}]`, s));
      }
    }
    process.stdout.write(`\r  ${name}: ${n} rows scanned…`);
    skip += TAKE;
  }
  process.stdout.write(`\r  ${name}: ${n} rows scanned. done.\n`);
}

async function main() {
  console.log("Auditing math fields (read-only)…\n");

  await auditColumnModel(
    "PYQ",
    (skip, take) => p.pYQ.findMany({
      skip, take, orderBy: { id: "asc" },
      select: { id: true, question_text: true, explanation: true, question_text_hindi: true, explanation_hindi: true, options: true, options_hindi: true },
    }),
    ["question_text", "explanation", "question_text_hindi", "explanation_hindi"],
    ["options", "options_hindi"],
  );

  await auditColumnModel(
    "GeneratedQuestion",
    (skip, take) => p.generatedQuestion.findMany({
      skip, take, orderBy: { id: "asc" },
      select: { id: true, question_text: true, explanation: true, question_text_hindi: true, explanation_hindi: true, options: true, options_hindi: true },
    }),
    ["question_text", "explanation", "question_text_hindi", "explanation_hindi"],
    ["options", "options_hindi"],
  );

  await auditColumnModel(
    "CoachingQuestion",
    (skip, take) => p.coachingQuestion.findMany({
      skip, take, orderBy: { id: "asc" },
      select: { id: true, question_text: true, solution: true, question_text_hindi: true, options: true },
    }),
    ["question_text", "solution", "question_text_hindi"],
    ["options"],
  );

  // Mock templates: walk the questions JSON array, tag ref as templateId#Qn
  const templates = await p.mockTestTemplate.findMany({ select: { id: true, title: true, questions: true } });
  let mn = 0;
  for (const t of templates) {
    const qs = (t.questions as any[]) ?? [];
    qs.forEach((q, i) => {
      const strs: string[] = [];
      collectStrings(q, strs);
      strs.forEach((s, j) => checkField(`Mock:${t.title}`, `${t.id}#Q${i + 1}`, `q[${j}]`, s));
    });
    mn++;
  }
  console.log(`  MockTestTemplate: ${mn} templates scanned. done.\n`);

  // ---- Report ----
  console.log(`\n================ RESULTS ================`);
  console.log(`Total error spans: ${findings.length}\n`);

  const byMsg = new Map<string, number>();
  const bySource = new Map<string, number>();
  for (const f of findings) {
    byMsg.set(f.message, (byMsg.get(f.message) ?? 0) + 1);
    bySource.set(f.source.split(":")[0], (bySource.get(f.source.split(":")[0]) ?? 0) + 1);
  }

  console.log("By error type:");
  [...byMsg.entries()].sort((a, b) => b[1] - a[1]).forEach(([m, c]) => console.log(`  ${String(c).padStart(5)}  ${m}`));
  console.log("\nBy source:");
  [...bySource.entries()].sort((a, b) => b[1] - a[1]).forEach(([s, c]) => console.log(`  ${String(c).padStart(5)}  ${s}`));

  // CSV
  const csvPath = path.join(process.cwd(), "scripts", "math-errors.csv");
  const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  const csv = ["source,ref,field,error_type,message,span,snippet"]
    .concat(findings.map((f) => [f.source, f.ref, f.field, f.message, f.rawMessage, f.span, f.snippet].map(esc).join(",")))
    .join("\n");
  fs.writeFileSync(csvPath, csv, "utf8");
  console.log(`\nFull report: ${csvPath}`);

  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
