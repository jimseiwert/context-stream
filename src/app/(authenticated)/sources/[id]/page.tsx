"use client";

import { JobProgressDisplay } from "@/components/sources/job-progress";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminRescrapeSource,
  useDeleteSource,
  useRescrapeSource,
  useSource,
  useUpdateSource,
} from "@/hooks/use-sources";
import { useSession } from "@/lib/auth/client";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  RefreshCw,
  Settings,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SourceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: source, isLoading, refetch } = useSource(params.id);
  const deleteSource = useDeleteSource();
  const rescrapeSource = useRescrapeSource();
  const adminRescrapeSource = useAdminRescrapeSource();
  const updateSource = useUpdateSource(params.id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    maxPages: 1000,
    respectRobotsTxt: true,
    rescrapeSchedule: "NEVER" as "NEVER" | "DAILY" | "WEEKLY" | "MONTHLY",
  });

  // Check if user is admin
  const isAdmin =
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "SUPER_ADMIN";

  // User can edit if: workspace source OR (global source AND user is admin)
  const canEdit =
    source?.scope === "WORKSPACE" || (source?.scope === "GLOBAL" && isAdmin);

  const handleJobComplete = () => {
    // Refresh source data when job completes
    refetch();
  };

  const handleDelete = async () => {
    await deleteSource.mutateAsync(params.id);
    router.push("/sources");
  };

  const handleRescrape = async () => {
    // Use admin endpoint for global sources if user is admin
    if (source?.scope === "GLOBAL" && isAdmin) {
      await adminRescrapeSource.mutateAsync({
        sourceId: params.id,
        fullReindex: true,
      });
    } else {
      await rescrapeSource.mutateAsync({
        sourceId: params.id,
        fullReindex: true,
      });
    }
  };

  const handleEditClick = () => {
    if (source) {
      setEditForm({
        name: source.name || source.domain,
        maxPages: source.config?.maxPages || 1000,
        respectRobotsTxt: source.config?.respectRobotsTxt ?? true,
        rescrapeSchedule: source.rescrapeSchedule || "NEVER",
      });
      setShowEditDialog(true);
    }
  };

  const handleEditSave = async () => {
    try {
      await updateSource.mutateAsync({
        name: editForm.name,
        config: {
          maxPages: editForm.maxPages,
          respectRobotsTxt: editForm.respectRobotsTxt,
        },
        rescrapeSchedule: editForm.rescrapeSchedule,
      });
      setShowEditDialog(false);
      refetch();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Source not found</h3>
        <p className="text-muted-foreground mb-6">
          The source you're looking for doesn't exist or you don't have access
          to it.
        </p>
        <Link href="/sources">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sources
          </Button>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: {
        color:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        icon: CheckCircle,
      },
      INDEXING: {
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        icon: RefreshCw,
      },
      PENDING: {
        color:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        icon: Clock,
      },
      ERROR: {
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        icon: XCircle,
      },
      PAUSED: {
        color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
        icon: AlertCircle,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "RUNNING":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const formatJobDuration = (
    startTime: string,
    endTime?: string | null
  ): string => {
    if (!endTime) return "";

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const elapsed = Math.floor((end - start) / 1000); // seconds

    if (elapsed < 60) {
      return `${elapsed}s`;
    }

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    if (minutes < 60) {
      return `${minutes}m ${seconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Link href="/sources">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">
                {source.name || source.domain}
              </h1>
              <p className="text-muted-foreground">{source.url}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canEdit && (
            <>
              <Button variant="outline" onClick={handleEditClick}>
                <Settings className="mr-2 h-4 w-4" />
                Edit Settings
              </Button>
              <Button
                variant="outline"
                onClick={handleRescrape}
                disabled={
                  rescrapeSource.isPending || adminRescrapeSource.isPending
                }
              >
                {rescrapeSource.isPending || adminRescrapeSource.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Re-scraping...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-scrape
                  </>
                )}
              </Button>
              {source.scope === "WORKSPACE" && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleteSource.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Job Progress (shown when indexing) */}
      <JobProgressDisplay sourceId={params.id} onComplete={handleJobComplete} />

      {/* Source Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Source Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Type</p>
              <p className="font-medium">{source.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              {getStatusBadge(source.status)}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Scope</p>
              <Badge
                variant={source.scope === "GLOBAL" ? "default" : "secondary"}
              >
                {source.scope === "GLOBAL" ? "Global" : "Workspace"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Pages Indexed
              </p>
              <p className="font-medium">{source.pageCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <p className="font-medium">
                {format(new Date(source.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
              <p className="font-medium">
                {format(new Date(source.updatedAt), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Auto-Rescrape
              </p>
              <p className="font-medium">
                {source.rescrapeSchedule === "NEVER"
                  ? "Manual only"
                  : source.rescrapeSchedule}
              </p>
            </div>
            {source.nextScrapeAt && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Next Scrape
                </p>
                <p className="font-medium">
                  {format(new Date(source.nextScrapeAt), "MMM d, yyyy")}
                </p>
              </div>
            )}
          </div>

          {source.config && Object.keys(source.config).length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium mb-3">Configuration</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {source.config.maxPages && (
                  <div>
                    <span className="text-muted-foreground">Max Pages: </span>
                    <span className="font-medium">
                      {source.config.maxPages}
                    </span>
                  </div>
                )}
                {typeof source.config.respectRobotsTxt === "boolean" && (
                  <div>
                    <span className="text-muted-foreground">
                      Respect robots.txt:{" "}
                    </span>
                    <span className="font-medium">
                      {source.config.respectRobotsTxt ? "Yes" : "No"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scrape Jobs */}
      {source.scrapeJobs && source.scrapeJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Scrape Jobs</CardTitle>
            <CardDescription>History of indexing operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {source.scrapeJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getJobStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">{job.status}</p>
                      <p className="text-sm text-muted-foreground">
                        Started:{" "}
                        {format(new Date(job.startedAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{job.pagesScraped} pages</p>
                    {job.completedAt && (
                      <p className="text-sm text-muted-foreground">
                        Completed: {format(new Date(job.completedAt), "HH:mm")}
                        {formatJobDuration(job.startedAt, job.completedAt) && (
                          <span className="ml-1 text-xs">
                            (took{" "}
                            {formatJobDuration(job.startedAt, job.completedAt)})
                          </span>
                        )}
                      </p>
                    )}
                    {job.errorMessage && (
                      <p className="text-sm text-red-600">{job.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indexed Pages */}
      {source.pages && source.pages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Indexed Pages</CardTitle>
            <CardDescription>
              Recently indexed pages from this source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {source.pages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="font-medium truncate">
                        {page.title || "Untitled"}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {page.url}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {page.lastScrapedAt && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(page.lastScrapedAt), "MMM d, yyyy")}
                      </p>
                    )}
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
            {source.pageCount > 10 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Showing 10 of {source.pageCount.toLocaleString()} pages
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Global Source Info */}
      {source.scope === "GLOBAL" && (
        <Card
          className={
            isAdmin
              ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
              : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Globe
                className={
                  isAdmin
                    ? "h-5 w-5 text-green-600 dark:text-green-400 mt-0.5"
                    : "h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5"
                }
              />
              <div className="space-y-1">
                <p
                  className={
                    isAdmin
                      ? "text-sm font-medium text-green-900 dark:text-green-100"
                      : "text-sm font-medium text-blue-900 dark:text-blue-100"
                  }
                >
                  This is a global source
                </p>
                <p
                  className={
                    isAdmin
                      ? "text-sm text-green-700 dark:text-green-300"
                      : "text-sm text-blue-700 dark:text-blue-300"
                  }
                >
                  {isAdmin ? (
                    <>
                      Global sources are shared across all workspaces. As an
                      administrator, you can edit this source's settings and
                      rescrape schedule. Note that changes will affect all
                      users.
                    </>
                  ) : (
                    <>
                      Global sources are shared across all workspaces and can
                      only be managed by administrators. You cannot edit or
                      delete this source.
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Source Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Source Settings</DialogTitle>
            <DialogDescription>
              Update configuration for {source.domain}. Note: URL cannot be
              changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Enter a friendly name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPages">Max Pages to Index</Label>
              <Input
                id="maxPages"
                type="number"
                min={1}
                max={10000}
                value={editForm.maxPages}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    maxPages: parseInt(e.target.value) || 1000,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of pages to crawl and index (1-10,000)
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="respectRobotsTxt"
                checked={editForm.respectRobotsTxt}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    respectRobotsTxt: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
              />
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="respectRobotsTxt" className="cursor-pointer">
                  Respect robots.txt
                </Label>
                <p className="text-xs text-muted-foreground">
                  Follow the site's robots.txt rules during crawling
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rescrapeSchedule">Automatic Rescraping</Label>
              <Select
                value={editForm.rescrapeSchedule}
                onValueChange={(value: any) =>
                  setEditForm({ ...editForm, rescrapeSchedule: value })
                }
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={updateSource.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={updateSource.isPending}>
              {updateSource.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the source "
              {source.name || source.domain}" and all {source.pageCount} indexed
              pages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete Source
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
