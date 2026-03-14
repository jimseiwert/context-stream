import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "ContextStream's terms of service. Read the terms and conditions that govern your use of the ContextStream documentation indexing and MCP search platform.",
  alternates: {
    canonical: "https://contextstream.dev/terms",
  },
  openGraph: {
    title: "Terms of Service — ContextStream",
    description: "Terms and conditions for using the ContextStream platform.",
    url: "https://contextstream.dev/terms",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ContextStream — Make Any Docs AI-Accessible" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
