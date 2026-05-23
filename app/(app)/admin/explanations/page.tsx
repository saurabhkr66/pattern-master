import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getGateCsePyqsMissingExplanation } from "@/app/actions/admin";
import ExplanationsClient from "./ExplanationsClient";

export const dynamic = "force-dynamic";

export default async function AdminExplanationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userEmail = dbUser?.email?.toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",");

  if (!userEmail || (!adminEmails.includes(userEmail) && userEmail !== "sauravkum4200@gmail.com")) {
    redirect("/");
  }

  const data = await getGateCsePyqsMissingExplanation(0, 50);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Missing Explanations</h1>
          <p className="text-gray-500 font-medium">
            GATE CSE PYQs without explanations — {data.totalPyq + data.totalSubjectPyq} remaining
          </p>
        </div>
      </div>

      <ExplanationsClient initialData={data} />
    </div>
  );
}
