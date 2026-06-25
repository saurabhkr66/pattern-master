"use client";

import { useState } from "react";
import { UserCog, Trash2, Mail } from "lucide-react";
import {
  PageHead,
  Card,
  Table,
  TRow,
  Pill,
  Btn,
  Avatar,
  type Col,
} from "@/components/coaching/ui";

export type TeamMember = {
  id: string;
  email: string | null;
  name: string | null;
  role: "owner" | "teacher";
  status: "active" | "pending";
};

const COLS: Col[] = [
  { label: "Member", w: "1fr" },
  { label: "Role", w: "130px" },
  { label: "Status", w: "130px" },
  { label: "", w: "60px", align: "right" },
];

export default function TeamClient({ initialMembers }: { initialMembers: TeamMember[] }) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/coaching/team");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members ?? []);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/coaching/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "could not send invite");
        return;
      }
      setEmail("");
      setName("");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: TeamMember) {
    const label = member.name || member.email || "this member";
    const verb = member.status === "pending" ? "Cancel the invite for" : "Remove";
    if (!confirm(`${verb} ${label}? They will lose access to this coaching.`)) return;
    const res = await fetch(`/api/coaching/team/${member.id}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "could not remove member");
    }
  }

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none";

  return (
    <div className="p-6 md:p-8">
      <PageHead
        title="Team"
        sub="Invite teachers to help manage tests, students, and grading."
        icon={<UserCog className="h-6 w-6" />}
      />

      {/* Invite form */}
      <Card className="mb-7">
        <form onSubmit={invite} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">
              Teacher email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              className={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">
              Name <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Sharma"
              className={inputStyle}
            />
          </div>
          <Btn type="submit" disabled={busy}>
            <Mail className="h-4 w-4" />
            {busy ? "Inviting…" : "Send invite"}
          </Btn>
        </form>
        {error && (
          <div className="px-6 pb-4 text-sm text-red-400">{error}</div>
        )}
        <div className="px-6 pb-5 text-xs text-slate-500">
          The teacher gets access the first time they sign in at{" "}
          <span className="text-slate-400">/coaching-admin/login</span> with this email. Share
          that link with them — no email is sent automatically.
        </div>
      </Card>

      {/* Roster */}
      <Table cols={COLS}>
        {members.map((m, i) => (
          <TRow
            key={m.id}
            cols={COLS}
            last={i === members.length - 1}
            cells={[
              <div key="m" className="flex items-center gap-3">
                <Avatar text={m.name || m.email || "?"} size={38} />
                <div className="min-w-0">
                  {m.name && (
                    <div className="truncate text-sm font-semibold text-slate-100">{m.name}</div>
                  )}
                  <div className="truncate text-sm text-slate-400">{m.email ?? "—"}</div>
                </div>
              </div>,
              <Pill key="r" tone={m.role === "owner" ? "amber" : "slate"}>
                {m.role === "owner" ? "Owner" : "Teacher"}
              </Pill>,
              <Pill key="s" tone={m.status === "active" ? "success" : "amber"} dot>
                {m.status === "active" ? "Active" : "Pending"}
              </Pill>,
              <div key="a" className="flex justify-end">
                {m.role !== "owner" && (
                  <button
                    onClick={() => remove(m)}
                    title={m.status === "pending" ? "Cancel invite" : "Remove teacher"}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-400 transition hover:border-red-500/40 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>,
            ]}
          />
        ))}
      </Table>
    </div>
  );
}
