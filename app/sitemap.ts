// app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { toSlug, buildExamSlug } from "@/lib/seo";

export const dynamic = 'force-dynamic';

const BASE = "https://battleexam.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ---------- Static pages ---------------------------------------------------
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/sign-up`, lastModified: now, changeFrequency: "yearly",  priority: 0.7 },
    { url: `${BASE}/sign-in`, lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
    { url: `${BASE}/practice`, lastModified: now, changeFrequency: "daily",  priority: 0.95 },
    { url: `${BASE}/mock-tests`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
  ];

  // ---------- Mock Test SEO Pages ---------------------------------------------
  const mockTemplates = await prisma.mockTestTemplate.findMany({
    select: { id: true, exam_type: true, branch: true, created_at: true },
  }).catch(() => []);

  const mockPages: MetadataRoute.Sitemap = [];

  const uniqueExams = Array.from(new Set(mockTemplates.map(t => t.exam_type)));
  uniqueExams.forEach(exam => {
    mockPages.push({
      url: `${BASE}/mock-tests/${toSlug(exam)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85
    });

    const branches = Array.from(new Set(mockTemplates.filter(t => t.exam_type === exam).map(t => t.branch || "All Subjects")));
    branches.forEach(branch => {
      mockPages.push({
        url: `${BASE}/mock-tests/${toSlug(exam)}/${toSlug(branch)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8
      });
    });
  });

  mockTemplates.forEach(test => {
    mockPages.push({
      url: `${BASE}/mock-tests/${toSlug(test.exam_type)}/${toSlug(test.branch || "All Subjects")}/${test.id}`,
      lastModified: test.created_at,
      changeFrequency: "monthly",
      priority: 0.75
    });
  });

  // ---------- Per-exam landing pages  /[examType]  --------------------------
  const examRows = await prisma.pattern.findMany({
    select: { exam_type: true, branch: true },
    distinct: ["exam_type", "branch"],
  }).catch(() => []);

  const examPages: MetadataRoute.Sitemap = examRows.map((r) => ({
    url: `${BASE}/${buildExamSlug(r.exam_type, r.branch)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.95,
  }));

  // ---------- Subject hub pages  /[examType]/[subject] ----------------------
  const subjectRows = await prisma.pattern.findMany({
    select: { exam_type: true, branch: true, subject: true },
    distinct: ["exam_type", "branch", "subject"],
  }).catch(() => []);

  const subjectPages: MetadataRoute.Sitemap = subjectRows.map((r) => ({
    url: `${BASE}/${buildExamSlug(r.exam_type, r.branch)}/${toSlug(r.subject)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // ---------- Topic hub pages  /[examType]/[subject]/[topic] ----------------
  const topicRows = await prisma.pattern.findMany({
    select: { exam_type: true, branch: true, subject: true, topic_name: true },
  }).catch(() => []);

  const topicPages: MetadataRoute.Sitemap = topicRows.map((r) => ({
    url: `${BASE}/${buildExamSlug(r.exam_type, r.branch)}/${toSlug(r.subject)}/${toSlug(r.topic_name)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // ---------- PYQs (Pattern-linked) -----------------------------------------
  const pyqs = await prisma.pYQ.findMany({
    select: {
      id: true,
      created_at: true,
      pattern: { select: { exam_type: true, branch: true, subject: true, topic_name: true } },
    },
  }).catch(() => []);

  const pyqPages: MetadataRoute.Sitemap = pyqs.map((q) => ({
    url: `${BASE}/${buildExamSlug(q.pattern.exam_type, q.pattern.branch)}/${toSlug(q.pattern.subject)}/${toSlug(q.pattern.topic_name)}/pyq-${q.id}`,
    lastModified: q.created_at,
    changeFrequency: "yearly" as const,
    priority: 0.8,
  }));

  // ---------- Subject PYQs --------------------------------------------------
  // Route shape is /[examType]/[subject]/[topic]/[questionId]. Subject PYQs
  // don't have a distinct topic, so the topic segment mirrors the subject.
  const subjectPYQs = await prisma.subjectPYQ.findMany({
    select: {
      id: true,
      created_at: true,
      subject_pattern: { select: { subject_name: true, branch: true, exam_type: true } },
    },
  }).catch(() => []);

  const subjectPYQPages: MetadataRoute.Sitemap = subjectPYQs.map((q) => {
    const subjectSlug = toSlug(q.subject_pattern.subject_name);
    return {
      url: `${BASE}/${buildExamSlug(q.subject_pattern.exam_type, q.subject_pattern.branch)}/${subjectSlug}/${subjectSlug}/spyq-${q.id}`,
      lastModified: q.created_at,
      changeFrequency: "yearly" as const,
      priority: 0.75,
    };
  });

  // ---------- Generated Questions -------------------------------------------
  const generatedQuestions = await prisma.generatedQuestion.findMany({
    select: {
      id: true,
      created_at: true,
      pattern: { select: { exam_type: true, branch: true, subject: true, topic_name: true } },
    },
  }).catch(() => []);

  const generatedPages: MetadataRoute.Sitemap = generatedQuestions.map((q) => ({
    url: `${BASE}/${buildExamSlug(q.pattern.exam_type, q.pattern.branch)}/${toSlug(q.pattern.subject)}/${toSlug(q.pattern.topic_name)}/gq-${q.id}`,
    lastModified: q.created_at,
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...mockPages,
    ...examPages,
    ...subjectPages,
    ...topicPages,
    ...pyqPages,
    ...subjectPYQPages,
    ...generatedPages,
  ];
}
