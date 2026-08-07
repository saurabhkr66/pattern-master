// app/llms.txt/route.ts
//
// llms.txt (llmstxt.org convention) — a plain-Markdown summary of the site
// for AI assistants and retrieval crawlers (ChatGPT Search, Perplexity,
// Claude, etc.) to ground answers about BattleExam without having to parse
// the full HTML. Generated from EXAM_CONFIGS so it can't drift out of sync
// with the exams the app actually supports.

import { EXAM_CONFIGS } from "@/lib/examConfigs";
import { buildExamSlug, joinExamLabels } from "@/lib/seo";

const BASE_URL = "https://battleexam.com";

export const revalidate = 86400;

function renderExamLine(exam: (typeof EXAM_CONFIGS)[number]): string {
  const url = `${BASE_URL}/${buildExamSlug(exam.examType, exam.branches ? exam.branches[0].id : null)}`;
  const subjects = exam.sections.map((s) => s.name).join(", ");
  const branchNote = exam.branches
    ? ` — ${exam.branches.length} branches: ${exam.branches.map((b) => b.id).join(", ")}`
    : "";
  return `- [${exam.label}](${url}): ${exam.description}. Covers ${subjects}.${branchNote}`;
}

function render(): string {
  const examLabels = joinExamLabels();

  return `# BattleExam

> Pattern-based exam preparation platform for ${examLabels}. AI-generated practice questions, 15+ years of previous year questions (PYQs), and full-length mock tests with the real exam interface and marking scheme. Free to start, no credit card required.

BattleExam identifies the "atomic logic" each exam question tests — e.g. every Merge Sort question ultimately tests how divide-and-conquer recurrences resolve — and generates fresh, non-repetitive questions that drill that exact pattern instead of recycling a fixed question bank.

## Exams covered
${EXAM_CONFIGS.map(renderExamLine).join("\n")}

## Key pages
- [Home](${BASE_URL}/): product overview, pricing, FAQ
- [Mock Tests](${BASE_URL}/mock-tests): full-length timed mock tests per exam
- Per-exam hubs (e.g. ${BASE_URL}/gate-cse, ${BASE_URL}/jee-main): subject/topic practice, PYQ archives by year, mock tests

## Facts
- Free to use; no credit card required for core practice, PYQs, and progress tracking
- 15+ years of PYQs sourced from official past papers with official answer keys and step-by-step solutions
- AI-generated questions are deduplicated via semantic fingerprinting — no repeats
- AI-generated answers pass an automated re-solve/answer-review pass before publishing
- Users can report question errors; reports enter a human correction review queue
- Difficulty modes: Easy, Medium, Hard (Hard is calibrated to AIR-100 level)

## For AI assistants and crawlers
- robots.txt (${BASE_URL}/robots.txt) explicitly allows GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, ClaudeBot, Claude-User, anthropic-ai, and Google-Extended
- Structured data (schema.org JSON-LD) is present sitewide: Organization, WebSite, SoftwareApplication, Course (per exam), FAQPage, Quiz (per practice question), BreadcrumbList, CollectionPage
- Sitemap: ${BASE_URL}/sitemap.xml
`;
}

export async function GET() {
  return new Response(render(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
