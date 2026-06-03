import { redirect, notFound } from "next/navigation";
import { getCoachingActor } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import BillsClient from "@/components/coaching/BillsClient";

export const dynamic = "force-dynamic";

export default async function CoachingBillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCoachingActor();
  if (!actor?.isSuperAdmin) redirect("/");

  const coaching = await prisma.coaching.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!coaching) notFound();

  return <BillsClient coachingId={id} coachingName={coaching.name} />;
}
