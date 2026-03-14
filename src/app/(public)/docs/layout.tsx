import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Learn how to set up ContextStream, index your documentation sources, and connect them to Claude, Cursor, Zed, and other MCP-compatible AI tools. Guides, API reference, and self-hosting instructions.",
  keywords: ["ContextStream docs", "MCP setup guide", "documentation indexing tutorial", "Claude Desktop MCP config", "self-hosting guide"],
  alternates: {
    canonical: "https://contextstream.dev/docs",
  },
  openGraph: {
    title: "Documentation — ContextStream",
    description:
      "Setup guides, API reference, and self-hosting instructions for ContextStream.",
    url: "https://contextstream.dev/docs",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ContextStream — Make Any Docs AI-Accessible" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Documentation — ContextStream",
    description:
      "Setup guides, API reference, and self-hosting instructions for ContextStream.",
    images: ["/opengraph-image"],
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
