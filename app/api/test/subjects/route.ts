// app/api/test/subjects/route.ts
// Returns all unique subjects that have questions in the DB.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch distinct subjects from both tables in parallel
        const [patternSubjects, subjectPatternNames] = await Promise.all([
            // Distinct subjects from PYQ → Pattern relationship
            prisma.pattern.findMany({
                where: { pyqs: { some: {} } }, // only patterns that have at least 1 PYQ
                select: { subject: true },
                distinct: ["subject"],
                orderBy: { subject: "asc" },
            }),
            // Distinct subject_names from SubjectPattern
            prisma.subjectPattern.findMany({
                where: { pyqs: { some: {} } }, // only patterns with at least 1 SubjectPYQ
                select: { subject_name: true },
                distinct: ["subject_name"],
                orderBy: { subject_name: "asc" },
            }),
        ]);

        const fromPatterns = patternSubjects.map(p => p.subject);
        const fromSubjectPatterns = subjectPatternNames.map(p => p.subject_name);

        // Merge and deduplicate, preserving alphabetical order
        const merged = Array.from(new Set([...fromPatterns, ...fromSubjectPatterns])).sort();

        return NextResponse.json({ subjects: merged });
    } catch (error) {
        console.error("Subjects fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
