import { ImageResponse } from "next/og";

export const alt = "BattleExam – Pattern-Based GATE, JEE, NEET & UGC NET Preparation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #09090f 0%, #0f0f1f 60%, #0a0a14 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 80px",
          gap: "0px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Top glow */}
        <div
          style={{
            position: "absolute",
            top: -80,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 400,
            background:
              "radial-gradient(ellipse, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.15) 40%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(40px)",
          }}
        />

        {/* Logo + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: "72px",
              fontWeight: 900,
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            <span style={{ color: "#ffffff" }}>{"Battle"}</span>
            <span style={{ color: "#818cf8" }}>{"Exam"}</span>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "30px",
            fontWeight: 600,
            color: "#94a3b8",
            textAlign: "center",
            letterSpacing: "-0.5px",
            maxWidth: "860px",
            lineHeight: 1.3,
            marginBottom: "36px",
          }}
        >
          {"Pattern-Based Exam Preparation"}
        </div>

        {/* Exam pills */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "36px",
          }}
        >
          {["GATE", "JEE", "NEET", "UGC NET"].map((exam) => (
            <div
              key={exam}
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#a5b4fc",
                background: "rgba(99,102,241,0.18)",
                border: "1px solid rgba(99,102,241,0.3)",
                padding: "8px 22px",
                borderRadius: "100px",
                letterSpacing: "2px",
              }}
            >
              {exam}
            </div>
          ))}
        </div>

        {/* Features row */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            fontSize: "16px",
            color: "#475569",
            fontWeight: 500,
          }}
        >
          {["AI-Generated Questions", "PYQs Included", "Adaptive Difficulty", "Free to Start"].map(
            (f) => (
              <span key={f}>{f}</span>
            )
          )}
        </div>

        {/* URL watermark */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 48,
            fontSize: "15px",
            color: "#334155",
            fontWeight: 500,
            letterSpacing: "0.5px",
          }}
        >
          battleexam.com
        </div>
      </div>
    ),
    size
  );
}
