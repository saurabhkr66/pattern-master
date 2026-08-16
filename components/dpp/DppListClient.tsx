"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BE } from "@/lib/theme";

export type DppRow = {
  id: string;
  name: string;
  order: number;
  status: string;
  isPublic: boolean;
  questionCount: number;
  patternId: string;
  topicName: string;
  subject: string;
  examType: string;
  branch: string;
  updatedAt: string;
};

// Locale AND timeZone are pinned deliberately. A bare toLocaleString() renders
// with the server's locale during SSR ("8/15/2026") and the browser's on the
// client ("15/8/2026"), which is a hydration mismatch. Matching the convention
// already used across the coaching surfaces (en-IN / Asia/Kolkata).
const UPDATED_FMT = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

const card: React.CSSProperties = {
  background: BE.surface,
  border: `1px solid ${BE.line}`,
  borderRadius: 14,
  padding: 16,
};

function Pill({ text, tone }: { text: string; tone: "good" | "warn" | "mute" }) {
  const bg = tone === "good" ? BE.goodSoft : tone === "warn" ? BE.warnSoft : "transparent";
  const fg = tone === "good" ? BE.good : tone === "warn" ? BE.warn : BE.textMute;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 999,
        background: bg,
        color: fg,
        border: `1px solid ${tone === "mute" ? BE.line : "transparent"}`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export default function DppListClient({ initial }: { initial: DppRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initial;
    return initial.filter((d) =>
      [d.name, d.topicName, d.subject, d.examType, d.branch].some((v) =>
        v.toLowerCase().includes(needle),
      ),
    );
  }, [initial, q]);

  async function remove(d: DppRow) {
    if (
      !confirm(
        `Delete "${d.name}" (${d.topicName}) and its ${d.questionCount} question(s)?\n\nThis cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(d.id);
    try {
      const res = await fetch(`/api/admin/dpp/${d.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Delete failed: ${j.error ?? res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleStatus(d: DppRow) {
    setBusy(d.id);
    try {
      const next = d.status === "ready" ? "draft" : "ready";
      const res = await fetch(`/api/admin/dpp/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Update failed: ${j.error ?? res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 64px", color: BE.text }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, flex: 1, minWidth: 200 }}>
          Daily Practice Problems
        </h1>
        <Link
          href="/admin/dpp/new"
          style={{
            background: BE.accent,
            color: "#1a1205",
            fontWeight: 700,
            fontSize: 14,
            padding: "10px 16px",
            borderRadius: 10,
            textDecoration: "none",
          }}
        >
          + New DPP
        </Link>
      </div>

      <p style={{ color: BE.textDim, fontSize: 13, marginTop: -8, marginBottom: 18 }}>
        Admin-only. DPPs are not visible to students and do not appear on public topic pages.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter by name, topic, subject or exam…"
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${BE.line}`,
          background: BE.surface,
          color: BE.text,
          fontSize: 14,
          marginBottom: 16,
        }}
      />

      {rows.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: BE.textDim }}>
          {initial.length === 0
            ? "No DPPs yet. Create one, then fill it by pasting questions or importing a PDF."
            : "No DPP matches that filter."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((d) => (
            <div key={d.id} style={{ ...card, opacity: busy === d.id ? 0.5 : 1 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Link
                      href={`/admin/dpp/${d.id}`}
                      style={{ fontSize: 16, fontWeight: 700, color: BE.text, textDecoration: "none" }}
                    >
                      {d.name}
                    </Link>
                    <Pill
                      text={d.status === "ready" ? "ready" : "draft"}
                      tone={d.status === "ready" ? "good" : "warn"}
                    />
                    <Pill text={`${d.questionCount} Q`} tone="mute" />
                    {/* "live" = visible to students, which needs BOTH gates.
                        Showing is_public alone read as "released" for a sheet
                        students could not actually see. */}
                    {d.isPublic && d.status === "ready" && <Pill text="live" tone="good" />}
                  </div>
                  <div style={{ fontSize: 12.5, color: BE.textDim, marginTop: 4 }}>
                    {d.examType} · {d.branch} · {d.subject} · <strong>{d.topicName}</strong>
                  </div>
                  <div style={{ fontSize: 11.5, color: BE.textMute, marginTop: 2 }}>
                    updated {UPDATED_FMT.format(new Date(d.updatedAt))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link
                    href={`/admin/dpp/${d.id}`}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 9,
                      border: `1px solid ${BE.line}`,
                      color: BE.text,
                      fontSize: 13,
                      textDecoration: "none",
                    }}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => toggleStatus(d)}
                    disabled={busy === d.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 9,
                      border: `1px solid ${BE.line}`,
                      background: "transparent",
                      color: BE.text,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {d.status === "ready" ? "Mark draft" : "Mark ready"}
                  </button>
                  <button
                    onClick={() => remove(d)}
                    disabled={busy === d.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 9,
                      border: `1px solid ${BE.bad}`,
                      background: "transparent",
                      color: BE.bad,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
