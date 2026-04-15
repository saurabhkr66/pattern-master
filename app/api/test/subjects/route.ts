// app/api/test/subjects/route.ts
// Returns all unique subjects that have questions in the DB.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const branch = searchParams.get("branch") || "";
        const isCseBranch = !branch || branch === "CSE";

        // Fetch distinct subjects from both tables in parallel
        const [patternSubjects, subjectPatternNames] = await Promise.all([
            // Distinct subjects from PYQ → Pattern relationship
            prisma.pattern.findMany({
                where: { pyqs: { some: {} } }, // only patterns that have at least 1 PYQ
                select: { subject: true },
                distinct: ["subject"],
                orderBy: { subject: "asc" },
            }),
            // Distinct subject_names from SubjectPattern — only for CSE branch
            isCseBranch
                ? prisma.subjectPattern.findMany({
                      where: { pyqs: { some: {} } },
                      select: { subject_name: true },
                      distinct: ["subject_name"],
                      orderBy: { subject_name: "asc" },
                  })
                : Promise.resolve([]),
        ]);

        const fromPatterns = patternSubjects.map(p => p.subject);
        const fromSubjectPatterns = subjectPatternNames.map((p: { subject_name: string }) => p.subject_name);

        // Merge and deduplicate, preserving alphabetical order
        const merged = Array.from(new Set([...fromPatterns, ...fromSubjectPatterns])).sort();

        return NextResponse.json({ subjects: merged });
    } catch (error) {
        console.error("Subjects fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
