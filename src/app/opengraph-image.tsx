import { ImageResponse } from "next/og";

export const alt = "ContextStream — Make Any Docs AI-Accessible";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#030711",
          padding: "60px 80px",
        }}
      >
        {/* Logo row */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginBottom: 48,
          }}
        >
          {/* SVG logo — animations stripped for Satori compatibility */}
          <svg width="56" height="56" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="og-grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity={1} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="og-grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity={1} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="og-grad3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
              </linearGradient>
            </defs>
            <path d="M 100 20 L 170 60 L 170 140 L 100 180 L 30 140 L 30 60 Z" stroke="url(#og-grad1)" strokeWidth={3} fill="none" opacity={0.4} />
            <polygon points="100,35 115,44 115,62 100,71 85,62 85,44" fill="url(#og-grad1)" opacity={0.9} />
            <polygon points="50,70 65,79 65,97 50,106 35,97 35,79" fill="url(#og-grad2)" opacity={0.8} />
            <polygon points="150,70 165,79 165,97 150,106 135,97 135,79" fill="url(#og-grad2)" opacity={0.8} />
            <polygon points="100,85 120,97 120,121 100,133 80,121 80,97" fill="url(#og-grad1)" />
            <polygon points="65,130 80,139 80,157 65,166 50,157 50,139" fill="url(#og-grad3)" opacity={0.8} />
            <polygon points="135,130 150,139 150,157 135,166 120,157 120,139" fill="url(#og-grad3)" opacity={0.8} />
            <line x1={100} y1={71} x2={100} y2={85} stroke="url(#og-grad1)" strokeWidth={3} opacity={0.6} />
            <line x1={65} y1={88} x2={80} y2={97} stroke="url(#og-grad2)" strokeWidth={3} opacity={0.6} />
            <line x1={135} y1={88} x2={120} y2={97} stroke="url(#og-grad2)" strokeWidth={3} opacity={0.6} />
            <line x1={85} y1={121} x2={72} y2={130} stroke="url(#og-grad3)" strokeWidth={3} opacity={0.6} />
            <line x1={115} y1={121} x2={128} y2={130} stroke="url(#og-grad3)" strokeWidth={3} opacity={0.6} />
            <circle cx={100} cy={109} r={15} fill="url(#og-grad1)" opacity={0.3} />
          </svg>
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#dce4f0",
              letterSpacing: "-0.02em",
            }}
          >
            ContextStream
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            textAlign: "center",
            maxWidth: 900,
            marginBottom: 28,
          }}
        >
          <span style={{ color: "#dce4f0" }}>Make Any Docs&nbsp;</span>
          <span
            style={{
              color: "#10b981",
            }}
          >
            AI-Accessible
          </span>
        </div>

        {/* Subtext */}
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#7a8eaa",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.5,
            marginBottom: 48,
          }}
        >
          Index your docs. Connect to Claude, Cursor, Zed, and any MCP tool.
        </div>

        {/* Badges */}
        <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
          {["Open Source", "MIT Licensed", "Self-Hostable"].map((badge) => (
            <div
              key={badge}
              style={{
                display: "flex",
                padding: "8px 20px",
                borderRadius: 99,
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#10b981",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
