"use client"
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import {
  Brain,
  LayoutDashboard,
  BookOpen,
  RotateCcw,
  XCircle,
  User,
  Menu,
  X,
  Sun,
  Moon,
  ClipboardList,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

const navLinks = [
  { href: "/practice", label: "Practice", icon: BookOpen },
  { href: "/test", label: "Mock Test", icon: ClipboardList },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/review", label: "Review", icon: RotateCcw },
  { href: "/mistakes", label: "Mistakes", icon: XCircle },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <header
      className="relative top-0 w-full border-b backdrop-blur-md"
      style={{ background: "var(--header-bg)", borderColor: "var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between gap-6 relative">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg"
          style={{ color: "var(--text-primary)" }}
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]">
            <Brain size={20} />
          </span>
          <span className="font-medium">
            Pattern<span className="text-purple-400 font-bold">Master</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <Show when="signed-in">
          <nav className="hidden md:flex items-center gap-2 flex-1 justify-center">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  pathname === href
                    ? "text-indigo-300 bg-indigo-500/20"
                    : "hover:bg-white/5"
                }`}
                style={
                  pathname === href
                    ? undefined
                    : { color: "var(--text-secondary)" }
                }
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
        </Show>

        {/* Right Section */}
        <div className="flex items-center gap-3">

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggle}
            className="p-2.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Auth */}
          <Show when="signed-out">
            <div className="hidden sm:flex gap-2">
              <SignInButton mode="modal">
                <button
                  className="border px-4 py-2 rounded-lg text-sm"
                  style={{ color: "var(--text-secondary)", borderColor: "var(--border-strong)" }}
                >
                  Sign In
                </button>
              </SignInButton>

              <SignUpButton mode="modal">
                <button className="bg-gradient-to-br from-indigo-500 to-purple-500 px-4 py-2 rounded-lg text-white text-sm">
                  Get Started
                </button>
              </SignUpButton>
            </div>
          </Show>

          <Show when="signed-in">
            <UserButton />
          </Show>

          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 z-[120]"
            style={{ color: "var(--text-primary)" }}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
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

              <Show when="signed-in">
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                      pathname === href
                        ? "text-indigo-300 bg-indigo-500/20"
                        : "hover:bg-white/5"
                    }`}
                    style={
                      pathname === href
                        ? undefined
                        : { color: "var(--text-secondary)" }
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                ))}
              </Show>

              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="text-left px-4 py-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Sign In
                  </button>
                </SignInButton>

                <SignUpButton mode="modal">
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="bg-indigo-500 text-white px-4 py-3 rounded-xl mt-2"
                  >
                    Get Started
                  </button>
                </SignUpButton>
              </Show>

            </nav>
          </div>
        </>
      )}
    </header>
  );
}
