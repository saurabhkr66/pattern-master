import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import DppNewClient from "@/components/dpp/DppNewClient";

export const dynamic = "force-dynamic";

export default async function NewDppPage() {
  await requireAdmin();

  // ~464 patterns, four short strings each — small enough to ship whole and
  // filter client-side, which avoids a cascade of round-trips per dropdown.
  const [patterns, existing] = await Promise.all([
    prisma.pattern.findMany({
      orderBy: [{ exam_type: "asc" }, { branch: "asc" }, { subject: "asc" }, { topic_name: "asc" }],
      select: { id: true, exam_type: true, branch: true, subject: true, topic_name: true },
    }),
    // Which slots are already taken, so the form can suggest the next free one.
    prisma.dpp.findMany({ select: { pattern_id: true, order: true, name: true } }),
  ]);

  const takenByPattern: Record<string, { order: number; name: string }[]> = {};
  for (const d of existing) {
    (takenByPattern[d.pattern_id] ??= []).push({ order: d.order, name: d.name });
  }

  return <DppNewClient patterns={patterns} taken={takenByPattern} />;
}
