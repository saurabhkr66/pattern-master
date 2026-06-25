import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getCachedCoachingBySlug } from "@/lib/coachingCache";
import { getStudentAttendance } from "@/lib/coachingAttendanceData";
import StudentHeader from "@/components/coaching/StudentHeader";
import StudentAttendanceList from "@/components/coaching/StudentAttendanceList";
import { Card, display } from "@/components/coaching/ui";
import { ArrowLeft, CalendarCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentAttendancePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const coaching = await getCachedCoachingBySlug(slug);
  if (!coaching || !coaching.active) notFound();
  // Feature is off for this coaching → the page doesn't exist for students.
  if (!coaching.attendance_visible_to_students) notFound();

  const student = await getCurrentStudent(coaching.id);
  if (!student) redirect(`/c/${slug}/login`);
  // Pending/rejected students don't get the attendance view (mirrors the dashboard gate).
  if (student.status !== "approved") redirect(`/c/${slug}/dashboard`);

  const { days, present, total, percent } = await getStudentAttendance(coaching.id, student.id);

  const pctColor = percent >= 75 ? "#22c55e" : percent >= 50 ? "#f59e0b" : "#f87171";

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#06060c" }}>
      <div
        className="pointer-events-none absolute right-0 top-[-150px] h-[380px] w-[600px]"
        style={{ background: "radial-gradient(60% 100% at 70% 0%, rgba(255,143,0,0.13), transparent 70%)" }}
      />
      <StudentHeader coachingName={coaching.name} studentName={student.name} slug={slug} />

      <main className="relative mx-auto max-w-4xl px-5 py-7 sm:px-12 sm:py-10">
        <Link
          href={`/c/${slug}/dashboard`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <h1
          className="mt-4 flex items-center gap-2.5 text-2xl font-bold text-white sm:text-[32px]"
          style={{ fontFamily: display, letterSpacing: "-0.02em" }}
        >
          <CalendarCheck className="h-6 w-6 text-amber-400" /> Attendance
        </h1>
        <p className="mt-1.5 text-sm text-slate-400 sm:text-[15px]">Your daily attendance record.</p>

        {total === 0 ? (
          <Card>
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span
                className="grid h-16 w-16 place-items-center rounded-2xl"
                style={{ background: "rgba(255,255,255,0.025)" }}
              >
                <CalendarCheck className="h-8 w-8 text-slate-500" strokeWidth={1.5} />
              </span>
              <p className="mt-5 text-[18px] font-bold text-white" style={{ fontFamily: display }}>
                No attendance yet
              </p>
              <p className="mt-1.5 max-w-[34ch] text-sm text-slate-500">
                Once your tutor starts marking attendance, it’ll show up here.
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Headline summary */}
            <Card glow>
              <div className="grid grid-cols-3 gap-2.5 px-5 py-5 sm:gap-3 sm:px-6">
                <Stat label="Attendance" value={`${percent}%`} color={pctColor} />
                <Stat label="Present" value={String(present)} color="#22c55e" />
                <Stat label="Days marked" value={String(total)} color="#94a3b8" />
              </div>
            </Card>

            {/* Day-by-day list (revealed progressively) */}
            <StudentAttendanceList days={days} />
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl px-3.5 py-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-extrabold leading-none text-white" style={{ fontFamily: display }}>
        {value}
      </div>
    </div>
  );
}
