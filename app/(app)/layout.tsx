import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Fast path: check DB first (single indexed lookup, ~2ms)
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  // Slow path: only call Clerk API for brand-new users who need DB sync
  if (!dbUser) {
    const clerkUser = await currentUser();
    if (!clerkUser) redirect("/sign-in");

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";

    // Use upsert on email as well to handle the case where a user record
    // already exists under this email (e.g. from a previous social login)
    await prisma.user.upsert({
      where: { email },
      create: { id: userId, email },
      update: { id: userId },
    });
  }

  return <>{children}</>;
}

