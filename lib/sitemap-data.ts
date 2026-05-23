// lib/sitemap-data.ts
//
// Shared sitemap data + chunking logic, consumed by:
//   app/sitemap.xml/route.ts  → sitemap index
//   app/sitemap/[id]/route.ts → individual child sitemaps
//
// IMPORTANT: per-question pages (pyq-*, gq-*, spyq-*) are `noindex` —
// they're thin and the same content lives on the rich topic pages. Per
// Google's guidance, noindex URLs do NOT belong in sitemaps. Only the
// hub and mock buckets are emitted.

import { prisma } from "@/lib/prisma";
import { toSlug, buildExamSlug } from "@/lib/seo";

export const BASE = "https://battleexam.com";
export const CHUNK_SIZE = 10_000; // generous headroom under Google's 50K cap

export type UrlEntry = {
  url: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
};

// Log + swallow so a single failed table doesn't tank the whole sitemap, but
// we get a log line instead of a silent empty bucket.
function logFail(label: string) {
  return (e: unknown) => {
    console.error(`[sitemap] ${label} query failed:`, e);
    return [] as never[];
  };
}

function chunkCount(rows: number): number {
  return Math.max(1, Math.ceil(rows / CHUNK_SIZE));
}

// Returns the set of sitemap ids that should appear in the index.
// "0" is the hub; "mock-N" are the chunked mock-test instances.
export async function listSitemapIds(): Promise<string[]> {
  const ids: string[] = ["0"];

  const mockCount = await prisma.mockTestTemplate.count().catch((e) => {
    console.error("[sitemap] mock count failed:", e);
    return 0;
  });

  if (mockCount > 0) {
    for (let i = 0; i < chunkCount(mockCount); i++) {
      ids.push(`mock-${i}`);
    }
  } else {
    console.warn("[sitemap] mock bucket is empty — skipping");
  }

  return ids;
}

export async function buildHubSitemap(): Promise<UrlEntry[]> {
  const now = new Date().toISOString();

  const staticPages: UrlEntry[] = [
    { url: BASE,                 lastmod: now, changefreq: "weekly", priority: 1.0 },
    { url: `${BASE}/mock-tests`, lastmod: now, changefreq: "daily",  priority: 0.95 },
    // /sign-up, /sign-in, /practice are auth/gated — excluded to avoid
    // robots.txt conflict (practice is disallowed) and thin-content signals.
  ];

  const mockTemplates = await prisma.mockTestTemplate
    .findMany({ select: { exam_type: true, branch: true } })
    .catch(logFail("mock landing"));

  const mockLandingPages: UrlEntry[] = [];
  const seenExam = new Set<string>();
  const seenExamBranch = new Set<string>();
  for (const t of mockTemplates) {
    if (!seenExam.has(t.exam_type)) {
      seenExam.add(t.exam_type);
      mockLandingPages.push({
        url: `${BASE}/mock-tests/${toSlug(t.exam_type)}`,
        lastmod: now,
        changefreq: "weekly",
        priority: 0.85,
      });
    }
    const branchKey = `${t.exam_type}::${t.branch || "All Subjects"}`;
    if (!seenExamBranch.has(branchKey)) {
      seenExamBranch.add(branchKey);
      mockLandingPages.push({
        url: `${BASE}/mock-tests/${toSlug(t.exam_type)}/${toSlug(t.branch || "All Subjects")}`,
        lastmod: now,
        changefreq: "weekly",
        priority: 0.8,
      });
    }
  }

  const examRows = await prisma.pattern
    .findMany({ select: { exam_type: true, branch: true }, distinct: ["exam_type", "branch"] })
    .catch(logFail("exam hub"));
  const examPages: UrlEntry[] = examRows.map((r) => ({
    url: `${BASE}/${buildExamSlug(r.exam_type, r.branch)}`,
    lastmod: now,
    changefreq: "weekly",
    priority: 0.95,
  }));

  const subjectRows = await prisma.pattern
    .findMany({
      select: { exam_type: true, branch: true, subject: true },
      distinct: ["exam_type", "branch", "subject"],
    })
    .catch(logFail("subject hub"));
  const subjectPages: UrlEntry[] = subjectRows.map((r) => ({
    url: `${BASE}/${buildExamSlug(r.exam_type, r.branch)}/${toSlug(r.subject)}`,
    lastmod: now,
    changefreq: "weekly",
    priority: 0.9,
  }));

  const topicRows = await prisma.pattern
    .findMany({ select: { exam_type: true, branch: true, subject: true, topic_name: true } })
    .catch(logFail("topic hub"));
  const topicPages: UrlEntry[] = topicRows.map((r) => ({
    url: `${BASE}/${buildExamSlug(r.exam_type, r.branch)}/${toSlug(r.subject)}/${toSlug(r.topic_name)}`,
    lastmod: now,
    changefreq: "weekly",
    priority: 0.85,
  }));

  // /[examType]/pyq — one per exam that has seeded papers
  const pyqExamRows = await prisma.mockTestTemplate
    .findMany({
      where: { mode: "seeded" },
      select: { exam_type: true, branch: true },
      distinct: ["exam_type", "branch"],
    })
    .catch(logFail("pyq hub"));
  const pyqPages: UrlEntry[] = pyqExamRows.map((r) => ({
    url: `${BASE}/${buildExamSlug(r.exam_type, r.branch)}/pyq`,
    lastmod: now,
    changefreq: "weekly",
    priority: 0.9,
  }));

  return [...staticPages, ...mockLandingPages, ...examPages, ...subjectPages, ...topicPages, ...pyqPages];
}

export async function buildMockChunk(chunkIdx: number): Promise<UrlEntry[]> {
  const offset = chunkIdx * CHUNK_SIZE;
  const rows = await prisma.mockTestTemplate
    .findMany({
      select: { id: true, exam_type: true, branch: true, created_at: true },
      orderBy: { id: "asc" },
      skip: offset,
      take: CHUNK_SIZE,
    })
    .catch(logFail(`mock chunk @${offset}`));

  return rows.map((t) => ({
    url: `${BASE}/mock-tests/${toSlug(t.exam_type)}/${toSlug(t.branch || "All Subjects")}/${t.id}`,
    lastmod: t.created_at.toISOString(),
    changefreq: "monthly",
    priority: 0.75,
  }));
}

// Resolves a sitemap id (e.g. "0", "mock-3") to its URL entries.
// Returns null when the id is unrecognised.
export async function buildSitemapById(id: string): Promise<UrlEntry[] | null> {
  if (id === "0") return buildHubSitemap();

  const dashIdx = id.lastIndexOf("-");
  if (dashIdx === -1) return null;

  const kind = id.slice(0, dashIdx);
  const chunkIdx = parseInt(id.slice(dashIdx + 1), 10);
  if (Number.isNaN(chunkIdx)) return null;

  if (kind === "mock") return buildMockChunk(chunkIdx);
  return null;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderUrlset(entries: UrlEntry[]): string {
  const urls = entries
    .map((e) => {
      const parts = [`<loc>${xmlEscape(e.url)}</loc>`];
      if (e.lastmod) parts.push(`<lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) parts.push(`<changefreq>${e.changefreq}</changefreq>`);
      if (e.priority !== undefined) parts.push(`<priority>${e.priority}</priority>`);
      return `  <url>${parts.join("")}</url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function renderSitemapIndex(ids: string[]): string {
  const lastmod = new Date().toISOString();
  const entries = ids
    .map(
      (id) =>
        `  <sitemap><loc>${BASE}/sitemap/${id}.xml</loc><lastmod>${lastmod}</lastmod></sitemap>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}
