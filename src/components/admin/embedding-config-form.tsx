"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";

interface EmbeddingConfigFormProps {
  onSuccess?: () => void;
  initialData?: any;
}

const PROVIDERS = [
  { value: "OPENAI", label: "OpenAI" },
  { value: "AZURE_OPENAI", label: "Azure OpenAI" },
  { value: "VERTEX_AI", label: "Google Vertex AI" },
];

const PROVIDER_DEFAULTS = {
  OPENAI: {
    model: "text-embedding-3-small",
    dimensions: 1536,
  },
  AZURE_OPENAI: {
    model: "text-embedding-3-small",
    dimensions: 1536,
  },
  VERTEX_AI: {
    model: "text-embedding-005",
    dimensions: 768,
  },
};

export function EmbeddingConfigForm({ onSuccess, initialData }: EmbeddingConfigFormProps) {
  const queryClient = useQueryClient();

  const [provider, setProvider] = useState(initialData?.provider || "OPENAI");
  const [model, setModel] = useState(initialData?.model || PROVIDER_DEFAULTS.OPENAI.model);
  const [dimensions, setDimensions] = useState(
    initialData?.dimensions?.toString() || PROVIDER_DEFAULTS.OPENAI.dimensions.toString()
  );
  const [apiKey, setApiKey] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState(initialData?.apiEndpoint || "");
  const [deploymentName, setDeploymentName] = useState(initialData?.deploymentName || "");
  const [projectId, setProjectId] = useState(initialData?.additionalConfig?.projectId || "");
  const [location, setLocation] = useState(initialData?.additionalConfig?.location || "us-central1");
  const [useBatchForNew, setUseBatchForNew] = useState(initialData?.useBatchForNew || false);
  const [useBatchForRescrape, setUseBatchForRescrape] = useState(
    initialData?.useBatchForRescrape !== undefined ? initialData.useBatchForRescrape : true
  );
  const [isActive, setIsActive] = useState(initialData?.isActive || false);

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const defaults = PROVIDER_DEFAULTS[newProvider as keyof typeof PROVIDER_DEFAULTS];
    setModel(defaults.model);
    setDimensions(defaults.dimensions.toString());

    // Clear provider-specific fields
    if (newProvider !== "AZURE_OPENAI") {
      setApiEndpoint("");
      setDeploymentName("");
    }
    if (newProvider !== "VERTEX_AI") {
      setProjectId("");
      setLocation("us-central1");
    }

    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const requestBody: any = {
        provider,
        model,
        dimensions: parseInt(dimensions, 10),
        apiKey,
      };

      if (provider === "AZURE_OPENAI") {
        requestBody.apiEndpoint = apiEndpoint;
        requestBody.deploymentName = deploymentName;
      }

      if (provider === "VERTEX_AI") {
        requestBody.additionalConfig = {
          projectId,
          location,
        };
      }

      const response = await apiClient.post<any>("/api/admin/embedding-config/test", requestBody);

      setTestResult({
        success: response.success,
        message: response.message || "Connection successful",
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.data?.details || err.message || "Connection test failed",
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
      if (!apiKey && !initialData) {
        throw new Error("API key is required");
      }

      const requestBody: any = {
        provider,
        model,
        dimensions: parseInt(dimensions, 10),
        useBatchForNew,
        useBatchForRescrape,
        isActive,
      };

      // Only include API key if provided
      if (apiKey) {
        requestBody.apiKey = apiKey;
      }

      if (provider === "AZURE_OPENAI") {
        requestBody.apiEndpoint = apiEndpoint;
        requestBody.deploymentName = deploymentName;
      }

      if (provider === "VERTEX_AI") {
        requestBody.additionalConfig = {
          projectId,
          location,
        };
      }

      if (initialData?.id) {
        // Update existing config
        await apiClient.patch(`/api/admin/embedding-config/${initialData.id}`, requestBody);
      } else {
        // Create new config
        await apiClient.post("/api/admin/embedding-config", requestBody);
      }

      // Invalidate the query cache to refetch the list
      await queryClient.invalidateQueries({ queryKey: ["embedding-configs"] });

      onSuccess?.();
    } catch (err: any) {
      setError(err.data?.error || err.message || "Failed to save configuration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? "Edit" : "Add"} Embedding Provider</CardTitle>
          <CardDescription>
            Configure an embedding provider for vector search
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
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

          {/* Dimensions */}
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

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key {initialData ? "(leave blank to keep existing)" : "*"}
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={initialData ? "••••••••" : "Enter API key"}
              required={!initialData}
            />
          </div>

          {/* Azure OpenAI specific fields */}
          {provider === "AZURE_OPENAI" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="apiEndpoint">Azure Endpoint *</Label>
                <Input
                  id="apiEndpoint"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
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

          {/* Vertex AI specific fields */}
          {provider === "VERTEX_AI" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="projectId">Project ID *</Label>
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
            </>
          )}

          {/* Batch API Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Batch API Settings</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="useBatchForNew">Use batch API for new scrapes</Label>
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
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey}
            >
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Update" : "Create"} Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
