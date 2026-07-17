import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
// import CoachingRail from "@/components/CoachingRail"; // rail hidden for now
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

import { buildOrganizationSchema, joinExamLabels } from "@/lib/seo";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/InstallPrompt";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f59e0b",
  viewportFit: "cover", // Ensures the app uses the full screen behind notches
};

const globalSchema = buildOrganizationSchema();
const EXAM_COPY = joinExamLabels();
const ROOT_TITLE = `BattleExam – AI-Powered ${EXAM_COPY} Preparation`;
const ROOT_DESC = `Master ${EXAM_COPY} with AI-generated pattern-based practice questions, previous year questions (PYQs), and full-length mock tests. Adaptive difficulty, instant explanations, progress tracking. Free to start.`;

export const metadata: Metadata = {
  title: {
    default: ROOT_TITLE,
    template: "%s | BattleExam",
  },
  description: ROOT_DESC,
  metadataBase: new URL("https://battleexam.com"),
  alternates: {
    canonical: "https://battleexam.com",
  },
  openGraph: {
    title: ROOT_TITLE,
    description: ROOT_DESC,
    url: "https://battleexam.com",
    siteName: "BattleExam",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://battleexam.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: `BattleExam – Pattern-Based ${EXAM_COPY} Preparation Platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: ROOT_TITLE,
    description: `Master ${EXAM_COPY} with AI-generated pattern-based practice, PYQs and full-length mocks. Free to start.`,
    creator: "@battleexam",
    images: ["https://battleexam.com/og-image.png"],
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
  // Bing Webmaster verification. Bing powers ChatGPT Search & (partly)
  // Perplexity, so getting verified + indexed there is a GEO priority. Paste the
  // token from Bing Webmaster Tools into NEXT_PUBLIC_BING_SITE_VERIFICATION.
  // (Alternatively, Bing can import verification directly from Google Search
  // Console with no code — then this env var can stay unset.)
  ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
    ? {
        verification: {
          other: {
            "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
          },
        },
      }
    : {}),
  icons: {
    icon: [
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  keywords: [
    "GATE preparation",
    "GATE CSE preparation",
    "GATE ECE preparation",
    "GATE EE preparation",
    "GATE ME preparation",
    "GATE practice questions",
    "GATE previous year questions",
    "GATE PYQ",
    "GATE 2026",
    "GATE 2027",
    "JEE Main preparation",
    "JEE Main practice questions",
    "JEE Main PYQ",
    "JEE Advanced preparation",
    "JEE Advanced PYQ",
    "NEET UG preparation",
    "NEET practice questions",
    "NEET PYQ",
    "UGC NET Paper 1 preparation",
    "UGC NET Paper 2 preparation",
    "UGC NET practice questions",
    "pattern based learning",
    "AI generated questions",
    "online mock tests India",
    "engineering entrance exam preparation India",
    "medical entrance exam preparation India",
  ],
};

import { LanguageProvider } from "@/components/providers/LanguageProvider";
import PostLoginRedirect from "@/components/landing/PostLoginRedirect";
import NativeMobileBridge from "@/components/providers/NativeMobileBridge";
import GlobalAnalyticsTracker from "@/components/providers/GlobalAnalyticsTracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // proxyUrl: serve Clerk's Frontend API first-party via /__clerk (see
    // app/__clerk/[[...rest]]/route.ts). Unset in dev → no proxy, normal FAPI.
    <ClerkProvider proxyUrl={process.env.NEXT_PUBLIC_CLERK_PROXY_URL}>
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
          <InstallPrompt />
          <NativeMobileBridge />
          <LanguageProvider>
            <ThemeProvider>
              <QueryProvider>
                <Header />
                {/* CoachingRail hidden for now — keep mounted-out until we want the desktop rail back. */}
                {/* <CoachingRail /> */}
                <Suspense fallback={null}>
                  <GlobalAnalyticsTracker />
                </Suspense>
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
