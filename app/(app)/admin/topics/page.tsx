import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import TopicsClient from "./TopicsClient";
import { getAllTopics } from "@/app/actions/admin";
import { isAdmin as checkIsAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminTopicsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Get email from our own database to avoid Clerk API timeouts
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();

  // SECURE ADMIN CHECK
  const adminEmails = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",");
  
  if (!userEmail || (!adminEmails.includes(userEmail) && userEmail !== "sauravkum4200@gmail.com")) {
    redirect("/");
  }

  // Fetch all mock tests to show in the list
  const mockTests = await prisma.mockTestTemplate.findMany({
    orderBy: { created_at: "desc" }
  });

  // Fetch all allowed topics (from the Pattern table) to give to the AI
  const availableTopics = await getAllTopics();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Topic Categorizer</h1>
          <p className="text-gray-500 font-medium">Use AI to automatically assign syllabus topics to mock test questions.</p>
        </div>
      </div>

      <TopicsClient mockTests={mockTests} availableTopics={availableTopics} />
    </div>
  );
}
