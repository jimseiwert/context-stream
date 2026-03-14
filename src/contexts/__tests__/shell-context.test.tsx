import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { ShellProvider, useShell } from "../shell-context";

describe("ShellContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to not collapsed", () => {
    const { result } = renderHook(() => useShell(), {
      wrapper: ShellProvider,
    });
    expect(result.current.sidebarCollapsed).toBe(false);
  });

  it("toggles sidebar collapsed state", () => {
    const { result } = renderHook(() => useShell(), {
      wrapper: ShellProvider,
    });
    act(() => result.current.toggleSidebar());
    expect(result.current.sidebarCollapsed).toBe(true);
    act(() => result.current.toggleSidebar());
    expect(result.current.sidebarCollapsed).toBe(false);
  });

  it("persists collapsed state to localStorage", () => {
    const { result } = renderHook(() => useShell(), {
      wrapper: ShellProvider,
    });
    act(() => result.current.toggleSidebar());
    expect(localStorage.getItem("cs-sidebar-collapsed")).toBe("true");
  });

  it("throws if used outside ShellProvider", () => {
    expect(() => renderHook(() => useShell())).toThrow(
      "useShell must be used inside ShellProvider"
    );
  });
});
