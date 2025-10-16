"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, Loader2, Trash2, Power, Edit } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface EmbeddingConfig {
  id: string;
  provider: string;
  model: string;
  dimensions: number;
  apiKey: string;
  apiEndpoint?: string | null;
  deploymentName?: string | null;
  useBatchForNew: boolean;
  useBatchForRescrape: boolean;
  additionalConfig?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmbeddingConfigListProps {
  onEdit?: (config: EmbeddingConfig) => void;
}

export function EmbeddingConfigList({ onEdit }: EmbeddingConfigListProps) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<EmbeddingConfig | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["embedding-configs"],
    queryFn: async () => {
      const response = await apiClient.get<{ configs: EmbeddingConfig[] }>(
        "/api/admin/embedding-config"
      );
      return response.configs;
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.patch(`/api/admin/embedding-config/${id}/activate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["embedding-configs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/api/admin/embedding-config/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["embedding-configs"] });
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    },
  });

  const handleActivate = (config: EmbeddingConfig) => {
    if (!config.isActive) {
      activateMutation.mutate(config.id);
    }
  };

  const handleDeleteClick = (config: EmbeddingConfig) => {
    setConfigToDelete(config);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (configToDelete) {
      deleteMutation.mutate(configToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Embedding Provider Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Embedding Provider Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Error loading configurations: {(error as any).message}</p>
        </CardContent>
      </Card>
    );
  }

  const configs = data || [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Embedding Provider Configurations</CardTitle>
          <CardDescription>
            Manage embedding providers for vector search. Only one provider can be active at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No embedding providers configured yet
            </p>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`border rounded-lg p-4 ${
                    config.isActive ? "border-green-500 bg-green-50 dark:bg-green-900/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">
                          {config.provider === "OPENAI" && "OpenAI"}
                          {config.provider === "AZURE_OPENAI" && "Azure OpenAI"}
                          {config.provider === "VERTEX_AI" && "Google Vertex AI"}
                        </h3>
                        {config.isActive && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Model:</span> {config.model}
                        </div>
                        <div>
                          <span className="font-medium">Dimensions:</span> {config.dimensions}
                        </div>
                        {config.apiEndpoint && (
                          <div>
                            <span className="font-medium">Endpoint:</span>{" "}
                            {config.apiEndpoint.replace(/https?:\/\//, "")}
                          </div>
                        )}
                        {config.deploymentName && (
                          <div>
                            <span className="font-medium">Deployment:</span> {config.deploymentName}
                          </div>
                        )}
                        {config.additionalConfig?.projectId && (
                          <div>
                            <span className="font-medium">Project ID:</span>{" "}
                            {config.additionalConfig.projectId}
                          </div>
                        )}
                        {config.additionalConfig?.location && (
                          <div>
                            <span className="font-medium">Location:</span>{" "}
                            {config.additionalConfig.location}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Batch for new:</span>
                          <Badge variant={config.useBatchForNew ? "default" : "outline"} className="text-xs">
                            {config.useBatchForNew ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Batch for rescrape:</span>
                          <Badge variant={config.useBatchForRescrape ? "default" : "outline"} className="text-xs">
                            {config.useBatchForRescrape ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Created {new Date(config.createdAt).toLocaleDateString()} • Updated{" "}
                        {new Date(config.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {!config.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(config)}
                          disabled={activateMutation.isPending}
                        >
                          {activateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Power className="h-4 w-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit?.(config)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {!config.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(config)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this embedding provider configuration? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
