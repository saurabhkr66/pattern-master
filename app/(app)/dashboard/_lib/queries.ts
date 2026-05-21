import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { startOfDay, subMonths } from "date-fns";

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
        prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT DATE(created_at) as date, COUNT(*)::bigint as count
          FROM "Attempt"
          WHERE user_id = ${userId} AND created_at >= ${sixMonthsAgo}
          GROUP BY DATE(created_at)
          ORDER BY date
        `,
        prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint as count FROM (
            SELECT is_correct,
                   ROW_NUMBER() OVER (
                     PARTITION BY COALESCE(question_id, pyq_id, subject_pyq_id)
                     ORDER BY created_at DESC
                   ) as rn
            FROM "Attempt"
            WHERE user_id = ${userId}
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
        const dateStr = typeof row.date === "string" ? row.date : new Date(row.date).toISOString().split("T")[0];
        activityData[dateStr] = Number(row.count);
      });

      let currentStreak = 0;
      const today = startOfDay(new Date());
      const checkDate = new Date(today);
      const toISO = (d: Date) => d.toISOString().split("T")[0];
      if (!activityData[toISO(checkDate)]) checkDate.setDate(checkDate.getDate() - 1);
      while (activityData[toISO(checkDate)]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      return { totalAttempted, correctAttempts, currentMistakesCount, activityData, currentStreak };
    },
    [`dashboard-stats-activity-${userId}`],
    { revalidate: 30, tags: [`dashboard-${userId}`, `mistakes-${userId}`] }
  )();
}

export function getCachedWeakTopic(userId: string) {
  return unstable_cache(
    async () => {
      const topicStats = await prisma.$queryRaw<{ pattern_id: string; topic_name: string; subject: string; count: bigint }[]>`
        SELECT
          t.pattern_id,
          COALESCE(pat.topic_name, sp_pat.subject_name, 'Unknown Topic') as topic_name,
          COALESCE(pat.subject, sp_pat.subject_name, 'General') as subject,
          t.count
        FROM (
          SELECT
            COALESCE(q.pattern_id, p.pattern_id, 'subject-' || sp.subject_pattern_id) as pattern_id,
            COUNT(*)::bigint as count
          FROM (
            SELECT question_id, pyq_id, subject_pyq_id, is_correct,
                   ROW_NUMBER() OVER (
                     PARTITION BY COALESCE(question_id, pyq_id, subject_pyq_id)
                     ORDER BY created_at DESC
                   ) as rn
            FROM "Attempt"
            WHERE user_id = ${userId}
          ) latest
          LEFT JOIN "GeneratedQuestion" q ON q.id = latest.question_id
          LEFT JOIN "PYQ" p ON p.id = latest.pyq_id
          LEFT JOIN "SubjectPYQ" sp ON sp.id = latest.subject_pyq_id
          WHERE latest.rn = 1 AND latest.is_correct = false
          GROUP BY 1
        ) t
        LEFT JOIN "Pattern" pat ON pat.id = t.pattern_id
        LEFT JOIN "SubjectPattern" sp_pat ON ('subject-' || sp_pat.id) = t.pattern_id
        WHERE t.pattern_id IS NOT NULL
          AND (pat.id IS NOT NULL OR sp_pat.id IS NOT NULL)
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
    { revalidate: 30, tags: [`dashboard-${userId}`] }
  )();
}

export function getCachedRecentAttempts(userId: string) {
  return unstable_cache(
    async () => {
      // Selective `select:` drops the heavy fields (options, explanation,
      // images) the dashboard never renders. Keeps egress to ~3-5KB per row
      // instead of ~2KB pre-trim + nested-include bloat.
      const recentAttempts = await prisma.attempt.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          is_correct: true,
          created_at: true,
          question_id: true,
          pyq_id: true,
          subject_pyq_id: true,
          question: {
            select: {
              id: true,
              question_text: true,
              pattern: { select: { topic_name: true, subject: true, id: true, exam_type: true } },
            },
          },
          pyq: {
            select: {
              id: true,
              question_text: true,
              pattern: { select: { topic_name: true, subject: true, id: true, exam_type: true } },
            },
          },
          subject_pyq: {
            select: {
              id: true,
              question_text: true,
              topic: true,
              subject_pattern: { select: { subject_name: true, id: true } },
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 20,
      });

      const latestRecentAttempts: any[] = [];
      const seenQ = new Set<string>();
      recentAttempts.forEach((a) => {
        const qId = a.question_id ?? a.pyq_id ?? a.subject_pyq_id ?? a.id;
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
    { revalidate: 30, tags: [`dashboard-${userId}`] }
  )();
}
