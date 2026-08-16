import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import DppListClient from "@/components/dpp/DppListClient";

// Admin-only DPP index. See docs/dpp-implementation-plan.md §3.
export const dynamic = "force-dynamic";

export default async function AdminDppPage() {
  await requireAdmin(); // redirects: /sign-in when signed out, / when not an admin

  const dpps = await prisma.dpp.findMany({
    orderBy: [{ updated_at: "desc" }],
    take: 300,
    select: {
      id: true,
      name: true,
      order: true,
      status: true,
      is_public: true,
      updated_at: true,
      pattern_id: true,
      _count: { select: { questions: true } },
      pattern: { select: { topic_name: true, subject: true, exam_type: true, branch: true } },
    },
  });

  return (
    <DppListClient
      initial={dpps.map((d) => ({
        id: d.id,
        name: d.name,
        order: d.order,
        status: d.status,
        isPublic: d.is_public,
        questionCount: d._count.questions,
        patternId: d.pattern_id,
        topicName: d.pattern.topic_name,
        subject: d.pattern.subject,
        examType: d.pattern.exam_type,
        branch: d.pattern.branch,
        // Serialized for the client boundary.
        updatedAt: d.updated_at.toISOString(),
      }))}
    />
  );
}
