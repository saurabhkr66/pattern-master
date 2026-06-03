"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, LogoBadge, AMBER_GRAD, AMBER_GLOW, display } from "@/components/coaching/ui";

type Mode = "join" | "login";

const fieldCls =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-amber-500/60";

export default function StudentAuthForm({
  mode,
  slug,
  coachingName,
}: {
  mode: Mode;
  slug: string;
  coachingName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "join" ? "/api/student/join" : "/api/student/login";
      const body =
        mode === "join" ? { slug, joinCode, name, phone, pin } : { slug, phone, pin };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.replace(`/c/${slug}/dashboard`);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4" style={{ background: "#06060c" }}>
      <div
        className="pointer-events-none absolute left-1/2 top-[-20%] h-[560px] w-[560px] -translate-x-1/2"
        style={{ background: "radial-gradient(circle, rgba(255,143,0,0.18), transparent 65%)" }}
      />
      <Card className="relative w-full max-w-[440px]">
        <div className="px-9 pb-8 pt-10">
          <div className="mb-5 flex flex-col items-center text-center">
            <LogoBadge letter={coachingName} size={52} />
            <h1 className="mt-4 text-xl font-bold tracking-tight text-white" style={{ fontFamily: display }}>
              {coachingName}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              {mode === "join" ? "Join with your coaching's code" : "Sign in to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "join" && (
              <div>
                <label className="block text-sm font-medium text-slate-300">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={fieldCls} />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300">Phone</label>
              <input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} required className={fieldCls} />
            </div>

            {mode === "join" && (
              <div>
                <label className="block text-sm font-medium text-slate-300">Join code</label>
                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required className={fieldCls} />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300">
                {mode === "join" ? "Set a PIN (4–6 digits)" : "PIN"}
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete={mode === "join" ? "new-password" : "current-password"}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                minLength={4}
                maxLength={6}
                placeholder="••••"
                className={`${fieldCls} tracking-widest`}
              />
              {mode === "join" && (
                <p className="mt-1.5 text-xs text-slate-500">You&apos;ll use this PIN with your phone to sign in.</p>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="grid h-14 w-full place-items-center rounded-2xl text-[17px] font-bold text-[#1a1205] transition disabled:opacity-50"
              style={{ background: AMBER_GRAD, boxShadow: AMBER_GLOW }}
            >
              {loading ? "Please wait…" : mode === "join" ? "Join" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-400">
          {mode === "join" ? (
            <>
              Already joined?{" "}
              <Link href={`/c/${slug}/login`} className="text-amber-400 hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href={`/c/${slug}/join`} className="text-amber-400 hover:underline">
                Join with code
              </Link>
            </>
          )}
          </p>
        </div>
      </Card>
    </div>
  );
}
