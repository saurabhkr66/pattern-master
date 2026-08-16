"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BE } from "@/lib/theme";

type Pattern = {
  id: string;
  exam_type: string;
  branch: string;
  subject: string;
  topic_name: string;
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: BE.textDim,
  marginBottom: 6,
};

const field: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${BE.line}`,
  background: BE.surface,
  color: BE.text,
  fontSize: 14,
};

const uniq = (xs: string[]) => [...new Set(xs)].sort();

export default function DppNewClient({
  patterns,
  taken,
}: {
  patterns: Pattern[];
  taken: Record<string, { order: number; name: string }[]>;
}) {
  const router = useRouter();
  const [exam, setExam] = useState("");
  const [branch, setBranch] = useState("");
  const [subject, setSubject] = useState("");
  const [patternId, setPatternId] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Cascading filters — each level narrows the next.
  const exams = useMemo(() => uniq(patterns.map((p) => p.exam_type)), [patterns]);
  const branches = useMemo(
    () => uniq(patterns.filter((p) => p.exam_type === exam).map((p) => p.branch)),
    [patterns, exam],
  );
  const subjects = useMemo(
    () =>
      uniq(
        patterns
          .filter((p) => p.exam_type === exam && p.branch === branch)
          .map((p) => p.subject),
      ),
    [patterns, exam, branch],
  );
  const topics = useMemo(
    () =>
      patterns.filter(
        (p) => p.exam_type === exam && p.branch === branch && p.subject === subject,
      ),
    [patterns, exam, branch, subject],
  );

  const existing = patternId ? (taken[patternId] ?? []) : [];
  const nextOrder = existing.reduce((m, d) => Math.max(m, d.order), 0) + 1;
  const suggested = `DPP ${nextOrder}`;

  async function create() {
    setErr(null);
    if (!patternId) {
      setErr("Pick a topic first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/dpp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId, name: name.trim() || suggested }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? `Failed (${res.status})`);
        return;
      }
      router.push(`/admin/dpp/${j.dpp.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 64px", color: BE.text }}>
      <Link href="/admin/dpp" style={{ color: BE.textDim, fontSize: 13, textDecoration: "none" }}>
        ← All DPPs
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "12px 0 4px" }}>New DPP</h1>
      <p style={{ color: BE.textDim, fontSize: 13, marginTop: 0, marginBottom: 22 }}>
        Creates an empty DPP. You add questions afterwards — paste them one at a time, or import a
        PDF.
      </p>

      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label style={label}>Exam</label>
          <select
            style={field}
            value={exam}
            onChange={(e) => {
              setExam(e.target.value);
              setBranch("");
              setSubject("");
              setPatternId("");
            }}
          >
            <option value="">Select exam…</option>
            {exams.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        {exam && (
          <div>
            <label style={label}>Branch</label>
            <select
              style={field}
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value);
                setSubject("");
                setPatternId("");
              }}
            >
              <option value="">Select branch…</option>
              {branches.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        )}

        {branch && (
          <div>
            <label style={label}>Subject</label>
            <select
              style={field}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setPatternId("");
              }}
            >
              <option value="">Select subject…</option>
              {subjects.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        )}

        {subject && (
          <div>
            <label style={label}>Topic ({topics.length})</label>
            <select style={field} value={patternId} onChange={(e) => setPatternId(e.target.value)}>
              <option value="">Select topic…</option>
              {topics.map((p) => {
                const n = (taken[p.id] ?? []).length;
                return (
                  <option key={p.id} value={p.id}>
                    {p.topic_name}
                    {n ? `  (${n} DPP${n > 1 ? "s" : ""})` : ""}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {patternId && (
          <>
            <div>
              <label style={label}>Name</label>
              <input
                style={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={suggested}
              />
              <div style={{ fontSize: 11.5, color: BE.textMute, marginTop: 6 }}>
                Leave blank to use <strong>{suggested}</strong>. Names are per-topic, so “DPP 1” can
                exist under many topics.
              </div>
            </div>

            {existing.length > 0 && (
              <div
                style={{
                  fontSize: 12.5,
                  color: BE.textDim,
                  border: `1px solid ${BE.line}`,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                Already in this topic:{" "}
                {existing
                  .sort((a, b) => a.order - b.order)
                  .map((d) => d.name)
                  .join(", ")}
              </div>
            )}
          </>
        )}

        {err && (
          <div
            style={{
              color: BE.bad,
              background: BE.badSoft,
              border: `1px solid ${BE.bad}`,
              borderRadius: 10,
              padding: 12,
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        <button
          onClick={create}
          disabled={!patternId || saving}
          style={{
            marginTop: 4,
            padding: "12px 18px",
            borderRadius: 10,
            border: "none",
            background: !patternId || saving ? BE.line : BE.accent,
            color: !patternId || saving ? BE.textMute : "#1a1205",
            fontWeight: 700,
            fontSize: 14,
            cursor: !patternId || saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Creating…" : "Create DPP"}
        </button>
      </div>
    </div>
  );
}
