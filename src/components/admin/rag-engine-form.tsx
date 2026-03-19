"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderConfigForm } from "@/components/admin/provider-config-form";
import { apiClient } from "@/lib/api-client";

import { vertexAIRagEngineProvider } from "@/lib/providers/rag-engine/vertex-ai-rag";
import type { FieldDefinition } from "@/lib/providers/types";

const RAG_ENGINE_PROVIDERS: {
  id: string;
  displayName: string;
  description: string;
  fields: FieldDefinition[];
}[] = [vertexAIRagEngineProvider];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RagEngineFormProps {
  existingConfig?: {
    id: string;
    name: string;
    provider: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

interface MutationBody {
  name: string;
  provider: string;
  connectionConfig: Record<string, unknown>;
}

interface TestResult {
  ok: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RagEngineForm({
  existingConfig,
  onSuccess,
  onCancel,
}: RagEngineFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!existingConfig;

  const [providerId, setProviderId] = useState(
    existingConfig?.provider ?? RAG_ENGINE_PROVIDERS[0].id
  );
  const [name, setName] = useState(existingConfig?.name ?? "");
  const [apiError, setApiError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const selectedProvider =
    RAG_ENGINE_PROVIDERS.find((p) => p.id === providerId) ??
    RAG_ENGINE_PROVIDERS[0];

  // Fetch existing decrypted (non-sensitive) field values when editing
  const { data: existingData } = useQuery({
    queryKey: ["rag-engine-config", existingConfig?.id],
    enabled: isEditing,
    queryFn: async () => {
      const res = await fetch(`/api/admin/rag-engine-config/${existingConfig!.id}`);
      if (!res.ok) throw new Error("Failed to load config");
      const json = (await res.json()) as {
        config: {
          connectionConfig: Record<string, unknown>;
          hasServiceAccountJson: boolean;
        };
      };
      return json.config;
    },
  });

  // Keep name in sync if existingConfig changes (shouldn't normally, but defensive)
  useEffect(() => {
    if (existingConfig?.name) setName(existingConfig.name);
  }, [existingConfig?.name]);

  // ---------------------------------------------------------------------------
  // Save mutation
  // ---------------------------------------------------------------------------

  const mutation = useMutation({
    mutationFn: async (body: MutationBody) => {
      if (isEditing) {
        return apiClient.patch(
          `/api/admin/rag-engine-config/${existingConfig!.id}`,
          body
        );
      }
      return apiClient.post("/api/admin/rag-engine-config", body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rag-engine-configs"] });
      onSuccess();
    },
    onError: (err: unknown) => {
      const e = err as { data?: { error?: string }; message?: string };
      setApiError(e.data?.error ?? e.message ?? "Failed to save configuration");
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSubmit = (values: Record<string, unknown>) => {
    setApiError(null);
    setTestResult(null);
    mutation.mutate({ name, provider: providerId, connectionConfig: values });
  };

  const handleTest = async (values: Record<string, unknown>) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/rag-engine-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionConfig: values }),
      });
      const data = (await res.json()) as {
        latencyMs?: number;
        corpusName?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        setTestResult({ ok: false, message: data.error?.message ?? "Test failed" });
      } else {
        setTestResult({
          ok: true,
          message: `Connected — ${data.corpusName ?? "corpus reachable"} (${data.latencyMs ?? 0}ms)`,
        });
      }
    } catch {
      setTestResult({ ok: false, message: "Network error" });
    } finally {
      setIsTesting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Build defaultValues for the form: existing non-sensitive fields, with a
  // placeholder hint for the service account field when one is already stored.
  const defaultValues: Record<string, unknown> = existingData?.connectionConfig ?? {};

  return (
    <Card className="border-border/60 bg-[#030711]">
      <CardHeader className="pb-4">
        <CardTitle className="text-[#dce4f0]">
          {isEditing ? "Edit" : "Add"} RAG Engine
        </CardTitle>
        <CardDescription className="text-[#7a8eaa]">
          Configure a full-pipeline RAG engine provider
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ---- Config name ---- */}
        <div className="space-y-2">
          <Label htmlFor="rag-name" className="text-[#dce4f0]">
            Config Name
          </Label>
          <Input
            id="rag-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Production Vertex AI RAG"
          />
        </div>

        <Separator className="bg-border/40" />

        {/* ---- Provider selector ---- */}
        <div className="space-y-2">
          <Label className="text-[#dce4f0]">Provider</Label>
          <Select
            value={providerId}
            onValueChange={(val) => setProviderId(val)}
            disabled={isEditing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a RAG engine provider" />
            </SelectTrigger>
            <SelectContent>
              {RAG_ENGINE_PROVIDERS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isEditing && (
            <p className="text-xs text-[#7a8eaa]">
              Provider cannot be changed after creation.
            </p>
          )}
          {selectedProvider.description && (
            <p className="text-xs text-[#7a8eaa]">{selectedProvider.description}</p>
          )}
        </div>

        {/* Service account hint when editing and one is already stored */}
        {isEditing && existingData?.hasServiceAccountJson && (
          <p className="text-xs text-[#7a8eaa]">
            A service account JSON is already stored. Upload a new file only if you want to replace it.
          </p>
        )}

        <Separator className="bg-border/40" />

        {/* ---- Dynamic provider fields ---- */}
        <ProviderConfigForm
          key={`${providerId}-${existingConfig?.id ?? "new"}`}
          fields={selectedProvider.fields}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onTest={handleTest}
          submitLabel={isEditing ? "Update Configuration" : "Create Configuration"}
          isLoading={mutation.isPending}
          isTesting={isTesting}
        />

        {/* ---- Test result ---- */}
        {testResult && (
          <div
            className="flex items-start gap-2 rounded-md p-3 text-sm"
            style={{
              border: testResult.ok ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)",
              background: testResult.ok ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
              color: testResult.ok ? "var(--app-accent-green)" : "#ef4444",
            }}
          >
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ display: testResult.ok ? undefined : "none" }}
            />
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ display: testResult.ok ? "none" : undefined }}
            />
            <span>{testResult.message}</span>
          </div>
        )}

        {/* ---- API error ---- */}
        {apiError && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* ---- Cancel ---- */}
        <div className="flex justify-start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={mutation.isPending}
            className="text-[#7a8eaa] hover:text-[#dce4f0]"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
