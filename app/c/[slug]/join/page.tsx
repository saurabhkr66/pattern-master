import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import StudentAuthForm from "@/components/coaching/StudentAuthForm";

export const metadata = {
  title: "Join | BattleExam",
  robots: { index: false, follow: false },
};

export default async function StudentJoinPage({
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

  // Already signed in (FULL validation — same check the dashboard uses, so a
  // stale/invalid cookie can't bounce us into a login↔dashboard loop).
  const student = await getCurrentStudent(coaching.id);
  if (student) redirect(`/c/${slug}/dashboard`);

  return <StudentAuthForm mode="join" slug={slug} coachingName={coaching.name} />;
}
