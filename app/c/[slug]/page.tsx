import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card, LogoBadge, AMBER_GRAD, AMBER_GLOW, display } from "@/components/coaching/ui";

// Public landing page (Join / Sign in) — its content (name, city, exam types)
// changes almost never, so it's cached/ISR instead of rendered per request.
// First hit renders + caches; subsequent hits for the window serve with zero
// DB. Busted immediately on coaching edit via revalidatePath("/c/<slug>") in
// the admin update/delete route; this is just the backstop.
export const revalidate = 3600;

// cache() dedupes the lookup across generateMetadata + the page within one
// render (they'd otherwise both query on an uncached render).
const getCoaching = cache(async (slug: string) =>
  prisma.coaching.findUnique({
    where: { slug },
    select: { id: true, name: true, city: true, exam_types: true, active: true },
  })
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const coaching = await getCoaching(slug);
  if (!coaching) return { title: "Coaching not found | BattleExam" };
  return {
    title: `${coaching.name}${coaching.city ? ` · ${coaching.city}` : ""} | BattleExam`,
    description: `Join ${coaching.name} on BattleExam to take their tests and track your progress.`,
  };
}

export default async function CoachingProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const coaching = await getCoaching(slug);
  if (!coaching || !coaching.active) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: coaching.name,
    ...(coaching.city ? { address: { "@type": "PostalAddress", addressLocality: coaching.city } } : {}),
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4" style={{ background: "#06060c" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* top radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-20%] h-[560px] w-[560px] -translate-x-1/2"
        style={{ background: "radial-gradient(circle, rgba(255,143,0,0.18), transparent 65%)" }}
      />
      <Card className="relative w-full max-w-[440px]">
        <div className="px-10 pb-8 pt-12 text-center">
          <div className="mx-auto mb-6 w-fit">
            <LogoBadge letter={coaching.name} />
          </div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white" style={{ fontFamily: display }}>
            {coaching.name}
          </h1>
          {coaching.city && <p className="mt-2 text-[15px] text-slate-400">{coaching.city}</p>}

          {coaching.exam_types.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {coaching.exam_types.map((e) => (
                <span key={e} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-slate-300">
                  {e}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={`/c/${slug}/join`}
              className="grid h-14 place-items-center rounded-2xl text-[17px] font-bold text-[#1a1205]"
              style={{ background: AMBER_GRAD, boxShadow: AMBER_GLOW }}
            >
              Join with code
            </Link>
            <Link
              href={`/c/${slug}/login`}
              className="grid h-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-base font-semibold text-slate-200 hover:bg-white/[0.06]"
            >
              Already joined? Sign in
            </Link>
          </div>
        </div>
        <div className="border-t px-4 py-4 text-center text-[13px] text-slate-500" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          Powered by <span className="font-bold text-slate-400">BattleExam</span>
        </div>
      </Card>
    </div>
  );
}
