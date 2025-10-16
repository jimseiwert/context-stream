"use client";

export const dynamic = "force-dynamic";

import { QuotaWarning } from "@/components/billing/quota-warning";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useSources,
  useGlobalSources,
  useAddSourceToWorkspace,
  GlobalSource,
} from "@/hooks/use-sources";
import { useWorkspaces } from "@/hooks/use-workspaces";
import {
  getQuotaExceededMessage,
  useUpgradePrompt,
} from "@/hooks/use-upgrade-prompt";
import { calculateUsagePercentage, useUsage } from "@/hooks/use-usage";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  MoreVertical,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import React from "react";
import { useSession } from "@/lib/auth/client";

export default function SourcesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalPage, setGlobalPage] = useState(1);
  const [accumulatedGlobalSources, setAccumulatedGlobalSources] = useState<any[]>([]);
  const [addToWorkspaceDialog, setAddToWorkspaceDialog] = useState<{
    open: boolean;
    source: GlobalSource | null;
  }>({ open: false, source: null });
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  // No workspaceId needed - API will use user's personal workspace
  const { data: sources = [], isLoading } = useSources();
  const { data: globalData, isLoading: isLoadingGlobal } = useGlobalSources(globalSearchQuery, globalPage);
  const { data: workspaces = [] } = useWorkspaces();
  const addSourceToWorkspace = useAddSourceToWorkspace();

  // Accumulate global sources as we load more pages
  React.useEffect(() => {
    if (globalData?.sources) {
      setAccumulatedGlobalSources((prev) => {
        // If it's page 1 or search changed, replace
        if (globalPage === 1) {
          return globalData.sources;
        }
        // Otherwise, append new sources
        const existingIds = new Set(prev.map((s) => s.id));
        const newSources = globalData.sources.filter((s) => !existingIds.has(s.id));
        return [...prev, ...newSources];
      });
    }
  }, [globalData, globalPage]);
  const { data: session } = useSession();
  const deleteSource = useDeleteSource();
  const rescrapeSource = useRescrapeSource();
  const adminRescrapeSource = useAdminRescrapeSource();

  // Check if user is admin
  const isAdmin =
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "SUPER_ADMIN";

  // Usage and quota tracking
  const { data: usage } = useUsage();
  const upgradePrompt = useUpgradePrompt();

  // Calculate if user is at or near source limit
  const sourcesUsed = usage?.usage.sourcesUsed || 0;
  const sourcesLimit = usage?.quotas.maxSources || -1;
  const sourcesPercentage = calculateUsagePercentage(sourcesUsed, sourcesLimit);
  const isAtLimit = sourcesPercentage >= 100 && sourcesLimit > 0;
  const isNearLimit = sourcesPercentage >= 90 && sourcesLimit > 0;

  const filteredSources = sources.filter((source) => {
    const matchesSearch =
      searchQuery === "" ||
      source.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.url.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || source.status === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4 text-accent-green-500" />;
      case "INDEXING":
      case "PENDING":
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      case "PAUSED":
        return <PauseCircle className="h-4 w-4 text-accent-amber-500" />;
      case "ERROR":
        return <AlertCircle className="h-4 w-4 text-accent-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string): any => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "INDEXING":
      case "PENDING":
        return "info";
      case "PAUSED":
        return "warning";
      case "ERROR":
        return "error";
      default:
        return "secondary";
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (confirm("Are you sure you want to remove this source?")) {
      deleteSource.mutate(sourceId);
    }
  };

  const handleRescrape = (sourceId: string, fullReindex: boolean = false) => {
    // Find the source to check if it's global
    const source = sources.find(s => s.id === sourceId);

    // Use admin endpoint for global sources if user is admin
    if (source?.scope === "GLOBAL" && isAdmin) {
      adminRescrapeSource.mutate({ sourceId, fullReindex });
    } else {
      rescrapeSource.mutate({ sourceId, fullReindex });
    }
  };

  const handleAddSourceClick = () => {
    if (isAtLimit) {
      upgradePrompt.showUpgradePrompt(getQuotaExceededMessage("source"));
    }
  };

  const handleAddToWorkspace = (source: GlobalSource) => {
    setAddToWorkspaceDialog({ open: true, source });
    // Default to first workspace
    if (workspaces.length > 0) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  };

  const handleConfirmAddToWorkspace = async () => {
    if (!addToWorkspaceDialog.source || !selectedWorkspaceId) return;

    await addSourceToWorkspace.mutateAsync({
      workspaceId: selectedWorkspaceId,
      sourceId: addToWorkspaceDialog.source.id,
    });

    // Close dialog
    setAddToWorkspaceDialog({ open: false, source: null });
    setSelectedWorkspaceId("");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentation Sources</h1>
          <p className="text-muted-foreground">
            Manage your indexed documentation sources
          </p>
        </div>
        {isAtLimit ? (
          <Button onClick={handleAddSourceClick}>
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        ) : (
          <Button asChild>
            <Link href="/sources/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Source
            </Link>
          </Button>
        )}
      </div>

      {/* Quota Warning */}
      {isNearLimit && (
        <QuotaWarning
          type="source"
          used={sourcesUsed}
          limit={sourcesLimit}
          percentage={sourcesPercentage}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border rounded-md bg-background"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="indexing">Indexing</option>
          <option value="paused">Paused</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Sources List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredSources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sources found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first documentation source"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button asChild>
                <Link href="/sources/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Source
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSources.map((source) => (
            <Card
              key={source.id}
              className="hover:shadow-md transition-all duration-200"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    {/* Logo/Favicon */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {source.logo ? (
                        <>
                          <img
                            src={source.logo}
                            alt={`${source.domain} logo`}
                            width={40}
                            height={40}
                            className="object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              const globeIcon = parent?.querySelector('.fallback-icon');
                              if (globeIcon) {
                                globeIcon.classList.remove('hidden');
                              }
                            }}
                          />
                          <Globe className="h-5 w-5 text-muted-foreground hidden fallback-icon" />
                        </>
                      ) : (
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">
                        <Link
                          href={`/sources/${source.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {source.name || source.domain}
                        </Link>
                      </CardTitle>
                      <CardDescription className="text-xs truncate">
                        {source.url}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleRescrape(source.id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Update Now
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRescrape(source.id, true)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Full Re-index
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/sources/${source.id}/edit`}>
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(source.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Source
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {source.type === 'DOCUMENT' ? 'Documents' : 'Pages'}
                    </span>
                    <span className="text-sm font-semibold">
                      {source.pageCount.toLocaleString()}
                    </span>
                  </div>
                  {source.estimatedStorageKB && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Storage
                      </span>
                      <span className="text-sm">
                        {Math.round(source.estimatedStorageKB / 1024)} MB
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Last Updated
                    </span>
                    <span className="text-sm">
                      {source.lastScrapedAt
                        ? new Date(source.lastScrapedAt).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between pt-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(source.status)}
                  <Badge variant={getStatusBadgeVariant(source.status)}>
                    {source.status.toLowerCase()}
                  </Badge>
                </div>
                {source.scope === "GLOBAL" && (
                  <Badge
                    variant="default"
                    className="flex items-center space-x-1"
                  >
                    <Globe className="h-3 w-3" />
                    <span>Global</span>
                  </Badge>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Global Sources Discovery Section */}
      <div className="mt-12 space-y-6">
        <div className="border-t pt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Browse Global Sources</h2>
              <p className="text-muted-foreground">
                Discover documentation sources available for search
              </p>
            </div>
          </div>

          {/* Global Search */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search global sources..."
              className="pl-10"
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setGlobalPage(1); // Reset to first page on search
              }}
            />
          </div>

          {/* Global Sources Grid */}
          {isLoadingGlobal ? (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {[...Array(20)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : !globalData || accumulatedGlobalSources.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No global sources found</h3>
                <p className="text-muted-foreground text-center">
                  {globalSearchQuery
                    ? "Try a different search term"
                    : "No global sources are currently available"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {accumulatedGlobalSources.map((source) => (
                  <Card
                    key={source.id}
                    className="hover:shadow-md transition-all duration-200 flex flex-col"
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-3 flex-1">
                      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                        {source.logo ? (
                          <>
                            <img
                              src={source.logo}
                              alt={`${source.domain} logo`}
                              width={48}
                              height={48}
                              className="object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                const globeIcon = parent?.querySelector('.fallback-icon');
                                if (globeIcon) {
                                  globeIcon.classList.remove('hidden');
                                }
                              }}
                            />
                            <Globe className="h-6 w-6 text-muted-foreground hidden fallback-icon" />
                          </>
                        ) : (
                          <Globe className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="w-full">
                        <p className="font-semibold text-sm truncate">
                          {source.name || source.domain}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {source.pageCount.toLocaleString()}{' '}
                          {source.type === 'DOCUMENT' ? 'documents' : 'pages'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-auto"
                        onClick={() => handleAddToWorkspace(source)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add to Workspace
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Load More Button */}
              {globalData.pagination.hasMore && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setGlobalPage((p) => p + 1)}
                    disabled={isLoadingGlobal}
                  >
                    {isLoadingGlobal ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}

              {/* Pagination Info */}
              <div className="text-center text-sm text-muted-foreground mt-4">
                Showing {accumulatedGlobalSources.length} of {globalData.pagination.total} sources
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={upgradePrompt.isOpen}
        onOpenChange={upgradePrompt.hideUpgradePrompt}
        reason={upgradePrompt.reason}
        currentTier={upgradePrompt.currentTier}
        suggestedTier={upgradePrompt.suggestedTier}
      />

      {/* Add to Workspace Dialog */}
      <Dialog
        open={addToWorkspaceDialog.open}
        onOpenChange={(open) =>
          setAddToWorkspaceDialog({ open, source: addToWorkspaceDialog.source })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Source to Workspace</DialogTitle>
            <DialogDescription>
              Choose which workspace to add &quot;{addToWorkspaceDialog.source?.name || addToWorkspaceDialog.source?.domain}&quot; to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace</Label>
              <Select
                value={selectedWorkspaceId}
                onValueChange={setSelectedWorkspaceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddToWorkspaceDialog({ open: false, source: null });
                setSelectedWorkspaceId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAddToWorkspace}
              disabled={!selectedWorkspaceId || addSourceToWorkspace.isPending}
            >
              {addSourceToWorkspace.isPending ? "Adding..." : "Add to Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
