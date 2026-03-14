import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Hello, {session?.user.name ?? "there"}</h1>
        <p className="text-muted-foreground">Dashboard coming soon.</p>
      </div>
    </main>
  );
}
