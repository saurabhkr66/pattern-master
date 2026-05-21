"use client";

import { useState } from "react";

interface Props {
  src: string;
  alt: string;
}

export default function ShareCardImage({ src, alt }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #1c1c33",
        boxShadow: "0 24px 80px rgba(99,102,241,0.15)",
        marginBottom: 28,
        aspectRatio: "1200/630",
        background: "#0f0f1c",
        position: "relative",
      }}
    >
      {/* Skeleton shown while loading */}
      {!loaded && !error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, #0f0f1c 25%, #1c1c33 50%, #0f0f1c 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s infinite",
          }}
        />
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#5c5c8a",
            fontSize: 14,
          }}
        >
          Could not load progress card
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          width: "100%",
          display: "block",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
