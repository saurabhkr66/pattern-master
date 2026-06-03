import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { finalizeOverdueAttempts } from "@/lib/coachingFinalize";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TestResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await resolveCoachingAdmin();

  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <p className="text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;

  const test = await prisma.coachingTest.findFirst({
    where: { id, coaching_id: coachingId },
    select: { id: true, title: true, status: true },
  });
  if (!test) notFound();

  // Server-authoritative close: finalize any attempt whose deadline passed but
  // never submitted (closed app / dead phone), grading it from its last
  // autosaved Redis answers. Runs on-view so the table below reflects them.
  await finalizeOverdueAttempts(id, coachingId);

  const attempts = await prisma.testAttempt.findMany({
    where: { test_id: id, coaching_id: coachingId },
    select: {
      id: true,
      status: true,
      score: true,
      max_score: true,
      tab_switches: true,
      started_at: true,
      submitted_at: true,
      student: { select: { name: true, phone: true } },
    },
    orderBy: [{ score: "desc" }, { submitted_at: "asc" }],
  });

  const submitted = attempts.filter((a) => a.status === "submitted");
  const submissions = submitted.length;
  const avgScore =
    submissions > 0
      ? submitted.reduce((s, a) => s + (a.score ?? 0), 0) / submissions
      : 0;
  const topScore = submissions > 0 ? Math.max(...submitted.map((a) => a.score ?? 0)) : 0;
  const maxScore = submitted[0]?.max_score ?? attempts[0]?.max_score ?? 0;

  const stats = [
    { label: "Submissions", value: submissions },
    { label: "In progress", value: attempts.length - submissions },
    { label: "Avg score", value: maxScore ? `${avgScore.toFixed(1)} / ${maxScore}` : avgScore.toFixed(1) },
    { label: "Top score", value: maxScore ? `${topScore} / ${maxScore}` : topScore },
  ];

  return (
    <div className="p-8">
      <Link
        href="/coaching-admin/tests"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tests
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-white">{test.title}</h1>
      <p className="mt-1 text-sm text-slate-400">Results &amp; submissions</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Tab switches</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {attempts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No attempts yet.
                </td>
              </tr>
            ) : (
              attempts.map((a) => (
                <tr key={a.id} className="text-slate-200">
                  <td className="px-4 py-3">{a.student.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{a.student.phone}</td>
                  <td className="px-4 py-3">
                    {a.status === "submitted" ? (
                      <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-400">
                        Submitted
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                        In progress
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {a.status === "submitted"
                      ? `${a.score ?? 0}${a.max_score ? ` / ${a.max_score}` : ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        a.tab_switches > 0 ? "font-medium text-amber-400" : "text-slate-400"
                      }
                    >
                      {a.tab_switches}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
