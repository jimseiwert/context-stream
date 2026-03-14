import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock @/lib/db to prevent database connection during tests.
// permissions.ts imports UserRole from @/lib/db, which attempts a real
// DB connection at module-evaluation time. We stub the full module and
// re-export UserRole from the schema enums directly.
vi.mock("@/lib/db", async () => {
  const enums = await import("@/lib/db/schema/enums");
  return { ...enums };
});

// Import after the mock is registered
const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin, isSuperAdmin, Permission } =
  await import("@/lib/auth/permissions");
const { UserRole } = await import("@/lib/db/schema/enums");

describe("hasPermission", () => {
  it("grants SUPER_ADMIN all permissions", () => {
    for (const perm of Object.values(Permission)) {
      expect(hasPermission(UserRole.SUPER_ADMIN, perm)).toBe(true);
    }
  });

  it("grants ADMIN view_admin_dashboard", () => {
    expect(hasPermission(UserRole.ADMIN, Permission.VIEW_ADMIN_DASHBOARD)).toBe(true);
  });

  it("denies ADMIN manage_user_roles", () => {
    expect(hasPermission(UserRole.ADMIN, Permission.MANAGE_USER_ROLES)).toBe(false);
  });

  it("grants USER manage_workspace_sources", () => {
    expect(hasPermission(UserRole.USER, Permission.MANAGE_WORKSPACE_SOURCES)).toBe(true);
  });

  it("denies USER view_admin_dashboard", () => {
    expect(hasPermission(UserRole.USER, Permission.VIEW_ADMIN_DASHBOARD)).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("returns true when role has at least one permission in the list", () => {
    expect(
      hasAnyPermission(UserRole.USER, [
        Permission.VIEW_ADMIN_DASHBOARD,
        Permission.MANAGE_WORKSPACE_SOURCES,
      ])
    ).toBe(true);
  });

  it("returns false when role has none of the permissions", () => {
    expect(
      hasAnyPermission(UserRole.USER, [
        Permission.VIEW_ADMIN_DASHBOARD,
        Permission.MANAGE_USER_ROLES,
      ])
    ).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("returns true when role has every permission in the list", () => {
    expect(
      hasAllPermissions(UserRole.ADMIN, [
        Permission.VIEW_ADMIN_DASHBOARD,
        Permission.VIEW_USAGE_STATS,
      ])
    ).toBe(true);
  });

  it("returns false when role is missing one permission", () => {
    expect(
      hasAllPermissions(UserRole.ADMIN, [
        Permission.VIEW_ADMIN_DASHBOARD,
        Permission.MANAGE_USER_ROLES,
      ])
    ).toBe(false);
  });
});

describe("isAdmin", () => {
  it("returns true for ADMIN", () => {
    expect(isAdmin(UserRole.ADMIN)).toBe(true);
  });

  it("returns true for SUPER_ADMIN", () => {
    expect(isAdmin(UserRole.SUPER_ADMIN)).toBe(true);
  });

  it("returns false for USER", () => {
    expect(isAdmin(UserRole.USER)).toBe(false);
  });
});

describe("isSuperAdmin", () => {
  it("returns true for SUPER_ADMIN", () => {
    expect(isSuperAdmin(UserRole.SUPER_ADMIN)).toBe(true);
  });

  it("returns false for ADMIN", () => {
    expect(isSuperAdmin(UserRole.ADMIN)).toBe(false);
  });

  it("returns false for USER", () => {
    expect(isSuperAdmin(UserRole.USER)).toBe(false);
  });
});
