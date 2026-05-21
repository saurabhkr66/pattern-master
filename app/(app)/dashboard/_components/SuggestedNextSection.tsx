import Link from "next/link";
import { BE } from "@/lib/theme";
import { getCachedWeakTopic } from "../_lib/queries";

export default async function SuggestedNextSection({ userId }: { userId: string }) {
  const weakestTopic = await getCachedWeakTopic(userId);

  if (!weakestTopic) {
    return (
      <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 24, marginBottom: 24, background: `linear-gradient(135deg, ${BE.goodSoft}, transparent)` }}>
        <div style={{ fontSize: 11, color: BE.good, letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
          Everything looks great
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: BE.text }}>No critical gaps identified yet. Keep practicing!</div>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 24, marginBottom: 24, background: `linear-gradient(135deg, ${BE.accentSoft}, transparent)`, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: BE.accent, letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
            Suggested next
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3, marginBottom: 6, color: BE.text }}>
            Fix your {weakestTopic.name} gap
          </div>
          <div style={{ fontSize: 13.5, color: BE.textDim, lineHeight: 1.55, maxWidth: 540 }}>
            You&apos;ve missed <span style={{ color: BE.text, fontWeight: 500 }}>{weakestTopic.count} questions</span> on this topic over the last 2 weeks. A quick focused set will help you master it.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Link href={`/practice?patternId=${weakestTopic.id}&subject=${encodeURIComponent(weakestTopic.subject)}`} className="px-5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold transition-all hover:bg-amber-600 no-underline">
              Start focused set →
            </Link>
          </div>
        </div>
        <div className="hidden sm:flex" style={{ width: 96, height: 96, borderRadius: 12, border: `1px solid ${BE.line}`, background: BE.surface, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.06, textTransform: "uppercase", fontWeight: 600 }}>Gap</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: BE.bad, letterSpacing: -0.6, fontFamily: BE.mono }}>{weakestTopic.count}</div>
          <div style={{ fontSize: 10, color: BE.textMute }}>since last wk</div>
        </div>
      </div>
    </div>
  );
}
