import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import PreferenceModal from "@/components/onboarding/PreferenceModal";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // /practice is intentionally public — guests can browse but cannot submit answers.
  // All other (app) routes require authentication.
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isPracticePath = pathname === "/practice" || pathname.startsWith("/practice/");

  const { userId } = await auth();

  if (!userId) {
    if (!isPracticePath) redirect("/sign-in");
    // Guest on /practice — skip DB setup, render children directly
    return <>{children}</>;
  }

  // Fast path: check DB first (single indexed lookup, ~2ms)
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      preferred_exam: true,
      preferred_branch: true
    },
  });

  // Slow path: only call Clerk API for brand-new users who need DB sync
  if (!dbUser) {
    const clerkUser = await currentUser();
    if (!clerkUser) redirect("/sign-in");

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";

    await prisma.user.upsert({
      where: { email },
      create: { id: userId, email },
      update: { id: userId },
    });
  }

  const needsOnboarding = dbUser && (!dbUser.preferred_exam || !dbUser.preferred_branch);

  return (
    <>
      {needsOnboarding && <PreferenceModal />}
      {children}
    </>
  );
}


