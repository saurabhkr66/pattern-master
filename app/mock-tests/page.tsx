import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { toSlug } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Online Mock Tests – GATE, JEE Main, ISRO & BARC | BattleExam",
  description: "Free online mock tests with real exam interfaces for GATE CSE, JEE Main, ISRO, and more. Instant scoring, performance analysis, and detailed explanations.",
};

export default async function MockTestsPage() {
  const exams = await prisma.mockTestTemplate.groupBy({
    by: ['exam_type'],
    _count: { _all: true }
  }).catch(() => []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-black mb-4" style={{ color: 'var(--text-primary)' }}>
        Online Mock Tests
      </h1>
      <p className="text-lg mb-12" style={{ color: 'var(--text-secondary)' }}>
        Select an exam to browse available practice papers and full-length mocks.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <Link 
            key={exam.exam_type}
            href={`/mock-tests/${toSlug(exam.exam_type)}`}
            className="group p-8 rounded-2xl border hover:border-indigo-500/40 transition-all hover:translate-y-[-4px]"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
              {exam._count._all} Available Tests
            </div>
            <h2 className="text-2xl font-black mb-4 group-hover:text-indigo-400 transition-colors">
              {exam.exam_type.replace('_', ' ')}
            </h2>
            <div className="text-sm font-bold flex items-center gap-2">
              Browse Exams →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
