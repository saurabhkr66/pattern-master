import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { subMonths } from "date-fns";
import { IST_DAY_SQL, computeStreak } from "@/lib/activityDay";

export function getCachedStatsActivity(userId: string) {
  return unstable_cache(
    async () => {
      const sixMonthsAgo = subMonths(new Date(), 6);

      const [attemptStats, activityRows, currentMistakes] = await Promise.all([
        prisma.attempt.groupBy({
          by: ["is_correct"],
          where: { user_id: userId },
          _count: true,
        }),
        // Bucketed by IST civil day, not UTC — see lib/activityDay.ts. The key
        // comes back as TEXT, so it drops straight into `activityData` with no
        // Date round-trip to shift it.
        prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT ${IST_DAY_SQL} as date, COUNT(*)::bigint as count
          FROM "Attempt"
          WHERE user_id = ${userId} AND created_at >= ${sixMonthsAgo}
          GROUP BY ${IST_DAY_SQL}
          ORDER BY date
        `,
        prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint as count FROM (
            SELECT is_correct,
                   ROW_NUMBER() OVER (
                     PARTITION BY COALESCE(question_id, pyq_id)
                     ORDER BY created_at DESC
                   ) as rn
            FROM "Attempt"
            WHERE user_id = ${userId}
              AND mock_question_id IS NULL
              -- Legacy mock rows (pre-dating mock_question_id being written on
              -- submit) have all refs NULL, so the filter above misses them and
              -- COALESCE collapses them into one NULL partition — leaking one
              -- arbitrary mock answer into the mistakes count.
              AND COALESCE(question_id, pyq_id) IS NOT NULL
          ) t
          WHERE rn = 1 AND is_correct = false
        `,
      ]);

      const correctRow = attemptStats.find((r) => r.is_correct === true);
      const incorrectRow = attemptStats.find((r) => r.is_correct === false);
      const correctAttempts = correctRow?._count ?? 0;
      const totalAttempted = correctAttempts + (incorrectRow?._count ?? 0);
      const currentMistakesCount = Number(currentMistakes[0]?.count ?? 0);

      const activityData: Record<string, number> = {};
      activityRows.forEach((row) => {
        activityData[row.date] = Number(row.count);
      });

      const currentStreak = computeStreak((day) => Boolean(activityData[day]));

      return { totalAttempted, correctAttempts, currentMistakesCount, activityData, currentStreak };
    },
    [`dashboard-stats-activity-${userId}`],
    // TTL safety net: tag invalidation (on new attempts) is the primary refresh,
    // but `revalidate: false` froze stale-empty entries forever when no attempt
    // followed — the all-zero dashboard bug. 300s caps how long any stale entry
    // (incl. an empty one cached during a DB switch) can survive.
    { revalidate: 300, tags: [`dashboard-${userId}`, `mistakes-${userId}`] }
  )();
}

export function getCachedWeakTopic(userId: string) {
  return unstable_cache(
    async () => {
      const topicStats = await prisma.$queryRaw<{ pattern_id: string; topic_name: string; subject: string; count: bigint }[]>`
        SELECT
          t.pattern_id,
          COALESCE(pat.topic_name, 'Unknown Topic') as topic_name,
          COALESCE(pat.subject, 'General') as subject,
          t.count
        FROM (
          SELECT
            COALESCE(q.pattern_id, p.pattern_id, d.pattern_id) as pattern_id,
            COUNT(*)::bigint as count
          FROM (
            SELECT question_id, pyq_id, dpp_question_id, is_correct,
                   ROW_NUMBER() OVER (
                     PARTITION BY COALESCE(question_id, pyq_id, dpp_question_id)
                     ORDER BY created_at DESC
                   ) as rn
            FROM "Attempt"
            WHERE user_id = ${userId} AND mock_question_id IS NULL
              -- Legacy mock rows have all refs NULL and would otherwise collapse
              -- into one partition together with each other.
              AND COALESCE(question_id, pyq_id, dpp_question_id) IS NOT NULL
          ) latest
          LEFT JOIN "GeneratedQuestion" q ON q.id = latest.question_id
          LEFT JOIN "PYQ" p ON p.id = latest.pyq_id
          -- DPP rows DO belong here, unlike in currentMistakesCount above: a DPP
          -- is scoped to exactly one Pattern, so a missed DPP question is as
          -- honest a "weak topic" signal as any other. (The count above excludes
          -- them only because the mistake room's DPP tab is fed from
          -- DppRun.answers, and counting both would double up.)
          LEFT JOIN "DppQuestion" dq ON dq.id = latest.dpp_question_id
          LEFT JOIN "Dpp" d ON d.id = dq.dpp_id
          WHERE latest.rn = 1 AND latest.is_correct = false
          GROUP BY 1
        ) t
        LEFT JOIN "Pattern" pat ON pat.id = t.pattern_id
        WHERE t.pattern_id IS NOT NULL
          AND pat.id IS NOT NULL
          AND t.count > 0
        ORDER BY t.count DESC
        LIMIT 5
      `;

      const weakestRow = topicStats[0];
      return weakestRow
        ? { id: weakestRow.pattern_id, name: weakestRow.topic_name, subject: weakestRow.subject, count: Number(weakestRow.count) }
        : null;
    },
    [`dashboard-weak-topic-${userId}`],
    { revalidate: 300, tags: [`dashboard-${userId}`] }
  )();
}

export function getCachedRecentAttempts(userId: string) {
  return unstable_cache(
    async () => {
      // Selective `select:` drops the heavy fields (options, explanation,
      // images) the dashboard never renders. Keeps egress to ~3-5KB per row
      // instead of ~2KB pre-trim + nested-include bloat.
      const recentAttempts = await prisma.attempt.findMany({
        where: { user_id: userId, mock_question_id: null },
        select: {
          id: true,
          is_correct: true,
          created_at: true,
          question_id: true,
          pyq_id: true,
          dpp_question_id: true,
          question: {
            select: {
              id: true,
              question_text: true,
              pattern: { select: { topic_name: true, subject: true, id: true, exam_type: true, branch: true } },
            },
          },
          pyq: {
            select: {
              id: true,
              question_text: true,
              pattern: { select: { topic_name: true, subject: true, id: true, exam_type: true, branch: true } },
            },
          },
          // DPP rows leave question_id AND pyq_id null, so without this relation
          // they render as "Unknown · Unknown" in Recent activity and as
          // text-less cards with a broken /practice?patternId=unknown link in
          // Critical review. The topic comes from the parent Dpp's Pattern.
          dpp_question: {
            select: {
              id: true,
              question_text: true,
              dpp: {
                select: {
                  id: true,
                  name: true,
                  pattern: { select: { topic_name: true, subject: true, id: true, exam_type: true, branch: true } },
                },
              },
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 20,
      });

      const latestRecentAttempts: any[] = [];
      const seenQ = new Set<string>();
      recentAttempts.forEach((a) => {
        // Falling back to the attempt id would make every DPP row distinct, so a
        // single 20-question sheet could fill the whole list.
        const qId = a.question_id ?? a.pyq_id ?? a.dpp_question_id ?? a.id;
        if (!seenQ.has(qId)) {
          latestRecentAttempts.push(a);
          seenQ.add(qId);
        }
      });

      return {
        lastFiveAttempts: latestRecentAttempts.slice(0, 5),
        recentFailures: latestRecentAttempts.filter((a) => !a.is_correct).slice(0, 10),
      };
    },
    [`dashboard-recent-attempts-${userId}`],
    { revalidate: 300, tags: [`dashboard-${userId}`] }
  )();
}
