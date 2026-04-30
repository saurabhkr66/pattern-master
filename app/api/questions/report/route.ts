import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId, isPyq, isSubjectPyq, reason, details } = await req.json();

    if (!questionId || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const data: any = {
      user_id: userId,
      reason,
      details: details || null,
      status: "pending",
    };

    if (isSubjectPyq) {
      data.subject_pyq_id = questionId;
    } else if (isPyq) {
      data.pyq_id = questionId;
    } else {
      data.question_id = questionId;
    }

    const report = await prisma.questionReport.create({
      data,
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("[QUESTION_REPORT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
