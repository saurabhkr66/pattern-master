import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getCachedCoachingBySlug, getCachedAnnouncements } from "@/lib/coachingCache";
import { studentInTestBatches } from "@/lib/coachingBatch";
import StudentHeader from "@/components/coaching/StudentHeader";
import MarkAnnouncementsRead from "@/components/coaching/MarkAnnouncementsRead";
import { Card, Pill, display } from "@/components/coaching/ui";
import { ArrowLeft, Megaphone, Pin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentAnnouncementsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const coaching = await getCachedCoachingBySlug(slug);
  if (!coaching || !coaching.active) notFound();
  // Feature is off for this coaching → the page doesn't exist for students.
  if (!coaching.announcements_enabled) notFound();

  const student = await getCurrentStudent(coaching.id);
  if (!student) redirect(`/c/${slug}/login`);
  // Pending/rejected students don't get the board (mirrors the dashboard gate).
  if (student.status !== "approved") redirect(`/c/${slug}/dashboard`);

  // Cached list (pinned-first, newest-next), filtered to what this student may see.
  const all = await getCachedAnnouncements(coaching.id);
  const visible = all.filter((a) => studentInTestBatches(a.batch_ids, student.batch_id));

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#06060c" }}>
      <div
        className="pointer-events-none absolute right-0 top-[-150px] h-[380px] w-[600px]"
        style={{ background: "radial-gradient(60% 100% at 70% 0%, rgba(255,143,0,0.13), transparent 70%)" }}
      />
      <StudentHeader coachingName={coaching.name} studentName={student.name} slug={slug} />

      {/* Mark everything the student can see as read → clears the dashboard badge. */}
      <MarkAnnouncementsRead ids={visible.map((a) => a.id)} />

      <main className="relative mx-auto max-w-3xl px-5 py-7 sm:px-12 sm:py-10">
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
          <Megaphone className="h-6 w-6 text-amber-400" /> Announcements
        </h1>
        <p className="mt-1.5 text-sm text-slate-400 sm:text-[15px]">Updates from your coaching.</p>

        <div className="mt-6 space-y-4">
          {visible.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <span
                  className="grid h-16 w-16 place-items-center rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.025)" }}
                >
                  <Megaphone className="h-8 w-8 text-slate-500" strokeWidth={1.5} />
                </span>
                <p className="mt-5 text-[18px] font-bold text-white" style={{ fontFamily: display }}>
                  Nothing here yet
                </p>
                <p className="mt-1.5 max-w-[34ch] text-sm text-slate-500">
                  Announcements from your tutor will show up here.
                </p>
              </div>
            </Card>
          ) : (
            visible.map((a) => (
              <Card key={a.id} glow={a.pinned}>
                <div className="px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[17px] font-bold text-white">{a.title}</span>
                    {a.pinned && (
                      <Pill tone="amber">
                        <Pin className="h-3 w-3" /> Pinned
                      </Pill>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-300">
                    {a.body}
                  </p>
                  <div className="mt-3 text-xs text-slate-500">
                    {new Date(a.created_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
