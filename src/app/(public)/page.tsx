export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { PublicFooter } from "@/components/layout/public-footer";

export const metadata: Metadata = {
  title: "Make Any Docs AI-Accessible",
  description:
    "Index your documentation, GitHub repos, and websites. Search them instantly from Claude, Cursor, Zed, and any MCP-compatible AI tool. Open source and self-hostable.",
  keywords: ["MCP server", "documentation indexing", "AI documentation search", "Claude Desktop docs", "Cursor MCP", "open source RAG"],
  alternates: {
    canonical: "https://contextstream.dev",
  },
  openGraph: {
    title: "ContextStream — Make Any Docs AI-Accessible",
    description:
      "Index your docs and GitHub repos. Search them from Claude, Cursor, Zed, and any MCP AI tool. Open source, MIT licensed.",
    url: "https://contextstream.dev",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ContextStream — Make Any Docs AI-Accessible" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ContextStream — Make Any Docs AI-Accessible",
    description:
      "Index your docs and GitHub repos. Search them from Claude, Cursor, Zed, and any MCP AI tool. Open source, MIT licensed.",
    images: ["/opengraph-image"],
  },
};
import { PublicHeader } from "@/components/layout/public-header";
import { ArrowRight, Code2, Database, Search, Shield, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

const features = [
  { icon: <Zap size={18} />, title: "Fast Indexing", desc: "Paste a URL and walk away. Most documentation sites are ready to search in under five minutes." },
  { icon: <Sparkles size={18} />, title: "MCP Native", desc: "Works out of the box with Claude Desktop, Cursor, Zed, and Windsurf. One config block and you're done." },
  { icon: <Search size={18} />, title: "Hybrid Search", desc: "Combines keyword matching with semantic vector search so results stay good whether you're specific or vague." },
  { icon: <Database size={18} />, title: "Pre-indexed Sources", desc: "React, Python, Vue, and more are already indexed. Enable them with one click, no waiting required." },
  { icon: <Shield size={18} />, title: "Your Data Stays Yours", desc: "Internal documentation never leaves your workspace. Role-based access keeps the right content with the right people." },
  { icon: <Code2 size={18} />, title: "Open Source", desc: "Full source on GitHub under MIT. Run it yourself or use our hosted version. Either way works fine." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://contextstream.dev/#website",
      url: "https://contextstream.dev",
      name: "ContextStream",
      description: "Index your documentation and connect it to AI tools via MCP.",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: "https://contextstream.dev/search?q={search_term_string}" },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://contextstream.dev/#organization",
      name: "ContextStream",
      url: "https://contextstream.dev",
      logo: { "@type": "ImageObject", url: "https://contextstream.dev/logo.svg" },
      sameAs: ["https://github.com/jimseiwert/context-stream"],
    },
    {
      "@type": "SoftwareApplication",
      name: "ContextStream",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: "https://contextstream.dev",
      description: "Open-source MCP server that indexes your documentation and makes it searchable from any AI tool.",
    },
  ],
};

export default function LandingPage() {
  return (
    <div
      className="dark flex min-h-screen flex-col"
      style={{ backgroundColor: "#030711", color: "#dce4f0", overflowX: "hidden" }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`
        .h-display { font-family: var(--font-display), sans-serif; font-weight: 800; letter-spacing: -0.03em; line-height: 1.08; }
        .g-text { background: linear-gradient(120deg, #10b981, #06b6d4 55%, #3b82f6); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .g-btn { background: linear-gradient(120deg, #10b981, #06b6d4); color: #030711; font-weight: 700; transition: opacity 0.15s, transform 0.1s; }
        .g-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .ghost-btn { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); color: #dce4f0; font-weight: 600; border: 1px solid rgba(255,255,255,0.09); border-radius: 8px; text-decoration: none; transition: border-color 0.15s, background 0.15s; }
        .ghost-btn:hover { border-color: rgba(16,185,129,0.3); background: rgba(255,255,255,0.07); }
        .hero-grid { background-image: linear-gradient(rgba(16,185,129,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.035) 1px, transparent 1px); background-size: 56px 56px; }
        .orb-hero { position: absolute; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, rgba(16,185,129,0.10), transparent 65%); width: 800px; height: 800px; top: -220px; left: 50%; transform: translateX(-50%); }
        .lp-badge { display: inline-flex; align-items: center; gap: 7px; padding: 5px 14px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.18); border-radius: 99px; font-size: 0.75rem; font-weight: 600; color: #10b981; letter-spacing: 0.04em; }
        .s-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #10b981; margin-bottom: 12px; }
        .h-sep { border: none; border-top: 1px solid rgba(255,255,255,0.05); margin: 0; }
        .stat-val { font-family: var(--font-display), sans-serif; font-weight: 800; font-size: 2.1rem; line-height: 1; background: linear-gradient(120deg, #10b981, #06b6d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .stat-lbl { color: #5a6a85; font-size: 0.8rem; margin-top: 5px; }
        .step-n { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.06)); border: 1px solid rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; font-family: var(--font-display), sans-serif; font-weight: 800; font-size: 0.9rem; color: #10b981; flex-shrink: 0; margin-bottom: 20px; }
        .feat-card { background: rgba(255,255,255,0.022); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 28px; transition: border-color 0.2s, background 0.2s, transform 0.2s; }
        .feat-card:hover { border-color: rgba(16,185,129,0.22); background: rgba(16,185,129,0.03); transform: translateY(-3px); }
        .feat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(16,185,129,0.14), rgba(6,182,212,0.08)); border: 1px solid rgba(16,185,129,0.18); color: #10b981; margin-bottom: 16px; }
        .ui-panel { background: rgba(7,15,32,0.97); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 28px 70px rgba(0,0,0,0.65), 0 0 0 1px rgba(16,185,129,0.04); }
        .ui-row { padding: 10px 14px; background: rgba(255,255,255,0.018); border-radius: 8px; margin-bottom: 6px; border: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between; }
        .code-panel { background: #060e1c; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; overflow: hidden; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; line-height: 1.75; }
        .code-hdr { background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 10px 16px; display: flex; align-items: center; gap: 7px; }
        @keyframes lp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes lp-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .anim-float { animation: lp-float 4s ease-in-out infinite; }
        .anim-blink { animation: lp-blink 1s step-end infinite; }
        .stat-cell { padding: 32px 20px; text-align: center; border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); }
        .stat-cell:nth-child(2n) { border-right: none; }
        @media (min-width: 768px) {
          .stat-cell { border-bottom: none; border-right: 1px solid rgba(255,255,255,0.05); }
          .stat-cell:nth-child(2n) { border-right: 1px solid rgba(255,255,255,0.05); }
          .stat-cell:last-child { border-right: none; }
        }
      `}</style>

      {/* NAV */}
      <PublicHeader />

      {/* MAIN CONTENT */}
      <main id="main-content">

      {/* HERO */}
      <section className="hero-grid" style={{ position: "relative", overflow: "hidden" }}>
        <div className="orb-hero" />
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center py-24 lg:py-28">
            {/* left */}
            <div>
              <div className="lp-badge" style={{ marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                Open Source / MCP Compatible
              </div>
              <h1 className="h-display" style={{ fontSize: "clamp(1.9rem, 3.5vw, 2.75rem)", marginBottom: 22 }}>
                Your docs, searchable from{" "}
                <span className="g-text">every AI tool you use</span>
              </h1>
              <p style={{ fontSize: "1.0625rem", lineHeight: 1.72, color: "#7a8eaa", maxWidth: 460, marginBottom: 40 }}>
                ContextStream indexes your websites and repos, then connects them to Claude, Cursor, Zed, and any other tool that supports MCP. Add a source once and stop copy-pasting docs forever.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 44 }}>
                <Link href="/register" className="g-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 8, fontSize: "0.9375rem", textDecoration: "none" }}>
                  Get started free <ArrowRight size={15} />
                </Link>
                <Link href="https://github.com/jimseiwert/context-stream" target="_blank" className="ghost-btn" style={{ padding: "12px 24px", fontSize: "0.9375rem" }}>
                  <Code2 size={15} /> See the code
                </Link>
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {["MIT Licensed", "Self-hostable", "No vendor lock-in"].map(t => (
                  <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, color: "#5a6a85", fontSize: "0.8rem" }}>
                    <svg width="13" height="13" viewBox="0 0 13 13"><circle cx="6.5" cy="6.5" r="5.5" stroke="#10b981" strokeWidth="1.3" fill="none" /><path d="M4 6.5 L6 8.5 L9 5" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* right — animated UI mockup */}
            <div className="anim-float" style={{ position: "relative" }}>
              <div className="ui-panel">
                <div style={{ background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", opacity: 0.65 }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", opacity: 0.65 }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", opacity: 0.65 }} />
                  <span style={{ marginLeft: 10, fontSize: "0.72rem", color: "#4a5568", fontFamily: "monospace" }}>contextstream — workspace</span>
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ fontSize: "0.7rem", color: "#3d4f6a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Indexed Sources</div>
                  {[
                    { emoji: "🌐", name: "react.dev", badge: "✓ 847 pages", bc: "#10b981" },
                    { emoji: "📦", name: "github.com/my-org/api", badge: "↻ syncing", bc: "#06b6d4" },
                    { emoji: "📄", name: "internal.docs.company.com", badge: "queued", bc: "#4a5568" },
                  ].map(s => (
                    <div key={s.name} className="ui-row">
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span>{s.emoji}</span>
                        <span style={{ fontSize: "0.78rem", color: "#8899bb", fontFamily: "monospace" }}>{s.name}</span>
                      </span>
                      <span style={{ fontSize: "0.68rem", color: s.bc, fontWeight: 600 }}>{s.badge}</span>
                    </div>
                  ))}
                  <hr className="h-sep" style={{ margin: "18px 0" }} />
                  <div style={{ fontSize: "0.7rem", color: "#3d4f6a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Live AI Query via MCP</div>
                  <div style={{ padding: "11px 14px", background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.14)", borderRadius: 8, fontFamily: "monospace", fontSize: "0.78rem", color: "#8899bb", marginBottom: 10 }}>
                    <span style={{ color: "#3d5a73" }}>&gt; </span>
                    <span style={{ color: "#06b6d4" }}>How does useEffect cleanup work?</span>
                  </div>
                  <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, fontSize: "0.76rem", color: "#7a8eaa", lineHeight: 1.65 }}>
                    <span style={{ color: "#06b6d4", fontSize: "0.68rem", display: "block", marginBottom: 7 }}>◎ 3 passages matched · react.dev</span>
                    The cleanup function runs before the component unmounts, preventing memory leaks by cancelling subscriptions...<span className="anim-blink" style={{ color: "#10b981" }}>▋</span>
                  </div>
                  <div style={{ display: "flex", gap: 7, marginTop: 16, flexWrap: "wrap" }}>
                    {["Claude Desktop", "Cursor", "Zed", "Windsurf"].map((t, i) => (
                      <span key={t} style={{ padding: "3px 10px", background: i === 0 ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${i === 0 ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 6, fontSize: "0.67rem", color: i === 0 ? "#10b981" : "#4a5568", fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ position: "absolute", top: -24, right: -24, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.14),transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -32, left: -32, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle,rgba(6,182,212,0.09),transparent 70%)", pointerEvents: "none" }} />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <hr className="h-sep" />
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            { v: "< 5 min", l: "URL to indexed" },
            { v: "Hybrid", l: "BM25 plus vector search" },
            { v: "MCP", l: "Native protocol support" },
            { v: "MIT", l: "Free to self-host" },
          ].map((s) => (
            <div key={s.l} className="stat-cell">
              <div className="stat-val">{s.v}</div>
              <div className="stat-lbl">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <hr className="h-sep" />

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div className="s-label">How it works</div>
          <h2 className="h-display" style={{ fontSize: "clamp(1.75rem, 3vw, 2.4rem)" }}>From URL to AI-ready in minutes</h2>
          <p style={{ color: "#7a8eaa", marginTop: 14, maxWidth: 460, margin: "14px auto 0", lineHeight: 1.65 }}>
            No training pipelines. No complex configuration. Add a source and your AI gets perfect context.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0" style={{ position: "relative" }}>
          <div className="hidden md:block" style={{ position: "absolute", top: 21, left: "calc(50%/3 + 22px)", right: "calc(50%/3 + 22px)", height: 1, background: "linear-gradient(90deg,rgba(16,185,129,0.3),rgba(6,182,212,0.3),rgba(59,130,246,0.3))", zIndex: 0 }} />
          {[
            { n: "01", t: "Add a Source", d: "Paste a URL, point to a GitHub repo, or drop in your docs. We find the pages, you don't have to list them.", note: "Supports websites, sitemaps, GitHub repos" },
            { n: "02", t: "Auto-Index", d: "We scrape, chunk, and embed everything in the background. Hybrid keyword plus vector search means results hold up in practice.", note: "Runs automatically, re-syncs on schedule" },
            { n: "03", t: "Query via AI", d: "Drop one config block into Claude Desktop or your editor. Ask a question, get the right docs back, every time.", note: "MCP-native, zero extra tooling required" },
          ].map(s => (
            <div key={s.n} style={{ padding: "0 32px 32px", position: "relative", zIndex: 1 }}>
              <div className="step-n">{s.n}</div>
              <h3 className="h-display" style={{ fontSize: "1.175rem", marginBottom: 10 }}>{s.t}</h3>
              <p style={{ color: "#7a8eaa", fontSize: "0.9rem", lineHeight: 1.68, marginBottom: 8 }}>{s.d}</p>
              <p style={{ color: "#3d4f6a", fontSize: "0.78rem", fontStyle: "italic" }}>{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <hr className="h-sep" />
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="s-label">Features</div>
          <h2 className="h-display" style={{ fontSize: "clamp(1.75rem, 3vw, 2.4rem)" }}>Built for AI-first developers</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.title} className="feat-card">
              <div className="feat-icon">{f.icon}</div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#dce4f0", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.65, color: "#5a6a85" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CODE SNIPPET */}
      <hr className="h-sep" />
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "96px 24px" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center" style={{ background: "rgba(7,15,32,0.5)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: "56px 48px" }}>
          <div>
            <div className="s-label">Quick Setup</div>
            <h2 className="h-display" style={{ fontSize: "1.9rem", marginBottom: 16 }}>
              One config block.<br />
              <span className="g-text">Infinite context.</span>
            </h2>
            <p style={{ color: "#7a8eaa", fontSize: "0.9375rem", lineHeight: 1.72, marginBottom: 32 }}>
              Drop this into your Claude Desktop config. That's it. Every indexed source becomes available to your AI straight away.
            </p>
            <Link href="/register" className="g-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8, fontSize: "0.875rem", textDecoration: "none" }}>
              Get your API key <ArrowRight size={14} />
            </Link>
          </div>
          <div className="code-panel">
            <div className="code-hdr">
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", opacity: 0.6 }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", opacity: 0.6 }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", opacity: 0.6 }} />
              <span style={{ marginLeft: 8, fontSize: "0.7rem", color: "#3d4f6a" }}>claude_desktop_config.json</span>
            </div>
            <div style={{ padding: "22px 24px", overflowX: "auto" }}>
              <pre style={{ margin: 0, color: "#5a6a85", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem", lineHeight: 1.75 }}>
                <span style={{ color: "#4a5a73" }}>{`{\n  `}</span>
                <span style={{ color: "#4a5a73" }}>&quot;mcpServers&quot;</span>
                <span style={{ color: "#4a5a73" }}>{`: {\n    `}</span>
                <span style={{ color: "#06b6d4" }}>&quot;contextstream&quot;</span>
                <span style={{ color: "#4a5a73" }}>{`: {\n      `}</span>
                <span style={{ color: "#4a5a73" }}>&quot;command&quot;</span>
                <span style={{ color: "#4a5a73" }}>{`: `}</span>
                <span style={{ color: "#10b981" }}>&quot;npx&quot;</span>
                <span style={{ color: "#4a5a73" }}>{`,\n      `}</span>
                <span style={{ color: "#4a5a73" }}>&quot;args&quot;</span>
                <span style={{ color: "#4a5a73" }}>{`: [`}</span>
                <span style={{ color: "#10b981" }}>&quot;-y&quot;</span>
                <span style={{ color: "#4a5a73" }}>{`, `}</span>
                <span style={{ color: "#10b981" }}>&quot;@contextstream/mcp&quot;</span>
                <span style={{ color: "#4a5a73" }}>{`],\n      `}</span>
                <span style={{ color: "#4a5a73" }}>&quot;env&quot;</span>
                <span style={{ color: "#4a5a73" }}>{`: {\n        `}</span>
                <span style={{ color: "#4a5a73" }}>&quot;API_KEY&quot;</span>
                <span style={{ color: "#4a5a73" }}>{`: `}</span>
                <span style={{ color: "#e9c46a" }}>&quot;cs_live_••••••••&quot;</span>
                <span style={{ color: "#4a5a73" }}>{`\n      }\n    }\n  }\n}`}</span>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "100px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 55% at 50% 100%, rgba(16,185,129,0.07), transparent)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}>
          <div className="lp-badge" style={{ margin: "0 auto 24px", display: "inline-flex" }}>
            Free to get started
          </div>
          <h2 className="h-display" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", marginBottom: 18 }}>
            Better context means<br />
            <span className="g-text">better answers</span>
          </h2>
          <p style={{ color: "#7a8eaa", fontSize: "1rem", lineHeight: 1.7, marginBottom: 40 }}>
            Stop digging through docs mid-conversation. Index them once and let your tools pull the right sections automatically.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="g-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 8, fontSize: "0.9375rem", textDecoration: "none" }}>
              Start Indexing for Free <ArrowRight size={15} />
            </Link>
            <Link href="https://github.com/jimseiwert/context-stream" target="_blank" className="ghost-btn" style={{ padding: "14px 28px", fontSize: "0.9375rem" }}>
              <Code2 size={15} /> Self-Host
            </Link>
          </div>
        </div>
      </section>

      </main>

      <PublicFooter />
    </div>
  );
}
