import Link from "next/link";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import StudentsClient from "@/components/coaching/StudentsClient";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const actor = await resolveCoachingAdmin();

  // Super admins must pick a coaching first (impersonation isn't wired into
  // these server reads yet — that lands with the super-admin panel).
  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-semibold">Students</h1>
        <p className="mt-2 text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          to manage its students.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;

  const [students, batches] = await Promise.all([
    prisma.student.findMany({
      where: { coaching_id: coachingId },
      select: {
        id: true,
        name: true,
        phone: true,
        active: true,
        joined_at: true,
        batch_id: true,
        batch: { select: { id: true, name: true } },
      },
      orderBy: { joined_at: "desc" },
      take: 500,
    }),
    prisma.batch.findMany({
      where: { coaching_id: coachingId },
      select: { id: true, name: true, _count: { select: { students: true } } },
      orderBy: { created_at: "desc" },
    }),
  ]);

  return (
    <StudentsClient
      initialStudents={students.map((s) => ({
        ...s,
        joined_at: s.joined_at.toISOString(),
      }))}
      initialBatches={batches}
    />
  );
}
