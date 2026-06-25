"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CalendarCheck, Check, X, Users, UserCheck, History } from "lucide-react";
import { Btn, Card, Pill, PageHead, StatCard, display } from "@/components/coaching/ui";
import VisibilityToggle from "@/components/coaching/VisibilityToggle";
import type { RosterStudent, AttendanceHistoryRow } from "@/lib/coachingAttendanceData";

const inputCls =
  "rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500";

// Must match ATTENDANCE_HISTORY_PAGE in lib/coachingAttendanceData (server-only, so
// it can't be imported here): the page size the history endpoint returns per fetch.
const HISTORY_PAGE = 30;

type Batch = { id: string; name: string; students: number };

// Local calendar day as YYYY-MM-DD (not UTC — the tutor marks "today" in their
// own timezone). The server stores it as a plain @db.Date.
function todayLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

type RosterEntry = { students: RosterStudent[]; taken: boolean };

export default function AttendanceClient({
  attendanceVisibleToStudents,
  batches,
  initialHistory,
  initialBatchId,
  initialDate,
  initialRoster,
  initialTaken,
}: {
  attendanceVisibleToStudents: boolean;
  batches: Batch[];
  initialHistory: AttendanceHistoryRow[];
  initialBatchId: string;
  initialDate: string;
  initialRoster: RosterStudent[] | null;
  initialTaken: boolean;
}) {
  // Whether the server pre-rendered a roster we can paint immediately (no spinner).
  const seeded = Boolean(initialBatchId && initialDate && initialRoster);

  const [batchId, setBatchId] = useState<string>(initialBatchId || batches[0]?.id || "");
  // Default to the server's date so the seeded roster is a cache hit on first paint.
  const [date, setDate] = useState<string>(initialDate || todayLocal());
  const [roster, setRoster] = useState<RosterStudent[] | null>(seeded ? initialRoster : null);
  const [taken, setTaken] = useState(seeded ? initialTaken : false);
  const [loading, setLoading] = useState(false);

  // Per (batch|date) roster cache so switching back to a previously-loaded view is
  // instant — no spinner, no blanking. Seeded with the server's initial roster.
  const rosterCache = useRef<Map<string, RosterEntry> | null>(null);
  if (rosterCache.current === null) {
    rosterCache.current = new Map();
    if (seeded) {
      rosterCache.current.set(`${initialBatchId}|${initialDate}`, {
        students: initialRoster!,
        taken: initialTaken,
      });
    }
  }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<AttendanceHistoryRow[]>(initialHistory);
  const [historyHasMore, setHistoryHasMore] = useState(initialHistory.length >= HISTORY_PAGE);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const submitting = useRef(false);

  const loadRoster = useCallback(async () => {
    if (!batchId || !date) {
      setRoster(null);
      return;
    }
    const cacheKey = `${batchId}|${date}`;
    const cached = rosterCache.current?.get(cacheKey);
    if (cached) {
      // Paint the cached roster immediately and revalidate quietly below — no spinner.
      setRoster(cached.students);
      setTaken(cached.taken);
    } else {
      setLoading(true);
      setRoster(null);
    }
    setError(null);
    try {
      const res = await fetch(
        `/api/coaching/attendance?batchId=${encodeURIComponent(batchId)}&date=${date}`
      );
      const data = await res.json();
      if (!res.ok) {
        // Keep the cached view on a failed revalidate; only surface the error when
        // we had nothing to show.
        if (!cached) {
          setError(data.error ?? "could not load the roster");
          setRoster(null);
        }
        return;
      }
      rosterCache.current?.set(cacheKey, { students: data.students, taken: data.taken });
      setRoster(data.students);
      setTaken(data.taken);
    } catch {
      if (!cached) {
        setError("network error — try again");
        setRoster(null);
      }
    } finally {
      setLoading(false);
    }
  }, [batchId, date]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  // Reload the newest page (after a save). Resets any older pages that were loaded.
  const refreshHistory = useCallback(async () => {
    const res = await fetch("/api/coaching/attendance/history");
    if (res.ok) {
      const d = await res.json();
      setHistory(d.history);
      setHistoryHasMore(d.hasMore);
    }
  }, []);

  // Append the next page of older sessions.
  const loadMoreHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/coaching/attendance/history?offset=${history.length}`);
      if (res.ok) {
        const d = await res.json();
        setHistory((prev) => [...prev, ...d.history]);
        setHistoryHasMore(d.hasMore);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, [history.length]);

  const setPresent = (studentId: string, present: boolean) =>
    setRoster((rows) => rows?.map((r) => (r.id === studentId ? { ...r, present } : r)) ?? null);
  const markAll = (present: boolean) =>
    setRoster((rows) => rows?.map((r) => ({ ...r, present })) ?? null);

  async function save() {
    if (submitting.current || !roster || roster.length === 0) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      const marks = Object.fromEntries(roster.map((r) => [r.id, r.present]));
      const res = await fetch("/api/coaching/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, date, marks }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "could not save attendance");
        return;
      }
      setTaken(true);
      setSavedAt(Date.now());
      // Reflect the just-saved marks in the cache so a switch-away/back shows them.
      rosterCache.current?.set(`${batchId}|${date}`, { students: roster, taken: true });
      await refreshHistory();
    } catch {
      setError("network error — try again");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  const presentCount = roster?.filter((r) => r.present).length ?? 0;
  const total = roster?.length ?? 0;

  return (
    <div className="p-6 sm:p-8">
      <PageHead
        title="Attendance"
        sub="Mark a batch present or absent, day by day"
        icon={<CalendarCheck className="h-7 w-7" />}
      />

      <VisibilityToggle
        initial={attendanceVisibleToStudents}
        endpoint="/api/coaching/attendance/settings"
        title="Show attendance to students"
        onLabel="Students can see their own attendance record and percentage."
        offLabel="Attendance stays private — only you and your team can see it."
      />

      {batches.length === 0 ? (
        <Card>
          <div className="px-6 py-14 text-center text-slate-400">
            Create a batch and add students before taking attendance.
          </div>
        </Card>
      ) : (
        <>
          {/* Controls */}
          <Card>
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1.5 text-sm text-slate-300">
                Batch
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className={`${inputCls} min-w-[12rem]`}
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.students})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-slate-300">
                Date
                <input
                  type="date"
                  value={date}
                  max={todayLocal()}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </label>
              <div className="flex-1" />
              {taken && <Pill tone="success" dot>Already marked</Pill>}
            </div>
          </Card>

          {/* Roster */}
          <div className="mt-5">
            {loading ? (
              <Card>
                <div className="px-6 py-14 text-center text-slate-400">Loading roster…</div>
              </Card>
            ) : roster && roster.length > 0 ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-300">
                    <UserCheck className="mr-1.5 inline h-4 w-4 text-green-400" />
                    {presentCount} / {total} present
                  </div>
                  <div className="flex gap-2">
                    <Btn kind="soft" onClick={() => markAll(true)}>
                      Mark all present
                    </Btn>
                    <Btn kind="ghost" onClick={() => markAll(false)}>
                      Mark all absent
                    </Btn>
                  </div>
                </div>

                <Card>
                  <div className="divide-y divide-white/[0.06]">
                    {roster.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <span className="font-medium text-white">{s.name}</span>
                        <PresentToggle present={s.present} onChange={(p) => setPresent(s.id, p)} />
                      </div>
                    ))}
                  </div>
                </Card>

                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

                <div className="mt-4 flex items-center justify-end gap-3">
                  {savedAt && !saving && <span className="text-sm text-green-400">Saved ✓</span>}
                  <Btn type="submit" onClick={save} disabled={saving}>
                    {saving ? "Saving…" : taken ? "Update attendance" : "Save attendance"}
                  </Btn>
                </div>
              </>
            ) : (
              <Card>
                <div className="px-6 py-14 text-center text-slate-400">
                  <Users className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                  {error ?? "No approved students in this batch yet."}
                </div>
              </Card>
            )}
          </div>

          {/* History */}
          <HistoryPanel
            history={history}
            batches={batches}
            hasMore={historyHasMore}
            loadingMore={loadingHistory}
            onLoadMore={loadMoreHistory}
          />
        </>
      )}
    </div>
  );
}

// Segmented Present / Absent control for one student.
function PresentToggle({ present, onChange }: { present: boolean; onChange: (p: boolean) => void }) {
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => onChange(true)}
        aria-pressed={present}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition"
        style={
          present
            ? { background: "rgba(34,197,94,0.16)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.4)" }
            : { background: "rgba(255,255,255,0.04)", color: "#8b93a2", border: "1px solid rgba(255,255,255,0.07)" }
        }
      >
        <Check className="h-3.5 w-3.5" /> Present
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        aria-pressed={!present}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition"
        style={
          !present
            ? { background: "rgba(239,68,68,0.14)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }
            : { background: "rgba(255,255,255,0.04)", color: "#8b93a2", border: "1px solid rgba(255,255,255,0.07)" }
        }
      >
        <X className="h-3.5 w-3.5" /> Absent
      </button>
    </div>
  );
}

function HistoryPanel({
  history,
  batches,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  history: AttendanceHistoryRow[];
  batches: Batch[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const [batchFilter, setBatchFilter] = useState<string>(""); // "" = all batches

  if (history.length === 0) return null;

  const filtered = batchFilter ? history.filter((h) => h.batchId === batchFilter) : history;

  return (
    <div className="mt-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white" style={{ fontFamily: display }}>
          <History className="h-5 w-5 text-amber-400" /> Recent roll-calls
        </h2>
        {batches.length > 1 && (
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
          >
            <option value="">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <Card>
        <div className="divide-y divide-white/[0.06]">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">No roll-calls for this batch yet.</div>
          ) : (
            filtered.map((h) => (
            <div key={h.sessionId} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <div className="font-medium text-white">{h.batchName}</div>
                <div className="text-xs text-slate-500">{fmtDate(h.date)}</div>
              </div>
              <Pill tone={h.present === h.total ? "success" : "slate"}>
                {h.present} / {h.total} present
              </Pill>
            </div>
            ))
          )}
        </div>
      </Card>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Btn kind="ghost" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Btn>
        </div>
      )}
    </div>
  );
}


