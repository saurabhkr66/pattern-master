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

  // Auto-sync user to our DB (replaces onboarding)
  await prisma.user.upsert({
    where: { id: userId },
    update: { email: clerkUser.emailAddresses[0]?.emailAddress },
    create: {
      id: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      onboarded: true,
    },
  });

  return <>{children}</>;
}
