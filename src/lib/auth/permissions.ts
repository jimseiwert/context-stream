// Permission System - Role-Based Access Control
// Defines permissions and role mappings

import { UserRole } from '@prisma/client'

// Permission enum - all available permissions in the system
export enum Permission {
  // Source management
  MANAGE_GLOBAL_SOURCES = 'manage_global_sources',
  MANAGE_WORKSPACE_SOURCES = 'manage_workspace_sources',
  PROMOTE_SOURCES = 'promote_sources',
  DEMOTE_SOURCES = 'demote_sources',

  // Admin features
  VIEW_ADMIN_DASHBOARD = 'view_admin_dashboard',
  VIEW_USAGE_STATS = 'view_usage_stats',

  // User management
  MANAGE_USER_ROLES = 'manage_user_roles',
  VIEW_ALL_WORKSPACES = 'view_all_workspaces',
}

// Role-based permission mapping
export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    Permission.MANAGE_GLOBAL_SOURCES,
    Permission.MANAGE_WORKSPACE_SOURCES,
    Permission.PROMOTE_SOURCES,
    Permission.DEMOTE_SOURCES,
    Permission.VIEW_ADMIN_DASHBOARD,
    Permission.VIEW_USAGE_STATS,
    Permission.MANAGE_USER_ROLES,
    Permission.VIEW_ALL_WORKSPACES,
  ],
  [UserRole.ADMIN]: [
    Permission.MANAGE_GLOBAL_SOURCES,
    Permission.PROMOTE_SOURCES,
    Permission.VIEW_ADMIN_DASHBOARD,
    Permission.VIEW_USAGE_STATS,
  ],
  [UserRole.USER]: [Permission.MANAGE_WORKSPACE_SOURCES],
}

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return RolePermissions[role].includes(permission)
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission))
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission))
}

// Check if user is admin or super admin
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN
}

// Check if user is super admin
export function isSuperAdmin(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN
}
