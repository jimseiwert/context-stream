import type { Metadata } from "next";

const OG_IMAGE = [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ContextStream — Make Any Docs AI-Accessible" }];

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for ContextStream. Start free with 50 searches/month. Upgrade to Starter ($9), Pro ($19), or Team ($49). Self-host free forever with our MIT-licensed open-source codebase.",
  keywords: ["ContextStream pricing", "MCP server pricing", "documentation search plans", "self-hosted free"],
  alternates: {
    canonical: "https://contextstream.dev/pricing",
  },
  openGraph: {
    title: "Pricing — ContextStream",
    description:
      "Start free. Upgrade when you need more. Or self-host for free — MIT licensed with no restrictions.",
    url: "https://contextstream.dev/pricing",
    type: "website",
    images: OG_IMAGE,
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — ContextStream",
    description:
      "Start free. Upgrade when you need more. Or self-host for free — MIT licensed with no restrictions.",
    images: ["/opengraph-image"],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What happens if I exceed my quota?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You'll receive warnings as you approach your limits. Once you reach your quota, you'll be prompted to upgrade to a higher plan to continue using the service.",
      },
    },
    {
      "@type": "Question",
      name: "Can I change plans at any time?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
      },
    },
    {
      "@type": "Question",
      name: "Do you offer refunds?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact us for a full refund.",
      },
    },
    {
      "@type": "Question",
      name: "What payment methods do you accept?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We accept all major credit cards and debit cards through Stripe. Enterprise customers can arrange invoicing.",
      },
    },
    {
      "@type": "Question",
      name: "Is self-hosting really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! ContextStream is open source and free to self-host with unlimited usage. You only pay for your own infrastructure costs (server, database, etc.).",
      },
    },
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
