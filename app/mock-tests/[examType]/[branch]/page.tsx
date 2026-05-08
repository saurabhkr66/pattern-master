import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { toSlug } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ examType: string; branch: string }> }): Promise<Metadata> {
  const { examType, branch } = await params;
  const examLabel = examType.toUpperCase().replace('-', ' ');
  const branchLabel = branch.toUpperCase().replace('-', ' ');
  
  return {
    title: `${branchLabel} Mock Tests for ${examLabel} | BattleExam`,
    description: `Take free ${branchLabel} mock tests for ${examLabel}. Practice with full-length papers, previous year questions, and AI-generated mocks. Detailed analysis and solutions included.`,
  };
}

export default async function BranchMockTestsPage({ params }: { params: Promise<{ examType: string; branch: string }> }) {
  const { examType, branch } = await params;
  
  // Find actual exam type
  const allExams = await prisma.mockTestTemplate.findMany({
    select: { exam_type: true },
    distinct: ['exam_type']
  });
  const actualExamType = allExams.find(e => toSlug(e.exam_type) === examType)?.exam_type;
  if (!actualExamType) notFound();

  // Find tests for this branch
  const tests = await prisma.mockTestTemplate.findMany({
    where: { 
      exam_type: actualExamType,
      OR: [
        { branch: branch === 'all-subjects' ? null : undefined },
        { branch: { equals: branch, mode: 'insensitive' } },
        // Try to match by slug if exact match fails
      ]
    },
    orderBy: { created_at: 'desc' }
  });

  // If no tests found via direct match, do a fuzzy slug match
  let finalTests = tests;
  if (tests.length === 0) {
     const allTemplates = await prisma.mockTestTemplate.findMany({
        where: { exam_type: actualExamType }
     });
     finalTests = allTemplates.filter(t => toSlug(t.branch || "All Subjects") === branch);
  }

  if (finalTests.length === 0) notFound();

  const displayBranch = finalTests[0].branch || "All Subjects";

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-12">
        <Link href={`/mock-tests/${examType}`} className="text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">← Back to {actualExamType.replace('_', ' ')}</Link>
        <h1 className="text-4xl font-black mt-4" style={{ color: 'var(--text-primary)' }}>
          {displayBranch} Mock Papers
        </h1>
        <p className="text-lg mt-2 opacity-70">
          Prepare with our collection of {finalTests.length} specialized mock tests.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {finalTests.map((test) => (
          <Link
            key={test.id}
            href={`/mock-tests/${examType}/${branch}/${test.id}`}
            className="group flex items-center justify-between p-6 rounded-2xl border hover:border-indigo-500/40 transition-all"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div>
              <h3 className="text-xl font-bold mb-1 group-hover:text-indigo-400 transition-colors">
                {test.title}
              </h3>
              <div className="flex items-center gap-4 text-xs opacity-60">
                <span>{test.total_questions} Questions</span>
                <span>•</span>
                <span>{test.max_score} Marks</span>
                <span>•</span>
                <span>{Math.round(test.duration_secs / 60)} Mins</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
              →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
