'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function saveUserPreference(exam: string, branch: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      preferred_exam: exam,
      preferred_branch: branch,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}
