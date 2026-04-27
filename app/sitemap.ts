// app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/seo";

const BASE = "https://battleexam.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ---------- Static pages ---------------------------------------------------
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/sign-up`, lastModified: now, changeFrequency: "yearly",  priority: 0.7 },
    { url: `${BASE}/sign-in`, lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
    // /practice requires auth — excluded to avoid wasting crawl budget
  ];

  // ---------- Subject hub pages  /[examType]/[subject] ----------------------
  const subjectRows = await prisma.pattern.findMany({
    select: { exam_type: true, subject: true },
    distinct: ["exam_type", "subject"],
  });

  const subjectPages: MetadataRoute.Sitemap = subjectRows.map((r) => ({
    url: `${BASE}/${toSlug(r.exam_type)}-cse/${toSlug(r.subject)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // ---------- Topic hub pages  /[examType]/[subject]/[topic] ----------------
  const topicRows = await prisma.pattern.findMany({
    select: { exam_type: true, subject: true, topic_name: true },
  });

  const topicPages: MetadataRoute.Sitemap = topicRows.map((r) => ({
    url: `${BASE}/${toSlug(r.exam_type)}-cse/${toSlug(r.subject)}/${toSlug(r.topic_name)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // ---------- PYQs (Pattern-linked) -----------------------------------------
  const pyqs = await prisma.pYQ.findMany({
    select: {
      id: true,
      created_at: true,
      pattern: { select: { exam_type: true, subject: true, topic_name: true } },
    },
  });

  const pyqPages: MetadataRoute.Sitemap = pyqs.map((q) => ({
    url: `${BASE}/${toSlug(q.pattern.exam_type)}-cse/${toSlug(q.pattern.subject)}/${toSlug(q.pattern.topic_name)}/pyq-${q.id}`,
    lastModified: q.created_at,
    changeFrequency: "yearly" as const,
    priority: 0.8,
  }));

  // ---------- Subject PYQs --------------------------------------------------
  const subjectPYQs = await prisma.subjectPYQ.findMany({
    select: {
      id: true,
      created_at: true,
      subject_pattern: { select: { subject_name: true } },
    },
  });

  const subjectPYQPages: MetadataRoute.Sitemap = subjectPYQs.map((q) => ({
    url: `${BASE}/gate-cse/${toSlug(q.subject_pattern.subject_name)}/${toSlug(q.subject_pattern.subject_name)}/spyq-${q.id}`,
    lastModified: q.created_at,
    changeFrequency: "yearly" as const,
    priority: 0.75,
  }));

  // ---------- Generated Questions -------------------------------------------
  const generatedQuestions = await prisma.generatedQuestion.findMany({
    select: {
      id: true,
      created_at: true,
      pattern: { select: { exam_type: true, subject: true, topic_name: true } },
    },
  });

  const generatedPages: MetadataRoute.Sitemap = generatedQuestions.map((q) => ({
    url: `${BASE}/${toSlug(q.pattern.exam_type)}-cse/${toSlug(q.pattern.subject)}/${toSlug(q.pattern.topic_name)}/gq-${q.id}`,
    lastModified: q.created_at,
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...subjectPages,
    ...topicPages,
    ...pyqPages,
    ...subjectPYQPages,
    ...generatedPages,
  ];
}
