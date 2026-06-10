"use client";

import { MessageCircle } from "lucide-react";
import {
  buildRankListMessage,
  buildResultMessage,
  normalizeIndianPhone,
  openWhatsApp,
} from "@/lib/whatsappShare";

// One-click WhatsApp share of a student's personal result, sent directly to
// their stored phone. Disabled (never falls back to a phoneless chat — a
// personal score must not land in the wrong chat) when the phone is invalid.
export function ShareResultButton(props: {
  studentName: string;
  phone: string;
  testTitle: string;
  coachingName: string;
  score: number;
  maxScore: number;
  rank: number;
  totalStudents: number;
  timeTakenSecs: number | null;
}) {
  const waPhone = normalizeIndianPhone(props.phone);
  if (!waPhone) {
    return (
      <span title="Invalid phone number" className="inline-block cursor-not-allowed p-1.5 opacity-40">
        <MessageCircle className="h-4 w-4 text-slate-400" />
      </span>
    );
  }
  return (
    <button
      onClick={() => openWhatsApp(buildResultMessage(props), waPhone)}
      title="Share result on WhatsApp"
      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-green-400"
    >
      <MessageCircle className="h-4 w-4" />
    </button>
  );
}

// One-click WhatsApp share of the test's rank list as formatted text (no link —
// the student leaderboard page requires login, so text works in any group).
export function ShareRankListButton(props: {
  testTitle: string;
  coachingName: string;
  entries: { rank: number; name: string; score: number }[];
  totalAppeared: number;
  avgScore: number;
  maxScore: number;
}) {
  return (
    <button
      onClick={() => openWhatsApp(buildRankListMessage(props))}
      className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
    >
      <MessageCircle className="h-4 w-4" /> Share Rank List
    </button>
  );
}
