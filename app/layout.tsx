import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import Header from "@/components/Header";
import ThemeProvider from "@/components/ThemeProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import "./globals.css";
import "katex/dist/katex.min.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { buildOrganizationSchema } from "@/lib/seo";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const globalSchema = buildOrganizationSchema();

export const metadata: Metadata = {
  title: {
    default: "BattleExam – AI-Powered GATE CSE Preparation",
    template: "%s – BattleExam",
  },
  description:
    "Master GATE CSE, ISRO, BARC & ESE with AI-generated pattern-based practice questions. Adaptive difficulty, instant explanations, progress tracking. Free to start.",
  metadataBase: new URL("https://battleexam.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "BattleExam – AI-Powered GATE CSE Preparation",
    description: "Master GATE CSE with AI-generated pattern-based practice. Adaptive difficulty and instant feedback.",
    url: "https://battleexam.com",
    siteName: "BattleExam",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BattleExam – AI-Powered GATE CSE Preparation",
    description: "Master GATE CSE with AI-powered patterns.",
    creator: "@battleexam",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

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
          {process.env.NEXT_PUBLIC_GA_ID && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                `}
              </Script>
            </>
          )}
          {process.env.NEXT_PUBLIC_CLARITY_ID && (
            <Script id="microsoft-clarity" strategy="afterInteractive">
              {`
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
              `}
            </Script>
          )}
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
          <ThemeProvider>
            <QueryProvider>
              <Header />
              <main className="flex-1">{children}</main>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
