import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import DppEditor from "@/components/dpp/DppEditor";
import {
  VERIFY_MODEL_OPTIONS,
  GENERATION_MODEL_OPTIONS,
  COMPARE_MODEL_OPTIONS,
} from "@/lib/coachingImport";

export const dynamic = "force-dynamic";

export default async function DppEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const dpp = await prisma.dpp.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      order: true,
      status: true,
      is_public: true,
      pattern: { select: { topic_name: true, subject: true, exam_type: true, branch: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          question_text: true,
          options: true,
          correct_answer: true,
          explanation: true,
          question_type: true,
          marks: true,
          images: true,
          question_text_hindi: true,
          explanation_hindi: true,
          answer_disputed: true,
          blind_answer: true,
          verify_answer: true,
          figure_missing: true,
          reviewed: true,
          source: true,
        },
      },
    },
  });

  if (!dpp) notFound();

  return (
    <DppEditor
      // Passed down rather than mirrored in the client component. lib/coachingImport
      // is server-only, so QuestionImportModal hand-copies these lists and they drift
      // every time a model id changes; threading them through props cannot drift.
      models={{
        verify: [...VERIFY_MODEL_OPTIONS],
        answer: [...GENERATION_MODEL_OPTIONS],
        compare: [...COMPARE_MODEL_OPTIONS],
      }}
      dpp={{
        id: dpp.id,
        name: dpp.name,
        order: dpp.order,
        status: dpp.status,
        isPublic: dpp.is_public,
        topicName: dpp.pattern.topic_name,
        subject: dpp.pattern.subject,
        examType: dpp.pattern.exam_type,
        branch: dpp.pattern.branch,
        questions: dpp.questions.map((q) => ({
          ...q,
          options: (q.options ?? []) as unknown as string[],
        })),
      }}
    />
  );
}
