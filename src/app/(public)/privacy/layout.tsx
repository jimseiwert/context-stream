import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "ContextStream's privacy policy. Learn how we collect, use, and protect your personal data when you use our documentation indexing and MCP search service.",
  alternates: {
    canonical: "https://contextstream.dev/privacy",
  },
  openGraph: {
    title: "Privacy Policy — ContextStream",
    description: "How ContextStream collects, uses, and protects your data.",
    url: "https://contextstream.dev/privacy",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ContextStream — Make Any Docs AI-Accessible" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
