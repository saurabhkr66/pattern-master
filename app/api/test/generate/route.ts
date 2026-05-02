import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getExamConfig, type ExamType, type SectionConfig } from "@/lib/examConfigs";
import type { TestQuestion } from "@/components/test/TestEngine";

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
  source: "pyq" | "subject_pyq";
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
  const subjects =
    subjectFilters.length > 0
      ? subjectFilters.filter((s) =>
          section.subjects === null || section.subjects.includes(s)
        )
      : section.subjects ?? [];

  const usedSubjectFilter = subjects.length > 0;

  // Only filter by branch for the catch-all subject section (subjects === null).
  // Named sections like "General Aptitude", "Physics", "Chemistry" are cross-branch.
  const branchFilter = section.subjects === null && branch ? { branch } : {};

  const [pyqs, subjectPyqs] = await Promise.all([
    // PYQ table: linked through Pattern (has exam_type + branch)
    prisma.pYQ.findMany({
      where: {
        pattern: {
          exam_type: examType,
          ...branchFilter,
          ...(usedSubjectFilter && section.subjects !== null
            ? { subject: { in: subjects } }
            : section.subjects !== null
            ? { subject: { in: section.subjects } }
            : {}),
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
    }),

    // SubjectPYQ table: linked through SubjectPattern (has exam_type + branch)
    prisma.subjectPYQ.findMany({
      where: {
        subject_pattern: {
          exam_type: examType,
          ...branchFilter,
          ...(usedSubjectFilter && section.subjects !== null
            ? { subject_name: { in: subjects } }
            : section.subjects !== null
            ? { subject_name: { in: section.subjects } }
            : {}),
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
        subject_pattern: { select: { subject_name: true } },
      },
    }),
  ]);

  const normalized: RawQuestion[] = [
    ...pyqs.map((q) => ({
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
    })),
    ...subjectPyqs.map((q) => ({
      id: q.id,
      source: "subject_pyq" as const,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      question_type: q.question_type,
      marks: q.marks,
      year: q.year,
      subject: q.subject_pattern?.subject_name ?? "Unknown",
      images: q.images,
    })),
  ];

  return shuffle(normalized);
}

/* ── Pick questions for a section respecting type + mark distribution ── */
function pickSectionQuestions(
  pool: RawQuestion[],
  section: SectionConfig
): { mandatory: RawQuestion[]; optional: RawQuestion[] } {
  // Separate by question type
  const byType: Record<string, RawQuestion[]> = {};
  for (const q of pool) {
    byType[q.question_type] = byType[q.question_type] ?? [];
    byType[q.question_type].push(q);
  }

  const mandatory: RawQuestion[] = [];
  const optional: RawQuestion[] = [];

  const totalMandatory = section.optional
    ? section.totalQuestions - section.optional.poolSize
    : section.totalQuestions;

  if (section.markDistribution.length > 0) {
    for (const band of section.markDistribution) {
      const typeKey = band.type ?? null;
      const count = band.count;

      // Determine if this band is for the optional pool
      const isOptionalBand =
        section.optional &&
        optional.length < section.optional.poolSize &&
        mandatory.length >= totalMandatory;

      const candidates = pool.filter(
        (q) =>
          q.marks === band.marks &&
          (!typeKey || q.question_type === (typeKey as string)) &&
          !mandatory.includes(q) &&
          !optional.includes(q)
      );

      const taken = candidates.slice(0, count);

      if (isOptionalBand) {
        optional.push(...taken);
      } else if (optional.length < (section.optional?.poolSize ?? 0) && mandatory.length >= totalMandatory) {
        optional.push(...taken);
      } else {
        mandatory.push(...taken);
      }
    }
  } else {
    // Fallback: just take first N
    mandatory.push(...pool.slice(0, totalMandatory));
    if (section.optional) {
      optional.push(...pool.slice(totalMandatory, totalMandatory + section.optional.poolSize));
    }
  }

  return { mandatory, optional };
}

/* ── Convert raw questions to TestQuestion shape ── */
function toTestQuestion(
  raw: RawQuestion,
  sectionIdx: number,
  sectionName: string,
  isOptional: boolean
): Omit<TestQuestion, "correct_answer" | "explanation"> & { correct_answer: string; explanation: string } {
  return {
    id: raw.id,
    source: raw.source,
    sectionIndex: sectionIdx,
    sectionName,
    isOptional,
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

    // ── SEEDED: look for an existing frozen template ──
    if (mode === "seeded" && mockNumber > 0) {
      const template = await prisma.mockTestTemplate.findFirst({
        where: {
          exam_type: examType,
          branch: branch ?? null,
          mode: "seeded",
          mock_number: mockNumber,
        },
      });

      if (template) {
        const safeQs = (template.questions as any[]).map(
          ({ correct_answer, explanation, ...safe }: any) => safe
        );
        return NextResponse.json({
          mockTestId: template.id,
          title: template.title,
          questions: safeQs,
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
      });

      if (unusedTemplate) {
        const safeQs = (unusedTemplate.questions as any[]).map(
          ({ correct_answer, explanation, ...safe }: any) => safe
        );
        return NextResponse.json({
          mockTestId: unusedTemplate.id,
          title: unusedTemplate.title,
          questions: safeQs,
          totalQuestions: unusedTemplate.total_questions,
          maxScore: unusedTemplate.max_score,
        });
      }
    }

    // ── Generate new questions ──
    const allSectionQuestions: Array<{
      sectionIdx: number;
      sectionName: string;
      mandatory: RawQuestion[];
      optional: RawQuestion[];
    }> = [];

    for (let si = 0; si < config.sections.length; si++) {
      const sec = config.sections[si];
      const pool = await fetchSectionQuestions(sec, examType, branch, subjectFilters);
      const { mandatory, optional } = pickSectionQuestions(pool, sec);
      allSectionQuestions.push({ sectionIdx: si, sectionName: sec.name, mandatory, optional });
    }

    // Check we have at least some questions
    const totalGenerated = allSectionQuestions.reduce(
      (sum, s) => sum + s.mandatory.length + s.optional.length,
      0
    );
    if (totalGenerated === 0) {
      return NextResponse.json(
        { error: "No questions found for this exam/branch. Please try a different exam or check if questions have been seeded." },
        { status: 404 }
      );
    }

    // Build question list with metadata (strip correct_answer + explanation from client payload)
    const clientQuestions: TestQuestion[] = [];
    const fullQuestions: Array<TestQuestion & { correct_answer: string; explanation: string }> = [];

    for (const { sectionIdx, sectionName, mandatory, optional } of allSectionQuestions) {
      for (const raw of mandatory) {
        const full = toTestQuestion(raw, sectionIdx, sectionName, false);
        fullQuestions.push(full);
        const { correct_answer, explanation, ...safe } = full;
        clientQuestions.push(safe);
      }
      for (const raw of optional) {
        const full = toTestQuestion(raw, sectionIdx, sectionName, true);
        fullQuestions.push(full);
        const { correct_answer, explanation, ...safe } = full;
        clientQuestions.push(safe);
      }
    }

    const maxScore = config.sections.reduce((sum, sec) => sum + sec.maxScore, 0);

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
