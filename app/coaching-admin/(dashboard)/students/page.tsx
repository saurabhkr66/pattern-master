import Link from "next/link";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import StudentsClient from "@/components/coaching/StudentsClient";

export const dynamic = "force-dynamic";

// Matches STUDENTS_PAGE_SIZE in the students API route — first page is
// server-rendered; the client pulls more from that endpoint.
const PAGE_SIZE = 50;

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
    // One extra row to detect a "Load more" page (no count query).
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
      take: PAGE_SIZE + 1,
    }),
    prisma.batch.findMany({
      where: { coaching_id: coachingId },
      select: { id: true, name: true, _count: { select: { students: true } } },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const hasMore = students.length > PAGE_SIZE;
  const firstPage = hasMore ? students.slice(0, PAGE_SIZE) : students;

  return (
    <StudentsClient
      initialStudents={firstPage.map((s) => ({
        ...s,
        joined_at: s.joined_at.toISOString(),
      }))}
      initialHasMore={hasMore}
      initialBatches={batches}
    />
  );
}
