// MCP Server Page — Server Component
// Shows MCP connection details, config snippets, API key list, and test panel.

import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { CopyButton } from "@/components/search/copy-button";
import { McpTestPanel } from "@/components/search/mcp-test-panel";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Config snippet generators
// ---------------------------------------------------------------------------

function claudeDesktopConfig(mcpUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        "context-stream": {
          url: mcpUrl,
          transport: "http",
        },
      },
    },
    null,
    2
  );
}

function cursorConfig(mcpUrl: string): string {
  return JSON.stringify(
    {
      mcp: {
        servers: [
          {
            name: "context-stream",
            url: mcpUrl,
            transport: "http",
          },
        ],
      },
    },
    null,
    2
  );
}

function zedConfig(mcpUrl: string): string {
  return JSON.stringify(
    {
      context_servers: {
        "context-stream": {
          url: mcpUrl,
          transport: "http",
        },
      },
    },
    null,
    2
  );
}

// ---------------------------------------------------------------------------
// Helper: format relative time
// ---------------------------------------------------------------------------
function formatRelativeTime(date: Date | null): string {
  if (!date) return "Never";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Code block with copy button
// ---------------------------------------------------------------------------
function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="rounded-lg border bg-muted/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <CopyButton text={code} label="Copy" />
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function McpPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  const mcpUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com"}/api/mcp`;

  // Fetch user's API keys (exclude the raw key — it was only shown at creation time)
  const userApiKeys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(apiKeys.createdAt);

  return (
    <div className="flex flex-col gap-8 p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">MCP Server</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect Claude Desktop, Cursor, Zed, and other AI tools to your
          ContextStream knowledge base via the Model Context Protocol.
        </p>
      </div>

      {/* Server URL */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Server URL</h2>
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <code className="text-sm font-mono flex-1 truncate">{mcpUrl}</code>
          <CopyButton text={mcpUrl} label="Copy URL" />
        </div>
        <p className="text-xs text-muted-foreground">
          Use your API key as the Bearer token in{" "}
          <code className="font-mono bg-muted px-1 rounded">
            Authorization: Bearer sk_live_...
          </code>
        </p>
      </section>

      {/* Config snippets */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Add the following config to your AI tool to connect it to ContextStream.
        </p>

        <div className="flex flex-col gap-4">
          <CodeBlock
            label="Claude Desktop — claude_desktop_config.json"
            code={claudeDesktopConfig(mcpUrl)}
          />
          <CodeBlock
            label="Cursor — .cursor/mcp.json"
            code={cursorConfig(mcpUrl)}
          />
          <CodeBlock
            label="Zed — settings.json"
            code={zedConfig(mcpUrl)}
          />
        </div>
      </section>

      {/* API Keys */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Your API Keys</h2>
          <Link
            href="/settings#api-keys"
            className="text-sm text-primary hover:underline"
          >
            Manage API keys
          </Link>
        </div>

        {userApiKeys.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              You don&apos;t have any API keys yet.
            </p>
            <Link
              href="/settings#api-keys"
              className="text-sm text-primary hover:underline"
            >
              Create your first API key →
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Last used
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Expires
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {userApiKeys.map((key) => {
                  const isExpired =
                    key.expiresAt != null && key.expiresAt < new Date();
                  return (
                    <tr key={key.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{key.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatRelativeTime(key.lastUsedAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {key.expiresAt
                          ? key.expiresAt.toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={isExpired ? "error" : "success"}
                        >
                          {isExpired ? "Expired" : "Active"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Test panel */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Test the MCP Server</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Send a search query and inspect the raw JSON-RPC response.
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <McpTestPanel mcpUrl={mcpUrl} />
        </div>
      </section>
    </div>
  );
}
