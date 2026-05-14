// app/(app)/practice/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { cleanTextForMeta } from "@/lib/seo";
import PatternTable from "@/components/patterns/PatternTable";
import ExamSwitcher from "@/components/patterns/ExamSwitcher";
import PracticeHydrator from "@/components/patterns/PracticeHydrator";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { BE } from "@/lib/theme";
import { Suspense } from "react";

// Metadata is now dynamic to support topic-specific SEO on the dashboard
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ patternId?: string; q?: string; questionId?: string }> }): Promise<Metadata> {
  const { patternId, q, questionId } = await searchParams;
  const qId = q || questionId;

  const BASE = "https://battleexam.com";

  if (qId) {
    let questionText = "";
    let topicName = "";

    if (qId.startsWith("pyq-")) {
      const dbQ = await prisma.pYQ.findUnique({ where: { id: qId.slice(4) }, select: { question_text: true, pattern: { select: { topic_name: true } } } });
      questionText = dbQ?.question_text || "";
      topicName = dbQ?.pattern?.topic_name || "";
    } else if (qId.startsWith("gq-")) {
      const dbQ = await prisma.generatedQuestion.findUnique({ where: { id: qId.slice(3) }, select: { question_text: true, pattern: { select: { topic_name: true } } } });
      questionText = dbQ?.question_text || "";
      topicName = dbQ?.pattern?.topic_name || "";
    }

    if (questionText) {
      const clean = cleanTextForMeta(questionText, 120);
      return {
        title: `Solve: ${topicName} Question | Practice on BattleExam`,
        description: `Practice this ${topicName} question with instant feedback and AI explanations. ${clean}`,
        alternates: { canonical: `${BASE}/practice?q=${qId}${patternId ? `&patternId=${patternId}` : ""}` }
      };
    }
  }

  if (patternId) {
    const actualId = patternId.startsWith("subject-") ? patternId.replace("subject-", "") : patternId;
    let name = "";
    if (patternId.startsWith("subject-")) {
      const sp = await prisma.subjectPattern.findUnique({ where: { id: actualId }, select: { subject_name: true } });
      name = sp?.subject_name || "";
    } else {
      const p = await prisma.pattern.findUnique({ where: { id: actualId }, select: { topic_name: true } });
      name = p?.topic_name || "";
    }

    if (name) {
      return {
        title: `${name} Practice Questions & PYQs | BattleExam`,
        description: `Practice ${name} questions for GATE CSE. Track your progress, solve previous year questions, and master patterns.`,
        alternates: { canonical: `${BASE}/practice?patternId=${patternId}` }
      };
    }
  }

  return {
    title: "Practice Dashboard | BattleExam",
    description: "Browse GATE CSE, ISRO, BARC & ESE topics and practice with AI-generated questions and previous year papers.",
    alternates: { canonical: `${BASE}/practice` }
  };
}

// Cache unique subjects and their topic counts for the tabs
const getSubjectStats = (examType: string, branch: string | null) => {
  return unstable_cache(
    async () => {
      const statsBySubject = await prisma.pattern.groupBy({
        by: ['subject'],
        where: { exam_type: examType, ...(branch ? { branch } : {}) },
        _count: { _all: true }
      });

      const stats: Record<string, number> = {};
      statsBySubject.forEach(entry => {
        stats[entry.subject] = entry._count._all;
      });

      const subjectPatternStats = await prisma.subjectPattern.findMany({
        where: { ...(branch ? { branch } : {}) },
        select: { subject_name: true },
      });
      subjectPatternStats.forEach(sp => {
        stats[sp.subject_name] = (stats[sp.subject_name] || 0) + 1;
      });

      const normalizedExamTypes = examType === "JEE_MAIN" || examType === "JEE Main"
        ? ["JEE_MAIN", "JEE Main"]
        : [examType];

      const mockCount = await prisma.mockTestTemplate.count({
        where: {
          exam_type: { in: normalizedExamTypes },
          ...(branch && branch !== "null" && branch !== "Common" ? { branch } : {}),
          mode: 'seeded'
        }
      });
      if (mockCount > 0) {
        stats["Full Papers"] = mockCount;
      }

      return stats;
    },
    [`subject-stats-${examType}-${branch || "all"}-v3`],
    { revalidate: 3600, tags: ["patterns"] }
  )();
};

const getTopicsForSubject = (examType: string, branch: string | null, subject: string | null) => {
  return unstable_cache(
    async () => {
      const isAll = !subject || subject === "All";

      const subjectPatterns = await prisma.subjectPattern.findMany({
        where: {
          exam_type: examType,
          ...(branch ? { branch } : {}),
          ...(!isAll ? { subject_name: subject } : {}),
        },
        select: {
          id: true,
          subject_name: true,
          branch: true,
          exam_type: true,
        },
      });

      const subjectsWithCounts = await Promise.all(
        subjectPatterns.map(async (sp) => {
          const pyqCount = await prisma.pYQ.count({
            where: {
              pattern: {
                subject: sp.subject_name,
                branch: sp.branch,
                exam_type: sp.exam_type,
              }
            }
          });
          return { ...sp, pyqCount };
        })
      );

      const mappedSubjects = subjectsWithCounts.map((sp) => ({
        id: `subject-${sp.id}`,
        _rawId: sp.id,
        subject: sp.subject_name,
        topic_name: sp.subject_name,
        atomic_logic: `Comprehensive practice covering all seeded questions for ${sp.subject_name}.`,
        isSubjectLevel: true,
        totalQuestions: sp.pyqCount,
        questionsCount: 0,
        pyqsCount: sp.pyqCount,
        solvedQuestions: 0,
        questions: [],
        pyqs: [],
      }));

      if (isAll && mappedSubjects.length > 0) return mappedSubjects;

      const topicPatterns = await prisma.pattern.findMany({
        where: {
          exam_type: examType,
          ...(branch ? { branch } : {}),
          ...(!isAll ? { subject } : {}),
        },
        select: {
          id: true,
          topic_name: true,
          subject: true,
          atomic_logic: true,
          short_notes: true,
          _count: { select: { questions: true, pyqs: true } },
        },
        orderBy: { topic_name: "asc" },
      });

      const mappedTopics = topicPatterns.map((p) => ({
        ...p,
        totalQuestions: p._count.questions + p._count.pyqs,
        questionsCount: p._count.questions,
        pyqsCount: p._count.pyqs,
        solvedQuestions: 0,
        questions: [],
        pyqs: [],
      }));

      if (subject === "Full Papers") {
        const normalizedExamTypes = examType === "JEE_MAIN" || examType === "JEE Main"
          ? ["JEE_MAIN", "JEE Main"]
          : [examType];

        const mocks = await prisma.mockTestTemplate.findMany({
          where: {
            exam_type: { in: normalizedExamTypes },
            ...(branch && branch !== "null" && branch !== "Common" ? { branch } : {}),
            mode: 'seeded'
          },
          select: {
            id: true,
            title: true,
            mock_number: true,
            total_questions: true,
            subjects: true,
          },
          orderBy: { mock_number: 'desc' }
        });

        return mocks.map(m => ({
          id: `mock-${m.id}`,
          topic_name: m.title,
          subject: "Full Papers",
          atomic_logic: `Full paper practice for ${m.title}.`,
          totalQuestions: m.total_questions,
          questionsCount: m.total_questions,
          pyqsCount: 0,
          solvedQuestions: 0,
          questions: [],
          pyqs: [],
          isMock: true
        }));
      }

      return [...mappedSubjects, ...mappedTopics];
    },
    [`topics-static-${examType}-${branch || "all"}-${subject || "all"}-v1`],
    { revalidate: 600, tags: ["patterns"] }
  )();
};

const getCachedExamMeta = unstable_cache(
  async () => {
    const rows = await prisma.pattern.findMany({
      select: { exam_type: true, branch: true },
      distinct: ["exam_type", "branch"],
    });

    const exams = [...new Set(rows.map((r) => r.exam_type))].sort();
    const branchesByExam: Record<string, string[]> = {};
    for (const row of rows) {
      if (!branchesByExam[row.exam_type]) branchesByExam[row.exam_type] = [];
      if (!branchesByExam[row.exam_type].includes(row.branch)) {
        branchesByExam[row.exam_type].push(row.branch);
      }
    }
    return { exams, branchesByExam };
  },
  ["exam-meta"],
  { revalidate: 3600, tags: ["patterns"] }
);

// ── Async server component that fetches heavy data and streams into the page ──
async function TopicsSection({
  exam,
  branch,
  subject,
  patternId,
  questionId,
}: {
  exam: string;
  branch: string;
  subject: string;
  patternId?: string;
  questionId?: string;
}) {
  let activeSubject = subject;

  // Resolve subject from patternId (deep-link path — rare)
  if (patternId && (activeSubject === "All" || !activeSubject)) {
    if (patternId.startsWith("subject-")) {
      const sp = await prisma.subjectPattern.findUnique({ where: { id: patternId.replace("subject-", "") }, select: { subject_name: true } });
      if (sp) activeSubject = sp.subject_name;
    } else {
      const p = await prisma.pattern.findUnique({ where: { id: patternId }, select: { subject: true } });
      if (p) activeSubject = p.subject;
    }
  }

  const [subjectStats, topics] = await Promise.all([
    getSubjectStats(exam, branch || null),
    getTopicsForSubject(exam, branch || null, activeSubject),
  ]);

  if (topics.length === 0 && activeSubject && activeSubject !== "All") {
    return (
      <div style={{ borderRadius: 16, padding: '48px 24px', textAlign: 'center', background: BE.surface, border: `1px solid ${BE.line}` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, marginBottom: 16, fontSize: 24, background: 'var(--bg-surface-2)' }}>🔍</div>
        <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: BE.text }}>No topics found</h3>
        <p style={{ fontSize: 14, color: BE.textDim }}>We haven&apos;t added study patterns for {activeSubject} yet.</p>
      </div>
    );
  }

  return (
    <PatternTable
      key={`${exam}-${branch}`}
      patterns={topics}
      highlightPatternId={patternId}
      directQuestionId={questionId}
      subjectStats={subjectStats}
      activeSubject={activeSubject}
      resolvedExam={exam}
      resolvedBranch={branch}
    />
  );
}

function TopicsLoadingFallback() {
  return (
    <div style={{ borderTop: `1px solid ${BE.line}`, paddingTop: 24 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          height: 64, borderRadius: 12, background: BE.surface,
          border: `1px solid ${BE.line}`, marginBottom: 8,
          opacity: 1 - i * 0.1,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  );
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ patternId?: string; exam?: string; branch?: string; subject?: string; questionId?: string }>;
}) {
  const { patternId, exam, branch: branchParam, subject: subjectParam, questionId } = await searchParams;
  const { userId } = await auth();

  try {
    // Only fetch what the shell needs — examMeta (cached) + user prefs
    // These are fast and allow the header + ExamSwitcher to render immediately.
    const [examMeta, dbUser, cookieStore] = await Promise.all([
      getCachedExamMeta(),
      userId ? prisma.user.findUnique({
        where: { id: userId },
        select: { preferred_exam: true, preferred_branch: true }
      }) : Promise.resolve(null),
      cookies(),
    ]);

    const activeExamType = exam || dbUser?.preferred_exam || "GATE";
    let activeBranch = branchParam ?? dbUser?.preferred_branch ?? null;

    const availableBranches = examMeta.branchesByExam[activeExamType] ?? [];

    if (activeBranch && !availableBranches.includes(activeBranch)) activeBranch = null;

    // Stable default: prefer "CSE", else first branch alphabetically
    if (!activeBranch && availableBranches.length > 0) {
      activeBranch = availableBranches.includes("CSE") ? "CSE" : availableBranches[0];
    }

    const cookieSubject = cookieStore.get(`pref_subject_${activeExamType}_${activeBranch}`)?.value;
    const activeSubject = subjectParam || cookieSubject || "All";

    // Shell renders immediately. TopicsSection (subjectStats + topics) streams in via Suspense.
    return (
      <div className="be-screen" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <PracticeHydrator />
        <div className="max-w-[1280px] mx-auto w-full flex flex-col md:flex-row gap-8 px-4 py-6 md:px-8 md:py-12 md:pb-20">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mb-5 md:mb-6">
              <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BE.textMute }}>
                {activeExamType}{activeBranch ? ` · ${activeBranch}` : ''} · Prep tracker
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 leading-[1.1]" style={{ fontFamily: BE.serif, color: BE.text }}>
                Master every topic, One pattern at a time.
              </h1>
              <div className="text-sm md:text-[15.5px] leading-relaxed max-w-[640px]" style={{ color: BE.textDim }}>
                Drill into any subtopic to get the question bank, previous years, and your notes.
              </div>
            </div>

            <ExamSwitcher
              currentExam={activeExamType}
              currentBranch={activeBranch}
              availableExams={examMeta.exams}
              availableBranches={availableBranches}
            />

            <Suspense fallback={<TopicsLoadingFallback />}>
              <TopicsSection
                exam={activeExamType}
                branch={activeBranch ?? ""}
                subject={activeSubject}
                patternId={patternId}
                questionId={questionId}
              />
            </Suspense>
          </div>

          <div className="hidden lg:block w-[300px] shrink-0" />
        </div>
      </div>
    );
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    console.error("Practice Page Error:", err);
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center text-red-100">
          <p className="text-red-400 font-bold text-lg mb-2">⚠️ Something went wrong</p>
          <p className="opacity-70 text-sm">
            We couldn&apos;t load your personalized study list. Please try again in a moment.
          </p>
        </div>
      </div>
    );
  }
}
