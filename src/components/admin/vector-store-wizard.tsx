"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
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
// Provider field maps — imported directly (pure TS, no server-only imports)
// ---------------------------------------------------------------------------

import { pgvectorProvider } from "@/lib/providers/vector-store/pgvector";
import { qdrantProvider } from "@/lib/providers/vector-store/qdrant";
import { pineconeProvider } from "@/lib/providers/vector-store/pinecone";
import { weaviateProvider } from "@/lib/providers/vector-store/weaviate";
import { vertexAIVectorSearchProvider } from "@/lib/providers/vector-store/vertex-ai-vector-search";

import { openAIEmbeddingProvider } from "@/lib/providers/embedding/openai";
import { azureOpenAIEmbeddingProvider } from "@/lib/providers/embedding/azure-openai";
import { vertexAIEmbeddingProvider } from "@/lib/providers/embedding/vertex-ai";

import type { FieldDefinition } from "@/lib/providers/types";

// ---------------------------------------------------------------------------
// Registry maps for this wizard (client-safe)
// ---------------------------------------------------------------------------

const VECTOR_STORE_PROVIDERS: {
  id: string;
  displayName: string;
  fields: FieldDefinition[];
}[] = [
  pgvectorProvider,
  qdrantProvider,
  pineconeProvider,
  weaviateProvider,
  vertexAIVectorSearchProvider,
];

const EMBEDDING_PROVIDERS: {
  id: string;
  displayName: string;
  fields: FieldDefinition[];
}[] = [
  openAIEmbeddingProvider,
  azureOpenAIEmbeddingProvider,
  vertexAIEmbeddingProvider,
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VectorStoreWizardProps {
  existingConfig?: {
    id: string;
    name: string;
    storeProvider: string;
    embeddingProvider: string;
    useBatchForNew: boolean;
    useBatchForRescrape: boolean;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

interface MutationBody {
  name: string;
  storeProvider: string;
  storeConfig: Record<string, unknown>;
  embeddingProvider: string;
  embeddingConfig: Record<string, unknown>;
  useBatchForNew: boolean;
  useBatchForRescrape: boolean;
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={[
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
              i + 1 === current
                ? "bg-primary text-primary-foreground"
                : i + 1 < current
                  ? "bg-primary/30 text-primary"
                  : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={[
                "h-px w-8 transition-colors",
                i + 1 < current ? "bg-primary/40" : "bg-border",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export function VectorStoreWizard({
  existingConfig,
  onSuccess,
  onCancel,
}: VectorStoreWizardProps) {
  const queryClient = useQueryClient();
  const isEditing = !!existingConfig;

  // -- Step tracking
  const [step, setStep] = useState<1 | 2>(1);

  // -- Step 1: store provider
  const [storeProviderId, setStoreProviderId] = useState(
    existingConfig?.storeProvider ?? VECTOR_STORE_PROVIDERS[0].id
  );
  const [storeFields, setStoreFields] = useState<Record<string, unknown>>({});

  // -- Step 2: embedding provider
  const [embeddingProviderId, setEmbeddingProviderId] = useState(
    existingConfig?.embeddingProvider ?? EMBEDDING_PROVIDERS[0].id
  );
  const [embeddingFields, setEmbeddingFields] = useState<
    Record<string, unknown>
  >({});

  // -- Bottom fields
  const [name, setName] = useState(existingConfig?.name ?? "");
  const [useBatchForNew, setUseBatchForNew] = useState(
    existingConfig?.useBatchForNew ?? false
  );
  const [useBatchForRescrape, setUseBatchForRescrape] = useState(
    existingConfig?.useBatchForRescrape ?? true
  );

  const [apiError, setApiError] = useState<string | null>(null);

  // -- Resolve selected provider descriptors
  const selectedStoreProvider =
    VECTOR_STORE_PROVIDERS.find((p) => p.id === storeProviderId) ??
    VECTOR_STORE_PROVIDERS[0];

  const selectedEmbeddingProvider =
    EMBEDDING_PROVIDERS.find((p) => p.id === embeddingProviderId) ??
    EMBEDDING_PROVIDERS[0];

  // ---------------------------------------------------------------------------
  // Mutation
  // ---------------------------------------------------------------------------

  const mutation = useMutation({
    mutationFn: async (body: MutationBody) => {
      if (isEditing) {
        return apiClient.patch(
          `/api/admin/vector-store-config/${existingConfig!.id}`,
          body
        );
      }
      return apiClient.post("/api/admin/vector-store-config", body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["vector-store-configs"],
      });
      onSuccess();
    },
    onError: (err: unknown) => {
      const e = err as { data?: { error?: string }; message?: string };
      setApiError(e.data?.error ?? e.message ?? "Failed to save configuration");
    },
  });

  // ---------------------------------------------------------------------------
  // Step 1 submit — captures store fields and advances to step 2
  // ---------------------------------------------------------------------------

  const handleStep1Submit = (values: Record<string, unknown>) => {
    setStoreFields(values);
    setStep(2);
  };

  // ---------------------------------------------------------------------------
  // Step 2 submit — captures embedding fields and fires the mutation
  // ---------------------------------------------------------------------------

  const handleStep2Submit = (values: Record<string, unknown>) => {
    setEmbeddingFields(values);
    setApiError(null);
    mutation.mutate({
      name,
      storeProvider: storeProviderId,
      storeConfig: storeFields,
      embeddingProvider: embeddingProviderId,
      embeddingConfig: values,
      useBatchForNew,
      useBatchForRescrape,
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card className="border-border/60 bg-[#030711]">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#dce4f0]">
              {isEditing ? "Edit" : "Add"} Vector Store
            </CardTitle>
            <CardDescription className="text-[#7a8eaa]">
              {step === 1
                ? "Configure the vector store connection"
                : "Configure the embedding provider"}
            </CardDescription>
          </div>
          <StepIndicator current={step} total={2} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ------------------------------------------------------------------ */}
        {/* Step 1 — Vector store connection                                   */}
        {/* ------------------------------------------------------------------ */}
        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label className="text-[#dce4f0]">Store Provider</Label>
              <Select
                value={storeProviderId}
                onValueChange={(val) => {
                  setStoreProviderId(val);
                  setStoreFields({});
                }}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vector store" />
                </SelectTrigger>
                <SelectContent>
                  {VECTOR_STORE_PROVIDERS.map((p) => (
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
            </div>

            <Separator className="bg-border/40" />

            <ProviderConfigForm
              key={storeProviderId}
              fields={selectedStoreProvider.fields}
              defaultValues={storeFields}
              onSubmit={handleStep1Submit}
              submitLabel="Next: Embedding Config"
            />

            <div className="flex justify-start pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-[#7a8eaa] hover:text-[#dce4f0]"
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Step 2 — Embedding config + bottom fields                          */}
        {/* ------------------------------------------------------------------ */}
        {step === 2 && (
          <>
            <div className="space-y-2">
              <Label className="text-[#dce4f0]">Embedding Provider</Label>
              <Select
                value={embeddingProviderId}
                onValueChange={(val) => {
                  setEmbeddingProviderId(val);
                  setEmbeddingFields({});
                }}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an embedding provider" />
                </SelectTrigger>
                <SelectContent>
                  {EMBEDDING_PROVIDERS.map((p) => (
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
            </div>

            <Separator className="bg-border/40" />

            <ProviderConfigForm
              key={embeddingProviderId}
              fields={selectedEmbeddingProvider.fields}
              defaultValues={embeddingFields}
              onSubmit={handleStep2Submit}
              submitLabel={
                mutation.isPending
                  ? undefined
                  : isEditing
                    ? "Update Configuration"
                    : "Create Configuration"
              }
              isLoading={mutation.isPending}
            />

            {/* ---- Shared bottom fields ---- */}
            <Separator className="bg-border/40" />

            <div className="space-y-2">
              <Label htmlFor="vs-name" className="text-[#dce4f0]">
                Config Name
              </Label>
              <Input
                id="vs-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Production pgvector"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[#dce4f0]">
                Batch API Settings
              </h3>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="vs-batch-new"
                    className="text-sm text-[#dce4f0]"
                  >
                    Use batch API for new scrapes
                  </Label>
                  <p className="text-xs text-[#7a8eaa]">
                    Higher cost savings, but adds 24h delay
                  </p>
                </div>
                <Switch
                  id="vs-batch-new"
                  checked={useBatchForNew}
                  onCheckedChange={setUseBatchForNew}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="vs-batch-rescrape"
                    className="text-sm text-[#dce4f0]"
                  >
                    Use batch API for rescrapes
                  </Label>
                  <p className="text-xs text-[#7a8eaa]">
                    Recommended for periodic updates
                  </p>
                </div>
                <Switch
                  id="vs-batch-rescrape"
                  checked={useBatchForRescrape}
                  onCheckedChange={setUseBatchForRescrape}
                />
              </div>
            </div>

            {/* ---- API error ---- */}
            {apiError && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {/* ---- Navigation ---- */}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                disabled={mutation.isPending}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
