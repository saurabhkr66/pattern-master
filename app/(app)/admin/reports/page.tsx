import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
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
    // If they are not an admin, kick them out to the homepage
    redirect("/");
  }

  // Fetch all pending manual reports
  const manualReports = await prisma.questionReport.findMany({
    where: { status: "pending" },
    orderBy: { created_at: "desc" },
    include: {
      user: { select: { email: true } },
      question: { include: { pattern: true } },
      pyq: { include: { pattern: true } },
      subject_pyq: { include: { subject_pattern: true } },
    }
  });

  // Automatically fetch some questions that are missing explanations for ALL exams
  const EXAMS = ["GATE", "JEE_MAIN", "JEE_ADVANCED", "NEET"];
  
  const missingSubjectPYQs: any[] = [];
  const missingPYQs: any[] = [];
  const missingMockQuestions: any[] = [];

  for (const exam of EXAMS) {
    // Fetch SubjectPYQs for this exam
    const sPyqs = await prisma.subjectPYQ.findMany({
      where: { 
        explanation: "",
        subject_pattern: { exam_type: exam }
      },
      take: 20,
      include: { subject_pattern: true }
    });
    missingSubjectPYQs.push(...sPyqs);

    // Fetch PYQs for this exam
    const pyqs = await prisma.pYQ.findMany({
      where: { 
        explanation: "",
        exam_type: exam 
      },
      take: 20,
      include: { pattern: true }
    });
    missingPYQs.push(...pyqs);
  }

  const mockTemplates = await prisma.mockTestTemplate.findMany();
  
  for (const exam of EXAMS) {
    const examTemplates = mockTemplates.filter(t => t.exam_type === exam);
    let count = 0;
    for (const template of examTemplates) {
      if (count >= 30) break;
      const questions = (template.questions as any[]) || [];
      for (const q of questions) {
        if (!q.explanation || q.explanation.trim() === "") {
          missingMockQuestions.push({
            id: `auto-mock-${template.id}-${q.id}`,
            reason: "Missing Explanation (Mock)",
            status: "pending",
            created_at: new Date(),
            user: { email: "System Scanner" },
            isMock: true,
            mock_test_id: template.id,
            mock_question_id: q.id,
            exam_type: template.exam_type,
            subject: q.subject || q.sectionName || q.topic_name || template.title,
            q: q,
            details: `Question in "${template.title}" has no explanation.`
          });
          count++;
          if (count >= 30) break;
        }
      }
    }
  }

  // Convert them into "virtual reports" so they show up in the UI
  const autoReports = [
    ...missingSubjectPYQs.map(q => ({
      id: `auto-empty-s-${q.id}`,
      reason: "Missing Explanation (Auto)",
      status: "pending",
      created_at: new Date(),
      user: { email: "System Scanner" },
      subject_pyq_id: q.id,
      subject_pyq: q,
      details: "This question currently has no explanation in the database."
    })),
    ...missingPYQs.map(q => ({
      id: `auto-empty-p-${q.id}`,
      reason: "Missing Explanation (Auto)",
      status: "pending",
      created_at: new Date(),
      user: { email: "System Scanner" },
      pyq_id: q.id,
      pyq: q,
      details: "This question currently has no explanation in the database."
    })),
    ...missingMockQuestions
  ];

  const allReports = [...manualReports, ...autoReports];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Flagged & Missing</h1>
          <p className="text-gray-500 font-medium">Review community reports and automatically fix missing explanations.</p>
        </div>
      </div>

      <ReportsClient reports={allReports} mockTests={mockTemplates} />
    </div>
  );
}
