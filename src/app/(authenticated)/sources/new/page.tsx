"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateSource } from "@/hooks/use-sources";
import { useSession } from "@/lib/auth/client";
import { useWorkspaceContext } from "@/contexts/workspace-context";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Database,
  FileText,
  Github,
  Globe,
  Loader2,
  Shield,
  FolderKanban,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createSourceSchema = z.object({
  url: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(["WEBSITE", "GITHUB", "DOCUMENT"]),
  scope: z.enum(["GLOBAL", "WORKSPACE"]),
  workspaceId: z.string().optional(),
  maxPages: z.number().min(1).max(10000).optional(),
  respectRobotsTxt: z.boolean().optional(),
  rescrapeSchedule: z.enum(["NEVER", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
}).refine((data) => {
  // URL is required and must be valid for WEBSITE and GITHUB
  if (data.type === "WEBSITE" || data.type === "GITHUB") {
    if (!data.url) return false;
    try {
      new URL(data.url);
    } catch {
      return false;
    }
  }
  // Name is required for DOCUMENT
  if (data.type === "DOCUMENT" && (!data.name || data.name.trim().length === 0)) {
    return false;
  }
  // WorkspaceId is required when scope is WORKSPACE
  if (data.scope === "WORKSPACE" && (!data.workspaceId || data.workspaceId.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Please fill in all required fields",
});

type CreateSourceFormData = z.infer<typeof createSourceSchema>;

export default function NewSourcePage() {
  const router = useRouter();
  const createSource = useCreateSource();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = useSession();
  const { currentWorkspace, workspaces } = useWorkspaceContext();

  // Check if user is admin
  const isAdmin =
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "SUPER_ADMIN";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<CreateSourceFormData>({
    resolver: zodResolver(createSourceSchema),
    mode: "onChange", // Validate on every change
    defaultValues: {
      type: "WEBSITE",
      scope: "WORKSPACE",
      workspaceId: currentWorkspace?.id,
      maxPages: 1000,
      respectRobotsTxt: true,
      rescrapeSchedule: "NEVER",
    },
  });

  const selectedType = watch("type");
  const selectedScope = watch("scope");
  const selectedWorkspaceId = watch("workspaceId");
  const selectedRescrapeSchedule = watch("rescrapeSchedule");

  // Debug: Log form state
  console.log("Form debug:", {
    selectedType,
    selectedScope,
    selectedWorkspaceId,
    currentWorkspaceId: currentWorkspace?.id,
    errors,
    isValid,
    formData: watch(),
  });

  const onSubmit = async (data: CreateSourceFormData) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        type: data.type,
        scope: data.scope,
        workspaceId: data.workspaceId,
        rescrapeSchedule: data.rescrapeSchedule,
      };

      // Add URL for WEBSITE/GITHUB, name for DOCUMENT
      if (data.type === "DOCUMENT") {
        payload.name = data.name;
      } else {
        payload.url = data.url;
        payload.config = {
          maxPages: data.maxPages,
          respectRobotsTxt: data.respectRobotsTxt,
        };
      }

      const result = await createSource.mutateAsync(payload);

      if (data.type === "DOCUMENT") {
        toast.success("Document collection created!", {
          description: "You can now upload documents to this collection.",
        });
        // Redirect to the source detail page for document uploads
        if (result.source?.id) {
          router.push(`/sources/${result.source.id}`);
        } else {
          router.push("/sources");
        }
      } else if (result.isGlobal || data.scope === "GLOBAL") {
        toast.success("Global source created!", {
          description:
            "This source will be available to all users once indexing completes.",
        });
        router.push("/sources");
      } else {
        toast.success("Source created!", {
          description: "Indexing has started for your workspace.",
        });
        router.push("/sources");
      }
    } catch (error: any) {
      console.error("Error creating source:", error);
      // Error toast is handled by the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case "GITHUB":
        return <Github className="h-4 w-4" />;
      case "WEBSITE":
        return <Globe className="h-4 w-4" />;
      case "DOCUMENT":
        return <FileText className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sources">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add Documentation Source</h1>
          <p className="text-muted-foreground">
            Index a new documentation website or repository
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Source Details</CardTitle>
          <CardDescription>
            Enter the URL of the documentation you want to index
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Source Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedType}
                onValueChange={(value) =>
                  setValue("type", value as CreateSourceFormData["type"])
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEBSITE">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span>Documentation Website</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="GITHUB">
                    <div className="flex items-center space-x-2">
                      <Github className="h-4 w-4" />
                      <span>GitHub Repository</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="DOCUMENT">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Document Collection</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">
                  {errors.type.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {selectedType === "DOCUMENT"
                  ? "Upload and index PDF, DOCX, TXT, and other document files"
                  : "Crawl and index web pages or repositories"}
              </p>
            </div>

            {/* Name field for DOCUMENT type */}
            {selectedType === "DOCUMENT" && (
              <div className="space-y-2">
                <Label htmlFor="name">
                  Collection Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Product Documentation"
                  disabled={isSubmitting}
                  {...register("name")}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  A descriptive name for this document collection
                </p>
              </div>
            )}

            {/* URL field for WEBSITE/GITHUB types */}
            {(selectedType === "WEBSITE" || selectedType === "GITHUB") && (
              <div className="space-y-2">
                <Label htmlFor="url">
                  Documentation URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://docs.example.com"
                  disabled={isSubmitting}
                  {...register("url")}
                  aria-invalid={!!errors.url}
                />
                {errors.url && (
                  <p className="text-sm text-destructive">{errors.url.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The main URL of the documentation site you want to index
                </p>
              </div>
            )}

            {/* Scope (Admin Only) */}
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="scope" className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-yellow-600" />
                  <span>
                    Source Scope <span className="text-destructive">*</span>
                  </span>
                </Label>
                <Select
                  value={selectedScope}
                  onValueChange={(value) =>
                    setValue("scope", value as CreateSourceFormData["scope"])
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WORKSPACE">
                      <div className="flex items-center space-x-2">
                        <Database className="h-4 w-4" />
                        <span>Workspace</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="GLOBAL">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span>Global (All Users)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.scope && (
                  <p className="text-sm text-destructive">
                    {errors.scope.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {selectedScope === "GLOBAL"
                    ? "🌐 Global sources are accessible to all users across all workspaces"
                    : "🏢 Workspace sources are only accessible to your workspace"}
                </p>
              </div>
            )}

            {/* Workspace Selector (Only for WORKSPACE scope) */}
            {selectedScope === "WORKSPACE" && workspaces.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="workspaceId" className="flex items-center space-x-2">
                  <FolderKanban className="h-4 w-4" />
                  <span>
                    Workspace <span className="text-destructive">*</span>
                  </span>
                </Label>
                <Select
                  value={selectedWorkspaceId}
                  onValueChange={(value) =>
                    setValue("workspaceId", value)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        <div className="flex items-center space-x-2">
                          <FolderKanban className="h-4 w-4" />
                          <span>{workspace.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.workspaceId && (
                  <p className="text-sm text-destructive">
                    {errors.workspaceId.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Choose which workspace this source will be added to
                </p>
              </div>
            )}

            {/* Advanced Options (only for WEBSITE/GITHUB) */}
            {selectedType !== "DOCUMENT" && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold">Advanced Options</h3>

              {/* Max Pages */}
              <div className="space-y-2">
                <Label htmlFor="maxPages">Maximum Pages to Index</Label>
                <Input
                  id="maxPages"
                  type="number"
                  min="1"
                  max="10000"
                  disabled={isSubmitting}
                  {...register("maxPages", { valueAsNumber: true })}
                />
                {errors.maxPages && (
                  <p className="text-sm text-destructive">
                    {errors.maxPages.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Limit the number of pages to crawl (1-10,000)
                </p>
              </div>

              {/* Respect robots.txt */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="respectRobotsTxt"
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={isSubmitting}
                  {...register("respectRobotsTxt")}
                />
                <Label
                  htmlFor="respectRobotsTxt"
                  className="font-normal cursor-pointer"
                >
                  Respect robots.txt restrictions
                </Label>
              </div>

              {/* Rescrape Schedule */}
              <div className="space-y-2">
                <Label htmlFor="rescrapeSchedule">Automatic Rescraping</Label>
                <Select
                  value={selectedRescrapeSchedule}
                  onValueChange={(value) =>
                    setValue("rescrapeSchedule", value as CreateSourceFormData["rescrapeSchedule"])
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEVER">Never (Manual only)</SelectItem>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Automatically rescrape this source to keep it up-to-date
                </p>
              </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !isValid}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Source...
                  </>
                ) : (
                  "Create Source"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {selectedType === "DOCUMENT" ? (
            <>
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">1</span>
                  </div>
                </div>
                <p>
                  Upload PDF, DOCX, TXT, and other supported document files to your collection
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">2</span>
                  </div>
                </div>
                <p>Text and images are extracted and processed automatically</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">3</span>
                  </div>
                </div>
                <p>Content is chunked and embedded for optimal AI retrieval</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">4</span>
                  </div>
                </div>
                <p>
                  Once indexed, your documents will be searchable and accessible via MCP
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">1</span>
                  </div>
                </div>
                <p>
                  ContextStream will crawl the documentation site and extract all
                  pages
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">2</span>
                  </div>
                </div>
                <p>Content is chunked and embedded for optimal AI retrieval</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">3</span>
                  </div>
                </div>
                <p>
                  Once complete, the documentation will be searchable and accessible
                  via MCP
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
