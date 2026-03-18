"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

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

// ---------------------------------------------------------------------------
// Provider registry — imported directly (pure TS, no server-only imports)
// ---------------------------------------------------------------------------

import { vertexAIRagEngineProvider } from "@/lib/providers/rag-engine/vertex-ai-rag";
import type { FieldDefinition } from "@/lib/providers/types";

// ---------------------------------------------------------------------------
// Registry map for this form (client-safe)
// ---------------------------------------------------------------------------

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

  const selectedProvider =
    RAG_ENGINE_PROVIDERS.find((p) => p.id === providerId) ??
    RAG_ENGINE_PROVIDERS[0];

  // ---------------------------------------------------------------------------
  // Mutation
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
  // Form submit
  // ---------------------------------------------------------------------------

  const handleSubmit = (values: Record<string, unknown>) => {
    setApiError(null);
    mutation.mutate({
      name,
      provider: providerId,
      connectionConfig: values,
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
        {/* ---- Provider selector ---- */}
        <div className="space-y-2">
          <Label className="text-[#dce4f0]">Provider</Label>
          <Select
            value={providerId}
            onValueChange={(val) => {
              setProviderId(val);
            }}
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
            <p className="text-xs text-[#7a8eaa]">
              {selectedProvider.description}
            </p>
          )}
        </div>

        <Separator className="bg-border/40" />

        {/* ---- Dynamic provider fields ---- */}
        <ProviderConfigForm
          key={providerId}
          fields={selectedProvider.fields}
          onSubmit={handleSubmit}
          submitLabel={
            isEditing ? "Update Configuration" : "Create Configuration"
          }
          isLoading={mutation.isPending}
        />

        {/* ---- Config name ---- */}
        <Separator className="bg-border/40" />

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
