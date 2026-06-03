import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Join a coaching | BattleExam",
  robots: { index: false, follow: false },
};

/**
 * Short-link entry point. A coach shares their join code (e.g. on WhatsApp);
 * the student opens /join/<code> and we resolve it to the coaching's slug and
 * forward them to its join page — no need to know the slug. Codes are matched
 * case-insensitively (mirrors the join API).
 */
export default async function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const clean = decodeURIComponent(code ?? "").trim();

  const coaching = clean
    ? await prisma.coaching.findFirst({
        where: { join_code: { equals: clean, mode: "insensitive" }, active: true },
        select: { slug: true },
      })
    : null;

  if (coaching) redirect(`/c/${coaching.slug}/join`);

  // No active coaching for this code — show a friendly dead end.
  return (
    <div
      className="grid min-h-[70vh] place-items-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-8 text-center"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Code not found
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          We couldn&apos;t find a coaching for the code{" "}
          <span className="font-mono font-semibold">{clean || "—"}</span>. Double-check
          the code your teacher gave you.
        </p>
        <Link
          href="/coaching"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-400"
        >
          Try another code
        </Link>
      </div>
    </div>
  );
}
