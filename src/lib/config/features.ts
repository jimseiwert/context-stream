// Feature Flags System
// Controls which features are enabled based on deployment mode

/**
 * Determines if the application is running in SaaS mode
 * SaaS mode enables billing, quotas, and usage tracking
 * Self-hosted mode disables all monetization features
 */
export const IS_SAAS_MODE = process.env.IS_SAAS_MODE === 'true'

/**
 * Feature flags configuration
 * Features can be enabled/disabled based on deployment mode
 */
export const features = {
  // Usage tracking and analytics
  usageTracking: IS_SAAS_MODE,

  // Quota enforcement (searches, sources, workspaces)
  quotaEnforcement: IS_SAAS_MODE,

  // Billing and subscription management UI
  billingUI: IS_SAAS_MODE,

  // Rate limiting per plan tier
  rateLimiting: IS_SAAS_MODE,

  // Stripe payment integration
  stripeIntegration: IS_SAAS_MODE,

  // Usage dashboards and metrics
  usageDashboard: IS_SAAS_MODE,

  // Upgrade prompts when approaching limits
  upgradePrompts: IS_SAAS_MODE,

  // Admin analytics (always enabled for admins)
  adminAnalytics: true,

  // API key management (always enabled)
  apiKeys: true,

  // MCP server support (always enabled)
  mcpServer: true,

  // Multi-workspace support (always enabled)
  multiWorkspace: true,

  // Advanced search features (always enabled)
  advancedSearch: true,
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof features): boolean {
  return features[feature]
}

/**
 * Get deployment mode string
 */
export function getDeploymentMode(): 'saas' | 'self-hosted' {
  return IS_SAAS_MODE ? 'saas' : 'self-hosted'
}

/**
 * Check if running in self-hosted mode
 */
export function isSelfHosted(): boolean {
  return !IS_SAAS_MODE
}

/**
 * Check if running in SaaS mode
 */
export function isSaaS(): boolean {
  return IS_SAAS_MODE
}

/**
 * Get environment configuration
 */
export function getEnvironmentConfig() {
  return {
    mode: getDeploymentMode(),
    isSaaS: isSaaS(),
    isSelfHosted: isSelfHosted(),
    features: features,
  }
}
