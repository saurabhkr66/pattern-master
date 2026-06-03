"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X, MoreVertical } from "lucide-react";

type TestRow = {
  id: string;
  title: string;
  status: string;
  duration_secs: number;
  start_at: string | null;
  end_at: string | null;
  questionCount: number;
  submissions: number;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-800 text-slate-300",
  active: "bg-green-900/50 text-green-400",
  closed: "bg-amber-900/40 text-amber-400",
};

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500";

// ISO → value for <input type="datetime-local"> (local time, minute precision).
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TestsClient({ initialTests }: { initialTests: TestRow[] }) {
  const router = useRouter();
  const [tests, setTests] = useState(initialTests);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<TestRow | null>(null);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    const res = await fetch(`/api/coaching/tests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    if (res.ok) {
      setTests((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
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

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
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
            {tests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No tests yet.
                </td>
              </tr>
            ) : (
              tests.map((t) => (
                <tr key={t.id} className="text-slate-200">
                  <td className="px-4 py-3">{t.title}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[t.status] ?? "bg-slate-800 text-slate-300"}`}>
                      {t.status}
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
                    <div className="flex justify-end">
                      <RowMenu test={t} busy={busy === t.id} onStatus={setStatus} onEdit={setEditing} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

// 3-dot kebab menu: opens a dropdown with the status-appropriate actions.
function RowMenu({
  test,
  busy,
  onStatus,
  onEdit,
}: {
  test: TestRow;
  busy: boolean;
  onStatus: (id: string, status: string) => void;
  onEdit: (t: TestRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const itemCls =
    "block w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50";

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        title="Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          {test.status === "draft" && (
            <button disabled={busy} className={`${itemCls} text-green-400`} onClick={() => { setOpen(false); onStatus(test.id, "active"); }}>
              Publish
            </button>
          )}
          {test.status === "active" && (
            <button disabled={busy} className={`${itemCls} text-amber-400`} onClick={() => { setOpen(false); onStatus(test.id, "closed"); }}>
              Close
            </button>
          )}
          {test.status === "closed" && (
            <button disabled={busy} className={`${itemCls} text-green-400`} onClick={() => { setOpen(false); onStatus(test.id, "active"); }}>
              Reopen
            </button>
          )}
          <button className={itemCls} onClick={() => { setOpen(false); onEdit(test); }}>
            Edit
          </button>
          <Link href={`/coaching-admin/tests/${test.id}/results`} className={itemCls} onClick={() => setOpen(false)}>
            Results
          </Link>
        </div>
      )}
    </div>
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
