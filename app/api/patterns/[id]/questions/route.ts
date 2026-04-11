import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    // Wrap the internal logic in unstable_cache
    const getData = unstable_cache(
      async () => {
        // Check if it's a regular topic pattern or a subject-level pattern
        if (id.startsWith("subject-")) {
          const actualId = id.replace("subject-", "");
          
          const subjectPattern = await prisma.subjectPattern.findUnique({
            where: { id: actualId },
            include: {
              pyqs: {
                include: {
                  attempts: {
                    where: userId ? { user_id: userId } : { user_id: "none" },
                    orderBy: { created_at: "desc" },
                    take: 1,
                  },
                },
                orderBy: { year: "desc" },
              },
            },
          });

          if (!subjectPattern) return { error: "Subject Pattern not found", status: 404 };

          return {
            data: {
              questions: [],
              pyqs: subjectPattern.pyqs.map(pyq => ({ ...pyq, _isSubjectPyq: true })),
            }
          };
        }

        // Regular Topic Pattern
        const pattern = await prisma.pattern.findUnique({
          where: { id },
          include: {
            questions: {
              include: {
                attempts: {
                  where: userId ? { user_id: userId } : { user_id: "none" },
                  orderBy: { created_at: "desc" },
                  take: 1,
                },
              },
              orderBy: { created_at: "desc" },
            },
            pyqs: {
              include: {
                attempts: {
                  where: userId ? { user_id: userId } : { user_id: "none" },
                  orderBy: { created_at: "desc" },
                  take: 1,
                },
              },
              orderBy: { year: "desc" },
            },
          },
        });

        if (!pattern) return { error: "Topic Pattern not found", status: 404 };

        return {
          data: {
            questions: pattern.questions,
            pyqs: pattern.pyqs,
          }
        };
      },
      [`pattern-questions-${id}-${userId || "guest"}-v3`],
      { revalidate: 600, tags: ["patterns"] }
    );

    const result = await getData();

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);

  } catch (error) {
    console.error("[GET_PATTERN_QUESTIONS]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
