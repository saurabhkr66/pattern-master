"use client";

// components/dashboard/ShareCardButton.tsx
// Handles downloading the card + sharing to Twitter/X and WhatsApp.

import { useState } from "react";
import { Share2, Download, X, Link2, Check } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface ShareCardButtonProps {
  userId: string;
}

export default function ShareCardButton({ userId }: ShareCardButtonProps) {
  const [open,      setOpen]      = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [examLabel, setExamLabel] = useState<string | null>(null);

  const origin  = typeof window !== "undefined" ? window.location.origin : "https://battleexam.com";
  const cardUrl = `${origin}/share/${userId}`;
  const pageUrl = cardUrl;
  const label     = examLabel ?? "GATE CSE";
  const shareText = `Tracking my ${label} prep on BattleExam — pattern-based AI practice. Check it out!`;

  async function handleOpen() {
    setOpen((v) => !v);
    if (!examLabel) {
      try {
        const res  = await fetch(`/api/share-card/meta?userId=${userId}`);
        const data = await res.json();
        setExamLabel(data.examLabel);
      } catch {
        // keep default
      }
    }
  }

  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${pageUrl}`)}`;

  async function handleDownload() {
    setLoading(true);
    try {
      const res   = await fetch(`/api/share-card?userId=${userId}`);
      const blob  = await res.blob();
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      a.href      = url;
      a.download  = "battleexam-progress.png";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-colors"
        style={{
          background:   "var(--bg-surface)",
          borderColor:  "var(--border)",
          color:        "var(--text-secondary)",
        }}
      >
        <Share2 size={14} />
        Share Progress
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />

          <div
            className="absolute right-0 top-full mt-2 z-20 rounded-2xl border shadow-2xl overflow-hidden"
            style={{
              background:  "var(--bg-surface)",
              borderColor: "var(--border)",
              width:       260,
            }}
          >
            {/* Card preview thumbnail */}
            <div
              className="border-b px-4 py-3 text-center"
              style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Your Progress Card
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/share-card?userId=${userId}`}
                alt="Your BattleExam progress card"
                className="w-full rounded-lg border"
                style={{ borderColor: "var(--border)", aspectRatio: "1200/630", objectFit: "cover" }}
              />
            </div>

            {/* Actions */}
            <div className="p-3 space-y-1.5">
              {/* Download PNG */}
              <button
                onClick={handleDownload}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-60"
                style={{ color: "var(--text-secondary)" }}
              >
                <Download size={15} className="shrink-0" />
                {loading ? "Downloading…" : "Download PNG"}
              </button>

              {/* Copy card link */}
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: "var(--text-secondary)" }}
              >
                {copied ? (
                  <Check size={15} className="shrink-0 text-emerald-500" />
                ) : (
                  <Link2 size={15} className="shrink-0" />
                )}
                {copied ? "Link copied!" : "Copy card link"}
              </button>

              {/* Divider */}
              <div
                className="my-2 h-px"
                style={{ background: "var(--border)" }}
              />

              {/* Share on Twitter/X */}
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={15} className="shrink-0" />
                Share on Twitter / X
              </a>

              {/* Share on WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: "var(--text-secondary)" }}
              >
                <WhatsAppIcon size={15} className="shrink-0" />
                Share on WhatsApp
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
