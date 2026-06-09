// app/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Archivo, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import {
  homeMetadata,
  structuredData,
  softwareAppSchema,
  faqStructuredData,
} from "@/components/landing/homeMetadata";
import LandingV2 from "@/components/landing/v2/LandingV2";

export const metadata = homeMetadata;

// Serve from CDN edge cache — regenerate at most once per hour
export const revalidate = 3600;

// Landing-only fonts, exposed as the CSS variables the scoped landing.css expects.
// Loaded as variable fonts (no `weight`) so the 850/900 display weights resolve.
const archivo = Archivo({ subsets: ["latin"], variable: "--ff-display", display: "swap" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--ff-body", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--ff-mono", display: "swap" });

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const fontClassName = `${archivo.variable} ${hanken.variable} ${jetbrains.variable}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <LandingV2 fontClassName={fontClassName} />
    </>
  );
}
