// scripts/telegram/ping.ts
//
// Connectivity check — verifies TELEGRAM_BOT_TOKEN works (getMe) and, if
// TELEGRAM_CHAT_ID is set, sends one test message so you can confirm the bot
// can post into your group before wiring up the full daily flow.
//
// Usage: npx tsx --env-file=.env scripts/telegram/ping.ts

import { BOT_TOKEN, CHAT_ID, EXAM_TOPICS } from "./config";
import { sendMessage } from "./telegram";

async function main() {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set in .env");

  const me = (await (
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)
  ).json()) as { ok: boolean; result?: { username?: string }; description?: string };
  if (!me.ok) throw new Error(`Bad token: ${me.description}`);
  console.log(`✅ Token OK — bot is @${me.result?.username}`);

  if (!CHAT_ID) {
    console.log("ℹ️  TELEGRAM_CHAT_ID not set yet — run tg:discover to get it. Skipping test message.");
    return;
  }

  const thread = EXAM_TOPICS.find((t) => t.threadId)?.threadId;
  await sendMessage({
    chatId: CHAT_ID,
    threadId: thread,
    text: "✅ <b>BattleExam bot connected.</b> Daily questions will post here.",
  });
  console.log(`✅ Test message sent to chat ${CHAT_ID}${thread ? ` (topic ${thread})` : ""}. Check Telegram.`);
}

main().catch((e) => {
  console.error("❌", (e as Error).message);
  process.exit(1);
});
