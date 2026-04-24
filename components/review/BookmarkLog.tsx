"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import MathRenderer from "@/components/ui/MathRenderer";
import { BE } from "@/lib/theme";
import { format } from "date-fns";
import { Bookmark } from "lucide-react";

type BookmarkCard = {
  id: string;
  bookmarkId: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic_name: string;
  subject: string;
  patternId: string;
  ispyq?: boolean;
  year?: number;
  created_at: string;
  practiceUrl: string;
};

type PatternGroup = {
  patternId: string;
  topic_name: string;
  subject: string;
  count: number;
  lastSeen: string;
  cards: BookmarkCard[];
};

export default function BookmarkLog({ cards }: { cards: BookmarkCard[] }) {
  const [activeSubject, setActiveSubject] = useState("All");
  const [activeTab, setActiveTab] = useState<"patterns" | "log">("patterns");
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  // Group by subject for filter tags
  const subjectCounts = useMemo(() => {
    const map: Record<string, number> = {};
    cards.forEach(c => { map[c.subject] = (map[c.subject] || 0) + 1; });
    return map;
  }, [cards]);

  const filteredCards = useMemo(() =>
    activeSubject === "All" ? cards : cards.filter(c => c.subject === activeSubject),
    [cards, activeSubject]
  );

  // Group filtered cards into pattern groups
  const patternGroups = useMemo<PatternGroup[]>(() => {
    const map: Record<string, PatternGroup> = {};
    filteredCards.forEach(c => {
      if (!map[c.patternId]) {
        map[c.patternId] = {
          patternId: c.patternId,
          topic_name: c.topic_name,
          subject: c.subject,
          count: 0,
          lastSeen: c.created_at,
          cards: [],
        };
      }
      map[c.patternId].count++;
      map[c.patternId].cards.push(c);
      if (new Date(c.created_at) > new Date(map[c.patternId].lastSeen)) {
        map[c.patternId].lastSeen = c.created_at;
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredCards]);

  const totalBookmarks = filteredCards.length;

  if (cards.length === 0) {
    return (
      <div style={{
        border: `1px solid ${BE.line}`, borderRadius: 16, padding: '64px 32px',
        textAlign: 'center', background: BE.surface,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Bookmark size={48} stroke={BE.accent} strokeWidth={1.5} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: BE.text, marginBottom: 6, fontFamily: BE.serif }}>No bookmarks yet!</div>
        <div style={{ fontSize: 14, color: BE.textDim, marginBottom: 24 }}>
          Save challenging questions or interesting patterns to revisit them later.
        </div>
        <Link href="/practice" style={{
          display: 'inline-block', padding: '10px 24px', borderRadius: 10,
          background: BE.accent, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
        }}>
          Explore Questions →
        </Link>
      </div>
    );
  }

  const tags = [
    { label: "All", n: cards.length },
    ...Object.keys(subjectCounts).sort().map(s => ({ label: s, n: subjectCounts[s] })),
  ];

  return (
    <div>
      <style>{`
        @media (max-width: 639px) {
          .ml-h1 { font-size: 22px !important; letter-spacing: -0.3px !important; }
          .ml-desc { font-size: 13px !important; }
          .ml-tag { padding: 4px 8px 4px 10px !important; font-size: 11px !important; }
          .ml-row { padding: 12px !important; gap: 12px !important; }
          .ml-badge { width: 40px !important; height: 40px !important; }
          .ml-badge-val { font-size: 16px !important; }
          .ml-badge-lbl { font-size: 8px !important; }
          .ml-actions { flex-direction: column; align-items: stretch !important; gap: 6px !important; }
          .ml-fix-btn { padding: 5px 10px !important; font-size: 11px !important; text-align: center; }
          .ml-expanded-row { padding: 10px 12px 10px 12px !important; }
          .ml-log-row { flex-direction: column; gap: 8px !important; }
          .ml-log-date { width: auto !important; margin-bottom: -4px; }
          .ml-log-btn { align-self: flex-start; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
          Saved Items · Question Bank
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5, margin: 0, marginBottom: 6, fontFamily: BE.serif, color: BE.text }} className="ml-h1">
          Your personal collection.
        </h1>
        <div style={{ fontSize: 14, color: BE.textDim, maxWidth: 600, lineHeight: 1.6 }} className="ml-desc">
          Revisit the patterns and specific questions you&apos;ve bookmarked for focused review and mastery.
        </div>
      </div>

      {/* Subject Filter Tags */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {tags.map(t => {
          const active = t.label === activeSubject;
          return (
            <button
              key={t.label}
              onClick={() => setActiveSubject(t.label)}
              style={{
                padding: '5px 10px 5px 12px', borderRadius: 999,
                border: `1px solid ${active ? BE.accent : BE.line}`,
                background: active ? BE.accentSoft : 'transparent',
                color: active ? BE.accent : BE.textDim,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'all 0.15s',
              }}
              className="ml-tag"
            >
              {t.label}
              <span style={{ fontSize: 11, fontFamily: BE.mono, opacity: 0.75 }}>{t.n}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `1px solid ${BE.line}` }}>
        {[
          { id: 'patterns', label: 'By pattern' },
          { id: 'log', label: 'All bookmarks' },
        ].map(tab => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 600,
                color: active ? BE.accent : BE.textDim,
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: `2px solid ${active ? BE.accent : 'transparent'}`,
                marginBottom: -1, cursor: 'pointer', background: 'transparent',
                outline: 'none',
              }}
            >
              {tab.label}
              <span style={{ marginLeft: 8, fontSize: 11, fontFamily: BE.mono, color: active ? BE.accent : BE.textMute }}>
                {tab.id === 'patterns' ? patternGroups.length : totalBookmarks}
              </span>
            </button>
          );
        })}
      </div>

      {/* PATTERNS TAB */}
      {activeTab === 'patterns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {patternGroups.map((p, i) => {
            const isExpanded = expandedPattern === p.patternId;
            const daysAgo = Math.round((Date.now() - new Date(p.lastSeen).getTime()) / 86400000);
            const lastSeenLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1d ago' : `${daysAgo}d ago`;

            return (
              <div key={p.patternId} style={{
                border: `1px solid ${isExpanded ? BE.accent : BE.line}`, borderRadius: 12,
                background: BE.surface, overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}>
                <div
                  onClick={() => setExpandedPattern(isExpanded ? null : p.patternId)}
                  style={{
                    padding: '14px 16px', display: 'flex', gap: 16, alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  className="ml-row hover:bg-amber-50/10 transition-colors"
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(255,143,0,0.08)', color: BE.accent,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }} className="ml-badge">
                    <Bookmark size={20} fill={BE.accent} stroke="none" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>{p.topic_name}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                        background: BE.accentSoft, color: BE.accent, textTransform: 'uppercase', letterSpacing: 0.4,
                      }}>{p.subject}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: BE.textMute }}>
                      {p.count} saved question{p.count > 1 ? 's' : ''} · Last {lastSeenLabel}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }} className="ml-actions">
                    <Link
                      href={`/practice?patternId=${p.patternId}&subject=${encodeURIComponent(p.subject)}`}
                      onClick={e => e.stopPropagation()}
                      style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                        background: BE.accent, color: '#fff', textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                      className="ml-fix-btn"
                    >
                      Practice →
                    </Link>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${BE.line}`, background: 'rgba(0,0,0,0.12)' }}>
                    {p.cards.map((c, ci) => (
                      <div key={c.id} style={{
                        padding: '12px 16px 12px 80px',
                        borderBottom: ci < p.cards.length - 1 ? `1px solid ${BE.line}` : 'none',
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                      }} className="ml-expanded-row">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, color: BE.textDim, lineHeight: 1.5, fontFamily: BE.serif,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            <MathRenderer content={c.question_text} />
                          </div>
                          <div style={{ fontSize: 11, color: BE.textMute, marginTop: 4 }}>
                            Saved on {format(new Date(c.created_at), "MMM d, yyyy")}
                            {c.ispyq && c.year && <span style={{ marginLeft: 8, color: BE.warn }}>· PYQ {c.year}</span>}
                          </div>
                        </div>
                        <Link
                          href={c.practiceUrl}
                          style={{
                            padding: '5px 11px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                            border: `1px solid ${BE.line}`, color: BE.accent, textDecoration: 'none',
                            flexShrink: 0, whiteSpace: 'nowrap',
                          }}
                        >
                          View →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* LOG TAB */}
      {activeTab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredCards.map((c, i) => (
            <div key={c.id} style={{
              padding: '14px 0', borderBottom: `1px solid ${BE.line}`,
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }} className="ml-log-row">
              <div style={{ width: 56, flexShrink: 0 }} className="ml-log-date">
                <div style={{ fontSize: 11, color: BE.textMute, fontFamily: BE.mono }}>
                  {format(new Date(c.created_at), "MMM d")}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: BE.accentSoft, color: BE.accent, textTransform: 'uppercase', letterSpacing: 0.4,
                  }}>{c.subject}</span>
                  <span style={{ fontSize: 12, color: BE.textDim }}>{c.topic_name}</span>
                  {c.ispyq && c.year && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: BE.warn }}>PYQ {c.year}</span>
                  )}
                </div>
                <div style={{
                  fontSize: 13.5, color: BE.text, lineHeight: 1.55, fontFamily: BE.serif, marginBottom: 6,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                } as any}>
                  <MathRenderer content={c.question_text} />
                </div>
              </div>

              <Link
                href={c.practiceUrl}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${BE.line}`, color: BE.accent, textDecoration: 'none',
                  flexShrink: 0, whiteSpace: 'nowrap', background: 'transparent',
                }}
                className="ml-log-btn"
              >
                View
              </Link>
            </div>
          ))}
          {filteredCards.length === 0 && (
            <div style={{ padding: '48px 0', textAlign: 'center', color: BE.textMute, fontSize: 14 }}>
              No bookmarks in this subject yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
