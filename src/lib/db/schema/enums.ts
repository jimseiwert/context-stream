// Drizzle Schema - Enums
// All enum types used across the application

import { pgEnum } from "drizzle-orm/pg-core";

// User Management
export const userRoleEnum = pgEnum("UserRole", [
  "SUPER_ADMIN",
  "ADMIN",
  "USER",
]);

// Sources
export const sourceTypeEnum = pgEnum("SourceType", [
  "WEBSITE",
  "GITHUB",
  "DOCUMENT",
  "CONFLUENCE",
  "NOTION",
]);

export const sourceStatusEnum = pgEnum("SourceStatus", [
  "PENDING",
  "INDEXING",
  "ACTIVE",
  "ERROR",
  "PAUSED",
]);

export const sourceScopeEnum = pgEnum("SourceScope", ["GLOBAL", "WORKSPACE"]);

export const rescrapeScheduleEnum = pgEnum("RescrapeSchedule", [
  "NEVER",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
]);

// Documents
export const documentTypeEnum = pgEnum("DocumentType", [
  "TXT",
  "PDF",
  "DOCX",
  "MD",
  "CSV",
  "XLSX",
  "HTML",
  "RTF",
  "ODT",
]);

// Jobs
export const jobTypeEnum = pgEnum("JobType", [
  "SCRAPE",
  "EMBED",
  "UPDATE",
  "DOCUMENT_UPLOAD",
]);

export const jobStatusEnum = pgEnum("JobStatus", [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

// Subscriptions
export const planTierEnum = pgEnum("PlanTier", [
  "FREE",
  "STARTER",
  "PRO",
  "TEAM",
  "ENTERPRISE",
  "SELF_HOSTED",
]);

export const subscriptionStatusEnum = pgEnum("SubscriptionStatus", [
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "TRIALING",
  "INCOMPLETE",
]);

export const usageEventTypeEnum = pgEnum("UsageEventType", [
  "SEARCH",
  "SOURCE_ADDED",
  "PAGE_INDEXED",
  "API_REQUEST",
  "WORKSPACE_CREATED",
]);

// Jobs - dispatch mode
export const jobDispatchModeEnum = pgEnum("JobDispatchMode", [
  "INPROCESS",
  "WORKER",
  "KUBERNETES",
]);

// System Configuration
export const credentialTypeEnum = pgEnum("CredentialType", [
  "API_KEY",
  "SERVICE_ACCOUNT_JSON",
  "CONNECTION_STRING",
  "AZURE_CREDENTIALS",
]);

export const imageProcessingMethodEnum = pgEnum("ImageProcessingMethod", [
  "OCR",
  "OPENAI_VISION",
  "AZURE_VISION",
  "SKIP",
]);

// Type exports for backwards compatibility with Prisma imports
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type SourceType = (typeof sourceTypeEnum.enumValues)[number];
export type SourceStatus = (typeof sourceStatusEnum.enumValues)[number];
export type SourceScope = (typeof sourceScopeEnum.enumValues)[number];
export type RescrapeSchedule = (typeof rescrapeScheduleEnum.enumValues)[number];
export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type JobType = (typeof jobTypeEnum.enumValues)[number];
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];
export type PlanTier = (typeof planTierEnum.enumValues)[number];
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
export type UsageEventType = (typeof usageEventTypeEnum.enumValues)[number];
export type CredentialType = (typeof credentialTypeEnum.enumValues)[number];
export type ImageProcessingMethod = (typeof imageProcessingMethodEnum.enumValues)[number];
export type JobDispatchMode = (typeof jobDispatchModeEnum.enumValues)[number];

// Enum value objects for backwards compatibility (to use as values, not just types)
export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN" as const,
  ADMIN: "ADMIN" as const,
  USER: "USER" as const,
};

export const SourceScope = {
  GLOBAL: "GLOBAL" as const,
  WORKSPACE: "WORKSPACE" as const,
};

export const SourceStatus = {
  PENDING: "PENDING" as const,
  INDEXING: "INDEXING" as const,
  ACTIVE: "ACTIVE" as const,
  ERROR: "ERROR" as const,
  PAUSED: "PAUSED" as const,
};

export const UsageEventType = {
  SEARCH: "SEARCH" as const,
  SOURCE_ADDED: "SOURCE_ADDED" as const,
  PAGE_INDEXED: "PAGE_INDEXED" as const,
  API_REQUEST: "API_REQUEST" as const,
  WORKSPACE_CREATED: "WORKSPACE_CREATED" as const,
};

export const PlanTier = {
  FREE: "FREE" as const,
  STARTER: "STARTER" as const,
  PRO: "PRO" as const,
  TEAM: "TEAM" as const,
  ENTERPRISE: "ENTERPRISE" as const,
  SELF_HOSTED: "SELF_HOSTED" as const,
};

export const SubscriptionStatus = {
  ACTIVE: "ACTIVE" as const,
  PAST_DUE: "PAST_DUE" as const,
  CANCELED: "CANCELED" as const,
  TRIALING: "TRIALING" as const,
  INCOMPLETE: "INCOMPLETE" as const,
};
