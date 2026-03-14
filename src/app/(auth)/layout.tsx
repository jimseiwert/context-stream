import { PublicHeader } from "@/components/layout/public-header";
import { PublicWrapper } from "@/components/layout/public-wrapper";
import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PublicWrapper>
      <PublicHeader />

      {/* Main Content */}
      <main
        id="main-content"
        className="pub-hero-grid"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top-center glow */}
        <div style={{
          position: "absolute",
          top: -120,
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.09), transparent 65%)",
          pointerEvents: "none",
        }} />
        {/* Bottom accent */}
        <div style={{
          position: "absolute",
          bottom: -80,
          right: "10%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.06), transparent 65%)",
          pointerEvents: "none",
        }} />
        <div className="pub-auth-card" style={{ width: "100%", maxWidth: 448, position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </main>
    </PublicWrapper>
  );
}
