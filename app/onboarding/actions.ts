'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function saveUserPreference(exam: string, branch: string | null) {
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

  revalidateTag(`user-${userId}`, "max");
  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}
