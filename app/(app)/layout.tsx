import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const clerkUser = await currentUser();

  if (!userId || !clerkUser) {
    redirect("/sign-in");
  }

  // Check if user exists to avoid expensive database writes on every page load
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!dbUser) {
    // Auto-sync user to our DB
    await prisma.user.upsert({
      where: { id: userId },
      update: { email: clerkUser.emailAddresses[0]?.emailAddress },
      create: {
        id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
      },
    });
  }

  return <>{children}</>;
}
