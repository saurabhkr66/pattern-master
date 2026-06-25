"use client";

import { useState } from "react";
import { CalendarCheck, CalendarX } from "lucide-react";
import { Card, Pill, mono } from "@/components/coaching/ui";
import type { StudentAttendanceDay } from "@/lib/coachingAttendanceData";

const PAGE = 30;

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

// The student's day-by-day attendance, revealed progressively so a long history
// doesn't render hundreds of rows at once. `days` is already the server-capped set.
export default function StudentAttendanceList({ days }: { days: StudentAttendanceDay[] }) {
  const [shown, setShown] = useState(PAGE);
  const visible = days.slice(0, shown);

  return (
    <div className="mt-6 space-y-2.5">
      {visible.map((d, i) => (
        <Card key={`${d.date}-${i}`}>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                style={{
                  background: d.present ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${d.present ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                }}
              >
                {d.present ? (
                  <CalendarCheck className="h-5 w-5 text-green-400" />
                ) : (
                  <CalendarX className="h-5 w-5 text-red-400" />
                )}
              </span>
              <span className="text-sm text-slate-200" style={{ fontFamily: mono }}>
                {fmtDate(d.date)}
              </span>
            </div>
            {d.present ? <Pill tone="success">Present</Pill> : <Pill tone="danger">Absent</Pill>}
          </div>
        </Card>
      ))}

      {shown < days.length && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
          >
            Show more ({days.length - shown})
          </button>
        </div>
      )}
    </div>
  );
}
