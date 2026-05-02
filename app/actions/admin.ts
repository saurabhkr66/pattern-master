"use server";

import { prisma } from "@/lib/prisma";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isAdmin as checkIsAdmin } from "@/lib/admin";

export async function resolveReport(
  reportId: string, 
  questionId: string, 
  questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion",
  updates: { 
    question_text?: string, 
    correct_answer?: string, 
    explanation?: string,
    options?: any,
    images?: any
  }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  // Get email from our own database to avoid Clerk API timeouts in Server Actions
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();
  
  if (!checkIsAdmin(userEmail)) {
    throw new Error("Forbidden: You are not an admin.");
  }

  
  // Update the actual question
  if (questionType === "SubjectPYQ") {
    await prisma.subjectPYQ.update({
      where: { id: questionId },
      data: updates
    });
  } else if (questionType === "PYQ") {
    await prisma.pYQ.update({
      where: { id: questionId },
      data: updates
    });
  } else {
    await prisma.generatedQuestion.update({
      where: { id: questionId },
      data: updates
    });
  }

  // Mark report as resolved ONLY if it's a real report, not a virtual one
  if (!reportId.startsWith("auto-empty-")) {
    await prisma.questionReport.update({
      where: { id: reportId },
      data: { status: "resolved" }
    });
  }

  revalidatePath("/admin/reports");
}

export async function deleteQuestion(
  questionId: string,
  questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion"
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();
  if (!checkIsAdmin(userEmail)) {
    throw new Error("Forbidden: You are not an admin.");
  }

  // Delete the actual question (Cascades to reports, bookmarks, attempts)
  if (questionType === "SubjectPYQ") {
    await prisma.subjectPYQ.delete({ where: { id: questionId } });
  } else if (questionType === "PYQ") {
    await prisma.pYQ.delete({ where: { id: questionId } });
  } else {
    await prisma.generatedQuestion.delete({ where: { id: questionId } });
  }

  revalidatePath("/admin/reports");
}

export async function quickEditExplanation(
  questionId: string,
  questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion" | string,
  explanation: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();
  if (!checkIsAdmin(userEmail)) {
    throw new Error("Forbidden: You are not an admin.");
  }

  if (questionType === "SubjectPYQ" || questionType === "subject_pyq") {
    await prisma.subjectPYQ.update({
      where: { id: questionId },
      data: { explanation }
    });
  } else if (questionType === "PYQ" || questionType === "pyq") {
    await prisma.pYQ.update({
      where: { id: questionId },
      data: { explanation }
    });
  } else {
    await prisma.generatedQuestion.update({
      where: { id: questionId },
      data: { explanation }
    });
  }
}

export async function deleteMockTest(mockTestId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();
  if (!checkIsAdmin(userEmail)) {
    throw new Error("Forbidden: You are not an admin.");
  }

  // Delete all related test sessions first (manual cascade)
  await prisma.testSession.deleteMany({
    where: { mock_test_id: mockTestId }
  });

  // Then delete the template
  await prisma.mockTestTemplate.delete({
    where: { id: mockTestId }
  });

  revalidatePath("/mocktest");
}
