"use client";

import { useWorkspaces, Workspace } from "@/hooks/use-workspaces";
import React, { createContext, useContext, useState, useEffect } from "react";

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

const STORAGE_KEY = "contextstream_current_workspace";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: workspaces = [], isLoading, refetch } = useWorkspaces();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );

  // Initialize current workspace from localStorage or first workspace
  useEffect(() => {
    if (workspaces.length === 0) return;

    // Try to restore from localStorage
    const storedWorkspaceId =
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;

    if (storedWorkspaceId) {
      const workspace = workspaces.find((w) => w.id === storedWorkspaceId);
      if (workspace) {
        setCurrentWorkspace(workspace);
        return;
      }
    }

    // Default to first workspace (personal workspace)
    setCurrentWorkspace(workspaces[0]);
  }, [workspaces]);

  const switchWorkspace = (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, workspaceId);
      }
    }
  };

  const refreshWorkspaces = () => {
    refetch();
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaces,
        isLoading,
        switchWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error(
      "useWorkspaceContext must be used within a WorkspaceProvider"
    );
  }
  return context;
}
