"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/coaching/ui";

// Shared visibility toggle for coaching features (fees, attendance, etc.).
// Optimistic flip with rollback on failure — the flag rides the slug cache,
// so the student side picks it up within the cache TTL (busted immediately on
// save by the settings endpoint).
export default function VisibilityToggle({
  initial,
  endpoint,
  onLabel,
  offLabel,
  title,
}: {
  initial: boolean;
  endpoint: string;
  onLabel: string;
  offLabel: string;
  title: string;
}) {
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    if (saving) return;
    const next = !on;
    setOn(next); // optimistic
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: next }),
      });
      if (!res.ok) setOn(!next); // rollback
    } catch {
      setOn(!next); // rollback
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-7">
      <Card>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg"
              style={{ background: on ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)" }}
            >
              {on ? (
                <Eye className="h-[18px] w-[18px] text-green-400" />
              ) : (
                <EyeOff className="h-[18px] w-[18px] text-slate-500" />
              )}
            </span>
            <div>
              <div className="text-sm font-semibold text-white">{title}</div>
              <div className="mt-0.5 text-xs text-slate-400">
                {on ? onLabel : offLabel}
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={title}
            disabled={saving}
            onClick={toggle}
            className="relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60"
            style={{ background: on ? "#22c55e" : "rgba(255,255,255,0.14)" }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
              style={{ left: on ? 22 : 2 }}
            />
          </button>
        </div>
      </Card>
    </div>
  );
}
