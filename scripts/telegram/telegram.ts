// scripts/telegram/telegram.ts
//
// Thin wrapper over the Telegram Bot API. No SDK — just fetch + the two or
// three methods the poster needs. Every send targets a Topic thread via
// message_thread_id.

import { BOT_TOKEN } from "./config";

const API = () => `https://api.telegram.org/bot${BOT_TOKEN}`;

async function call<T = unknown>(
  method: string,
  body: FormData | Record<string, unknown>,
): Promise<T> {
  const init: RequestInit =
    body instanceof FormData
      ? { method: "POST", body }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        };
  const res = await fetch(`${API()}/${method}`, init);
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) {
    throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
  }
  return json.result as T;
}

/** Post the rendered question card image into a Topic thread. */
export async function sendPhoto(opts: {
  chatId: string;
  threadId?: number;
  png: Buffer;
  caption?: string;
}): Promise<void> {
  const form = new FormData();
  form.append("chat_id", opts.chatId);
  if (opts.threadId) form.append("message_thread_id", String(opts.threadId));
  if (opts.caption) {
    form.append("caption", opts.caption);
    form.append("parse_mode", "HTML");
  }
  form.append(
    "photo",
    new Blob([new Uint8Array(opts.png)], { type: "image/png" }),
    "question.png",
  );
  await call("sendPhoto", form);
}

/** Post a native quiz poll (options are just the letters; the image holds the text). */
export async function sendQuizPoll(opts: {
  chatId: string;
  threadId?: number;
  question: string;
  options: string[];
  correctOptionId: number;
  explanation?: string;
}): Promise<void> {
  await call("sendPoll", {
    chat_id: opts.chatId,
    ...(opts.threadId ? { message_thread_id: opts.threadId } : {}),
    question: opts.question.slice(0, 300),
    options: opts.options,
    type: "quiz",
    correct_option_id: opts.correctOptionId,
    is_anonymous: true,
    ...(opts.explanation ? { explanation: opts.explanation.slice(0, 200) } : {}),
  });
}

/** Post a plain text message (used for the "full solution → site" CTA). */
export async function sendMessage(opts: {
  chatId: string;
  threadId?: number;
  text: string;
  disablePreview?: boolean;
}): Promise<void> {
  await call("sendMessage", {
    chat_id: opts.chatId,
    ...(opts.threadId ? { message_thread_id: opts.threadId } : {}),
    text: opts.text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: !!opts.disablePreview },
  });
}

/** Raw getUpdates — used by discover.ts to find chat + topic ids. */
export async function getUpdates(): Promise<unknown[]> {
  return call<unknown[]>("getUpdates", { timeout: 0 });
}
