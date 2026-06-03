import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import StudentAuthForm from "@/components/coaching/StudentAuthForm";

export const metadata = {
  title: "Sign in | BattleExam",
  robots: { index: false, follow: false },
};

export default async function StudentLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const coaching = await prisma.coaching.findUnique({
    where: { slug },
    select: { id: true, name: true, active: true },
  });
  if (!coaching || !coaching.active) notFound();

  // Full validation (same as dashboard) so a stale/invalid cookie shows the
  // login form instead of bouncing into a login↔dashboard loop.
  const student = await getCurrentStudent(coaching.id);
  if (student) redirect(`/c/${slug}/dashboard`);

  return <StudentAuthForm mode="login" slug={slug} coachingName={coaching.name} />;
}
