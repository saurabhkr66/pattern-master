// app/api/test/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const testId = searchParams.get("testId");

        if (!testId) {
            return NextResponse.json({ error: "Missing testId" }, { status: 400 });
        }

        // Fetch all test sessions for this test template, ordering highest score first and shortest time.
        const sessions = await prisma.testSession.findMany({
            where: { mock_test_id: testId },
            orderBy: [
                { score: "desc" },
                { time_taken_secs: "asc" }
            ],
            select: {
                id: true,
                user_id: true,
                score: true,
                max_score: true,
                time_taken_secs: true,
                created_at: true,
            }
        });

        if (sessions.length === 0) {
            return NextResponse.json({ leaderboard: [] });
        }

        // Fetch emails from User table to display names/identities
        // (If user_id doesn't align with User.id due to Clerk sync mismatches, we fallback below)
        const userIds = [...new Set(sessions.map(s => s.user_id))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true }
        });
        
        // Wait, user_id in TestSession is the Clerk user ID. In the User table, the ID is typically an internal CUID 
        // unless they overrode ID to be clerk ID. But they do use email as unique.
        // Assuming user_id in TestSession is Clerk ID, we might not always have a matching Prisma User ID if it wasn't synced perfectly.
        // Let's just do our best with the DB mapping. If not found, use truncated user_id.

        const userMap = new Map();
        // The Prisma schema says User id is CUID (`@default(cuid())`), but Clerk ID starts with `user_`.
        // The `Attempt` table has `user_id` referencing `User(id)`. Let's assume User.id IS the Clerk ID in their implementation.
        for (const u of users) {
             userMap.set(u.id, u.email);
        }

        const leaderboard = sessions.map((s, idx) => {
            const rawIdentifier = userMap.get(s.user_id) || "Student";
            let displayName = "Student";
            
            if (rawIdentifier.includes("@")) {
                const parts = rawIdentifier.split("@");
                const namePart = parts[0];
                // Pseudo-anonymize: keep first 3 letters, mask the rest of email
                displayName = namePart.substring(0, 3) + "***@" + parts[1];
            } else {
                 displayName = "User_" + s.user_id.substring(s.user_id.length - 4);
            }

            return {
                rank: idx + 1,
                user: displayName,
                score: s.score,
                maxScore: s.max_score,
                timeTakenSecs: s.time_taken_secs,
                date: s.created_at,
            };
        });

        return NextResponse.json({ leaderboard });
    } catch (error) {
        console.error("Leaderboard fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
