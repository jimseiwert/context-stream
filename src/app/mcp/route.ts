// MCP Server — Streamable HTTP Transport
// Implements the Model Context Protocol over HTTP (POST + GET for SSE).
// Auth: Authorization: Bearer <api_key>
//
// Tools:
//   search          — hybrid BM25 + vector search
//   list_sources    — list sources for a workspace
//   get_document    — retrieve full document content
//   list_collections — list collections for a workspace

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, getApiKeyFromHeaders } from "@/lib/auth/api-key";
import { hybridSearch } from "@/lib/search/hybrid-search";
import { db } from "@/lib/db";
import {
  sources,
  workspaceSources,
  collections,
  pages,
  documents,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// MCP protocol types (minimal subset for Streamable HTTP)
// ---------------------------------------------------------------------------

interface McpRequest {
  jsonrpc: "2.0";
  id: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface McpSuccessResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result: unknown;
}

interface McpErrorResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  error: { code: number; message: string; data?: unknown };
}

type McpResponse = McpSuccessResponse | McpErrorResponse;

// JSON-RPC error codes
const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

function mcpError(
  id: number | string | null,
  code: number,
  message: string,
  data?: unknown
): McpErrorResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function mcpSuccess(id: number | string | null, result: unknown): McpSuccessResponse {
  return { jsonrpc: "2.0", id, result };
}

// ---------------------------------------------------------------------------
// Tool schemas (for tools/list response)
// ---------------------------------------------------------------------------

const TOOL_DEFINITIONS = [
  {
    name: "search",
    description:
      "Hybrid BM25 + vector search across indexed sources. Returns ranked text excerpts with source metadata.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        workspace_id: {
          type: "string",
          description: "Limit results to sources in this workspace",
        },
        collection_id: {
          type: "string",
          description: "Limit results to sources in this collection",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 10, max 50)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_sources",
    description: "List all sources available in a workspace including their status.",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string", description: "Workspace ID to list sources for" },
      },
      required: ["workspace_id"],
    },
  },
  {
    name: "get_document",
    description:
      "Retrieve the full text content of a document or page by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: {
          type: "string",
          description: "ID of a page or document to retrieve",
        },
      },
      required: ["document_id"],
    },
  },
  {
    name: "list_collections",
    description: "List all collections in a workspace.",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string", description: "Workspace ID" },
      },
      required: ["workspace_id"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function handleSearch(
  args: Record<string, unknown>,
  _userId: string
): Promise<string> {
  const query = args["query"];
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("'query' must be a non-empty string");
  }

  const workspaceId =
    typeof args["workspace_id"] === "string" ? args["workspace_id"] : undefined;
  const collectionId =
    typeof args["collection_id"] === "string" ? args["collection_id"] : undefined;
  const limit = Math.min(
    typeof args["limit"] === "number" ? args["limit"] : 10,
    50
  );

  const { results, total } = await hybridSearch(query, {
    workspaceId,
    collectionId,
    limit,
  });

  if (results.length === 0) {
    return `No results found for query: "${query}"`;
  }

  const lines: string[] = [
    `Found ${total} result(s) for "${query}" (showing top ${results.length}):`,
    "",
  ];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    lines.push(`## ${i + 1}. ${r.title}`);
    lines.push(`Source: ${r.sourceName} (${r.sourceType})`);
    lines.push(`Score: ${r.score.toFixed(4)} (BM25: ${r.bm25Score.toFixed(4)}, Vector: ${r.vectorScore.toFixed(4)})`);
    lines.push(`Chunk ID: ${r.chunkId}`);
    lines.push("");
    lines.push(r.excerpt);
    lines.push("");
  }

  return lines.join("\n");
}

async function handleListSources(
  args: Record<string, unknown>,
  _userId: string
): Promise<string> {
  const workspaceId = args["workspace_id"];
  if (typeof workspaceId !== "string" || !workspaceId.trim()) {
    throw new Error("'workspace_id' must be a non-empty string");
  }

  const rows = await db
    .select({
      sourceId: workspaceSources.sourceId,
      source: sources,
    })
    .from(workspaceSources)
    .innerJoin(sources, eq(sources.id, workspaceSources.sourceId))
    .where(eq(workspaceSources.workspaceId, workspaceId));

  if (rows.length === 0) {
    return `No sources found for workspace ${workspaceId}`;
  }

  const lines: string[] = [`Sources in workspace ${workspaceId}:`, ""];
  for (const row of rows) {
    const s = row.source;
    lines.push(
      `- ${s.name ?? s.domain} (${s.type}) — status: ${s.status} — pages: ${s.pageCount} — id: ${s.id}`
    );
  }

  return lines.join("\n");
}

async function handleGetDocument(
  args: Record<string, unknown>,
  _userId: string
): Promise<string> {
  const documentId = args["document_id"];
  if (typeof documentId !== "string" || !documentId.trim()) {
    throw new Error("'document_id' must be a non-empty string");
  }

  // Try pages first, then documents
  const page = await db.query.pages.findFirst({
    where: eq(pages.id, documentId),
    with: { source: true },
  });

  if (page) {
    const source = page.source;
    const lines: string[] = [
      `# ${page.title ?? "Untitled Page"}`,
      `Source: ${source.name ?? source.domain}`,
      `URL: ${page.url}`,
      `Indexed: ${page.indexedAt.toISOString()}`,
      "",
      page.contentText,
    ];
    return lines.join("\n");
  }

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
    with: { source: true },
  });

  if (doc) {
    const source = doc.source;
    const lines: string[] = [
      `# ${doc.filename}`,
      `Source: ${source.name ?? source.domain}`,
      `Type: ${doc.type}`,
      `Indexed: ${doc.indexedAt?.toISOString() ?? "not indexed"}`,
      "",
      doc.contentText,
    ];
    return lines.join("\n");
  }

  throw new Error(`Document not found: ${documentId}`);
}

async function handleListCollections(
  args: Record<string, unknown>,
  _userId: string
): Promise<string> {
  const workspaceId = args["workspace_id"];
  if (typeof workspaceId !== "string" || !workspaceId.trim()) {
    throw new Error("'workspace_id' must be a non-empty string");
  }

  const rows = await db.query.collections.findMany({
    where: eq(collections.workspaceId, workspaceId),
    with: { collectionSources: true },
  });

  if (rows.length === 0) {
    return `No collections found for workspace ${workspaceId}`;
  }

  const lines: string[] = [`Collections in workspace ${workspaceId}:`, ""];
  for (const c of rows) {
    lines.push(
      `- ${c.name} — ${c.collectionSources.length} source(s) — id: ${c.id}${c.description ? ` — ${c.description}` : ""}`
    );
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// MCP method dispatcher
// ---------------------------------------------------------------------------

async function dispatchMethod(
  method: string,
  params: Record<string, unknown>,
  userId: string,
  id: number | string | null
): Promise<McpResponse> {
  // --- Protocol lifecycle methods ---

  if (method === "initialize") {
    return mcpSuccess(id, {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "context-stream",
        version: "1.0.0",
      },
    });
  }

  if (method === "notifications/initialized") {
    // Client confirmation — no response needed but return success
    return mcpSuccess(id, {});
  }

  if (method === "ping") {
    return mcpSuccess(id, {});
  }

  // --- Tools ---

  if (method === "tools/list") {
    return mcpSuccess(id, { tools: TOOL_DEFINITIONS });
  }

  if (method === "tools/call") {
    const toolName = params["name"];
    // Arguments may be absent for tools with no required params
    const toolArgs = (params["arguments"] as Record<string, unknown>) ?? {};

    if (typeof toolName !== "string") {
      return mcpError(id, JSON_RPC_ERRORS.INVALID_PARAMS, "'name' is required");
    }

    try {
      let text: string;

      switch (toolName) {
        case "search":
          text = await handleSearch(toolArgs, userId);
          break;
        case "list_sources":
          text = await handleListSources(toolArgs, userId);
          break;
        case "get_document":
          text = await handleGetDocument(toolArgs, userId);
          break;
        case "list_collections":
          text = await handleListCollections(toolArgs, userId);
          break;
        default:
          return mcpError(
            id,
            JSON_RPC_ERRORS.METHOD_NOT_FOUND,
            `Unknown tool: ${toolName}`
          );
      }

      return mcpSuccess(id, {
        content: [{ type: "text", text }],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tool execution failed";
      return mcpSuccess(id, {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      });
    }
  }

  return mcpError(
    id,
    JSON_RPC_ERRORS.METHOD_NOT_FOUND,
    `Method not found: ${method}`
  );
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * POST /mcp — Main JSON-RPC endpoint.
 * Accepts a single request object or a batch array.
 */
export async function POST(request: NextRequest) {
  // Authenticate via API key
  const rawKey = getApiKeyFromHeaders(request.headers);
  if (!rawKey) {
    return NextResponse.json(
      mcpError(null, -32001, "Authorization required"),
      { status: 401 }
    );
  }

  let userId: string;
  try {
    userId = await validateApiKey(rawKey);
  } catch {
    return NextResponse.json(
      mcpError(null, -32001, "Invalid or expired API key"),
      { status: 401 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      mcpError(null, JSON_RPC_ERRORS.PARSE_ERROR, "Invalid JSON"),
      { status: 400 }
    );
  }

  // Handle batch requests
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map((item) => processSingleRequest(item, userId))
    );
    return NextResponse.json(responses, {
      headers: { "Content-Type": "application/json" },
    });
  }

  const response = await processSingleRequest(body, userId);
  return NextResponse.json(response, {
    headers: { "Content-Type": "application/json" },
  });
}

async function processSingleRequest(
  body: unknown,
  userId: string
): Promise<McpResponse> {
  if (
    !body ||
    typeof body !== "object" ||
    !("jsonrpc" in body) ||
    !("method" in body)
  ) {
    return mcpError(null, JSON_RPC_ERRORS.INVALID_REQUEST, "Invalid Request");
  }

  const req = body as McpRequest;
  const id = req.id ?? null;
  const method = req.method;
  const params = (req.params as Record<string, unknown>) ?? {};

  if (typeof method !== "string") {
    return mcpError(id, JSON_RPC_ERRORS.INVALID_REQUEST, "Method must be a string");
  }

  return dispatchMethod(method, params, userId, id);
}

/**
 * GET /mcp — SSE endpoint for streaming transport.
 * Responds with a minimal SSE stream indicating the server is available.
 * Full SSE streaming of notifications is not required for basic tool use.
 */
export async function GET(request: NextRequest) {
  // Authenticate via API key
  const rawKey = getApiKeyFromHeaders(request.headers);
  if (!rawKey) {
    return new NextResponse("Authorization required", { status: 401 });
  }

  try {
    await validateApiKey(rawKey);
  } catch {
    return new NextResponse("Invalid or expired API key", { status: 401 });
  }

  // Return a server-sent events stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send endpoint event per MCP Streamable HTTP spec
      const endpointEvent =
        `event: endpoint\ndata: ${JSON.stringify({ uri: "/mcp" })}\n\n`;
      controller.enqueue(encoder.encode(endpointEvent));
      // Keep connection open until client disconnects
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
