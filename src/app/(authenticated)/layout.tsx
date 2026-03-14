import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const user = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email,
    role: (session.user as { role?: string }).role ?? "USER",
    image: session.user.image ?? null,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
