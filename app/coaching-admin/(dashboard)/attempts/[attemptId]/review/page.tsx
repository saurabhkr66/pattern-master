import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import {
  getResolvedTestQuestions,
  studentQuestionsFromBase,
} from "@/lib/coachingQuestionCache";
import type { RuntimeTest } from "@/lib/coachingTestRuntime";
import { subjectiveEntryMarks, type StoredAnswers } from "@/lib/coachingScore";
import { isSubjectiveEntry } from "@/lib/subjectiveTypes";
import { isR2Configured, presignAnswerGets } from "@/lib/r2";
import SubjectiveReviewPanel, {
  type ReviewQuestion,
} from "@/components/coaching/SubjectiveReviewPanel";

export const dynamic = "force-dynamic";

// Teacher grading screen for ONE attempt's subjective answers: the student's
// photos (signed URLs), the AI's marks/confidence/feedback, and an override
// input. Low-confidence and flagged answers are what actually need attention;
// everything else is shown for transparency.
export default async function SubjectiveReviewPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const actor = await resolveCoachingAdmin();

  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <p className="text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }
  const coachingId = actor!.coachingId!;

  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, coaching_id: coachingId },
    select: {
      id: true,
      status: true,
      answers: true,
      score: true,
      max_score: true,
      grading_status: true,
      student_id: true,
      student: { select: { name: true } },
      test: {
        select: { id: true, title: true, questions: true, shuffle: true, pool_size: true },
      },
    },
  });
  if (!attempt) notFound();
  if (attempt.status !== "submitted") {
    return (
      <div className="p-8 text-slate-400">
        This attempt has not been submitted yet — nothing to review.
      </div>
    );
  }

  const runtimeTest: RuntimeTest = {
    id: attempt.test.id,
    questions: attempt.test.questions,
    shuffle: attempt.test.shuffle,
    pool_size: attempt.test.pool_size,
  };
  const base = await getResolvedTestQuestions(runtimeTest, coachingId);
  const resolved = studentQuestionsFromBase(base, runtimeTest, attempt.student_id);
  const answers = (attempt.answers ?? {}) as StoredAnswers;

  const subjective = resolved.filter((q) => q.question_type === "subjective");
  const allKeys = subjective.flatMap((q) => {
    const v = answers[q.id];
    return isSubjectiveEntry(v) ? v.image_keys : [];
  });
  const imageUrlMap =
    allKeys.length && isR2Configured() ? await presignAnswerGets(allKeys) : {};

  let qNum = 0;
  const reviewQuestions: ReviewQuestion[] = subjective.map((q) => {
    qNum = resolved.indexOf(q) + 1;
    const v = answers[q.id];
    const entry = isSubjectiveEntry(v) ? v : null;
    const final = entry ? subjectiveEntryMarks(entry, q.marks) : null;
    return {
      questionId: q.id,
      number: qNum,
      questionText: q.question_text,
      questionHtml: q.question_html,
      modelAnswer: q.solution,
      generatedModelAnswer: entry?.generated_model_answer ?? null,
      maxMarks: q.marks,
      answered: !!entry && entry.image_keys.length > 0,
      imageUrls: entry ? entry.image_keys.map((k) => imageUrlMap[k]).filter(Boolean) : [],
      geminiMarks: entry?.gemini_marks ?? null,
      geminiFeedback: entry?.gemini_feedback ?? null,
      geminiConfidence: entry?.gemini_confidence ?? null,
      flagged: entry?.flagged ?? false,
      manualOverride: entry?.manual_override ?? null,
      gradedBy: entry?.graded_by ?? null,
      pending: final?.pending ?? false,
      finalMarks: entry && !final?.pending ? final!.marks : null,
    };
  });

  return (
    <div className="p-4 md:p-8">
      <Link
        href={`/coaching-admin/attempts/${attempt.id}`}
        className="text-sm text-slate-400 hover:text-white"
      >
        ← Back to attempt analysis
      </Link>
      <SubjectiveReviewPanel
        attemptId={attempt.id}
        studentName={attempt.student.name}
        testTitle={attempt.test.title}
        initialScore={attempt.score ?? 0}
        maxScore={attempt.max_score ?? 0}
        gradingStatus={attempt.grading_status}
        questions={reviewQuestions}
      />
    </div>
  );
}
