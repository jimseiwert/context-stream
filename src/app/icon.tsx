import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          borderRadius: "6px",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="favGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#10b981" }} />
              <stop offset="50%" style={{ stopColor: "#06b6d4" }} />
              <stop offset="100%" style={{ stopColor: "#3b82f6" }} />
            </linearGradient>
          </defs>
          <path
            d="M 16 4 L 28 10 L 28 22 L 16 28 L 4 22 L 4 10 Z"
            stroke="url(#favGrad)"
            strokeWidth="1.5"
            fill="none"
            opacity="0.4"
          />
          <polygon points="16,7 18,8 18,10 16,11 14,10 14,8" fill="url(#favGrad)" opacity="0.9"/>
          <polygon points="9,13 11,14 11,16 9,17 7,16 7,14" fill="#f59e0b" opacity="0.8"/>
          <polygon points="23,13 25,14 25,16 23,17 21,16 21,14" fill="#f59e0b" opacity="0.8"/>
          <polygon points="16,14 19,16 19,18 16,20 13,18 13,16" fill="url(#favGrad)"/>
          <polygon points="11,21 13,22 13,24 11,25 9,24 9,22" fill="#06b6d4" opacity="0.8"/>
          <polygon points="21,21 23,22 23,24 21,25 19,24 19,22" fill="#06b6d4" opacity="0.8"/>
          <line x1="16" y1="11" x2="16" y2="14" stroke="url(#favGrad)" strokeWidth="1" opacity="0.5"/>
          <line x1="11" y1="15" x2="13" y2="16" stroke="#f59e0b" strokeWidth="1" opacity="0.5"/>
          <line x1="21" y1="15" x2="19" y2="16" stroke="#f59e0b" strokeWidth="1" opacity="0.5"/>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
