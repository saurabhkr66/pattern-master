"use server"
// app/onboarding/actions.ts

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, currentUser } from "@clerk/nextjs/server"

export async function completeOnboarding(formData: {
    exam_type: string;
    branch: string;
    exam_date: string;
    target_score: string;
}) {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        return { error: "Unauthorized. Please sign in again." };
    }

    // Get the primary email address
    const email = user.emailAddresses[0]?.emailAddress;

    try {
        // We use UPSERT: Create if doesn't exist, Update if it does.
        await prisma.user.upsert({
            where: { id: userId },
            update: {
                exam_type: formData.exam_type,
                branch: formData.branch,
                exam_date: new Date(formData.exam_date),
                target_score: parseInt(formData.target_score),
                onboarded: true,
            },
            create: {
                id: userId,
                email: email,
                exam_type: formData.exam_type,
                branch: formData.branch,
                exam_date: new Date(formData.exam_date),
                target_score: parseInt(formData.target_score),
                onboarded: true,
            },
        });
    } catch (error) {
        console.error("Failed to sync user onboarding:", error);
        return { error: "Something went wrong while saving your account data." };
    }

    revalidatePath("/");
    redirect("/dashboard");
}
