/**
 * Documentation Page
 */

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicWrapper } from "@/components/layout/public-wrapper";
import { Book, Code2, GitBranch, Sparkles, Zap } from "lucide-react";
import Link from "next/link";


export default function DocsPage() {
  return (
    <PublicWrapper>
      <PublicHeader />

      {/* Main Content */}
      <main id="main-content" style={{ flex: 1 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px" }}>
          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="pub-s-label" style={{ marginBottom: 12 }}>
              Docs
            </div>
            <h1
              className="pub-h-display"
              style={{
                fontSize: "clamp(1.6rem,4.5vw,2.8rem)",
                marginBottom: 16,
                color: "#dce4f0",
              }}
            >
              Documentation
            </h1>
            <p style={{ fontSize: "1.1rem", color: "#8899bb" }}>
              Everything you need to get started with ContextStream
            </p>
          </div>

          {/* Guide cards */}
          <div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: 24, marginBottom: 48 }}
          >
            {/* Quick Start */}
            <div className="pub-card">
              <div className="pub-feat-icon">
                <Zap size={20} />
              </div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#dce4f0",
                  marginBottom: 6,
                }}
              >
                Quick Start
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  marginBottom: 16,
                }}
              >
                Get up and running with ContextStream in minutes
              </p>
              <ol
                style={{
                  paddingLeft: "1.2em",
                  margin: 0,
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  lineHeight: 1.8,
                }}
              >
                <li>Create an account</li>
                <li>Add your first documentation source</li>
                <li>Configure the MCP server in Claude Desktop</li>
                <li>Start asking questions about your docs!</li>
              </ol>
            </div>

            {/* MCP Integration */}
            <div className="pub-card">
              <div className="pub-feat-icon">
                <Code2 size={20} />
              </div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#dce4f0",
                  marginBottom: 6,
                }}
              >
                MCP Integration
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  marginBottom: 16,
                }}
              >
                Connect ContextStream to Claude Desktop
              </p>
              <p style={{ fontSize: "0.875rem", color: "#8899bb", marginBottom: 12 }}>
                Add ContextStream as an MCP server in your Claude Desktop
                config:
              </p>
              <div className="pub-code-panel">
                <div className="pub-code-hdr">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.15)",
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#5a6a85" }}>
                    claude_desktop_config.json
                  </span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: "14px 16px",
                    color: "#8899bb",
                    overflowX: "auto",
                  }}
                >{`{
  "mcpServers": {
    "contextstream": {
      "command": "npx",
      "args": [
        "@contextstream/mcp-server",
        "--api-key",
        "your_api_key"
      ]
    }
  }
}`}</pre>
              </div>
            </div>

            {/* Adding Sources */}
            <div className="pub-card">
              <div className="pub-feat-icon">
                <Book size={20} />
              </div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#dce4f0",
                  marginBottom: 6,
                }}
              >
                Adding Sources
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  marginBottom: 16,
                }}
              >
                Index documentation websites and repositories
              </p>
              <p style={{ fontSize: "0.875rem", color: "#8899bb", marginBottom: 8 }}>
                Supported source types:
              </p>
              <ul
                style={{
                  paddingLeft: "1.2em",
                  margin: 0,
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  lineHeight: 1.8,
                }}
              >
                <li>Public documentation websites</li>
                <li>GitHub repositories</li>
                <li>Confluence spaces (coming soon)</li>
                <li>Custom sources</li>
              </ul>
            </div>

            {/* Self-Hosting */}
            <div className="pub-card">
              <div className="pub-feat-icon">
                <GitBranch size={20} />
              </div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#dce4f0",
                  marginBottom: 6,
                }}
              >
                Self-Hosting
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#8899bb",
                  marginBottom: 16,
                }}
              >
                Deploy ContextStream on your own infrastructure
              </p>
              <p style={{ fontSize: "0.875rem", color: "#8899bb", marginBottom: 12 }}>
                ContextStream is open source and can be self-hosted with Docker:
              </p>
              <div className="pub-code-panel">
                <div className="pub-code-hdr">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.15)",
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#5a6a85" }}>
                    terminal
                  </span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: "14px 16px",
                    color: "#8899bb",
                    overflowX: "auto",
                  }}
                >{`docker-compose up -d`}</pre>
              </div>
            </div>
          </div>

          {/* Need Help? card */}
          <div
            className="pub-card"
            style={{ border: "1px solid rgba(16,185,129,0.3)" }}
          >
            <div className="pub-feat-icon">
              <Sparkles size={20} />
            </div>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#dce4f0",
                marginBottom: 6,
              }}
            >
              Need Help?
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#8899bb", marginBottom: 28 }}>
              We&apos;re here to help you get the most out of ContextStream
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <h3
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#dce4f0",
                    marginBottom: 6,
                  }}
                >
                  GitHub Issues
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#8899bb",
                    marginBottom: 12,
                  }}
                >
                  Report bugs, request features, or ask questions
                </p>
                <Link
                  href="https://github.com/contextstream/contextstream/issues"
                  target="_blank"
                  className="pub-ghost-btn"
                  style={{ padding: "8px 18px", fontSize: "0.875rem" }}
                >
                  Open an Issue
                </Link>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#dce4f0",
                    marginBottom: 6,
                  }}
                >
                  Full Documentation
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#8899bb",
                    marginBottom: 12,
                  }}
                >
                  Visit our comprehensive documentation on GitHub
                </p>
                <Link
                  href="https://github.com/contextstream/contextstream"
                  target="_blank"
                  className="pub-ghost-btn"
                  style={{ padding: "8px 18px", fontSize: "0.875rem" }}
                >
                  View on GitHub
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </PublicWrapper>
  );
}
