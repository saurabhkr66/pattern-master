import type { ReactNode, CSSProperties } from "react";

// Coaching admin design system — reconstructed from the BattleExam redesign
// mockup (admin.jsx). Dark near-black surfaces, translucent bordered cards,
// amber accent (brand #ff8f00, not the mockup's purple), big display numerals.

// Reference the next/font CSS variable (set on the coaching layout wrappers via
// coachingFontVars), with web-safe fallbacks for any render outside that scope.
// The "Consistent design format" mockup uses one family — Plus Jakarta Sans —
// for both body and display, so `sans` and `display` now point at the same var.
export const sans = "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif";
export const display = "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif";
export const mono = "var(--font-jetbrains-mono), ui-monospace, monospace";

// Amber brand gradient. The mockup uses a 135° orange ramp for primary actions
// and the logo badge; AMBER_GRAD keeps the warmer logo gradient.
export const AMBER_GRAD = "linear-gradient(180deg,#ffb24d,#ff8f00)";
export const AMBER_GLOW = "0 10px 28px -8px rgba(255,143,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)";
// Primary-button gradient + glow from the mockup (theme.jsx orangeGrad).
export const ORANGE_GRAD = "linear-gradient(135deg,#fb923c 0%,#f59e0b 100%)";
export const ORANGE_BTN_GLOW = "0 8px 22px rgba(245,158,11,0.32)";

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
      className={`relative overflow-hidden rounded-[18px] border ${className}`}
      style={{
        borderColor: "rgba(255,255,255,0.07)",
        background: "#0f1218",
        boxShadow: glow
          ? "0 0 0 1px rgba(245,158,11,0.12), 0 20px 50px rgba(0,0,0,0.4)"
          : "0 14px 40px rgba(0,0,0,0.35)",
      }}
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
// Bordered, tinted badges matching the mockup Badge (theme.jsx). `dot` adds a
// leading status dot in the tone colour.
const PILL: Record<string, { bg: string; fg: string; bd: string }> = {
  success: { bg: "rgba(34,197,94,0.14)", fg: "#4ade80", bd: "rgba(34,197,94,0.3)" },
  amber: { bg: "rgba(245,158,11,0.12)", fg: "#f59e0b", bd: "rgba(245,158,11,0.3)" },
  accent: { bg: "rgba(245,158,11,0.12)", fg: "#f59e0b", bd: "rgba(245,158,11,0.3)" },
  slate: { bg: "rgba(255,255,255,0.05)", fg: "#8b93a2", bd: "rgba(255,255,255,0.07)" },
  danger: { bg: "rgba(239,68,68,0.12)", fg: "#f87171", bd: "rgba(239,68,68,0.3)" },
};
export function Pill({
  tone = "slate",
  dot = false,
  children,
}: {
  tone?: string;
  dot?: boolean;
  children: ReactNode;
}) {
  const c = PILL[tone] ?? PILL.slate;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ background: c.bg, color: c.fg, borderColor: c.bd }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.fg }} />}
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
  kind?: "primary" | "ghost" | "soft";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:brightness-110 disabled:opacity-50";
  const style: CSSProperties =
    kind === "primary"
      ? { background: ORANGE_GRAD, color: "#1a1205", boxShadow: ORANGE_BTN_GLOW }
      : kind === "soft"
        ? {
            background: "rgba(245,158,11,0.1)",
            color: "#f59e0b",
            border: "1px solid rgba(245,158,11,0.3)",
          }
        : {
            background: "rgba(255,255,255,0.04)",
            color: "#c9ced8",
            border: "1px solid rgba(255,255,255,0.07)",
          };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${className}`} style={style}>
      {children}
    </button>
  );
}

// ── Page header with radial glow ───────────────────────────────────────────────
export function PageHead({
  title,
  sub,
  icon,
  children,
}: {
  title: string;
  sub?: ReactNode;
  icon?: ReactNode;
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
        <div className="flex items-center gap-4">
          {icon && (
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-amber-400"
              style={{
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.35)",
                boxShadow: "0 0 30px rgba(245,158,11,0.15)",
              }}
            >
              {icon}
            </span>
          )}
          <div>
            <h1
              className="text-3xl font-extrabold tracking-tight text-white sm:text-[34px] lg:text-[38px]"
              style={{ fontFamily: display, letterSpacing: "-0.02em" }}
            >
              {title}
            </h1>
            {sub && <p className="mt-1.5 text-sm text-slate-400 sm:text-base">{sub}</p>}
          </div>
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

// Stat tile with a tinted icon chip (mockup StatCard / ProfileStat / ResStat).
// `icon` is a lucide node; `iconColor` tints the chip. Optional `spark` draws a
// full-width sparkline pinned to the card bottom.
export function StatCard({
  label,
  value,
  sub,
  icon,
  iconColor = "#f59e0b",
  accent = false,
  spark,
}: {
  label: ReactNode;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  iconColor?: string;
  accent?: boolean;
  spark?: number[];
}) {
  const p = spark ? sparkPaths(spark, 120, 34) : null;
  const gid = `sp-${String(label).replace(/\W/g, "")}`;
  return (
    <Card glow={accent} className="flex-1">
      <div className="px-6 py-5">
        {icon && (
          <span
            className="mb-4 grid h-11 w-11 place-items-center rounded-xl"
            style={{
              color: iconColor,
              background: `${iconColor}1f`,
              border: `1px solid ${iconColor}33`,
            }}
          >
            {icon}
          </span>
        )}
        <div
          className="text-3xl font-extrabold leading-none tracking-tight text-white sm:text-4xl"
          style={{ fontFamily: display }}
        >
          {value}
        </div>
        <div className="mt-2 text-sm font-semibold text-slate-300">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
        {p && (
          <svg
            viewBox="0 0 120 34"
            preserveAspectRatio="none"
            fill="none"
            className="mt-3 h-8 w-full"
          >
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={iconColor} stopOpacity="0.35" />
                <stop offset="1" stopColor={iconColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={p.area} fill={`url(#${gid})`} />
            <path
              d={p.line}
              stroke={iconColor}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </Card>
  );
}

// ── Avatar (initials circle) ───────────────────────────────────────────────────
export function Avatar({ text, size = 44, ring = false }: { text: string; size?: number; ring?: boolean }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-extrabold text-amber-400"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: "rgba(245,158,11,0.14)",
        border: "1.5px solid rgba(245,158,11,0.5)",
        boxShadow: ring ? "0 0 0 5px rgba(245,158,11,0.08)" : "none",
        fontFamily: display,
      }}
    >
      {(text || "?").charAt(0).toUpperCase()}
    </div>
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
