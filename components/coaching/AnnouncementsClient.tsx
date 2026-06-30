"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Pin, Plus, Trash2, Users, Eye, X } from "lucide-react";
import { Card, PageHead, Pill, Btn, display, mono } from "@/components/coaching/ui";

type Batch = { id: string; name: string };
type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  batchIds: string[];
  createdAt: string; // ISO
  readCount: number;
};

export default function AnnouncementsClient({
  enabled: initialEnabled,
  batches,
  studentTotal,
  initialAnnouncements,
}: {
  enabled: boolean;
  batches: Batch[];
  studentTotal: number;
  initialAnnouncements: Announcement[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [items, setItems] = useState(initialAnnouncements);
  const [composing, setComposing] = useState(false);

  // ── Compose form state ──
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [pinned, setPinned] = useState(false);
  const [targetBatches, setTargetBatches] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const batchName = (id: string) => batches.find((b) => b.id === id)?.name ?? "batch";

  async function toggleEnabled() {
    const next = !enabled;
    setEnabled(next); // optimistic
    const res = await fetch("/api/coaching/announcements/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (!res.ok) setEnabled(!next); // revert on failure
  }

  function resetForm() {
    setTitle("");
    setBodyText("");
    setPinned(false);
    setTargetBatches([]);
    setError(null);
  }

  async function post() {
    setError(null);
    if (!title.trim()) return setError("Add a title.");
    if (!bodyText.trim()) return setError("Add a message.");
    setBusy(true);
    try {
      const res = await fetch("/api/coaching/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: bodyText.trim(),
          pinned,
          batchIds: targetBatches,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not post the announcement.");
        return;
      }
      setComposing(false);
      resetForm();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement? Students will no longer see it.")) return;
    setItems((prev) => prev.filter((a) => a.id !== id)); // optimistic
    const res = await fetch(`/api/coaching/announcements/${id}`, { method: "DELETE" });
    if (!res.ok) router.refresh(); // re-sync on failure
  }

  async function togglePin(a: Announcement) {
    const next = !a.pinned;
    setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, pinned: next } : x)));
    const res = await fetch(`/api/coaching/announcements/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: next }),
    });
    if (!res.ok) router.refresh();
    else router.refresh(); // re-sort by pinned
  }

  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHead
          title="Announcements"
          sub="Broadcast a message to your students — replaces the WhatsApp group."
        />
        <button
          onClick={() => {
            resetForm();
            setComposing((v) => !v);
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[#1a1205] transition hover:brightness-110"
          style={{ background: "linear-gradient(135deg,#ffb43a,#ff8f00)" }}
        >
          {composing ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {composing ? "Cancel" : "New announcement"}
        </button>
      </div>

      {/* Visibility toggle */}
      <Card className="mb-6">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[15px] font-bold text-white">
              <Megaphone className="h-4 w-4 text-amber-400" /> Show announcements to students
            </div>
            <p className="mt-1 text-sm text-slate-400">
              When off, the board is hidden from every student — your posts stay drafts only you can see.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={enabled}
            onClick={toggleEnabled}
            className="relative h-7 w-12 shrink-0 rounded-full transition"
            style={{ background: enabled ? "#f59e0b" : "rgba(255,255,255,0.12)" }}
          >
            <span
              className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
              style={{ left: enabled ? 26 : 4 }}
            />
          </button>
        </div>
      </Card>

      {/* Compose form */}
      {composing && (
        <Card glow className="mb-6">
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Class cancelled tomorrow)"
              maxLength={140}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] font-semibold text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none"
            />
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Write your message…"
              rows={4}
              className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none"
            />

            {/* Batch targeting */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Send to
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={targetBatches.length === 0}
                  onClick={() => setTargetBatches([])}
                >
                  All students
                </Chip>
                {batches.map((b) => {
                  const on = targetBatches.includes(b.id);
                  return (
                    <Chip
                      key={b.id}
                      active={on}
                      onClick={() =>
                        setTargetBatches((prev) =>
                          on ? prev.filter((x) => x !== b.id) : [...prev, b.id]
                        )
                      }
                    >
                      {b.name}
                    </Chip>
                  );
                })}
              </div>
              {batches.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">No batches yet — this goes to all students.</p>
              )}
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              <Pin className="h-4 w-4 text-amber-400" /> Pin to top
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <Btn kind="ghost" onClick={() => setComposing(false)}>
                Cancel
              </Btn>
              <Btn kind="primary" onClick={post} disabled={busy}>
                {busy ? "Posting…" : "Post announcement"}
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {/* List */}
      {items.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
              <Megaphone className="h-8 w-8" />
            </span>
            <p className="mt-4 text-lg font-bold text-white" style={{ fontFamily: display }}>
              No announcements yet
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Post your first message — students will see it on their dashboard.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="transition-transform hover:-translate-y-0.5">
              <div className="px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate text-[16px] font-bold text-white">{a.title}</span>
                    {a.pinned && (
                      <Pill tone="amber">
                        <Pin className="h-3 w-3" /> Pinned
                      </Pill>
                    )}
                    {a.batchIds.length === 0 ? (
                      <Pill tone="slate">All students</Pill>
                    ) : (
                      a.batchIds.map((bid) => (
                        <Pill key={bid} tone="accent">
                          {batchName(bid)}
                        </Pill>
                      ))
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => togglePin(a)}
                      title={a.pinned ? "Unpin" : "Pin to top"}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-amber-400"
                    >
                      <Pin className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      title="Delete"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{a.body}</p>
                <div
                  className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"
                  style={{ fontFamily: mono }}
                >
                  <span>
                    {new Date(a.createdAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {a.readCount} read
                    {studentTotal > 0 && <span className="text-slate-600"> / {studentTotal}</span>}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition"
      style={
        active
          ? { background: "rgba(245,158,11,0.14)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.4)" }
          : { background: "rgba(255,255,255,0.03)", color: "#c9ced8", borderColor: "rgba(255,255,255,0.08)" }
      }
    >
      {active && <Users className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
