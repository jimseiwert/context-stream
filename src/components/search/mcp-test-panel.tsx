"use client";

// MCP Test Panel — Client Component
// Lets users send a search query via the MCP server and see the raw JSON response.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface McpTestPanelProps {
  mcpUrl: string;
}

export function McpTestPanel({ mcpUrl }: McpTestPanelProps) {
  const [query, setQuery] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your API key.");
      return;
    }
    if (!query.trim()) {
      setError("Please enter a search query.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const body = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "search",
          arguments: { query, limit: 5 },
        },
      };

      const res = await fetch(mcpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            API Key
          </Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk_live_..."
            className="text-sm font-mono"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Search Query
          </Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="react hooks tutorial"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTest();
            }}
          />
        </div>
      </div>

      <Button onClick={handleTest} disabled={loading} className="self-start">
        {loading ? "Sending..." : "Send test request"}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {response && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Raw MCP Response
          </Label>
          <Textarea
            readOnly
            value={response}
            className="font-mono text-xs h-64 resize-y"
          />
        </div>
      )}
    </div>
  );
}
