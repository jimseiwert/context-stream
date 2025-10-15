import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ContextStream - AI-Accessible Documentation",
  description:
    "Make any documentation AI-accessible in minutes with ContextStream's MCP server",
  keywords: ["documentation", "MCP", "AI", "search", "indexing", "Claude"],
  authors: [{ name: "ContextStream" }],
  creator: "ContextStream",
  metadataBase: new URL("https://contextstream.dev"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://contextstream.dev",
    title: "ContextStream - AI-Accessible Documentation",
    description: "Make any documentation AI-accessible in minutes",
    siteName: "ContextStream",
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 630,
        alt: "ContextStream Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ContextStream - AI-Accessible Documentation",
    description: "Make any documentation AI-accessible in minutes",
    images: ["/logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: "font-sans",
                duration: 5000,
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
