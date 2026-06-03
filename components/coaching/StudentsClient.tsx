"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, Trash2, Pencil, X, KeyRound } from "lucide-react";

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

export default function StudentsClient({
  initialStudents,
  initialBatches,
}: {
  initialStudents: Student[];
  initialBatches: Batch[];
}) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [q, setQ] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showBatches, setShowBatches] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const firstLoad = useRef(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (batchFilter) params.set("batch", batchFilter);
    const res = await fetch(`/api/coaching/students?${params}`);
    const data = await res.json();
    if (res.ok) setStudents(data.students);
    setLoading(false);
  }, [q, batchFilter]);

  // Debounced re-fetch on search / filter change (skip the initial mount —
  // we already have server-rendered data).
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    const t = setTimeout(refetch, 300);
    return () => clearTimeout(t);
  }, [q, batchFilter, refetch]);

  async function refetchBatches() {
    const res = await fetch("/api/coaching/batches");
    const data = await res.json();
    if (res.ok) setBatches(data.batches);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Students</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBatches(true)}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Manage Batches
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            <Plus className="h-4 w-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or phone"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
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
                  <td className="px-4 py-3">{s.name}</td>
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
                    <div className="flex justify-end gap-2">
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
                        onClick={() => setEditing(s)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Deactivate ${s.name}?`)) return;
                          const res = await fetch(`/api/coaching/students/${s.id}`, {
                            method: "DELETE",
                          });
                          if (res.ok) refetch();
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                        title="Deactivate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
