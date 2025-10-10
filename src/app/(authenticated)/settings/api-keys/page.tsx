"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus,
  Key,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "@/hooks/use-api-keys"

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  expiresInDays: z.string().optional(),
})

type CreateApiKeyFormData = z.infer<typeof createApiKeySchema>

export default function ApiKeysPage() {
  const { data: apiKeys = [], isLoading } = useApiKeys()
  const createApiKey = useCreateApiKey()
  const deleteApiKey = useDeleteApiKey()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateApiKeyFormData>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      expiresInDays: "never",
    },
  })

  const expiresInDays = watch("expiresInDays")

  const onSubmit = async (data: CreateApiKeyFormData) => {
    try {
      const result = await createApiKey.mutateAsync({
        name: data.name,
        expiresInDays:
          data.expiresInDays && data.expiresInDays !== "never"
            ? parseInt(data.expiresInDays)
            : undefined,
      })

      setNewApiKey(result.key)
      setIsCreateDialogOpen(false)
      reset()
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const copyToClipboard = async () => {
    if (newApiKey) {
      await navigator.clipboard.writeText(newApiKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
      toast.success("API key copied to clipboard")
    }
  }

  const handleDelete = async (keyId: string, name: string) => {
    if (confirm(`Are you sure you want to delete the API key "${name}"? This action cannot be undone.`)) {
      await deleteApiKey.mutateAsync(keyId)
    }
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for MCP server authentication
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Use API keys to authenticate MCP clients
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Add the API key to your Claude Desktop or other MCP client configuration.
                The key will only be shown once upon creation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            {apiKeys.length === 0
              ? "You haven't created any API keys yet"
              : `${apiKeys.length} API key${apiKeys.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API keys yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Create your first API key to connect your MCP clients
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{key.name}</h3>
                      {isExpired(key.expiresAt) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Created {format(new Date(key.createdAt), "MMM d, yyyy")}</span>
                      {key.expiresAt && (
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {isExpired(key.expiresAt)
                              ? `Expired ${format(new Date(key.expiresAt), "MMM d, yyyy")}`
                              : `Expires ${format(new Date(key.expiresAt), "MMM d, yyyy")}`}
                          </span>
                        </span>
                      )}
                      {key.lastUsedAt && (
                        <span>Last used {format(new Date(key.lastUsedAt), "MMM d, yyyy")}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(key.id, key.name)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for MCP server authentication
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Claude Desktop, VS Code Extension"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Expiration</Label>
              <Select
                value={expiresInDays}
                onValueChange={(value) => setValue("expiresInDays", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  reset()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createApiKey.isPending}>
                {createApiKey.isPending ? "Creating..." : "Create API Key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Show New API Key Dialog */}
      <Dialog open={!!newApiKey} onOpenChange={() => setNewApiKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created Successfully</DialogTitle>
            <DialogDescription>
              Copy your API key now. For security reasons, it won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
              {newApiKey}
            </div>
            <Button onClick={copyToClipboard} className="w-full">
              {copiedKey ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            <div className="p-4 border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Make sure to save this key in a secure location. You won't be able to view it again.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewApiKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
