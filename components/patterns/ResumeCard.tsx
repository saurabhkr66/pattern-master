"use client";
import { useQuery } from "@tanstack/react-query";
import { BE } from "@/lib/theme";

interface Session {
  patternId: string;
  topicName: string;
  subject: string;
  questions: number;
  accuracy: number;
  lastAt: string;
}

function fetchLastSession(): Promise<{ session: Session | null }> {
  return fetch("/api/practice/last-session").then((r) => r.json());
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ResumeCard({
  onResume,
}: {
  onResume: (patternId: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["lastSession"],
    queryFn: fetchLastSession,
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${BE.line}`,
          padding: "16px 20px",
          background: BE.surface,
          opacity: 0.5,
          height: "100%",
          width: "100%",
        }}
      >
        <div style={{ fontSize: 10, color: BE.accent, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Resume Practice
        </div>
        <div style={{ fontSize: 13, color: BE.textDim, marginTop: 8 }}>Loading last session…</div>
      </div>
    );
  }

  const session = data?.session;
  if (!session) return null;

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1.5px solid ${BE.lineHi}`,
        padding: "16px 20px",
        background: `linear-gradient(135deg, ${BE.accentSoft}, transparent)`,
        transition: "all 0.2s",
        // marginTop: "32px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
      className="active:scale-[0.98] cursor-pointer"
    >
      <div style={{ flex: 1 }}>
        {/* Label */}
        <div style={{ fontSize: 10, color: BE.accent, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Resume Practice
        </div>

        {/* Topic */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: BE.text }}>
            {session.topicName}
          </div>
          <div style={{ fontSize: 11, color: BE.textMute, fontWeight: 600 }}>
            · {session.subject}
          </div>
        </div>

        {/* Meta */}
        <div style={{ fontSize: 12, color: BE.textDim, marginBottom: 20 }}>
          {session.questions > 0
            ? `Last session: ${session.questions} questions · ${session.accuracy}% accuracy`
            : "No questions attempted yet"}
          {" · "}
          <span style={{ color: BE.textMute }}>{timeAgo(session.lastAt)}</span>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => onResume(session.patternId)}
        className="w-full py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95"
        style={{
          background: BE.accent,
          color: "#fff",
          boxShadow: "0 8px 20px -6px rgba(245, 158, 11, 0.4)",
        }}
      >
        Continue Solving →
      </button>
    </div>
  );
}
