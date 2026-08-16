"use client";

import { useState } from "react";
import { BE } from "@/lib/theme";
import { openWhatsApp } from "@/lib/whatsappShare";

// The loop's call to action, shown to the run's owner on their result screen.
//
// `?via=` tags the channel so the CHILD run records how it arrived
// (source_channel), which is what makes the loop measurable without a second
// table.
//
// Copy is written to survive being posted to a class WhatsApp GROUP (the
// dominant real-world share target), not just a 1:1 DM — "beat me" reads oddly
// to 40 people, "beat that" / "none of you" doesn't. A losing score gets its
// own framing rather than being silently unshareable: "this destroyed me" is
// arguably MORE shareable among students than a brag.

export default function ShareChallenge({
  runCode,
  dppName,
  topicName,
  score,
  maxScore,
}: {
  runCode: string;
  dppName: string;
  topicName: string;
  score: number;
  maxScore: number;
}) {
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const link = (via: string) => `${base}/dpp/r/${runCode}?via=${via}`;

  const won = maxScore > 0 && score / maxScore >= 0.5;
  const pitch = won
    ? `🔥 I scored ${score}/${maxScore} on ${dppName} (${topicName}) on BattleExam. Anyone beat that?`
    : `😅 ${dppName} (${topicName}) destroyed me — ${score}/${maxScore}. Bet none of you can do better.`;

  // Advisory only: a failed call just leaves shared_at null, so it's fired and
  // forgotten rather than blocking the share action on it.
  function markShared() {
    fetch(`/api/dpp/share/${runCode}`, { method: "POST" }).catch(() => {});
  }

  async function nativeShare() {
    markShared();
    try {
      await navigator.share({ title: dppName, text: pitch, url: link("share") });
    } catch {
      // User dismissed the OS sheet, or it's unsupported after all — non-fatal.
    }
  }

  function whatsapp() {
    markShared();
    openWhatsApp(`${pitch}\n\n${link("wa")}`);
  }

  async function copy() {
    markShared();
    try {
      await navigator.clipboard.writeText(link("copy"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context, permissions). Non-fatal —
      // WhatsApp remains available.
    }
  }

  return (
    <div
      style={{
        background: BE.surface,
        border: `1px solid ${BE.accent}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: BE.text }}>Challenge your class</div>
      <div style={{ fontSize: 12.5, color: BE.textDim, marginTop: 3, marginBottom: 12 }}>
        Post it to a group — everyone who beats you gets a rematch link back to you.
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canNativeShare && (
          <button
            onClick={nativeShare}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: BE.accent,
              color: "#1a1205",
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            Share
          </button>
        )}
        <button
          onClick={whatsapp}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: canNativeShare ? `1px solid ${BE.line}` : "none",
            background: canNativeShare ? "transparent" : BE.accent,
            color: canNativeShare ? BE.text : "#1a1205",
            fontWeight: canNativeShare ? 600 : 700,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          WhatsApp
        </button>
        <button
          onClick={copy}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: `1px solid ${BE.line}`,
            background: "transparent",
            color: copied ? BE.good : BE.text,
            fontWeight: 600,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
