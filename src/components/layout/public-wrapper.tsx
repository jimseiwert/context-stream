/**
 * PublicWrapper — shared dark-theme shell for all public-facing pages.
 *
 * Provides:
 * - #030711 background (ContextStream dark navy)
 * - Forces `dark` CSS class so shadcn variables use dark tokens
 * - Injects all shared public-site CSS classes (pub-*)
 * - flex column layout filling min-screen height
 */
export function PublicWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="dark flex min-h-screen flex-col"
      style={{ backgroundColor: "#030711", color: "#dce4f0" }}
    >
      <style>{`
        /* ── Typography ── */
        .pub-h-display {
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.08;
        }

        /* ── Gradient text ── */
        .pub-g-text {
          background: linear-gradient(120deg, #10b981, #06b6d4 55%, #3b82f6);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        /* ── Buttons ── */
        .pub-g-btn {
          background: linear-gradient(120deg, #10b981, #06b6d4);
          color: #030711;
          font-weight: 700;
          transition: opacity 0.15s, transform 0.1s;
        }
        .pub-g-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .pub-g-btn:focus-visible { outline: 2px solid #10b981; outline-offset: 3px; border-radius: 6px; }
        .pub-ghost-btn:focus-visible { outline: 2px solid #10b981; outline-offset: 3px; }

        .pub-ghost-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.04);
          color: #dce4f0;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 8px;
          text-decoration: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .pub-ghost-btn:hover {
          border-color: rgba(16,185,129,0.3);
          background: rgba(255,255,255,0.07);
        }

        /* ── Nav links ── */
        .pub-nav-link {
          color: #8899bb;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.15s;
        }
        .pub-nav-link:hover { color: #10b981; }
        .pub-nav-link:focus-visible { outline: 2px solid #10b981; outline-offset: 3px; border-radius: 4px; }

        /* ── Cards ── */
        .pub-card {
          background: rgba(255,255,255,0.022);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 28px;
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
        }
        .pub-card:hover {
          border-color: rgba(16,185,129,0.22);
          background: rgba(16,185,129,0.03);
          transform: translateY(-3px);
        }

        /* ── Pricing cards ── */
        .pub-price-card {
          background: rgba(255,255,255,0.022);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .pub-price-card:hover {
          border-color: rgba(16,185,129,0.2);
          transform: translateY(-3px);
        }
        .pub-price-card.popular {
          border-color: rgba(16,185,129,0.35);
          box-shadow: 0 0 0 1px rgba(16,185,129,0.15), 0 8px 30px rgba(16,185,129,0.1);
        }

        /* ── Feature icon ── */
        .pub-feat-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(16,185,129,0.14), rgba(6,182,212,0.08));
          border: 1px solid rgba(16,185,129,0.18);
          color: #10b981;
          margin-bottom: 16px;
        }

        /* ── Step numbers ── */
        .pub-step-n {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.06));
          border: 1px solid rgba(16,185,129,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          font-size: 0.9rem;
          color: #10b981;
          flex-shrink: 0;
          margin-bottom: 20px;
        }

        /* ── Badge ── */
        .pub-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 14px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.18);
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #10b981;
          letter-spacing: 0.04em;
        }

        /* ── Section label ── */
        .pub-s-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #10b981;
          margin-bottom: 12px;
        }

        /* ── Horizontal rule ── */
        .pub-sep {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin: 0;
        }

        /* ── Hero grid background ── */
        .pub-hero-grid {
          background-image:
            linear-gradient(rgba(16,185,129,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.035) 1px, transparent 1px);
          background-size: 56px 56px;
        }

        /* ── Stat value ── */
        .pub-stat-val {
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          font-size: 2.1rem;
          line-height: 1;
          background: linear-gradient(120deg, #10b981, #06b6d4);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .pub-stat-lbl { color: #8899bb; font-size: 0.8rem; margin-top: 5px; }

        /* ── Prose (legal / docs) ── */
        .pub-prose { color: #8899bb; line-height: 1.75; }
        .pub-prose h1 {
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          font-size: clamp(2rem, 4vw, 2.75rem);
          letter-spacing: -0.03em;
          color: #dce4f0;
          margin-bottom: 8px;
        }
        .pub-prose h2 {
          font-family: var(--font-display), sans-serif;
          font-weight: 700;
          font-size: 1.3rem;
          letter-spacing: -0.02em;
          color: #c8d5e8;
          margin-top: 40px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .pub-prose h3 {
          font-weight: 700;
          font-size: 1rem;
          color: #b0c0d8;
          margin-top: 24px;
          margin-bottom: 8px;
        }
        .pub-prose p { margin-bottom: 16px; }
        .pub-prose ul, .pub-prose ol { padding-left: 1.4em; margin-bottom: 16px; }
        .pub-prose li { margin-bottom: 6px; }
        .pub-prose a { color: #10b981; text-decoration: underline; text-underline-offset: 3px; }
        .pub-prose a:hover { color: #06b6d4; }
        .pub-prose strong { color: #c8d5e8; font-weight: 600; }
        .pub-prose pre {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
          font-family: var(--font-mono), monospace;
          font-size: 0.82rem;
          line-height: 1.7;
          color: #8899bb;
        }

        /* ── Code block (syntax-highlighted) ── */
        .pub-code-panel {
          background: #060e1c;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          overflow: hidden;
          font-family: var(--font-mono), monospace;
          font-size: 0.8rem;
          line-height: 1.75;
        }
        .pub-code-hdr {
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        /* ── Animations ── */
        @keyframes pub-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pub-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .pub-anim-float { animation: pub-float 4s ease-in-out infinite; }
        .pub-anim-blink { animation: pub-blink 1s step-end infinite; }

        /* ── Auth card override ── */
        .pub-auth-card {
          background: rgba(10, 18, 40, 0.9) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 16px !important;
        }
        .pub-auth-card input {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.1) !important;
          color: #dce4f0 !important;
        }
        .pub-auth-card input::placeholder { color: #6b7fa0 !important; }
        .pub-auth-card input:focus {
          border-color: rgba(16,185,129,0.4) !important;
          box-shadow: 0 0 0 2px rgba(16,185,129,0.15) !important;
        }
      `}</style>
      {children}
    </div>
  );
}
