"use server";

import { prisma } from "@/lib/prisma";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function resolveReport(
  reportId: string, 
  questionId: string, 
  questionType: "PYQ" | "SubjectPYQ" | "GeneratedQuestion",
  updates: { question_text?: string, correct_answer?: string, explanation?: string }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  // Get email from our own database to avoid Clerk API timeouts in Server Actions
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();
  
  if (!userEmail) throw new Error("User email not found in database.");

  const adminEmails = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",");
  
  // SECURE: Replace the email below with your actual email if you don't use the .env variable
  if (!adminEmails.includes(userEmail) && userEmail !== "sauravkum4200@gmail.com") {
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
  if (!userEmail) throw new Error("User email not found in database.");

  const adminEmails = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",");
  if (!adminEmails.includes(userEmail) && userEmail !== "sauravkum4200@gmail.com") {
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
