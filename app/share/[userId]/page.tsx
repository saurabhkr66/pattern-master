// app/share/[userId]/page.tsx
// Public shareable progress card page — no auth required.

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import ShareCardImage from "./ShareCardImage";

const BASE = "https://battleexam.com";

interface Props {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    return { title: "BattleExam" };
  }

  const handle = user.email.split("@")[0];
  const displayName = handle.charAt(0).toUpperCase() + handle.slice(1);
  const cardImageUrl = `${BASE}/api/share-card?userId=${userId}`;
  const title = `${displayName}'s GATE CSE Progress — BattleExam`;
  const description =
    "Tracking GATE CSE prep with pattern-based AI practice on BattleExam. Check out my progress!";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE}/share/${userId}`,
      siteName: "BattleExam",
      images: [
        {
          url: cardImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayName}'s BattleExam progress card`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [cardImageUrl],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) notFound();

  const handle = user.email.split("@")[0];
  const displayName = handle.charAt(0).toUpperCase() + handle.slice(1);
  const cardImageUrl = `/api/share-card?userId=${userId}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07070f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: "white",
            fontWeight: 900,
          }}
        >
          B
        </div>
        <span
          style={{
            color: "#eeeef8",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.5px",
          }}
        >
          Battle<span style={{ color: "#818cf8" }}>Exam</span>
        </span>
      </div>

      {/* Card image */}
      <ShareCardImage src={cardImageUrl} alt={`${displayName}'s BattleExam progress card`} />

      {/* Caption */}
      <p
        style={{
          color: "#5c5c8a",
          fontSize: 14,
          textAlign: "center",
          marginBottom: 24,
          maxWidth: 480,
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: "#eeeef8", fontWeight: 600 }}>{displayName}</span>{" "}
        is tracking GATE CSE prep with pattern-based AI practice on BattleExam.
      </p>

      {/* CTA */}
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "12px 28px",
          borderRadius: 12,
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          color: "white",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
          letterSpacing: "0.02em",
        }}
      >
        Start your own prep →
      </Link>
    </div>
  );
}
