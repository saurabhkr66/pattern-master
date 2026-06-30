import Link from "next/link";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { getAttendanceAnalytics, getAttendanceHistory, getBatchRoster } from "@/lib/coachingAttendanceData";
import AttendanceClient from "@/components/coaching/AttendanceClient";

export const dynamic = "force-dynamic";

// "Today" in IST — the userbase (and the date the tutor marks) is India, and the
// server may run in UTC, so we can't rely on the server's local date. The client
// defaults its date picker to this same value, so the server-rendered initial
// roster is a cache hit on first paint (no loading spinner on navigation).
function istToday(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

export default async function AttendancePage() {
  const actor = await resolveCoachingAdmin();

  // Super admins must pick a coaching first (these server reads aren't wired into
  // impersonation yet — matches the fees/students pages).
  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="mt-2 text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          to mark its attendance.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;
  const initialDate = istToday();

  const [coaching, batches, history, analytics] = await Promise.all([
    prisma.coaching.findUnique({
      where: { id: coachingId },
      select: { attendance_visible_to_students: true },
    }),
    prisma.batch.findMany({
      where: { coaching_id: coachingId },
      select: { id: true, name: true, _count: { select: { students: true } } },
      orderBy: { name: "asc" },
    }),
    getAttendanceHistory(coachingId),
    getAttendanceAnalytics(coachingId),
  ]);

  // Pre-render the roster for the default batch + today so the first paint has
  // content instead of a spinner. Reads the (Redis-cached) roster, so it's cheap.
  const initialBatchId = batches[0]?.id ?? "";
  const initialRoster = initialBatchId
    ? await getBatchRoster(coachingId, initialBatchId, initialDate)
    : null;

  return (
    <AttendanceClient
      attendanceVisibleToStudents={coaching?.attendance_visible_to_students ?? false}
      batches={batches.map((b) => ({ id: b.id, name: b.name, students: b._count.students }))}
      initialHistory={history}
      initialBatchId={initialBatchId}
      initialDate={initialDate}
      initialRoster={initialRoster?.students ?? null}
      initialTaken={initialRoster?.taken ?? false}
      analytics={analytics}
    />
  );
}
