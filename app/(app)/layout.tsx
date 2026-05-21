import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import PreferenceModal from "@/components/onboarding/PreferenceModal";
import { getCachedExamMeta } from "@/lib/examMeta";

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
  let dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      preferred_exam: true,
      preferred_branch: true,
    },
  });

  // Slow path: only call Clerk API for brand-new users who need DB sync
  if (!dbUser) {
    const clerkUser = await currentUser();
    if (!clerkUser) redirect("/sign-in");

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";

    dbUser = await prisma.user.upsert({
      where: { email },
      create: { id: userId, email },
      update: { id: userId },
      select: {
        id: true,
        preferred_exam: true,
        preferred_branch: true,
      },
    });
  }

  // Only fetch the exam list when we actually need the modal — keeps the
  // hot path (already-onboarded users) free of an extra cache hit on each
  // navigation.
  let modalProps: { exams: string[]; branchesByExam: Record<string, string[]> } | null = null;
  let needsOnboarding = false;

  if (!dbUser.preferred_exam) {
    needsOnboarding = true;
  } else {
    const meta = await getCachedExamMeta();
    const realBranches = (meta.branchesByExam[dbUser.preferred_exam] ?? []).filter(
      (b) => b !== "Common",
    );
    if (realBranches.length > 0 && !dbUser.preferred_branch) {
      needsOnboarding = true;
      modalProps = { exams: meta.exams, branchesByExam: meta.branchesByExam };
    }
  }

  if (needsOnboarding && !modalProps) {
    const meta = await getCachedExamMeta();
    modalProps = { exams: meta.exams, branchesByExam: meta.branchesByExam };
  }

  return (
    <>
      {needsOnboarding && modalProps && (
        <PreferenceModal
          availableExams={modalProps.exams}
          branchesByExam={modalProps.branchesByExam}
        />
      )}
      {children}
    </>
  );
}


