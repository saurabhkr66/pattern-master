"use client"
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Show,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import {
  LayoutDashboard,
  BookOpen,
  RotateCcw,
  XCircle,
  Menu,
  X,
  Sun,
  Moon,
  ClipboardList,
  Bookmark,
  Trash2,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import GlobalSearch from "./search/GlobalSearch";
import { useLanguage } from "./providers/LanguageProvider";

const navLinks = [
  { href: "/practice", label: "Practice", icon: BookOpen, prefetch: false },
  { href: "/test", label: "Mock Test", icon: ClipboardList, disabled: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, prefetch: false },
  { href: "/review", label: "Review", icon: RotateCcw, prefetch: false },
  { href: "/mistakes", label: "Mistakes", icon: XCircle, prefetch: false },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark, prefetch: false },
];


export default function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, toggle } = useTheme();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname === "/test") return null;

  return (
    <header
      className="sticky top-0 z-50 w-full border-b backdrop-blur-md"
      style={{ background: "var(--header-bg)", borderColor: "var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between gap-6 relative">

        {/* Logo */}
        <Link
          href="/"
          prefetch={true}
          className="flex items-center gap-2 text-lg"
          style={{ color: "var(--text-primary)" }}
        >
          <svg width="28" height="35" viewBox="0 0 100 125" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g transform="translate(0, 2)">
              <path d="M 50 2 C 22 8 8 25 8 45 L 8 75 C 8 98 30 112 50 120 L 50 2 Z" fill="var(--text-primary)"/>
              <path d="M 50 2 C 78 8 92 25 92 45 L 92 75 C 92 98 70 112 50 120" fill="none" stroke="#FF8F00" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M 50 12 L 38 48 L 45 66 L 32 66 L 32 72 L 44 72 L 44 94 L 36 102 L 50 108 Z" fill="var(--bg-surface)"/>
              <path d="M 50 12 L 62 48 L 55 66 L 68 66 L 68 72 L 56 72 L 56 94 L 64 102 L 50 108 Z" fill="var(--text-primary)"/>
              <path d="M 50 40 A 4 4 0 0 0 50 48 Z" fill="var(--text-primary)"/>
              <rect x="49" y="22" width="1" height="18" fill="var(--text-primary)"/>
              <path d="M 50 40 A 4 4 0 0 1 50 48 Z" fill="var(--bg-surface)"/>
              <rect x="50" y="22" width="1" height="18" fill="var(--bg-surface)"/>
            </g>
          </svg>
          <span className="font-medium">
            Battle<span className="text-orange-400 font-bold">Exam</span>
          </span>
        </Link>

        {/* Desktop Nav — always visible */}
        <nav className="hidden md:flex items-center gap-2 flex-1 justify-center">
          {navLinks.map(({ href, label, icon: Icon, disabled, prefetch }) => {
            const content = (
              <>
                <Icon size={16} />
                {label}
              </>
            );

            if (disabled) {
              return (
                <span
                  key={href}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm opacity-40 cursor-not-allowed"
                  style={{ color: "var(--text-secondary)" }}
                  title="Coming soon"
                >
                  {content}
                </span>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                prefetch={prefetch ?? false}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm nav-item ${
                  pathname === href ? "nav-item-active" : ""
                }`}
                style={
                  pathname === href
                    ? undefined
                    : { color: "var(--text-secondary)" }
                }
              >
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-3">

          {/* Global Search (signed-in only) */}
          <Show when="signed-in">
            <GlobalSearch />
          </Show>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggle}
            className="p-2.5 rounded-lg nav-item transition-colors"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Toggle theme"
          >
            {!mounted ? (
              <div className="w-[18px] h-[18px]" />
            ) : theme === "dark" ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>

          {/* Auth */}
          <Show when="signed-out">
            <div className="hidden sm:flex gap-2">
              {/* Style the Link itself — a <button> nested inside <a> is invalid
                  HTML and the browser hoists it out of the anchor, so clicks
                  don't navigate. */}
              <Link
                href="/sign-in"
                className="border px-4 py-2 rounded-lg text-sm inline-flex items-center transition-colors"
                style={{ color: "var(--text-secondary)", borderColor: "var(--border-strong)" }}
              >
                Sign In
              </Link>

              <Link
                href="/sign-up"
                className="bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 px-4 py-2 rounded-lg text-white text-sm font-medium inline-flex items-center transition-colors"
              >
                Get Started
              </Link>
            </div>
          </Show>

          <Show when="signed-in">
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Account & deletion"
                  labelIcon={<Trash2 size={16} />}
                  href="/account"
                />
              </UserButton.MenuItems>
            </UserButton>
          </Show>

          {/* Hamburger (only shown if not signed in or as a fallback) */}
          <Show when="signed-out">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 z-[120]"
              style={{ color: "var(--text-primary)" }}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </Show>
        </div>
      </div>

      {/* ================= MOBILE MENU ================= */}

      {isMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-[90]"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu */}
          <div
            className="fixed top-[60px] left-0 right-0 z-[110] border-b animate-in slide-in-from-top-4 duration-200"
            style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}
          >

            <nav className="flex flex-col p-4 gap-2">

              {navLinks.map(({ href, label, icon: Icon, disabled, prefetch }) => {
                const content = (
                  <>
                    <Icon size={18} />
                    {label}
                  </>
                );

                if (disabled) {
                  return (
                    <div
                      key={href}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl opacity-40 cursor-not-allowed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {content}
                    </div>
                  );
                }

                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={prefetch ?? false}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl nav-item ${
                      pathname === href ? "nav-item-active" : ""
                    }`}
                    style={
                      pathname === href
                        ? undefined
                        : { color: "var(--text-secondary)" }
                    }
                  >
                    {content}
                  </Link>
                );
              })}

              <Show when="signed-out">
                <div className="border-t my-2" style={{ borderColor: "var(--border)" }} />
                <Link
                  href="/sign-in"
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full px-4 py-3 rounded-xl text-sm nav-item"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full bg-amber-500 text-white px-4 py-3 rounded-xl mt-1 font-semibold text-sm text-center"
                >
                  Get Started — Free
                </Link>
              </Show>

            </nav>
          </div>
        </>
      )}
    </header>
  );
}
