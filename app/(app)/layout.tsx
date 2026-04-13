import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // If the user row doesn't exist yet, or onboarded is false → send to onboarding.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboarded: true },
  });

  if (!user || !user.onboarded) {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
