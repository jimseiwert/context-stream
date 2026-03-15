"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceContextValue {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  switchWorkspace: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  currentWorkspace: null,
  workspaces: [],
  switchWorkspace: () => {},
});

const STORAGE_KEY = "cs-current-workspace-id";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.workspaces) return;
        const list: Workspace[] = data.workspaces;
        setWorkspaces(list);

        const stored = localStorage.getItem(STORAGE_KEY);
        const valid = stored && list.some((w) => w.id === stored);
        setCurrentWorkspaceId(valid ? stored : (list[0]?.id ?? null));
      })
      .catch(() => {});
  }, []);

  const switchWorkspace = (id: string) => {
    setCurrentWorkspaceId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const currentWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{ currentWorkspace, workspaces, switchWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}
