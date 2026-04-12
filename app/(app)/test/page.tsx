// app/(app)/test/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MockTestPage from "@/components/test/MockTestPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mock Test – PatternMaster",
  description: "Take a full GATE CSE mock test with 55 questions, real-time scoring, and detailed analysis.",
};

export default async function TestPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return <MockTestPage />;
}
