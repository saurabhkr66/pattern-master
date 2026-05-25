import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const exam = searchParams.get("exam") ?? undefined;
  const branch = searchParams.get("branch") ?? undefined;

  if (q.length < 2) {
    return NextResponse.json({ subjects: [], topics: [] });
  }

  const topicResults = await prisma.pattern.findMany({
    where: {
      topic_name: { contains: q, mode: "insensitive" },
      ...(exam ? { exam_type: exam } : {}),
      ...(branch ? { branch } : {}),
    },
    select: { id: true, topic_name: true, subject: true, exam_type: true, branch: true },
    take: 5,
  });

  return NextResponse.json(
    { subjects: [], topics: topicResults },
    { headers: { "Cache-Control": "public, s-maxage=60, max-age=0" } }
  );
}
