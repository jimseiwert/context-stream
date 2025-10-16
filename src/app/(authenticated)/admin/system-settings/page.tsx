"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmbeddingConfigForm } from "@/components/admin/embedding-config-form";
import { EmbeddingConfigList } from "@/components/admin/embedding-config-list";
import { ImageProcessingConfig } from "@/components/admin/image-processing-config";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SystemSettingsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingConfig(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingConfig(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">
            Configure embedding providers and system-wide settings
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {editingConfig ? "Edit" : "Add"} Embedding Provider
            </h2>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
          <EmbeddingConfigForm
            initialData={editingConfig}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {/* Configurations List */}
      {!showForm && <EmbeddingConfigList onEdit={handleEdit} />}

      {/* Image Processing Configuration */}
      {!showForm && (
        <div className="border-t pt-6">
          <ImageProcessingConfig />
        </div>
      )}
    </div>
  );
}
