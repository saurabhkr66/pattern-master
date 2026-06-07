import type { ReactNode, CSSProperties } from "react";

// Coaching admin design system — reconstructed from the BattleExam redesign
// mockup (admin.jsx). Dark near-black surfaces, translucent bordered cards,
// amber accent (brand #ff8f00, not the mockup's purple), big display numerals.

// Reference the next/font CSS variables (set on the coaching layout wrappers via
// coachingFontVars), with web-safe fallbacks for any render outside that scope.
export const sans = "var(--font-manrope), ui-sans-serif, system-ui, sans-serif";
export const display = "var(--font-space-grotesk), var(--font-manrope), ui-sans-serif, sans-serif";
export const mono = "var(--font-jetbrains-mono), ui-monospace, monospace";

// Amber brand gradient (replaces the mockup's purple). Used for the logo badge
// and student-facing primary buttons.
export const AMBER_GRAD = "linear-gradient(180deg,#ffb24d,#ff8f00)";
export const AMBER_GLOW = "0 10px 28px -8px rgba(255,143,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)";

// Gradient brand badge with the coaching's initial.
export function LogoBadge({ letter, size = 56 }: { letter: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: AMBER_GRAD,
        display: "grid",
        placeItems: "center",
        boxShadow: AMBER_GLOW,
        fontFamily: display,
        fontWeight: 700,
        fontSize: size * 0.5,
        color: "#1a1205",
      }}
    >
      {(letter || "?").charAt(0).toUpperCase()}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  glow = false,
  className = "",
}: {
  children: ReactNode;
  glow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white/[0.025] ${className}`}
      style={{ borderColor: "rgba(255,255,255,0.07)" }}
    >
      {glow && (
        <div
          className="pointer-events-none absolute -top-16 right-0 h-40 w-40"
          style={{
            background:
              "radial-gradient(60% 60% at 70% 0%, rgba(255,143,0,0.18), transparent 70%)",
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

// ── Pill (status / tag badge) ──────────────────────────────────────────────────
const PILL: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-500/15 text-amber-400",
  accent: "bg-amber-500/15 text-amber-400",
  slate: "bg-white/[0.06] text-slate-300",
  danger: "bg-red-500/15 text-red-400",
};
export function Pill({ tone = "slate", children }: { tone?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${PILL[tone] ?? PILL.slate}`}
    >
      {children}
    </span>
  );
}

// ── Button ───────────────────────────────────────────────────────────────────
export function Btn({
  children,
  onClick,
  kind = "primary",
  type = "button",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50";
  const styles =
    kind === "primary"
      ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
      : "border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

// ── Page header with radial glow ───────────────────────────────────────────────
export function PageHead({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative mb-7">
      <div
        className="pointer-events-none absolute -top-24 left-0 right-0 h-48"
        style={{
          background:
            "radial-gradient(45% 100% at 25% 0%, rgba(255,143,0,0.12), transparent 70%)",
        }}
      />
      <div className="relative flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: display }}>
            {title}
          </h1>
          {sub && <p className="mt-1.5 text-sm text-slate-400">{sub}</p>}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}

// ── Sparkline (tiny trend line) ────────────────────────────────────────────────
function sparkPaths(values: number[], w = 84, h = 34) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 2 - ((v - min) / span) * (h - 6)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return { line, area };
}

export function StatCard({
  label,
  value,
  accent = false,
  spark,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  spark?: number[];
}) {
  const p = spark ? sparkPaths(spark) : null;
  const gid = `sp-${label.replace(/\W/g, "")}`;
  return (
    <Card glow={accent} className="flex-1">
      <div className="px-6 py-5">
        <div className="text-sm font-semibold text-slate-400">{label}</div>
        <div className="mt-4 flex items-end justify-between">
          <div
            className="text-4xl font-bold leading-none tracking-tight text-white"
            style={{ fontFamily: display }}
          >
            {value}
          </div>
          {p && (
            <svg width="84" height="34" viewBox="0 0 84 34" fill="none" className="mb-0.5">
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ff8f00" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#ff8f00" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={p.area} fill={`url(#${gid})`} />
              <path
                d={p.line}
                stroke="#ffab33"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Skeleton (loading shimmer) ─────────────────────────────────────────────────
// Single shimmer block. Used by the route-level loading.tsx files so a click
// swaps to a skeleton instantly (Next renders this at the Suspense boundary
// while the dynamic page's auth + DB queries run on the server).
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={`animate-pulse rounded-md bg-white/[0.06] ${className}`} style={style} />
  );
}

// Generic list-page skeleton: a title + action button, then a stack of table
// rows. Matches the p-8 / table layout of StudentsClient, TestsClient, etc.
export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
        <div className="bg-slate-900 px-4 py-3.5">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="divide-y divide-slate-800 bg-slate-950">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Table primitives (grid-based, matches mockup THead/TRow) ────────────────────
export type Col = { label: string; w: string; align?: "left" | "right" | "center" };

export function Table({ cols, children }: { cols: Col[]; children: ReactNode }) {
  return (
    <Card>
      <THead cols={cols} />
      {children}
    </Card>
  );
}

const gridStyle = (cols: Col[]): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: cols.map((c) => c.w).join(" "),
  alignItems: "center",
});

export function THead({ cols }: { cols: Col[] }) {
  return (
    <div
      className="border-b px-6 py-3.5 text-[13px] font-semibold text-slate-400"
      style={{ ...gridStyle(cols), borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
    >
      {cols.map((c, i) => (
        <div key={i} style={{ textAlign: c.align ?? "left" }}>
          {c.label}
        </div>
      ))}
    </div>
  );
}

export function TRow({ cols, cells, last = false }: { cols: Col[]; cells: ReactNode[]; last?: boolean }) {
  return (
    <div
      className="px-6 py-4"
      style={{ ...gridStyle(cols), borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)" }}
    >
      {cells.map((cell, i) => (
        <div key={i} style={{ textAlign: cols[i].align ?? "left" }}>
          {cell}
        </div>
      ))}
    </div>
  );
}

export { mono as monoFont };
