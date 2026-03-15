"use client";

// useUpgradePrompt — Tracks whether the upgrade dialog should be open
// and stores the reason that triggered it.

import { useState, useCallback } from "react";

export interface UpgradePromptState {
  open: boolean;
  reason?: string;
  resource?: "searches" | "pages" | "sources" | "workspaces";
}

export function useUpgradePrompt() {
  const [state, setState] = useState<UpgradePromptState>({ open: false });

  const openUpgradeDialog = useCallback(
    (reason?: string, resource?: UpgradePromptState["resource"]) => {
      setState({ open: true, reason, resource });
    },
    []
  );

  const closeUpgradeDialog = useCallback(() => {
    setState({ open: false });
  }, []);

  return {
    upgradePromptOpen: state.open,
    upgradePromptReason: state.reason,
    upgradePromptResource: state.resource,
    openUpgradeDialog,
    closeUpgradeDialog,
  };
}
