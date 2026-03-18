"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VectorStoreWizard } from "@/components/admin/vector-store-wizard";
import { RagEngineForm } from "@/components/admin/rag-engine-form";
import { Plus } from "lucide-react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const dynamic = "force-dynamic";

const queryClient = new QueryClient();

function SystemSettingsContent() {
  const [showVsWizard, setShowVsWizard] = useState(false);
  const [showRagForm, setShowRagForm] = useState(false);

  const { data: vsData, refetch: refetchVs } = useQuery({
    queryKey: ["vector-store-configs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vector-store-config");
      if (!res.ok) throw new Error("Failed to fetch vector store configs");
      return res.json() as Promise<{ configs: Array<{ id: string; name: string; storeProvider: string; embeddingProvider: string; isActive: boolean }> }>;
    },
  });

  const { data: ragData, refetch: refetchRag } = useQuery({
    queryKey: ["rag-engine-configs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rag-engine-config");
      if (!res.ok) throw new Error("Failed to fetch RAG engine configs");
      return res.json() as Promise<{ configs: Array<{ id: string; name: string; provider: string; isActive: boolean }> }>;
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--app-text-primary)" }}>
          System Settings
        </h1>
        <p style={{ color: "var(--app-text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          Configure vector stores, embedding providers, and RAG engines.
        </p>
      </div>

      {/* Vector Stores Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--app-text-primary)" }}>
              Vector Stores
            </h2>
            <p style={{ color: "var(--app-text-muted)", fontSize: "0.8rem" }}>
              Each store includes its own embedding configuration.
            </p>
          </div>
          {!showVsWizard && (
            <Button size="sm" onClick={() => setShowVsWizard(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Vector Store
            </Button>
          )}
        </div>

        {showVsWizard && (
          <VectorStoreWizard
            onSuccess={() => { setShowVsWizard(false); void refetchVs(); }}
            onCancel={() => setShowVsWizard(false)}
          />
        )}

        {vsData?.configs && vsData.configs.length > 0 ? (
          <div className="space-y-2">
            {vsData.configs.map((cfg) => (
              <div
                key={cfg.id}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  border: cfg.isActive
                    ? "1px solid rgba(16,185,129,0.3)"
                    : "1px solid var(--app-border, rgba(255,255,255,0.06))",
                  background: cfg.isActive ? "rgba(16,185,129,0.04)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--app-text-primary)" }}>
                    {cfg.name || cfg.storeProvider}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "var(--app-text-muted)" }}>
                    {cfg.storeProvider} · Embedding: {cfg.embeddingProvider}
                  </p>
                </div>
                {cfg.isActive && (
                  <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--app-accent-green)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : !showVsWizard ? (
          <p style={{ fontSize: "0.875rem", color: "var(--app-text-muted)" }}>
            No vector stores configured yet.
          </p>
        ) : null}
      </div>

      {/* RAG Engines Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--app-text-primary)" }}>
              RAG Engines
            </h2>
            <p style={{ color: "var(--app-text-muted)", fontSize: "0.8rem" }}>
              Full-pipeline providers that handle chunking, embedding, and retrieval internally.
            </p>
          </div>
          {!showRagForm && (
            <Button size="sm" variant="outline" onClick={() => setShowRagForm(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add RAG Engine
            </Button>
          )}
        </div>

        {showRagForm && (
          <RagEngineForm
            onSuccess={() => { setShowRagForm(false); void refetchRag(); }}
            onCancel={() => setShowRagForm(false)}
          />
        )}

        {ragData?.configs && ragData.configs.length > 0 ? (
          <div className="space-y-2">
            {ragData.configs.map((cfg) => (
              <div
                key={cfg.id}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  border: cfg.isActive
                    ? "1px solid rgba(16,185,129,0.3)"
                    : "1px solid var(--app-border, rgba(255,255,255,0.06))",
                  background: cfg.isActive ? "rgba(16,185,129,0.04)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--app-text-primary)" }}>
                    {cfg.name || cfg.provider}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "var(--app-text-muted)" }}>
                    {cfg.provider}
                  </p>
                </div>
                {cfg.isActive && (
                  <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--app-accent-green)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : !showRagForm ? (
          <p style={{ fontSize: "0.875rem", color: "var(--app-text-muted)" }}>
            No RAG engines configured yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function SystemSettingsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <SystemSettingsContent />
    </QueryClientProvider>
  );
}
