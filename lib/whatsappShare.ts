// WhatsApp share helpers for coaching admins: plain wa.me deep links with
// pre-formatted text. Imported by client components — keep this module pure
// and free of any "server-only" dependency chain.

// Digits-only phone (how coaching students are stored) → wa.me-ready number.
// Returns null when the number can't be a valid Indian mobile — callers must
// degrade (disable the button) rather than open a chat with a wrong number.
export function normalizeIndianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  return null;
}

export function buildWaUrl(text: string, phone?: string | null): string {
  return `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
}

// wa.me routes to the WhatsApp app on mobile and WhatsApp Web/desktop app on
// desktop. Must be called from a user gesture (onClick) or popup blockers eat it.
export function openWhatsApp(text: string, phone?: string | null): void {
  window.open(buildWaUrl(text, phone), "_blank", "noopener,noreferrer");
}

// Built at click time on the admin's device, so the local timezone is the
// admin's — which is what their students share.
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function buildTestInviteMessage(o: {
  testTitle: string;
  coachingName: string;
  durationMins: number;
  totalMarks: number | null; // null for pooled tests (per-student subset)
  questionCount: number;
  startAt: string | null; // ISO
  endAt: string | null; // ISO
  testUrl: string;
  joinCode: string;
  joinUrl: string;
}): string {
  const lines = [
    `📝 *${o.testTitle}*`,
    `🏫 ${o.coachingName}`,
    "",
    `⏱️ Duration: ${o.durationMins} min`,
    o.totalMarks != null ? `📊 Total Marks: ${o.totalMarks}` : `❓ Questions: ${o.questionCount}`,
  ];
  if (o.startAt && new Date(o.startAt).getTime() > Date.now()) {
    lines.push(`🗓️ Starts: ${fmtDate(o.startAt)}`);
  }
  if (o.endAt) lines.push(`🗓️ Last date: ${fmtDate(o.endAt)}`);
  lines.push(
    "",
    "👉 Start the test here:",
    o.testUrl,
    "",
    `📌 New student? Join ${o.coachingName} first —`,
    `Join Code: *${o.joinCode}*`,
    o.joinUrl
  );
  return lines.join("\n");
}

export function buildResultMessage(o: {
  studentName: string;
  testTitle: string;
  coachingName: string;
  score: number;
  maxScore: number;
  rank: number;
  totalStudents: number;
  timeTakenSecs: number | null;
}): string {
  const scoreLine =
    o.maxScore > 0
      ? `📊 Score: *${o.score} / ${o.maxScore}* (${((o.score / o.maxScore) * 100).toFixed(1)}%)`
      : `📊 Score: *${o.score}*`;
  const lines = [
    `🎉 Hi ${o.studentName}!`,
    "",
    `Your result for *${o.testTitle}* is out 📢`,
    `🏫 ${o.coachingName}`,
    "",
    scoreLine,
    `🏆 Rank: *#${o.rank}* out of ${o.totalStudents} students`,
  ];
  if (o.timeTakenSecs != null) lines.push(`⏱️ Time taken: ${fmtDuration(o.timeTakenSecs)}`);
  lines.push("", "Keep practicing! 💪");
  return lines.join("\n");
}

const RANK_LIST_CAP = 10;
const MEDALS = ["🥇", "🥈", "🥉"];

export function buildRankListMessage(o: {
  testTitle: string;
  coachingName: string;
  entries: { rank: number; name: string; score: number }[];
  totalAppeared: number;
  avgScore: number;
  maxScore: number;
}): string {
  const top = o.entries.slice(0, RANK_LIST_CAP);
  const suffix = o.maxScore > 0 ? `/${o.maxScore}` : "";
  const lines = [`🏆 *${o.testTitle} — Top Rankers*`, `🏫 ${o.coachingName}`, ""];
  for (const e of top) {
    const prefix = e.rank <= 3 ? MEDALS[e.rank - 1] : `${e.rank}.`;
    lines.push(`${prefix} ${e.name} — ${e.score}${suffix}`);
  }
  if (o.totalAppeared > top.length) {
    lines.push(`…and ${o.totalAppeared - top.length} more students`);
  }
  lines.push(
    "",
    `👥 Students appeared: ${o.totalAppeared}`,
    `📈 Average score: ${o.avgScore.toFixed(1)}${suffix}`
  );
  return lines.join("\n");
}
