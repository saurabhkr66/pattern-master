"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, ArrowRight, X } from "lucide-react";
import {
  getMemberships,
  removeMembership,
  type CoachingMembership,
} from "@/lib/coachingMemberships";

export default function CoachingHomePage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<CoachingMembership[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [code, setCode] = useState("");

  // localStorage is client-only — read after mount to avoid hydration mismatch.
  useEffect(() => {
    setMemberships(getMemberships());
    setHydrated(true);
  }, []);

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    router.push(`/join/${encodeURIComponent(c)}`);
  }

  function forget(slug: string) {
    removeMembership(slug);
    setMemberships(getMemberships());
  }

  const hasCoachings = hydrated && memberships.length > 0;

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-500">
          <GraduationCap size={26} />
        </span>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            My coaching
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {hasCoachings ? "Tap a coaching to continue." : "Join your coaching to get started."}
          </p>
        </div>
      </div>

      {/* Joined coachings — tappable cards */}
      {hasCoachings && (
        <div className="mb-8 space-y-3">
          {memberships.map((m) => (
            <div
              key={m.slug}
              className="flex items-center gap-3 rounded-2xl border p-4"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
            >
              <Link href={`/c/${m.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-base font-bold text-white">
                  {m.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {m.name}
                  </span>
                  <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                    Open
                  </span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-amber-500" />
              </Link>
              <button
                type="button"
                onClick={() => forget(m.slug)}
                aria-label={`Remove ${m.name}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Join by code */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {hasCoachings ? "Join another coaching" : "Enter your coaching code"}
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          Your teacher shares this code with you.
        </p>
        <form onSubmit={submitCode} className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. SHARMA24"
            autoCapitalize="characters"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm uppercase tracking-wide outline-none focus:border-amber-500"
            style={{
              background: "var(--bg-base)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            disabled={!code.trim()}
            className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-400 disabled:opacity-40"
          >
            Join
          </button>
        </form>
      </div>

      {/* Teacher entry — parallel to the student "join" flow above. */}
      <Link
        href="/for-coachings"
        className="mt-4 flex items-center justify-between rounded-2xl border px-5 py-4 transition-colors hover:border-amber-500/50"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <span>
          <span className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Are you a teacher?
          </span>
          <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
            Run your coaching&apos;s tests on BattleExam.
          </span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-amber-500" />
      </Link>
    </div>
  );
}
