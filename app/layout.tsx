import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import ThemeProvider from "@/components/ThemeProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import "./globals.css";
import 'katex/dist/katex.min.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { buildOrganizationSchema } from "@/lib/seo";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f59e0b",
  viewportFit: "cover", // Ensures the app uses the full screen behind notches
};

const globalSchema = buildOrganizationSchema();

export const metadata: Metadata = {
  title: {
    default: "BattleExam – AI-Powered GATE CSE Preparation",
    template: "%s | BattleExam",
  },
  description:
    "Master GATE CSE, ISRO, BARC & ESE with AI-generated pattern-based practice questions. Adaptive difficulty, instant explanations, progress tracking. Free to start.",
  metadataBase: new URL("https://battleexam.com"),
  alternates: {
    canonical: "https://battleexam.com",
  },
  openGraph: {
    title: "BattleExam – AI-Powered GATE CSE Preparation",
    description:
      "Master GATE CSE, ISRO, BARC & ESE with AI-generated pattern-based practice. Adaptive difficulty, instant explanations, PYQs. Free to start.",
    url: "https://battleexam.com",
    siteName: "BattleExam",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://battleexam.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: "BattleExam – Pattern-Based GATE CSE Preparation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BattleExam – AI-Powered GATE CSE Preparation",
    description:
      "Master GATE CSE, ISRO, BARC & ESE with AI-generated pattern-based practice. Free to start.",
    creator: "@battleexam",
    images: ["https://battleexam.com/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  keywords: [
    "GATE CSE preparation",
    "GATE practice questions",
    "GATE previous year questions",
    "GATE 2026",
    "GATE 2027",
    "ISRO CSE preparation",
    "BARC preparation",
    "ESE preparation",
    "pattern based learning",
    "AI generated questions",
    "GATE algorithms",
    "GATE data structures",
    "GATE operating systems",
    "GATE DBMS",
    "GATE computer networks",
    "competitive exam preparation India",
  ],
};

import { LanguageProvider } from "@/components/providers/LanguageProvider";
import PostLoginRedirect from "@/components/landing/PostLoginRedirect";
import NativeMobileBridge from "@/components/providers/NativeMobileBridge";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();`,
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(globalSchema) }}
          />
        </head>
        <body className="min-h-full flex flex-col">
          {process.env.NEXT_PUBLIC_GA_ID && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive" dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                `
              }} />
            </>
          )}
          {process.env.NEXT_PUBLIC_CLARITY_ID && (
            <Script id="microsoft-clarity" strategy="afterInteractive" dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
              `
            }} />
          )}
          <ServiceWorkerRegistration />
          <NativeMobileBridge />
          <LanguageProvider>
            <ThemeProvider>
              <QueryProvider>
                <Header />
                <PostLoginRedirect />
                <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+70px)] md:pb-0">{children}</main>
                <MobileNav />
              </QueryProvider>
            </ThemeProvider>
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
