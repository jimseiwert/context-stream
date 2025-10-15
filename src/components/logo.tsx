import React from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  animated?: boolean;
}

export function Logo({
  size = 40,
  showText = true,
  className = "",
  animated = true,
}: LogoProps) {
  const iconSize = showText ? size * 0.8 : size;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="logoGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#10b981" }} />
            <stop offset="50%" style={{ stopColor: "#06b6d4" }} />
            <stop offset="100%" style={{ stopColor: "#3b82f6" }} />
          </linearGradient>
          <linearGradient id="logoGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#f59e0b" }} />
            <stop offset="50%" style={{ stopColor: "#06b6d4" }} />
            <stop offset="100%" style={{ stopColor: "#10b981" }} />
          </linearGradient>
          <linearGradient id="logoGradient3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#3b82f6" }} />
            <stop offset="100%" style={{ stopColor: "#10b981" }} />
          </linearGradient>
          <filter id="logoGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer frame */}
        <path
          d="M 80 15 L 140 50 L 140 110 L 80 145 L 20 110 L 20 50 Z"
          stroke="url(#logoGradient1)"
          strokeWidth="2.5"
          fill="none"
          opacity="0.4"
        />

        {/* Top node */}
        <polygon
          points="80,30 92,37 92,51 80,58 68,51 68,37"
          fill="url(#logoGradient1)"
          opacity="0.9"
        />

        {/* Left node */}
        <polygon
          points="40,58 52,65 52,79 40,86 28,79 28,65"
          fill="url(#logoGradient2)"
          opacity="0.8"
        />

        {/* Right node */}
        <polygon
          points="120,58 132,65 132,79 120,86 108,79 108,65"
          fill="url(#logoGradient2)"
          opacity="0.8"
        />

        {/* Center node */}
        <polygon
          points="80,68 98,78 98,98 80,108 62,98 62,78"
          fill="url(#logoGradient1)"
          filter="url(#logoGlow)"
        />

        {/* Bottom nodes */}
        <polygon
          points="52,105 64,112 64,126 52,133 40,126 40,112"
          fill="url(#logoGradient3)"
          opacity="0.8"
        />

        <polygon
          points="108,105 120,112 120,126 108,133 96,126 96,112"
          fill="url(#logoGradient3)"
          opacity="0.8"
        />

        {/* Connection lines */}
        <line x1="80" y1="58" x2="80" y2="68" stroke="url(#logoGradient1)" strokeWidth="2.5" opacity="0.6"/>
        <line x1="52" y1="72" x2="62" y2="78" stroke="url(#logoGradient2)" strokeWidth="2.5" opacity="0.6"/>
        <line x1="108" y1="72" x2="98" y2="78" stroke="url(#logoGradient2)" strokeWidth="2.5" opacity="0.6"/>
        <line x1="68" y1="98" x2="58" y2="105" stroke="url(#logoGradient3)" strokeWidth="2.5" opacity="0.6"/>
        <line x1="92" y1="98" x2="102" y2="105" stroke="url(#logoGradient3)" strokeWidth="2.5" opacity="0.6"/>

        {animated && (
          <>
            {/* Animated data particles */}
            <circle r="3" fill="#10b981">
              <animateMotion dur="2s" repeatCount="indefinite" path="M 80 58 L 80 68"/>
              <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle r="3" fill="#f59e0b">
              <animateMotion dur="2.5s" repeatCount="indefinite" path="M 52 72 L 62 78"/>
              <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <circle r="3" fill="#06b6d4">
              <animateMotion dur="2.2s" repeatCount="indefinite" path="M 108 72 L 98 78"/>
              <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" repeatCount="indefinite"/>
            </circle>
          </>
        )}

        {/* Center glow */}
        <circle cx="80" cy="88" r="12" fill="url(#logoGradient1)" opacity="0.3" filter="url(#logoGlow)"/>
      </svg>

      {showText && (
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: size * 0.5 }}
        >
          Context
          <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
            Stream
          </span>
        </span>
      )}
    </div>
  );
}

export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return <Logo size={size} showText={false} className={className} />;
}
