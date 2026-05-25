import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getExamConfig, type ExamType, type SectionConfig } from "@/lib/examConfigs";
import type { TestQuestion } from "@/components/test/TestEngine";
import {
  getCachedTemplateById,
  getCachedSeededTemplateId,
  cacheTemplate,
} from "@/lib/mockTemplate";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface RawQuestion {
  id: string;
  source: "pyq";
  question_text: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
  question_type: string;
  marks: number;
  year?: number;
  subject: string;
  images: unknown;
}

/* ── Fetch questions for a section ── */
async function fetchSectionQuestions(
  section: SectionConfig,
  examType: string,
  branch: string | null,
  subjectFilters: string[]
): Promise<RawQuestion[]> {
  // If the user applied a subject filter, check whether this section overlaps it.
  // section.subjects === null means "all branch subjects" (GATE subject section) — always overlaps.
  // For sections with a fixed list, zero overlap means this section should be skipped entirely;
  // return [] so the caller can omit it.
  let subjects: string[];
  if (subjectFilters.length > 0) {
    if (section.subjects === null) {
      // GATE-style open subject section — apply user filter directly
      subjects = subjectFilters;
    } else {
      const overlap = subjectFilters.filter((s) => section.subjects!.includes(s));
      if (overlap.length === 0) {
        // No overlap → skip this section
        return [];
      }
      subjects = overlap;
    }
  } else {
    subjects = section.subjects ?? [];
  }

  const usedSubjectFilter = subjects.length > 0;

  // Only filter by branch for the catch-all subject section (subjects === null).
  // Named sections like "General Aptitude", "Physics", "Chemistry" are cross-branch.
  const branchFilter = section.subjects === null && branch ? { branch } : {};

  // Resolve which subjects to filter by for each table:
  //   section.subjects !== null → fixed list; intersect with user filters if any
  //   section.subjects === null → GATE subject section; apply user filters if any, else no filter
  const pyqSubjectFilter =
    section.subjects !== null
      ? { subject: { in: usedSubjectFilter ? subjects : section.subjects } }
      : usedSubjectFilter
      ? { subject: { in: subjects } }
      : {};

  // Push marks + type filters into DB to avoid loading the full question bank.
  // Compute from markDistribution; fall back to no filter if section has no distribution.
  const neededMarks = section.markDistribution.length > 0
    ? [...new Set(section.markDistribution.map((b) => b.marks))]
    : null;
  const neededTypes = section.markDistribution.length > 0
    ? [...new Set(section.markDistribution.map((b) => b.type).filter(Boolean))] as string[]
    : null;

  const marksFilter = neededMarks ? { marks: { in: neededMarks } } : {};
  const typeFilter = neededTypes && neededTypes.length > 0 ? { question_type: { in: neededTypes } } : {};

  // Load 4× the needed count so shuffle has variety, but don't pull the whole table.
  const totalNeeded = section.markDistribution.length > 0
    ? section.markDistribution.reduce((sum, b) => sum + b.count, 0)
    : section.totalQuestions;
  const takeLimit = Math.max(totalNeeded * 4, 50);

  const pyqs = await prisma.pYQ.findMany({
    where: {
      ...marksFilter,
      ...typeFilter,
      pattern: {
        exam_type: examType,
        ...branchFilter,
        ...pyqSubjectFilter,
      },
    },
    select: {
      id: true,
      question_text: true,
      options: true,
      correct_answer: true,
      explanation: true,
      question_type: true,
      marks: true,
      year: true,
      images: true,
      pattern: { select: { subject: true } },
    },
    take: takeLimit,
  });

  const normalized: RawQuestion[] = pyqs.map((q) => ({
    id: q.id,
    source: "pyq" as const,
    question_text: q.question_text,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    question_type: q.question_type,
    marks: q.marks,
    year: q.year,
    subject: q.pattern?.subject ?? "Unknown",
    images: q.images,
  }));

  return shuffle(normalized);
}

/* ── Pick questions for a section respecting type + mark distribution ── */
function pickSectionQuestions(pool: RawQuestion[], section: SectionConfig): RawQuestion[] {
  const picked: RawQuestion[] = [];

  if (section.markDistribution.length > 0) {
    for (const band of section.markDistribution) {
      const candidates = pool.filter(
        (q) =>
          q.marks === band.marks &&
          (!band.type || q.question_type === (band.type as string)) &&
          !picked.includes(q)
      );
      picked.push(...candidates.slice(0, band.count));
    }
  } else {
    picked.push(...pool.slice(0, section.totalQuestions));
  }

  return picked;
}

/* ── Convert raw questions to TestQuestion shape ── */
function toTestQuestion(
  raw: RawQuestion,
  sectionIdx: number,
  sectionName: string,
): Omit<TestQuestion, "correct_answer" | "explanation"> & { correct_answer: string; explanation: string } {
  return {
    id: raw.id,
    source: raw.source,
    sectionIndex: sectionIdx,
    sectionName,
    isOptional: false,
    question_text: raw.question_text,
    options: Array.isArray(raw.options) ? (raw.options as string[]) : null,
    question_type: raw.question_type as "MCQ" | "MSQ" | "NAT",
    marks: raw.marks,
    year: raw.year,
    subject: raw.subject,
    images: raw.images as { index: number; filename: string }[] | null,
    correct_answer: raw.correct_answer,
    explanation: raw.explanation,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const examType = (searchParams.get("exam_type") ?? "GATE") as ExamType;
    const branch = searchParams.get("branch") ?? null;
    const mode = searchParams.get("mode") ?? "random";
    const mockNumber = parseInt(searchParams.get("mock_number") ?? "0", 10);
    const subjectFilters = searchParams.getAll("subject").flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean);

    const config = getExamConfig(examType, branch ?? undefined);

    // Strip server-only fields from a stored template's questions JSON.
    // We select only the scalar columns (no `questions`) and then re-fetch
    // questions in a second lightweight query only when needed.
    const TEMPLATE_META_SELECT = {
      id: true,
      title: true,
      total_questions: true,
      max_score: true,
      questions: true,
    } as const;

    function safeQuestions(template: { questions: unknown }) {
      return (template.questions as any[]).map(
        ({ correct_answer, explanation, ...safe }: any) => safe
      );
    }

    // ── DIRECT template lookup (used for session resume) ──
    const templateId = searchParams.get("templateId");
    if (templateId) {
      const template = await getCachedTemplateById(templateId);
      if (template) {
        return NextResponse.json({
          mockTestId: template.id,
          title: template.title,
          questions: safeQuestions(template),
          totalQuestions: template.total_questions,
          maxScore: template.max_score,
        });
      }
    }

    // ── SEEDED: look for an existing frozen template ──
    if (mode === "seeded" && mockNumber > 0) {
      const cachedId = await getCachedSeededTemplateId(
        examType,
        branch ?? null,
        mockNumber
      );
      const template = cachedId ? await getCachedTemplateById(cachedId) : null;
      if (template) {
        return NextResponse.json({
          mockTestId: template.id,
          title: template.title,
          questions: safeQuestions(template),
          totalQuestions: template.total_questions,
          maxScore: template.max_score,
        });
      }
    }

    // ── RANDOM: look for unused template the user hasn't attempted ──
    if (mode === "random") {
      const sortedFilters = [...subjectFilters].sort();
      const unusedTemplate = await prisma.mockTestTemplate.findFirst({
        where: {
          exam_type: examType,
          branch: branch ?? null,
          mode: "random",
          subjects: { equals: sortedFilters },
          sessions: { none: { user_id: userId } },
        },
        orderBy: { created_at: "asc" },
        select: TEMPLATE_META_SELECT,
      });
      if (unusedTemplate) {
        return NextResponse.json({
          mockTestId: unusedTemplate.id,
          title: unusedTemplate.title,
          questions: safeQuestions(unusedTemplate),
          totalQuestions: unusedTemplate.total_questions,
          maxScore: unusedTemplate.max_score,
        });
      }
    }

    // ── Generate new questions ──
    const allSectionQuestions: Array<{
      sectionIdx: number;
      sectionName: string;
      questions: RawQuestion[];
    }> = [];
    const includedSectionIndices = new Set<number>();

    for (let si = 0; si < config.sections.length; si++) {
      const sec = config.sections[si];
      const pool = await fetchSectionQuestions(sec, examType, branch, subjectFilters);
      // fetchSectionQuestions returns [] when subject filter has no overlap with this section
      if (pool.length === 0 && subjectFilters.length > 0) continue;
      const picked = pickSectionQuestions(pool, sec);
      allSectionQuestions.push({ sectionIdx: si, sectionName: sec.name, questions: picked });
      includedSectionIndices.add(si);
    }

    // Check we have at least some questions
    const totalGenerated = allSectionQuestions.reduce((sum, s) => sum + s.questions.length, 0);
    if (totalGenerated === 0) {
      return NextResponse.json(
        { error: "No questions found for this exam/branch. Please try a different exam or check if questions have been seeded." },
        { status: 404 }
      );
    }

    // Build question list with metadata (strip correct_answer + explanation from client payload)
    const clientQuestions: TestQuestion[] = [];
    const fullQuestions: Array<TestQuestion & { correct_answer: string; explanation: string }> = [];

    for (const { sectionIdx, sectionName, questions } of allSectionQuestions) {
      for (const raw of questions) {
        const full = toTestQuestion(raw, sectionIdx, sectionName);
        fullQuestions.push(full);
        const { correct_answer, explanation, ...safe } = full;
        clientQuestions.push(safe);
      }
    }

    const maxScore = config.sections
      .filter((_, i) => includedSectionIndices.has(i))
      .reduce((sum, sec) => sum + sec.maxScore, 0);

    // Determine how many seeded mocks already exist
    const existingCount = await prisma.mockTestTemplate.count({
      where: { exam_type: examType, branch: branch ?? null, mode },
    });

    const branchLabel = branch ? ` ${branch}` : "";
    const modeNum = mode === "seeded" ? `#${mockNumber}` : `#${existingCount + 1}`;
    const title =
      subjectFilters.length > 0
        ? `${config.label}${branchLabel} — ${subjectFilters.join(", ")} Test ${modeNum}`
        : `${config.label}${branchLabel} Mock Test ${modeNum}`;

    // Save template (store full questions including answers for grading)
    const template = await prisma.mockTestTemplate.create({
      data: {
        exam_type: examType,
        branch: branch ?? null,
        mode,
        mock_number: mode === "seeded" ? mockNumber : 0,
        title,
        subjects: subjectFilters.sort(),
        total_questions: fullQuestions.length,
        max_score: maxScore,
        duration_secs: config.durationSecs,
        sections: config.sections as any,
        questions: fullQuestions as any,
      },
    });

    // Pre-warm cache so subsequent takers skip the DB entirely.
    cacheTemplate(template).catch(() => {});

    return NextResponse.json({
      mockTestId: template.id,
      title: template.title,
      questions: clientQuestions,
      totalQuestions: clientQuestions.length,
      maxScore,
    });
  } catch (err) {
    console.error("Test generation error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
