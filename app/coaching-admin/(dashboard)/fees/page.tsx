import Link from "next/link";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { getFeeDues } from "@/lib/coachingFeesData";
import FeesClient from "@/components/coaching/FeesClient";

export const dynamic = "force-dynamic";

export default async function FeesPage() {
  const actor = await resolveCoachingAdmin();

  // Super admins must pick a coaching first (these server reads aren't wired into
  // impersonation yet — matches the students page).
  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-semibold">Fees</h1>
        <p className="mt-2 text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          to manage its fees.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;

  const [coaching, dues, batches, students, templates] = await Promise.all([
    prisma.coaching.findUnique({
      where: { id: coachingId },
      select: { fees_visible_to_students: true },
    }),
    getFeeDues(coachingId),
    prisma.batch.findMany({
      where: { coaching_id: coachingId },
      select: { id: true, name: true, _count: { select: { students: true } } },
      orderBy: { created_at: "desc" },
    }),
    // Approved, active students drive the ad-hoc "single student" plan picker.
    prisma.student.findMany({
      where: { coaching_id: coachingId, status: "approved", active: true },
      select: { id: true, name: true, batch: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.feeTemplate.findMany({
      where: { coaching_id: coachingId },
      select: {
        id: true,
        title: true,
        batch_id: true,
        total_amount: true,
        created_at: true,
        batch: { select: { name: true } },
        _count: { select: { plans: true } },
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  return (
    <FeesClient
      feesVisibleToStudents={coaching?.fees_visible_to_students ?? false}
      initialDues={dues}
      batches={batches.map((b) => ({ id: b.id, name: b.name, students: b._count.students }))}
      students={students.map((s) => ({ id: s.id, name: s.name, batchName: s.batch?.name ?? null }))}
      initialTemplates={templates.map((t) => ({
        id: t.id,
        title: t.title,
        batchName: t.batch?.name ?? null,
        totalAmount: t.total_amount,
        plans: t._count.plans,
      }))}
    />
  );
}
