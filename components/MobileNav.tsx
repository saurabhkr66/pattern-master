"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BE } from "@/lib/theme";

export default function MobileNav() {
  const pathname = usePathname();

  if (pathname === "/test") return null;

  const tabs = [
    { id: 'Practice', href: '/practice', icon: 'book' },
    { id: 'Mock', href: '/test', icon: 'timer', disabled: true },
    { id: 'Stats', href: '/dashboard', icon: 'chart' },
    { id: 'Review', href: '/review', icon: 'flip' },
    { id: 'Mistakes', href: '/mistakes', icon: 'user' },
    { id: 'Saved', href: '/bookmarks', icon: 'bookmark' },
  ];

  const ic = (k: string, c: string) => {
    const p = { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none', stroke: c, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    if (k === 'book') return <svg {...p}><path d="M4 4h6a3 3 0 013 3v11a2 2 0 00-2-2H4zM18 4h-6a3 3 0 00-3 3v11a2 2 0 012-2h7z"/></svg>;
    if (k === 'timer')return <svg {...p}><circle cx="11" cy="12" r="7"/><path d="M11 8v4l2.5 2M9 3h4"/></svg>;
    if (k === 'chart')return <svg {...p}><path d="M4 17V9M10 17V5M16 17v-5"/><path d="M3 19h17"/></svg>;
    if (k === 'flip') return <svg {...p}><rect x="3" y="5" width="16" height="12" rx="2"/><path d="M7 9h8M7 13h5"/></svg>;
    if (k === 'user') return <svg {...p}><circle cx="11" cy="8" r="3.5"/><path d="M4.5 19c1.5-3 4-4.5 6.5-4.5s5 1.5 6.5 4.5"/></svg>;
    if (k === 'bookmark') return <svg {...p}><path d="M16 3H6a2 2 0 00-2 2v14l7-4.5 7 4.5V5a2 2 0 00-2-2z"/></svg>;
    return null;
  };

  return (
    <div
      className="mobile-nav-bar md:hidden fixed bottom-0 left-0 right-0 z-[100] border-t backdrop-blur-lg"
      style={{ 
        background: 'rgba(var(--bg-base-rgb), 0.8)', 
        borderColor: BE.line,
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
        paddingTop: '8px'
      }}
    >
      <div className="flex justify-around items-center px-2">
        {tabs.map(t => {
          const isActive = pathname === t.href;
          const content = (
            <>
              {ic(t.icon, isActive ? BE.accent : BE.textMute)}
              <span 
                style={{ 
                  fontSize: '9px', 
                  fontWeight: 700, 
                  color: isActive ? BE.accent : BE.textMute, 
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase'
                }}
              >
                {t.id}
              </span>
            </>
          );

          if (t.disabled) {
            return (
              <div 
                key={t.id} 
                className="flex flex-col items-center gap-1 min-w-[64px] opacity-30 cursor-not-allowed"
              >
                {content}
              </div>
            );
          }

          return (
            <Link 
              key={t.id} 
              href={t.href}
              className="flex flex-col items-center gap-1 min-w-[64px] transition-transform active:scale-90"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
