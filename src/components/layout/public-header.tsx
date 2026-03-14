"use client";

import { Logo } from "@/components/logo";
import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
    <a
      href="#main-content"
      style={{
        position: "absolute",
        left: "-9999px",
        top: "auto",
        width: 1,
        height: 1,
        overflow: "hidden",
      }}
      onFocus={e => {
        e.currentTarget.style.cssText = "position:fixed;top:8px;left:8px;z-index:9999;padding:8px 16px;background:#10b981;color:#030711;font-weight:700;border-radius:6px;text-decoration:none;width:auto;height:auto;overflow:visible;font-size:0.875rem;";
      }}
      onBlur={e => {
        e.currentTarget.style.cssText = "position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;";
      }}
    >
      Skip to main content
    </a>
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(18px)",
        backgroundColor: "rgba(3,7,17,0.82)",
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/">
          <Logo size={36} animated={true} />
        </Link>

        <div className="flex items-center gap-3 md:gap-7">
          {/* Nav links — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-7">
            <Link href="/pricing" className="pub-nav-link">Pricing</Link>
            <Link href="/docs" className="pub-nav-link">Docs</Link>
            <Link
              href="https://github.com/jimseiwert/context-stream"
              target="_blank"
              className="pub-nav-link"
            >
              GitHub
            </Link>
            <Link href="/login" className="pub-nav-link">Sign in</Link>
          </nav>

          {/* CTA — hidden on mobile, visible md+ */}
          <Link
            href="/register"
            className="pub-g-btn hidden md:inline-flex"
            style={{
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 8,
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            Get Started <ArrowRight size={14} />
          </Link>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            style={{
              background: "none",
              border: "none",
              color: "#8899bb",
              cursor: "pointer",
              padding: 4,
              lineHeight: 0,
            }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          id="mobile-nav"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            backgroundColor: "rgba(3,7,17,0.97)",
            padding: "8px 0 16px",
          }}
          className="md:hidden"
        >
          {[
            { label: "Pricing", href: "/pricing" },
            { label: "Docs", href: "/docs" },
            { label: "GitHub", href: "https://github.com/jimseiwert/context-stream", external: true },
            { label: "Sign in", href: "/login" },
          ].map(item => (
            <Link
              key={item.label}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              onClick={() => setMenuOpen(false)}
              style={{
                display: "block",
                padding: "12px 24px",
                color: "#8899bb",
                textDecoration: "none",
                fontSize: "0.9375rem",
                fontWeight: 500,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {item.label}
            </Link>
          ))}
          <div style={{ padding: "16px 24px 4px" }}>
            <Link
              href="/register"
              className="pub-g-btn"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "11px 18px",
                borderRadius: 8,
                fontSize: "0.9375rem",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </header>
    </>
  );
}
