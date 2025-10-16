/**
 * Auth Capabilities Helper
 * Determines which authentication providers are available based on environment configuration
 */

export function getAuthCapabilities() {
  return {
    hasGithub: !!(
      process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ),
  };
}
