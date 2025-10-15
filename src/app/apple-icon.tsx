import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
        }}
      >
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer frame */}
          <path
            d="M 70 15 L 125 48 L 125 92 L 70 125 L 15 92 L 15 48 Z"
            stroke="white"
            strokeWidth="3"
            fill="none"
            opacity="0.4"
          />

          {/* Top node */}
          <polygon points="70,28 80,34 80,46 70,52 60,46 60,34" fill="white" opacity="0.9"/>

          {/* Side nodes */}
          <polygon points="35,52 45,58 45,70 35,76 25,70 25,58" fill="white" opacity="0.8"/>
          <polygon points="105,52 115,58 115,70 105,76 95,70 95,58" fill="white" opacity="0.8"/>

          {/* Center node */}
          <polygon points="70,60 85,68 85,84 70,92 55,84 55,68" fill="white"/>

          {/* Bottom nodes */}
          <polygon points="45,92 55,98 55,110 45,116 35,110 35,98" fill="white" opacity="0.8"/>
          <polygon points="95,92 105,98 105,110 95,116 85,110 85,98" fill="white" opacity="0.8"/>

          {/* Connection lines */}
          <line x1="70" y1="52" x2="70" y2="60" stroke="white" strokeWidth="2" opacity="0.6"/>
          <line x1="45" y1="64" x2="55" y2="68" stroke="white" strokeWidth="2" opacity="0.6"/>
          <line x1="95" y1="64" x2="85" y2="68" stroke="white" strokeWidth="2" opacity="0.6"/>
          <line x1="60" y1="84" x2="50" y2="92" stroke="white" strokeWidth="2" opacity="0.6"/>
          <line x1="80" y1="84" x2="90" y2="92" stroke="white" strokeWidth="2" opacity="0.6"/>

          {/* Center glow */}
          <circle cx="70" cy="76" r="12" fill="white" opacity="0.3"/>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
