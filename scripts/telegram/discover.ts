// scripts/telegram/discover.ts
//
// Setup helper: prints the chat_id of your supergroup and the message_thread_id
// of each Topic, so you can fill them into config.ts.
//
// How to use:
//   1. Add your bot to the supergroup as an admin.
//   2. In EACH exam Topic, send any message that mentions the bot, e.g.
//        @YourBotName hello
//      (mentioning it makes Telegram deliver the message to getUpdates).
//   3. Run: npx tsx --env-file=.env scripts/telegram/discover.ts

import { getUpdates } from "./telegram";
import { assertConfigured } from "./config";

interface Msg {
  message?: {
    chat?: { id: number; title?: string; type?: string };
    message_thread_id?: number;
    is_topic_message?: boolean;
    text?: string;
    reply_to_message?: { forum_topic_created?: { name?: string } };
  };
}

async function main() {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set in .env");

  const updates = (await getUpdates()) as Msg[];
  if (updates.length === 0) {
    console.log(
      "No updates. Add the bot to the group, send a message mentioning it in each Topic, then rerun.\n" +
        "(Note: getUpdates only returns the last ~24h of messages.)",
    );
    return;
  }

  const seen = new Map<string, { chatId: number; title: string; threadId: number; topic: string }>();
  for (const u of updates) {
    const m = u.message;
    if (!m?.chat) continue;
    const threadId = m.message_thread_id ?? 0;
    const key = `${m.chat.id}:${threadId}`;
    seen.set(key, {
      chatId: m.chat.id,
      title: m.chat.title ?? "(dm)",
      threadId,
      topic: m.reply_to_message?.forum_topic_created?.name ?? (threadId ? `thread ${threadId}` : "General"),
    });
  }

  console.log("\nChats / Topics the bot has seen:\n");
  for (const v of seen.values()) {
    console.log(
      `  group "${v.title}"  →  TELEGRAM_CHAT_ID = ${v.chatId}\n` +
        `     Topic "${v.topic}"  →  threadId = ${v.threadId}\n`,
    );
  }
  console.log("Paste CHAT_ID into .env and each threadId into scripts/telegram/config.ts.");
  try {
    assertConfigured();
  } catch {
    /* config not filled yet — that's expected on first run */
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
