import { redirect } from "next/navigation";
import { getCoachingActor } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import AdminCoachingsClient from "@/components/coaching/AdminCoachingsClient";

export const dynamic = "force-dynamic";

export default async function AdminCoachingsPage() {
  const actor = await getCoachingActor();
  if (!actor?.isSuperAdmin) redirect("/");

  const coachings = await prisma.coaching.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      owner_email: true,
      join_code: true,
      status: true,
      applicant_name: true,
      applicant_phone: true,
      billing_mode: true,
      price_per_test: true,
      monthly_fee: true,
      active: true,
      created_at: true,
      _count: { select: { students: true, tests: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const serialized = coachings.map((c) => ({ ...c, created_at: c.created_at.toISOString() }));
  return <AdminCoachingsClient initialCoachings={serialized} />;
}
