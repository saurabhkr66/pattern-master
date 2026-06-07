"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, Pencil, X, KeyRound, LayoutGrid } from "lucide-react";
import { display } from "@/components/coaching/ui";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500";

type Batch = { id: string; name: string; _count?: { students: number } };
type Student = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  joined_at: string;
  batch_id: string | null;
  batch: { id: string; name: string } | null;
};

const PAGE_SIZE = 50;

export default function StudentsClient({
  initialStudents,
  initialHasMore,
  initialBatches,
}: {
  initialStudents: Student[];
  initialHasMore: boolean;
  initialBatches: Batch[];
}) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [q, setQ] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showBatches, setShowBatches] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  // Filter signature the current list already reflects (initially the SSR query:
  // all blank). Refetch only when it actually changes — robust against React
  // StrictMode's double-mount, which made a "skip first render" ref refetch on
  // load and flash the list.
  const loadedKey = useRef("|");

  // Fetch one page. offset 0 replaces the list; a positive offset appends.
  const fetchPage = useCallback(
    async (offset: number) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (batchFilter) params.set("batch", batchFilter);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      const res = await fetch(`/api/coaching/students?${params}`);
      const data = await res.json();
      if (res.ok) {
        setStudents((prev) => (offset > 0 ? [...prev, ...data.students] : data.students));
        setHasMore(data.hasMore);
      }
    },
    [q, batchFilter]
  );

  // Reload from the top — filter changes, and after add/edit/deactivate.
  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchPage(0);
    setLoading(false);
  }, [fetchPage]);

  async function loadMore() {
    setLoadingMore(true);
    await fetchPage(students.length);
    setLoadingMore(false);
  }

  // Debounced re-fetch when the filters change from what's already loaded.
  useEffect(() => {
    const key = `${q}|${batchFilter}`;
    if (loadedKey.current === key) return;
    const t = setTimeout(() => {
      loadedKey.current = key;
      refetch();
    }, 300);
    return () => clearTimeout(t);
  }, [q, batchFilter, refetch]);

  async function refetchBatches() {
    const res = await fetch("/api/coaching/batches");
    const data = await res.json();
    if (res.ok) setBatches(data.batches);
  }

  return (
    <div className="p-5 sm:p-8">
      {/* Header: title + compact Add */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: display }}>
          Students
        </h1>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Sub-actions: manage batches + total count */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => setShowBatches(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
        >
          <LayoutGrid className="h-4 w-4" /> Manage Batches
        </button>
        <span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-300">
          {students.length}
          {hasMore ? "+" : ""} total
        </span>
      </div>

      {/* Search (full width) */}
      <div className="relative mt-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or phone"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-amber-500"
        />
      </div>

      {/* Batch filter (own row) */}
      <div className="mt-3">
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="w-full max-w-[260px] rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500"
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: table. Mobile: stacked cards (below). */}
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-800 md:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No students yet.
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="text-slate-200">
                  <td className="px-4 py-3">
                    <Link
                      href={`/coaching-admin/students/${s.id}`}
                      className="font-medium text-white hover:text-amber-400 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">{s.phone}</td>
                  <td className="px-4 py-3 text-slate-400">{s.batch?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {s.active ? (
                      <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StudentActions s={s} onEdit={setEditing} onReload={refetch} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-4 space-y-3 md:hidden">
        {loading ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-slate-500">Loading…</p>
        ) : students.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-8 text-center text-slate-500">No students yet.</p>
        ) : (
          students.map((s) => (
            <article key={s.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-400">
                {s.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/coaching-admin/students/${s.id}`}
                    className="truncate font-semibold text-white hover:text-amber-400"
                  >
                    {s.name}
                  </Link>
                  {s.active ? (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">Active</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">Inactive</span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
                  <span className="font-mono">{s.phone}</span>
                  <span className="text-slate-600">·</span>
                  <span className="truncate">{s.batch?.name ?? "No batch"}</span>
                </div>
              </div>
              <StudentActions s={s} onEdit={setEditing} onReload={refetch} />
            </article>
          ))
        )}
      </div>

      {hasMore && !loading && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {showAdd && (
        <StudentFormModal
          batches={batches}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refetch();
          }}
        />
      )}

      {editing && (
        <StudentFormModal
          batches={batches}
          student={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}

      {showBatches && (
        <BatchModal
          batches={batches}
          onClose={() => setShowBatches(false)}
          onChanged={refetchBatches}
        />
      )}
    </div>
  );
}

// Row actions shared by the desktop table and the mobile cards (one copy of the
// reset-PIN / edit / deactivate handlers).
function StudentActions({
  s,
  onEdit,
  onReload,
}: {
  s: Student;
  onEdit: (s: Student) => void;
  onReload: () => void;
}) {
  return (
    <div className="flex shrink-0 justify-end gap-2">
      <button
        onClick={async () => {
          if (!confirm(`Reset ${s.name}'s PIN? They'll re-join with the code to set a new one.`)) return;
          const res = await fetch(`/api/coaching/students/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resetPin: true }),
          });
          if (res.ok) alert("PIN reset. The student re-joins with the code to set a new PIN.");
        }}
        className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-400"
        title="Reset PIN"
      >
        <KeyRound className="h-4 w-4" />
      </button>
      <button
        onClick={() => onEdit(s)}
        className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={async () => {
          if (!confirm(`Deactivate ${s.name}?`)) return;
          const res = await fetch(`/api/coaching/students/${s.id}`, { method: "DELETE" });
          if (res.ok) onReload();
        }}
        className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400"
        title="Deactivate"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function StudentFormModal({
  batches,
  student,
  onClose,
  onSaved,
}: {
  batches: Batch[];
  student?: Student;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!student;
  const [name, setName] = useState(student?.name ?? "");
  const [phone, setPhone] = useState(student?.phone ?? "");
  const [batchId, setBatchId] = useState(student?.batch_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/coaching/students/${student!.id}` : "/api/coaching/students",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone, batchId: batchId || null }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Edit Student" : "Add Student"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            inputMode="numeric"
            className={inputCls}
          />
        </Field>
        <Field label="Batch">
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={inputCls}>
            <option value="">No batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-amber-600 py-2 font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Add student"}
        </button>
      </form>
    </Modal>
  );
}

function BatchModal({
  batches,
  onClose,
  onChanged,
}: {
  batches: Batch[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addBatch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/coaching/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setName("");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Batches" onClose={onClose}>
      <ul className="mb-4 space-y-2">
        {batches.length === 0 && <li className="text-sm text-slate-500">No batches yet.</li>}
        {batches.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-200"
          >
            <span>{b.name}</span>
            <span className="text-slate-500">{b._count?.students ?? 0} students</span>
          </li>
        ))}
      </ul>
      <form onSubmit={addBatch} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New batch name"
          required
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
