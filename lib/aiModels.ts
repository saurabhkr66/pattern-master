/**
 * Single source of truth for the admin AI model picker.
 *
 * This lives OUTSIDE app/actions/admin.ts on purpose: that file is `"use server"`,
 * so it can only export async functions — a client component can't import a constant
 * from it. The picker's labels therefore used to be hand-written strings ("Gemini
 * Flash (API key)") that said nothing about which model actually ran, and drifted
 * every time the constant moved a generation. Labels are now derived from the same
 * ids the dispatcher uses, so they cannot disagree.
 */

// --- AI Studio (billed to GEMINI_API_KEY, free tier available) ------------------
export const GEMINI_MODEL = "gemini-3.5-flash-lite";
// Flash-lite doesn't support the googleSearch tool; full Flash does, so grounded
// calls swap to this one.
export const GEMINI_SEARCH_MODEL = "gemini-3.5-flash";
// Topic classification is a much simpler task than review — kept on the cheaper
// older lite model deliberately.
export const GEMINI_TOPIC_MODEL = "gemini-3.1-flash-lite";

export type AIModel =
  | "gemini"
  | "gpt-5.6-luna"
  | "deepseek-v4-flash"
  | "glm-5.2";

/** Picker entries, in menu order. `label` names the MODEL, `hint` names who pays. */
export const AI_MODEL_OPTIONS: { id: AIModel; label: string; hint: string }[] = [
  { id: "gemini", label: GEMINI_MODEL, hint: "API key" },
  { id: "gpt-5.6-luna", label: "gpt-5.6-luna", hint: "OpenAI key" },
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", hint: "Modal" },
  { id: "glm-5.2", label: "GLM 5.2", hint: "OpenRouter (free)" },
];
