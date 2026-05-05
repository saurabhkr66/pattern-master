import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { toSlug } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ examType: string }> }): Promise<Metadata> {
  const { examType } = await params;
  const label = examType.toUpperCase().replace('-', ' ');
  return {
    title: `${label} Mock Tests & Practice Papers | BattleExam`,
    description: `Free online mock tests for ${label}. Real exam interface, detailed analysis, and subject-wise practice papers. Start your ${label} preparation today.`,
  };
}

export default async function ExamMockTestsPage({ params }: { params: Promise<{ examType: string }> }) {
  const { examType } = await params;
  
  // Find the actual exam type string from the database that matches the slug
  const allExams = await prisma.mockTestTemplate.findMany({
    select: { exam_type: true },
    distinct: ['exam_type']
  });

  const actualExamType = allExams.find(e => toSlug(e.exam_type) === examType)?.exam_type;
  if (!actualExamType) notFound();

  // Get branches/modes for this exam
  const branches = await prisma.mockTestTemplate.groupBy({
    by: ['branch'],
    where: { exam_type: actualExamType },
    _count: { _all: true }
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-12">
        <Link href="/mock-tests" className="text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">← All Exams</Link>
        <h1 className="text-4xl font-black mt-4" style={{ color: 'var(--text-primary)' }}>
          {actualExamType.replace('_', ' ')} Mock Tests
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((b) => {
          const branchLabel = b.branch || "All Subjects";
          const branchSlug = toSlug(branchLabel);
          
          return (
            <Link 
              key={branchSlug}
              href={`/mock-tests/${examType}/${branchSlug}`}
              className="group p-8 rounded-2xl border hover:border-indigo-500/40 transition-all hover:translate-y-[-4px]"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
                {b._count._all} Papers
              </div>
              <h2 className="text-2xl font-black mb-4 group-hover:text-indigo-400 transition-colors">
                {branchLabel}
              </h2>
              <div className="text-sm font-bold flex items-center gap-2">
                View All Papers →
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
