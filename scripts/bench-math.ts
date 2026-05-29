// scripts/bench-math.ts
//
// Measures the real CPU cost of the MathRenderer pipeline that runs server-side
// during ISR generation of the public topic pages.
//
// It reproduces the exact SSR path:
//   transformMathContent()  →  react-markdown(remark-math, remark-breaks)
//                              →  rehype-katex  →  renderToStaticMarkup()
// over real question content pulled from the DB, then extrapolates to a full
// 20-question topic page (TOPIC_PAGE_SIZE).
//
// Usage:
//   npx tsx scripts/bench-math.ts            # default 50 questions
//   npx tsx scripts/bench-math.ts 200        # 200 questions
//
// Reports BOTH wall-clock and process CPU time. The CPU number is the one that
// maps to Vercel "Fluid Active CPU".

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import { prisma } from "../lib/prisma";
import { transformMathContent } from "../lib/math/transform";

const TOPIC_PAGE_SIZE = 20; // mirrors lib/seo.ts

// One render = one MathRenderer call (question text, one option, or explanation).
function renderOne(content: string): number {
  const processed = transformMathContent(content || "");
  const el = createElement(
    ReactMarkdown as any,
    {
      remarkPlugins: [remarkMath, remarkBreaks],
      rehypePlugins: [rehypeKatex],
    },
    processed
  );
  const html = renderToStaticMarkup(el);
  return html.length;
}

// Flatten a question into the individual strings MathRenderer is called on,
// exactly as QuestionViewer does: question text + each option + explanation.
function contentStringsFor(q: {
  question_text: string | null;
  options: unknown;
  explanation: string | null;
}): string[] {
  const out: string[] = [];
  if (q.question_text) out.push(q.question_text);
  if (Array.isArray(q.options)) {
    for (const opt of q.options) if (typeof opt === "string") out.push(opt);
  }
  if (q.explanation) out.push(q.explanation);
  return out;
}

async function main() {
  const limit = parseInt(process.argv[2] || "50", 10);

  console.log(`\n🔬 MathRenderer CPU benchmark (limit=${limit} questions)\n`);

  // Pull a mix of PYQ + GeneratedQuestion — the same content the topic pages render.
  const half = Math.ceil(limit / 2);
  const [pyqs, generated] = await Promise.all([
    prisma.pYQ.findMany({
      select: { question_text: true, options: true, explanation: true },
      take: half,
    }),
    prisma.generatedQuestion.findMany({
      select: { question_text: true, options: true, explanation: true },
      take: limit - half,
    }),
  ]);

  const questions = [...pyqs, ...generated];
  const strings = questions.flatMap(contentStringsFor);

  if (strings.length === 0) {
    console.log("No content found in DB. Check DATABASE_URL.");
    return;
  }

  // Warm-up: let V8 JIT + KaTeX/markdown module init settle so we measure
  // steady-state cost, not first-call overhead.
  for (let i = 0; i < Math.min(10, strings.length); i++) renderOne(strings[i]);

  // ── Timed pass ──────────────────────────────────────────────────────────
  const cpuStart = process.cpuUsage();
  const wallStart = performance.now();

  let totalHtmlBytes = 0;
  for (const s of strings) totalHtmlBytes += renderOne(s);

  const wallMs = performance.now() - wallStart;
  const cpu = process.cpuUsage(cpuStart);
  const cpuMs = (cpu.user + cpu.system) / 1000;

  // ── Report ────────────────────────────────────────────────────────────────
  const renders = strings.length;
  const avgCpu = cpuMs / renders;
  const avgWall = wallMs / renders;
  const rendersPerQuestion = renders / questions.length;
  const pageRenders = rendersPerQuestion * TOPIC_PAGE_SIZE;
  const pageCpuMs = avgCpu * pageRenders;

  console.log(`questions sampled : ${questions.length}`);
  console.log(`total renders     : ${renders}  (${rendersPerQuestion.toFixed(1)} per question)`);
  console.log(`rendered HTML     : ${(totalHtmlBytes / 1024).toFixed(0)} KB total\n`);

  console.log(`── per render ──`);
  console.log(`  CPU  : ${avgCpu.toFixed(2)} ms`);
  console.log(`  wall : ${avgWall.toFixed(2)} ms\n`);

  console.log(`── extrapolated to one ${TOPIC_PAGE_SIZE}-question topic page ──`);
  console.log(`  renders/page : ${pageRenders.toFixed(0)}`);
  console.log(`  CPU/page     : ${pageCpuMs.toFixed(0)} ms  (≈ ${(pageCpuMs / 1000).toFixed(2)} s)\n`);

  console.log(`  → ${Math.round(60_000 / pageCpuMs)} cold page generations = ~1 min of Fluid Active CPU`);
  console.log(`  → at 30 min/day that implies ~${Math.round((30 * 60_000) / pageCpuMs).toLocaleString()} cold page generations/day\n`);

  console.log(`(Option B replaces all of the above per-page CPU with a string copy ≈ 0 ms.)\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
