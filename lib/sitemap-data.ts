// lib/sitemap-data.ts
//
// Shared sitemap data + chunking logic, consumed by:
//   app/sitemap.xml/route.ts  → sitemap index
//   app/sitemap/[id]/route.ts → individual child sitemaps
//
// IMPORTANT: per-question URLs (pyq-*, gq-*, spyq-*) 308-redirect to their
// parent topic page (see app/[examType]/[subject]/[topic]/[questionId]/route.ts)
// — they're thin and the same content lives on the rich topic pages. Redirecting
// URLs do NOT belong in sitemaps. Only the hub and mock buckets are emitted.

import { prisma } from "@/lib/prisma";
import { toSlug, buildExamSlug, paperSlug, paperYear, TOPIC_PAGE_SIZE } from "@/lib/seo";

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
// "0" is the hub; "mock-N" are chunked mock-test instances; "pyq-years" is the year-wise PYQ index.
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

  const pyqYearCount = await prisma.pYQ
    .groupBy({ by: ["exam_type", "year"] })
    .then((r) => r.length)
    .catch((e) => {
      console.error("[sitemap] pyq year count failed:", e);
      return 0;
    });

  if (pyqYearCount > 0) {
    ids.push("pyq-years");
  }

  const paperCount = await prisma.mockTestTemplate
    .count({ where: { mode: "seeded" } })
    .catch((e) => {
      console.error("[sitemap] paper count failed:", e);
      return 0;
    });

  if (paperCount > 0) {
    ids.push("papers");
  }

  return ids;
}

// Static pages don't change on every request — use a real deploy date so
// Googlebot doesn't treat a rotating `lastmod` as noise and ignore it.
const STATIC_LASTMOD = "2026-06-08";

// The sitemap index lastmod should reflect when child sitemaps were last
// updated (roughly: "today" since they're revalidated daily via ISR).
export function currentLastmod(): string {
  return new Date().toISOString().split("T")[0];
}

export async function buildHubSitemap(): Promise<UrlEntry[]> {
  const staticPages: UrlEntry[] = [
    { url: BASE,                  lastmod: STATIC_LASTMOD, changefreq: "weekly",  priority: 1.0 },
    { url: `${BASE}/mock-tests`,  lastmod: STATIC_LASTMOD, changefreq: "daily",   priority: 0.95 },
    { url: `${BASE}/privacy`,     lastmod: STATIC_LASTMOD, changefreq: "yearly",  priority: 0.3 },
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
        changefreq: "weekly",
        priority: 0.85,
      });
    }
    const branchKey = `${t.exam_type}::${t.branch || "All Subjects"}`;
    if (!seenExamBranch.has(branchKey)) {
      seenExamBranch.add(branchKey);
      mockLandingPages.push({
        url: `${BASE}/mock-tests/${toSlug(t.exam_type)}/${toSlug(t.branch || "All Subjects")}`,
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
    changefreq: "weekly",
    priority: 0.9,
  }));

  // Per-topic freshness + depth. The Pattern table has no timestamp column and
  // its questions paginate at TOPIC_PAGE_SIZE per page, so for every topic we
  // derive two things from its child questions (both tables carry created_at and
  // are indexed by pattern_id):
  //   • lastmod → newest question added (max of PYQ/generated). Freshly seeded
  //               topics advertise a recent date and get recrawled promptly.
  //   • count   → total questions, to emit every pagination page (/page/2…N).
  //               Without this only page 1 of each topic was in the sitemap and
  //               ~90% of question pages stayed invisible to Google.
  const [gqAgg, pyqAgg] = await Promise.all([
    prisma.generatedQuestion
      .groupBy({ by: ["pattern_id"], _max: { created_at: true }, _count: true })
      .catch(logFail("gq agg")),
    prisma.pYQ
      .groupBy({ by: ["pattern_id"], _max: { created_at: true }, _count: true })
      .catch(logFail("pyq agg")),
  ]);
  const lastmodByPattern = new Map<string, Date>();
  const countByPattern = new Map<string, number>();
  for (const r of [...gqAgg, ...pyqAgg]) {
    countByPattern.set(r.pattern_id, (countByPattern.get(r.pattern_id) ?? 0) + r._count);
    const d = r._max.created_at;
    if (!d) continue;
    const prev = lastmodByPattern.get(r.pattern_id);
    if (!prev || d > prev) lastmodByPattern.set(r.pattern_id, d);
  }

  const topicRows = await prisma.pattern
    .findMany({ select: { id: true, exam_type: true, branch: true, subject: true, topic_name: true, short_notes: true } })
    .catch(logFail("topic hub"));
  const topicPages: UrlEntry[] = topicRows.flatMap((r) => {
    const base = `${BASE}/${buildExamSlug(r.exam_type, r.branch)}/${toSlug(r.subject)}/${toSlug(r.topic_name)}`;
    const lastmod = lastmodByPattern.get(r.id)?.toISOString();
    const totalQ = countByPattern.get(r.id) ?? 0;
    // Skip topics with zero questions: the page renders as a question-less
    // "Practice Questions & PYQs" shell, which is thin/misleading content. Once
    // the topic is seeded it re-enters the sitemap automatically (count-driven).
    if (totalQ === 0) return [];
    // Mirror the topic page's own pagination math — Math.max(1, ceil(totalQ /
    // PAGE_SIZE)) — so we never emit a /page/N the route would 404.
    const totalPages = Math.max(1, Math.ceil(totalQ / TOPIC_PAGE_SIZE));

    const entries: UrlEntry[] = [
      {
        url: base,
        ...(lastmod ? { lastmod } : {}),
        changefreq: "weekly",
        priority: 0.85,
      },
    ];
    // Page 1 is the canonical primary surface; deeper pages get a slightly lower
    // priority so crawlers still treat the topic root as the lead URL.
    for (let p = 2; p <= totalPages; p++) {
      entries.push({
        url: `${base}/page/${p}`,
        ...(lastmod ? { lastmod } : {}),
        changefreq: "weekly",
        priority: 0.7,
      });
    }
    // Dedicated concept-notes page — only when the topic actually has notes
    // (the /notes route notFound()s otherwise, so an empty entry would 404).
    if (r.short_notes && r.short_notes.trim().length > 0) {
      entries.push({
        url: `${base}/notes`,
        ...(lastmod ? { lastmod } : {}),
        changefreq: "monthly",
        priority: 0.8,
      });
    }
    return entries;
  });

  // /[examType]/pyq — one per exam that has seeded papers or PYQs
  const [pyqExamRows, seededExamRows] = await Promise.all([
    prisma.$queryRaw<Array<{ exam_type: string; branch: string }>>`
      SELECT DISTINCT q.exam_type, p.branch
      FROM "PYQ" q
      JOIN "Pattern" p ON q.pattern_id = p.id
    `.catch(logFail("pyq exams")),
    prisma.mockTestTemplate
      .findMany({
        where: { mode: "seeded" },
        select: { exam_type: true, branch: true },
        distinct: ["exam_type", "branch"],
      })
      .catch(logFail("seeded exams")),
  ]);

  const seenPyqHubs = new Set<string>();
  const pyqPages: UrlEntry[] = [];
  const addPyqHub = (examType: string, branch: string | null) => {
    const slug = buildExamSlug(examType, branch);
    if (!seenPyqHubs.has(slug)) {
      seenPyqHubs.add(slug);
      pyqPages.push({
        url: `${BASE}/${slug}/pyq`,
        changefreq: "weekly",
        priority: 0.9,
      });
    }
  };

  for (const r of pyqExamRows || []) addPyqHub(r.exam_type, r.branch);
  for (const r of seededExamRows || []) addPyqHub(r.exam_type, r.branch);

  return [...staticPages, ...mockLandingPages, ...examPages, ...subjectPages, ...topicPages, ...pyqPages];
}

export async function buildPaperPagesSitemap(): Promise<UrlEntry[]> {
  const mocks = await prisma.mockTestTemplate
    .findMany({
      where: { mode: "seeded" },
      select: { id: true, title: true, exam_type: true, branch: true, created_at: true },
      orderBy: { exam_type: "asc" },
    })
    .catch(logFail("paper pages"));

  const entries: UrlEntry[] = [];
  for (const m of mocks) {
    const year = paperYear(m.title);
    if (!year) continue;
    const examSlug = buildExamSlug(m.exam_type, m.branch);
    const pSlug = paperSlug(m.title, m.exam_type, year);
    entries.push({
      url: `${BASE}/${examSlug}/pyq/${year}/${pSlug}`,
      lastmod: m.created_at.toISOString(),
      changefreq: "yearly",
      priority: 0.85,
    });
  }
  return entries;
}

export async function buildPyqYearsSitemap(): Promise<UrlEntry[]> {
  // Fetch distinct (exam_type, branch, year) combos from PYQ table.
  // Pattern holds exam_type + branch; join through pattern.
  // Year clamp guards against extraction bugs where a number inside the
  // question text (e.g. "2080 kJ/mol") was parsed as the exam year and would
  // otherwise emit a bogus /pyq/2080 page.
  const rows = await prisma.$queryRaw<Array<{ exam_type: string; branch: string; year: number }>>`
    SELECT DISTINCT q.exam_type, p.branch, q.year
    FROM "PYQ" q
    JOIN "Pattern" p ON q.pattern_id = p.id
    WHERE q.year BETWEEN 1980 AND EXTRACT(YEAR FROM now()) + 1
    ORDER BY q.exam_type ASC, q.year DESC
  `.catch(logFail("pyq years"));

  const seen = new Set<string>();
  const entries: UrlEntry[] = [];
  for (const r of rows || []) {
    const examSlug = buildExamSlug(r.exam_type, r.branch);
    const key = `${examSlug}::${r.year}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      url: `${BASE}/${examSlug}/pyq/${r.year}`,
      changefreq: "yearly",
      priority: 0.8,
    });
  }
  return entries;
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

// Resolves a sitemap id (e.g. "0", "mock-3", "pyq-years") to its URL entries.
// Returns null when the id is unrecognised.
export async function buildSitemapById(id: string): Promise<UrlEntry[] | null> {
  if (id === "0") return buildHubSitemap();
  if (id === "pyq-years") return buildPyqYearsSitemap();
  if (id === "papers") return buildPaperPagesSitemap();

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
  const lastmod = currentLastmod();
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
