import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://contextstream.dev/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
