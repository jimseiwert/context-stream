"use client";

import { useState } from "react";
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
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";

interface EmbeddingConfigFormProps {
  onSuccess?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
}

const PROVIDERS = [
  { value: "OPENAI", label: "OpenAI" },
  { value: "AZURE_OPENAI", label: "Azure OpenAI" },
  { value: "VERTEX_AI", label: "Google Vertex AI" },
  {
    value: "VERTEX_AI_RAG_ENGINE",
    label: "Google Vertex AI RAG Engine",
  },
];

const PROVIDER_DEFAULTS: Record<
  string,
  { model: string; dimensions: number }
> = {
  OPENAI: { model: "text-embedding-3-small", dimensions: 1536 },
  AZURE_OPENAI: { model: "text-embedding-3-small", dimensions: 1536 },
  VERTEX_AI: { model: "text-embedding-005", dimensions: 768 },
  VERTEX_AI_RAG_ENGINE: { model: "text-embedding-005", dimensions: 768 },
};

function isVertexProvider(p: string) {
  return p === "VERTEX_AI" || p === "VERTEX_AI_RAG_ENGINE";
}

export function EmbeddingConfigForm({
  onSuccess,
  initialData,
}: EmbeddingConfigFormProps) {
  const queryClient = useQueryClient();

  const [provider, setProvider] = useState(
    initialData?.provider || "OPENAI"
  );
  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.OPENAI;
  const [name, setName] = useState(initialData?.name || "");
  const [model, setModel] = useState(initialData?.model || defaults.model);
  const [dimensions, setDimensions] = useState(
    initialData?.dimensions?.toString() || defaults.dimensions.toString()
  );

  // OpenAI
  const [apiKey, setApiKey] = useState("");

  // Azure
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [deploymentName, setDeploymentName] = useState("");

  // Vertex AI / Vertex AI RAG Engine
  const [projectId, setProjectId] = useState("");
  const [location, setLocation] = useState("us-central1");
  const [accessToken, setAccessToken] = useState("");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  // RAG Engine specific
  const [ragCorpusName, setRagCorpusName] = useState("");

  const [useBatchForNew, setUseBatchForNew] = useState(
    initialData?.useBatchForNew || false
  );
  const [useBatchForRescrape, setUseBatchForRescrape] = useState(
    initialData?.useBatchForRescrape !== undefined
      ? initialData.useBatchForRescrape
      : true
  );
  const [isActive, setIsActive] = useState(initialData?.isActive || false);

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const d = PROVIDER_DEFAULTS[newProvider] ?? PROVIDER_DEFAULTS.OPENAI;
    setModel(d.model);
    setDimensions(d.dimensions.toString());
    setApiKey("");
    setAzureEndpoint("");
    setDeploymentName("");
    setProjectId("");
    setLocation("us-central1");
    setAccessToken("");
    setServiceAccountJson("");
    setRagCorpusName("");
    setTestResult(null);
  };

  function buildConnectionConfig(): Record<string, unknown> | null {
    switch (provider) {
      case "OPENAI":
        if (!apiKey && !initialData) return null;
        return apiKey ? { apiKey } : undefined!;

      case "AZURE_OPENAI":
        if (!apiKey && !initialData) return null;
        return {
          ...(apiKey ? { apiKey } : {}),
          ...(azureEndpoint ? { endpoint: azureEndpoint } : {}),
          ...(deploymentName ? { deploymentName } : {}),
        };

      case "VERTEX_AI": {
        let parsedJson: object | undefined;
        if (serviceAccountJson.trim()) {
          try {
            parsedJson = JSON.parse(serviceAccountJson);
          } catch {
            return null; // caller will catch this
          }
        }
        return {
          projectId: projectId || undefined,
          location: location || undefined,
          ...(accessToken ? { accessToken } : {}),
          ...(parsedJson ? { serviceAccountJson: parsedJson } : {}),
        };
      }

      case "VERTEX_AI_RAG_ENGINE": {
        let parsedJson: object | undefined;
        if (serviceAccountJson.trim()) {
          try {
            parsedJson = JSON.parse(serviceAccountJson);
          } catch {
            return null;
          }
        }
        return {
          projectId: projectId || undefined,
          location: location || undefined,
          ragCorpusName: ragCorpusName || undefined,
          ...(accessToken ? { accessToken } : {}),
          ...(parsedJson ? { serviceAccountJson: parsedJson } : {}),
        };
      }

      default:
        return null;
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const connectionConfig = buildConnectionConfig();
      if (connectionConfig === null) {
        throw new Error(
          provider === "VERTEX_AI" || provider === "VERTEX_AI_RAG_ENGINE"
            ? "Invalid service account JSON"
            : "API key is required for testing"
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await apiClient.post<any>(
        "/api/admin/embedding-config/test",
        {
          provider,
          model,
          dimensions: parseInt(dimensions, 10),
          connectionConfig,
        }
      );

      setTestResult({
        success: response.success,
        message: response.message || "Connection successful",
      });
    } catch (err: unknown) {
      const e = err as { data?: { details?: string }; message?: string };
      setTestResult({
        success: false,
        message: e.data?.details || e.message || "Connection test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const connectionConfig = buildConnectionConfig();

      // Validate service account JSON parse error
      if (
        isVertexProvider(provider) &&
        serviceAccountJson.trim() &&
        connectionConfig === null
      ) {
        throw new Error("Invalid JSON in service account credentials field");
      }

      const requestBody: Record<string, unknown> = {
        provider,
        name,
        model,
        dimensions: parseInt(dimensions, 10),
        isRagEngine: provider === "VERTEX_AI_RAG_ENGINE",
        useBatchForNew,
        useBatchForRescrape,
        isActive,
      };

      // Only send connectionConfig if there's anything to update
      if (
        connectionConfig &&
        Object.keys(connectionConfig).length > 0
      ) {
        requestBody.connectionConfig = connectionConfig;
      } else if (!initialData) {
        throw new Error("Connection configuration is required");
      }

      if (initialData?.id) {
        await apiClient.patch(
          `/api/admin/embedding-config/${initialData.id}`,
          requestBody
        );
      } else {
        await apiClient.post("/api/admin/embedding-config", requestBody);
      }

      await queryClient.invalidateQueries({ queryKey: ["embedding-configs"] });
      onSuccess?.();
    } catch (err: unknown) {
      const e = err as { data?: { error?: string }; message?: string };
      setError(
        e.data?.error || e.message || "Failed to save configuration"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const canTest =
    provider !== "VERTEX_AI_RAG_ENGINE" &&
    (apiKey ||
      (isVertexProvider(provider) &&
        (accessToken || serviceAccountJson.trim())));

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {initialData ? "Edit" : "Add"} Embedding Provider
          </CardTitle>
          <CardDescription>
            Configure an embedding provider for vector search
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider *</Label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={!!initialData}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Display name */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production OpenAI"
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g., text-embedding-3-small"
              required
            />
          </div>

          {/* Dimensions — hidden for RAG engine */}
          {provider !== "VERTEX_AI_RAG_ENGINE" && (
            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions *</Label>
              <Input
                id="dimensions"
                type="number"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="e.g., 1536"
                required
              />
            </div>
          )}

          {/* OpenAI */}
          {provider === "OPENAI" && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                API Key {initialData ? "(leave blank to keep existing)" : "*"}
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={initialData ? "••••••••" : "sk-..."}
                required={!initialData}
              />
            </div>
          )}

          {/* Azure OpenAI */}
          {provider === "AZURE_OPENAI" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="apiKey">
                  API Key{" "}
                  {initialData ? "(leave blank to keep existing)" : "*"}
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={initialData ? "••••••••" : "Enter Azure API key"}
                  required={!initialData}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="azureEndpoint">Azure Endpoint *</Label>
                <Input
                  id="azureEndpoint"
                  value={azureEndpoint}
                  onChange={(e) => setAzureEndpoint(e.target.value)}
                  placeholder="https://your-resource.openai.azure.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deploymentName">Deployment Name *</Label>
                <Input
                  id="deploymentName"
                  value={deploymentName}
                  onChange={(e) => setDeploymentName(e.target.value)}
                  placeholder="your-deployment-name"
                  required
                />
              </div>
            </>
          )}

          {/* Vertex AI / Vertex AI RAG Engine */}
          {isVertexProvider(provider) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="projectId">GCP Project ID *</Label>
                <Input
                  id="projectId"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="your-gcp-project-id"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="us-central1"
                  required
                />
              </div>
              {provider === "VERTEX_AI_RAG_ENGINE" && (
                <div className="space-y-2">
                  <Label htmlFor="ragCorpusName">RAG Corpus Name *</Label>
                  <Input
                    id="ragCorpusName"
                    value={ragCorpusName}
                    onChange={(e) => setRagCorpusName(e.target.value)}
                    placeholder="projects/.../locations/.../ragCorpora/..."
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="serviceAccountJson">
                  Service Account JSON{" "}
                  <span className="text-muted-foreground text-xs">
                    (recommended)
                  </span>
                </Label>
                <textarea
                  id="serviceAccountJson"
                  value={serviceAccountJson}
                  onChange={(e) => setServiceAccountJson(e.target.value)}
                  placeholder='Paste the contents of your GCP service account JSON key file'
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  The JSON content from your GCP service account key file (
                  <code>.json</code> downloaded from IAM &amp; Admin → Service
                  Accounts).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessToken">
                  Access Token{" "}
                  <span className="text-muted-foreground text-xs">
                    (short-lived alternative to service account JSON)
                  </span>
                </Label>
                <Input
                  id="accessToken"
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="ya29...."
                />
              </div>
            </>
          )}

          {/* RAG Engine info banner */}
          {provider === "VERTEX_AI_RAG_ENGINE" && (
            <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-400">
              Vertex AI RAG Engine handles retrieval and embedding internally.
              The separate embedding pipeline is skipped when this provider is
              active.
            </div>
          )}

          {/* Batch API Settings — not relevant for RAG engine */}
          {provider !== "VERTEX_AI_RAG_ENGINE" && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">Batch API Settings</h3>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="useBatchForNew">
                    Use batch API for new scrapes
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Higher cost savings, but adds 24h delay
                  </p>
                </div>
                <Switch
                  id="useBatchForNew"
                  checked={useBatchForNew}
                  onCheckedChange={setUseBatchForNew}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="useBatchForRescrape">
                    Use batch API for rescrapes/refreshes
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recommended for periodic updates
                  </p>
                </div>
                <Switch
                  id="useBatchForRescrape"
                  checked={useBatchForRescrape}
                  onCheckedChange={setUseBatchForRescrape}
                />
              </div>
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Set as active provider</Label>
              <p className="text-sm text-muted-foreground">
                Only one provider can be active at a time
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`flex items-center space-x-2 p-3 rounded-md ${
                testResult.success
                  ? "bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100"
                  : "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100"
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center space-x-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            {provider !== "VERTEX_AI_RAG_ENGINE" && (
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !canTest}
              >
                {isTesting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Test Connection
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialData ? "Update" : "Create"} Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
