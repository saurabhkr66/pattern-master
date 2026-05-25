import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const examType = searchParams.get("exam_type") ?? "GATE";
    const branch = searchParams.get("branch") ?? null;

    const patternSubjects = await prisma.pattern.findMany({
      where: {
        exam_type: examType,
        ...(branch ? { branch } : {}),
        pyqs: { some: {} },
      },
      select: { subject: true },
      distinct: ["subject"],
      orderBy: { subject: "asc" },
    });

    const merged = Array.from(
      new Set(patternSubjects.map((p) => p.subject))
    ).sort();

    return NextResponse.json({ subjects: merged }, { headers: { "Cache-Control": "private, s-maxage=3600, max-age=0" } });
  } catch (err) {
    console.error("Subjects fetch error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
