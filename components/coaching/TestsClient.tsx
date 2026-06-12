"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X, MoreVertical, Hash, Clock, Check, Calendar, MessageCircle } from "lucide-react";
import { buildTestInviteMessage, openWhatsApp } from "@/lib/whatsappShare";

type TestRow = {
  id: string;
  title: string;
  status: string;
  duration_secs: number;
  start_at: string | null;
  end_at: string | null;
  questionCount: number;
  total_marks: number | null;
  submissions: number;
};

type CoachingInfo = { name: string; slug: string; joinCode: string };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-800 text-slate-300",
  active: "bg-green-900/50 text-green-400",
  closed: "bg-amber-900/40 text-amber-400",
  scheduled: "bg-sky-900/40 text-sky-400",
};

// A test marked "active" is only really open inside its time window. Once end_at
// passes it's effectively closed (the admin may not have flipped the status yet);
// before start_at it's scheduled. This drives the badge + filter so a finished
// test never shows "active".
function effectiveStatus(t: TestRow): "draft" | "active" | "closed" | "scheduled" {
  if (t.status === "draft") return "draft";
  if (t.status === "closed") return "closed";
  const now = Date.now();
  if (t.end_at && new Date(t.end_at).getTime() < now) return "closed";
  if (t.start_at && new Date(t.start_at).getTime() > now) return "scheduled";
  return "active";
}

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500";

// ISO → value for <input type="datetime-local"> (local time, minute precision).
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TestsClient({
  initialTests,
  coaching,
}: {
  initialTests: TestRow[];
  coaching: CoachingInfo;
}) {
  const router = useRouter();
  const [tests, setTests] = useState(initialTests);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<TestRow | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");

  const shown = tests.filter((t) => filter === "all" || effectiveStatus(t) === filter);

  // clearEnd: also wipe a past end_at so reopening a window-ended test actually
  // makes it open again (flipping status alone wouldn't — the window stays shut).
  async function setStatus(id: string, status: string, clearEnd = false) {
    setBusy(id);
    const res = await fetch(`/api/coaching/tests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clearEnd ? { status, endAt: null } : { status }),
    });
    setBusy(null);
    if (res.ok) {
      setTests((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status, ...(clearEnd ? { end_at: null } : {}) } : t))
      );
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Tests</h1>
        <button
          onClick={() => router.push("/coaching-admin/tests/new")}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
        >
          <Plus className="h-4 w-4" /> New Test
        </button>
      </div>

      {/* Status filter chips */}
      <div className="mt-5 flex gap-2">
        {(["all", "active", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm capitalize transition ${
              filter === f
                ? "bg-amber-500 font-semibold text-slate-950"
                : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Desktop: table. Mobile: stacked cards (below) — the wide table can't
          fit a phone without horizontal scroll. */}
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-800 md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Questions</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Window</th>
              <th className="px-4 py-3 font-medium">Submissions</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {shown.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No tests yet.
                </td>
              </tr>
            ) : (
              shown.map((t) => (
                <tr key={t.id} className="text-slate-200">
                  <td className="px-4 py-3">
                    <Link
                      href={`/coaching-admin/tests/${t.id}/results`}
                      className="font-medium text-white hover:text-amber-400 hover:underline"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[effectiveStatus(t)]}`}>
                      {effectiveStatus(t)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{t.questionCount}</td>
                  <td className="px-4 py-3 text-slate-400">{Math.round(t.duration_secs / 60)} min</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {t.end_at
                      ? `closes ${new Date(t.end_at).toLocaleDateString([], { day: "numeric", month: "short" })}, ${new Date(t.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{t.submissions}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <ShareTestButton test={t} coaching={coaching} />
                      <RowMenu test={t} busy={busy === t.id} onStatus={setStatus} onEdit={setEditing} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-4 space-y-3 md:hidden">
        {shown.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-8 text-center text-slate-500">
            No tests yet.
          </p>
        ) : (
          shown.map((t) => (
            <article key={t.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Link
                    href={`/coaching-admin/tests/${t.id}/results`}
                    className="truncate font-semibold text-white hover:text-amber-400"
                  >
                    {t.title}
                  </Link>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[effectiveStatus(t)]}`}>
                    {effectiveStatus(t)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ShareTestButton test={t} coaching={coaching} />
                  <RowMenu test={t} busy={busy === t.id} onStatus={setStatus} onEdit={setEditing} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />{t.questionCount} questions</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{Math.round(t.duration_secs / 60)} min</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" />{t.submissions} subs</span>
              </div>
              {t.end_at && (
                <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-3 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Closes {new Date(t.end_at).toLocaleDateString([], { day: "numeric", month: "short" })},{" "}
                  {new Date(t.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </article>
          ))
        )}
      </div>

      {editing && (
        <EditTestModal
          test={editing}
          onClose={() => setEditing(null)}
          onSaved={(patch) => {
            setTests((prev) => prev.map((t) => (t.id === editing.id ? { ...t, ...patch } : t)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// One-click WhatsApp invite: test details + direct link for enrolled students,
// plus the coaching join code/link so new students can onboard from the same
// message. Only shown while the test can still be taken (active/scheduled).
function ShareTestButton({ test, coaching }: { test: TestRow; coaching: CoachingInfo }) {
  const es = effectiveStatus(test);
  if (es !== "active" && es !== "scheduled") return null;
  return (
    <button
      onClick={() => {
        const origin = window.location.origin;
        openWhatsApp(
          buildTestInviteMessage({
            testTitle: test.title,
            coachingName: coaching.name,
            durationMins: Math.round(test.duration_secs / 60),
            totalMarks: test.total_marks,
            questionCount: test.questionCount,
            startAt: test.start_at,
            endAt: test.end_at,
            testUrl: `${origin}/c/${coaching.slug}/test/${test.id}`,
            joinCode: coaching.joinCode,
            joinUrl: `${origin}/join/${coaching.joinCode}`,
          })
        );
      }}
      title="Share on WhatsApp"
      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-green-400"
    >
      <MessageCircle className="h-4 w-4" />
    </button>
  );
}

// 3-dot kebab menu: opens a dropdown with the status-appropriate actions.
function RowMenu({
  test,
  busy,
  onStatus,
  onEdit,
}: {
  test: TestRow;
  busy: boolean;
  onStatus: (id: string, status: string, clearEnd?: boolean) => void;
  onEdit: (t: TestRow) => void;
}) {
  const es = effectiveStatus(test);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_W = 160; // w-40
  const MENU_H = 168; // generous estimate (≤4 items) for flip decision

  // Anchor the menu to the button with fixed positioning. The table lives in an
  // `overflow-x-auto` container, which clips absolutely-positioned children — so
  // the menu is portaled to <body> instead to escape that clip box.
  const place = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const left = Math.max(8, r.right - MENU_W); // right-align, clamp to viewport
    const openUp = r.bottom + 4 + MENU_H > window.innerHeight && r.top - MENU_H - 4 > 0;
    const top = openUp ? r.top - 4 - MENU_H : r.bottom + 4;
    setCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const reposition = () => place();
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    // capture-phase scroll so we follow any scrolling ancestor, not just window
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, place]);

  const itemCls =
    "block w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50";

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        title="Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: MENU_W }}
            className="z-[60] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
          >
            {es === "draft" && (
              <button disabled={busy} className={`${itemCls} text-green-400`} onClick={() => { setOpen(false); onStatus(test.id, "active"); }}>
                Publish
              </button>
            )}
            {(es === "active" || es === "scheduled") && (
              <button disabled={busy} className={`${itemCls} text-amber-400`} onClick={() => { setOpen(false); onStatus(test.id, "closed"); }}>
                Close
              </button>
            )}
            {es === "closed" && (
              <button
                disabled={busy}
                className={`${itemCls} text-green-400`}
                onClick={() => {
                  setOpen(false);
                  // If the window already ended, clear end_at so it truly reopens.
                  const endPassed = !!test.end_at && new Date(test.end_at).getTime() < Date.now();
                  onStatus(test.id, "active", endPassed);
                }}
              >
                Reopen
              </button>
            )}
            <button className={itemCls} onClick={() => { setOpen(false); onEdit(test); }}>
              Edit
            </button>
            <Link href={`/coaching-admin/tests/${test.id}/results`} className={itemCls} onClick={() => setOpen(false)}>
              Results
            </Link>
          </div>,
          document.body
        )}
    </>
  );
}

function EditTestModal({
  test,
  onClose,
  onSaved,
}: {
  test: TestRow;
  onClose: () => void;
  onSaved: (patch: Partial<TestRow>) => void;
}) {
  const [title, setTitle] = useState(test.title);
  const [durationMins, setDurationMins] = useState(String(Math.round(test.duration_secs / 60)));
  const [startAt, setStartAt] = useState(toLocalInput(test.start_at));
  const [endAt, setEndAt] = useState(toLocalInput(test.end_at));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/coaching/tests/${test.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          durationMins: Number(durationMins),
          startAt: startAt || null,
          endAt: endAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      onSaved({
        title,
        duration_secs: Number(durationMins) * 60,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Edit test</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={save} className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-300">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Duration (min)</span>
            <input type="number" min={1} value={durationMins} onChange={(e) => setDurationMins(e.target.value)} className={`${inputCls} max-w-[160px]`} />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-slate-300">Opens</span>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Closes</span>
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputCls} />
            </label>
          </div>
          <p className="text-xs text-slate-500">Leave a date empty for no open/close limit.</p>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={saving} className="w-full rounded-lg bg-amber-600 py-2 font-medium text-white hover:bg-amber-500 disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
