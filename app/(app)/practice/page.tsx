// app/(app)/practice/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { cleanTextForMeta } from "@/lib/seo";
import PatternTable from "@/components/patterns/PatternTable";
import ExamSwitcher from "@/components/patterns/ExamSwitcher";
import PracticeHydrator from "@/components/patterns/PracticeHydrator";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { BE } from "@/lib/theme";

// Metadata is now dynamic to support topic-specific SEO on the dashboard
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ patternId?: string; q?: string; questionId?: string }> }): Promise<Metadata> {
  const { patternId, q, questionId } = await searchParams;
  const qId = q || questionId;

  const BASE = "https://battleexam.com";
  
  if (qId) {
    // If a specific question is selected in the dashboard
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
    // If a topic is selected
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
      // Use groupBy for major performance gain over fetching all pattern rows
      const statsBySubject = await prisma.pattern.groupBy({
        by: ['subject'],
        where: { exam_type: examType, ...(branch ? { branch } : {}) },
        _count: { _all: true }
      });

      const stats: Record<string, number> = {};
      statsBySubject.forEach(entry => {
        stats[entry.subject] = entry._count._all;
      });

      // Subject-level patterns only apply to GATE CSE — skip for all other exams/branches
      if (branch === "CSE") {
        const subjectPatternStats = await prisma.subjectPattern.findMany({
          select: { subject_name: true },
        });
        subjectPatternStats.forEach(sp => {
          stats[sp.subject_name] = (stats[sp.subject_name] || 0) + 1;
        });
      }

      return stats;
    },
    [`subject-stats-${examType}-${branch || "all"}-v3`],
    { revalidate: 3600, tags: ["patterns"] }
  )();
};

// Global cache — no userId. Topic names, counts etc. are static data shared across all users.
const getTopicsForSubject = (examType: string, branch: string | null, subject: string | null) => {
  return unstable_cache(
    async () => {
      const isAll = !subject || subject === "All";

      // Subject-level patterns only apply to GATE CSE — skip entirely for other exams/branches
      const subjectPatterns = (branch === "CSE")
        ? await prisma.subjectPattern.findMany({
            where: !isAll ? { subject_name: subject } : {},
            select: {
              id: true,
              subject_name: true,
              _count: { select: { pyqs: true } },
            },
          })
        : [];

      const mappedSubjects = subjectPatterns.map((sp) => ({
        id: `subject-${sp.id}`,
        _rawId: sp.id,
        subject: sp.subject_name,
        topic_name: sp.subject_name,
        atomic_logic: `Comprehensive practice covering all seeded questions for ${sp.subject_name}.`,
        isSubjectLevel: true,
        totalQuestions: sp._count.pyqs,
        questionsCount: 0,
        pyqsCount: sp._count.pyqs,
        solvedQuestions: 0, // hydrated on the client
        questions: [],
        pyqs: [],
      }));

      if (isAll && mappedSubjects.length > 0) return mappedSubjects;

      // Fetch topic patterns with counts only
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
        solvedQuestions: 0, // hydrated on the client
        questions: [],
        pyqs: [],
      }));

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

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ patternId?: string; exam?: string; branch?: string; subject?: string; questionId?: string }>;
}) {
  const { patternId, exam, branch: branchParam, subject: subjectParam, questionId } = await searchParams;
  const { userId } = await auth();

  let topics: any[] = [];
  let subjectStats: Record<string, number> = {};
  let baseExamType = "GATE";
  let baseBranch: string | null = null;

  try {
    const examMeta = await getCachedExamMeta();

    // Fetch user preferences for defaults
    const dbUser = userId ? await prisma.user.findUnique({
      where: { id: userId },
      select: { preferred_exam: true, preferred_branch: true }
    }) : null;

    const activeExamType = exam || dbUser?.preferred_exam || baseExamType;
    let activeBranch = branchParam ?? dbUser?.preferred_branch ?? baseBranch;

    const availableBranches = examMeta.branchesByExam[activeExamType] ?? [];
    
    // VALIDATION: If the saved/param branch doesn't exist for THIS exam, reset it
    if (activeBranch && !availableBranches.includes(activeBranch)) {
      activeBranch = null;
    }

    // SMART DEFAULT: If no branch (or invalid branch), pick a random one
    if (!activeBranch && availableBranches.length > 0) {
      activeBranch = availableBranches[Math.floor(Math.random() * availableBranches.length)];
    }

    // Always stamp the resolved branch into the URL so client-side keys are consistent
    if (activeBranch && !branchParam) {
      const p = new URLSearchParams();
      p.set("exam", activeExamType);
      p.set("branch", activeBranch);
      if (subjectParam) p.set("subject", subjectParam);
      if (patternId) p.set("patternId", patternId);
      if (questionId) p.set("questionId", questionId);
      redirect(`/practice?${p.toString()}`);
    }

    const cookieStore = await cookies();
    const cookieSubject = cookieStore.get(`pref_subject_${activeExamType}_${activeBranch}`)?.value;
    let activeSubject = subjectParam || cookieSubject || "All";

    // Fetch stats for the active exam/branch
    subjectStats = await getSubjectStats(activeExamType, activeBranch);

    // If we have a patternId but no subject, resolve the subject so topics are fetched correctly
    if (patternId && (activeSubject === "All" || !subjectParam)) {
      if (patternId.startsWith("subject-")) {
        const spId = patternId.replace("subject-", "");
        const sp = await prisma.subjectPattern.findUnique({ where: { id: spId }, select: { subject_name: true } });
        if (sp) activeSubject = sp.subject_name;
      } else {
        const p = await prisma.pattern.findUnique({ where: { id: patternId }, select: { subject: true } });
        if (p) activeSubject = p.subject;
      }
    }

    topics = await getTopicsForSubject(activeExamType, activeBranch, activeSubject);


    return (
      <div className="be-screen" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <PracticeHydrator />
        <div className="max-w-[1280px] mx-auto w-full flex flex-col md:flex-row gap-8 px-4 py-6 md:px-8 md:py-12 md:pb-20">
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header — tighter */}
            <div className="mb-5 md:mb-6">
              <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BE.textMute }}>
                {activeExamType}{activeBranch ? ` · ${activeBranch}` : ''} · Prep tracker
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 leading-[1.1]" style={{ fontFamily: BE.serif, color: BE.text }}>
                Master every topic, One pattern at a time.
              </h1>
              <div className="text-sm md:text-[15.5px] leading-relaxed max-w-[640px]" style={{ color: BE.textDim }}>
                Practice across {Object.keys(subjectStats).length} subjects. Drill into any subtopic to get the question bank, previous years, and your notes.
              </div>
            </div>

            <ExamSwitcher
              currentExam={activeExamType}
              currentBranch={activeBranch}
              availableExams={examMeta.exams}
              availableBranches={availableBranches}
            />

            {/* Practice Disclaimer */}
            {/* <div style={{ 
              marginBottom: 18, 
              padding: '12px 16px', 
              borderRadius: 12, 
              border: `1px solid ${BE.line}`, 
              background: BE.accentSoft,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start'
            }}>
              <div style={{ 
                width: 20, height: 20, borderRadius: 10, 
                background: BE.accentSoft, color: BE.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 900, flexShrink: 0
              }}>i</div>
              <p style={{ fontSize: 13, color: BE.textDim, lineHeight: 1.5, margin: 0, fontStyle: 'italic', fontFamily: BE.serif }}>
                <strong style={{ fontStyle: 'normal', color: BE.accent, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10, display: 'block', marginBottom: 2, fontWeight: 800 }}>Practice Note</strong>
                Topic-level questions are designed to be extremely close to the GATE standard. For guaranteed official previous year questions, select the <strong style={{ color: BE.text, fontStyle: 'normal' }}>PYQ</strong> tab within any subtopic.
              </p>
            </div> */}

            {topics.length === 0 && (subjectParam && subjectParam !== "All") ? (
              <div style={{ borderRadius: 16, padding: '48px 24px', textAlign: 'center', background: BE.surface, border: `1px solid ${BE.line}` }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, marginBottom: 16, fontSize: 24, background: 'var(--bg-surface-2)' }}>🔍</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: BE.text }}>No topics found</h3>
                <p style={{ fontSize: 14, color: BE.textDim }}>
                  We haven&apos;t added study patterns for {subjectParam} yet.
                </p>
              </div>
            ) : (
              <PatternTable
                key={`${activeExamType}-${activeBranch ?? ""}`}
                patterns={topics}
                highlightPatternId={patternId}
                directQuestionId={questionId}
                subjectStats={subjectStats}
                activeSubject={activeSubject}
                resolvedExam={activeExamType}
                resolvedBranch={activeBranch ?? ""}
              />
            )}
          </div>

          {/* Right Rail Mock */}
          <div className="hidden lg:block w-[300px] shrink-0">
            {/* Ad Rail or Info Rail would go here */}
          </div>
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
