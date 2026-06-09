"use client";

import { useEffect, useState } from "react";

/**
 * Boot splash shown once per app launch.
 *
 * Shows the app header's shield/sword crest next to the "BattleExam" wordmark,
 * with the whole lockup blinking/pulsing while the app loads. Holds for a
 * minimum so the blink reads, then fades out on window load.
 */
const REVEAL_MS = 1100;
const MIN_VISIBLE_MS = REVEAL_MS + 300;
const FADE_MS = 500;

export default function BootSplash() {
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const start = performance.now();

    const dismiss = () => {
      const elapsed = performance.now() - start;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      setTimeout(() => {
        setHidden(true);
        setTimeout(() => setRemoved(true), FADE_MS);
      }, wait);
    };

    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", dismiss, { once: true });
      // Fallback in case `load` never fires (e.g. cached SW serve).
      const t = setTimeout(dismiss, MIN_VISIBLE_MS + 600);
      return () => {
        window.removeEventListener("load", dismiss);
        clearTimeout(t);
      };
    }
  }, []);

  if (removed) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{
        backgroundColor: "var(--bg-base)",
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,600;1,800&display=swap');

        .bx-lockup {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 24px;
          max-width: 100vw;
          transform-origin: center;
          /* Continuous blink/pulse of the whole lockup (icon + wordmark). */
          animation: bx-blink 1.1s ease-in-out infinite;
        }
        .bx-crest {
          flex: 0 0 auto;
          width: 58px;
          height: 72px;
        }
        .bx-word {
          white-space: nowrap;
        }
        .bx-title {
          font-family: 'Poppins', var(--font-geist-sans), system-ui, sans-serif;
          font-weight: 800;
          font-style: italic;
          font-size: clamp(34px, 11vw, 60px);
          line-height: 1;
          color: var(--text-primary);
          margin: 0;
        }
        .bx-title .bx-exam { color: #FF8F00; font-weight: 600; }
        .bx-tagline {
          font-family: 'Poppins', var(--font-geist-sans), system-ui, sans-serif;
          font-weight: 600;
          font-style: italic;
          font-size: clamp(9px, 2.6vw, 13px);
          letter-spacing: 2px;
          color: var(--text-secondary);
          margin-top: 8px;
        }

        @keyframes bx-blink {
          0%, 100% { opacity: 1;   transform: scale(1);    }
          50%      { opacity: .25; transform: scale(.9);   }
        }

        @media (prefers-reduced-motion: reduce) {
          .bx-lockup { animation: none; }
        }
      `}</style>

      <div className="bx-lockup">
        {/* Same shield/sword crest used in the app header. */}
        <svg className="bx-crest" viewBox="0 0 100 125" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g transform="translate(0, 2)">
            <path d="M 50 2 C 22 8 8 25 8 45 L 8 75 C 8 98 30 112 50 120 L 50 2 Z" fill="var(--text-primary)" />
            <path d="M 50 2 C 78 8 92 25 92 45 L 92 75 C 92 98 70 112 50 120" fill="none" stroke="#FF8F00" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 50 12 L 38 48 L 45 66 L 32 66 L 32 72 L 44 72 L 44 94 L 36 102 L 50 108 Z" fill="var(--bg-surface)" />
            <path d="M 50 12 L 62 48 L 55 66 L 68 66 L 68 72 L 56 72 L 56 94 L 64 102 L 50 108 Z" fill="var(--text-primary)" />
            <path d="M 50 40 A 4 4 0 0 0 50 48 Z" fill="var(--text-primary)" />
            <rect x="49" y="22" width="1" height="18" fill="var(--text-primary)" />
            <path d="M 50 40 A 4 4 0 0 1 50 48 Z" fill="var(--bg-surface)" />
            <rect x="50" y="22" width="1" height="18" fill="var(--bg-surface)" />
          </g>
        </svg>
        <div className="bx-word">
          <p className="bx-title">
            Battle<span className="bx-exam">Exam</span>
          </p>
          <p className="bx-tagline">PRACTICE TODAY, ACE TOMORROW</p>
        </div>
      </div>
    </div>
  );
}
