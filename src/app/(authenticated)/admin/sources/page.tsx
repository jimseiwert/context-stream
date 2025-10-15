"use client";

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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminRescrapeSource, useAdminSources, useAdminDeleteSource } from "@/hooks/use-sources";
import { apiClient } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowUpCircle,
  Building2,
  CheckCircle,
  Database,
  ExternalLink,
  Globe,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminSourcesPage() {
  // Fetch all sources for admin (no pagination limit)
  const { data: sources = [], isLoading } = useAdminSources();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterScope, setFilterScope] = useState<
    "all" | "global" | "workspace"
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "error" | "indexing" | "pending"
  >("all");
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [rescrapeDialogOpen, setRescrapeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<any>(null);

  const queryClient = useQueryClient();
  const rescrapeSource = useAdminRescrapeSource();
  const deleteSource = useAdminDeleteSource();

  // Mutation for promoting source to global
  const promoteMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      return apiClient.post(`/api/admin/sources/${sourceId}/promote`, {});
    },
    onSuccess: (data: any) => {
      toast.success("Source promoted to global successfully!", {
        description: `${data.source.domain} is now accessible to all users.`,
      });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      setPromoteDialogOpen(false);
      setSelectedSource(null);
    },
    onError: (error: any) => {
      toast.error("Failed to promote source", {
        description: error.message || "Please try again later.",
      });
    },
  });

  const handlePromoteClick = (source: any) => {
    setSelectedSource(source);
    setPromoteDialogOpen(true);
  };

  const handleConfirmPromote = () => {
    if (selectedSource) {
      promoteMutation.mutate(selectedSource.id);
    }
  };

  const handleRescrapeClick = (source: any) => {
    setSelectedSource(source);
    setRescrapeDialogOpen(true);
  };

  const handleConfirmRescrape = async () => {
    if (selectedSource) {
      try {
        await rescrapeSource.mutateAsync({
          sourceId: selectedSource.id,
          fullReindex: true,
        });
        setRescrapeDialogOpen(false);
        setSelectedSource(null);
      } catch (error) {
        // Error is handled by the mutation
      }
    }
  };

  const handleDeleteClick = (source: any) => {
    setSelectedSource(source);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedSource) {
      try {
        await deleteSource.mutateAsync(selectedSource.id);
        setDeleteDialogOpen(false);
        setSelectedSource(null);
      } catch (error) {
        // Error is handled by the mutation
      }
    }
  };

  // Filter sources
  const filteredSources = sources.filter((source) => {
    const matchesSearch =
      source.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (source.name &&
        source.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesScope =
      filterScope === "all" ||
      (filterScope === "global" && source.scope === "GLOBAL") ||
      (filterScope === "workspace" && source.scope === "WORKSPACE");

    const matchesStatus =
      filterStatus === "all" ||
      source.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesScope && matchesStatus;
  });

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
        icon: AlertCircle,
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

  // Calculate stats
  const stats = {
    total: sources.length,
    global: sources.filter((s) => s.scope === "GLOBAL").length,
    workspace: sources.filter((s) => s.scope === "WORKSPACE").length,
    active: sources.filter((s) => s.status === "ACTIVE").length,
    totalPages: sources.reduce((sum, s) => sum + s.pageCount, 0),
    totalWorkspaceConnections: sources.reduce((sum, s) => sum + (s.workspaceCount || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Sources</h1>
        <p className="text-muted-foreground">
          Manage all documentation sources across the platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Globe className="h-4 w-4 mr-1" />
              Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.global}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Building2 className="h-4 w-4 mr-1" />
              Workspace Scoped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workspace}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalWorkspaceConnections} total connections
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalPages.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by domain, URL, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filterScope}
              onValueChange={(value: any) => setFilterScope(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="global">Global Only</SelectItem>
                <SelectItem value="workspace">Workspace Only</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={(value: any) => setFilterStatus(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="indexing">Indexing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sources List */}
      <Card>
        <CardHeader>
          <CardTitle>All Sources ({filteredSources.length})</CardTitle>
          <CardDescription>
            {filterScope !== "all" || filterStatus !== "all" || searchQuery
              ? "Filtered results"
              : "Complete list of all sources"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sources found</h3>
              <p className="text-muted-foreground text-center">
                {searchQuery || filterScope !== "all" || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "No sources have been added yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Link href={`/sources/${source.id}`}>
                          <h3 className="font-semibold hover:text-primary transition-colors">
                            {source.name || source.domain}
                          </h3>
                        </Link>
                      {source.scope === "GLOBAL" ? (
                        <Badge
                          variant="default"
                          className="flex items-center space-x-1"
                        >
                          <Globe className="h-3 w-3" />
                          <span>Global</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="flex items-center space-x-1"
                        >
                          <Building2 className="h-3 w-3" />
                          <span>Workspace</span>
                        </Badge>
                      )}
                      {getStatusBadge(source.status)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary flex items-center space-x-1"
                      >
                        <span className="truncate max-w-md">{source.url}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{source.pageCount.toLocaleString()} pages</span>
                      </span>
                    </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {source.scope === "WORKSPACE" &&
                      source.status === "ACTIVE" &&
                      source.pageCount > 0 && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePromoteClick(source)}
                          disabled={promoteMutation.isPending}
                        >
                          <ArrowUpCircle className="h-4 w-4 mr-1" />
                          Promote to Global
                        </Button>
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRescrapeClick(source)}
                      disabled={
                        rescrapeSource.isPending ||
                        source.status === "INDEXING"
                      }
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Re-scrape
                    </Button>
                    <Link href={`/sources/${source.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {source.scope === "GLOBAL" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(source)}
                        disabled={deleteSource.isPending}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promote to Global Confirmation Dialog */}
      <AlertDialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote Source to Global</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to promote{" "}
              <strong>{selectedSource?.domain}</strong> to global scope?
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-medium">This will:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    Make this source accessible to all users across all
                    workspaces
                  </li>
                  <li>
                    Share all {selectedSource?.pageCount || 0} indexed pages
                    globally
                  </li>
                  <li>Reduce redundant indexing and improve efficiency</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={promoteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPromote}
              disabled={promoteMutation.isPending}
              className="bg-primary"
            >
              {promoteMutation.isPending ? "Promoting..." : "Promote to Global"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-scrape Confirmation Dialog */}
      <AlertDialog
        open={rescrapeDialogOpen}
        onOpenChange={setRescrapeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-scrape Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to re-scrape{" "}
              <strong>{selectedSource?.domain}</strong>?
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-medium">This will:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    Delete all {selectedSource?.pageCount || 0} existing indexed
                    pages
                  </li>
                  <li>Re-index the entire source from scratch</li>
                  <li>Take approximately 5-10 minutes to complete</li>
                  {selectedSource?.scope === "GLOBAL" && (
                    <li className="text-yellow-700 dark:text-yellow-400">
                      This is a <strong>GLOBAL</strong> source - all users will
                      be affected
                    </li>
                  )}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rescrapeSource.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRescrape}
              disabled={rescrapeSource.isPending}
              className="bg-primary"
            >
              {rescrapeSource.isPending ? "Starting..." : "Re-scrape Source"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Source Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Global Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{selectedSource?.domain}</strong>?
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-medium text-destructive">
                  ⚠️ This action cannot be undone!
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    This will permanently delete all {selectedSource?.pageCount || 0} indexed pages
                  </li>
                  <li>All embeddings and search data will be lost</li>
                  <li className="text-red-700 dark:text-red-400 font-medium">
                    This is a <strong>GLOBAL</strong> source - all users across all
                    workspaces will lose access
                  </li>
                  <li>Users will need to re-add this source if needed in the future</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSource.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteSource.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSource.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
