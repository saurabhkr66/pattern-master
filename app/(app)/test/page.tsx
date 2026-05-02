import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MockTestPage from "@/components/test/MockTestPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mock Test – PatternMaster",
  description: "Full-length mock tests for GATE, JEE Main, JEE Advanced, and NEET — real exam experience with instant analysis.",
};

export default async function TestPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <MockTestPage />;
}
