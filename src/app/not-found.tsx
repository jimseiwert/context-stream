import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicWrapper } from "@/components/layout/public-wrapper";
import Link from "next/link";

export default function NotFound() {
  return (
    <PublicWrapper>
      <PublicHeader />

      <main
        id="main-content"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.06), transparent 65%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
          <div
            style={{
              fontFamily: "var(--font-display), sans-serif",
              fontSize: "clamp(5rem, 20vw, 9rem)",
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              background: "linear-gradient(120deg, #10b981, #06b6d4 55%, #3b82f6)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: 24,
            }}
          >
            404
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display), sans-serif",
              fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#dce4f0",
              marginBottom: 12,
            }}
          >
            Page not found
          </h1>

          <p style={{ fontSize: "1rem", color: "#8899bb", lineHeight: 1.7, marginBottom: 36 }}>
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/"
              className="pub-g-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 24px",
                borderRadius: 8,
                fontSize: "0.9375rem",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Back to Home
            </Link>
            <Link
              href="/docs"
              className="pub-ghost-btn"
              style={{ padding: "11px 24px", fontSize: "0.9375rem" }}
            >
              Documentation
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </PublicWrapper>
  );
}
