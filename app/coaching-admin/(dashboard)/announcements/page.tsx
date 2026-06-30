import Link from "next/link";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import AnnouncementsClient from "@/components/coaching/AnnouncementsClient";

export const dynamic = "force-dynamic";

// In-app announcement board — replaces the external WhatsApp group. The tutor
// posts titled messages, optionally pinned and/or scoped to specific batches;
// students see them on their dashboard with an unread badge. Gated per coaching
// by Coaching.announcements_enabled (toggled here).
export default async function AnnouncementsPage() {
  const actor = await resolveCoachingAdmin();

  // Super admins must pick a coaching first (these server reads aren't wired into
  // impersonation yet — matches the attendance/fees pages).
  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-semibold">Announcements</h1>
        <p className="mt-2 text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          to manage its announcements.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;

  const [coaching, batches, announcements, studentTotal] = await Promise.all([
    prisma.coaching.findUnique({
      where: { id: coachingId },
      select: { announcements_enabled: true },
    }),
    prisma.batch.findMany({
      where: { coaching_id: coachingId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.announcement.findMany({
      where: { coaching_id: coachingId, active: true },
      select: {
        id: true,
        title: true,
        body: true,
        pinned: true,
        batch_ids: true,
        created_at: true,
        _count: { select: { reads: true } },
      },
      orderBy: [{ pinned: "desc" }, { created_at: "desc" }],
      take: 200,
    }),
    // Denominator for the "X / Y read" stat: approved + active students.
    prisma.student.count({
      where: { coaching_id: coachingId, status: "approved", active: true },
    }),
  ]);

  return (
    <AnnouncementsClient
      enabled={coaching?.announcements_enabled ?? false}
      batches={batches}
      studentTotal={studentTotal}
      initialAnnouncements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        pinned: a.pinned,
        batchIds: a.batch_ids,
        createdAt: a.created_at.toISOString(),
        readCount: a._count.reads,
      }))}
    />
  );
}
