// better-auth Server Configuration
// Configures authentication with Drizzle adapter and providers

import { db, prisma } from "@/lib/db";
import { users, accounts, sessions, verifications } from "@/lib/db/schema";
import { PLANS } from "@/lib/subscriptions/plans";
import { PlanTier } from "@/lib/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import { microsoft } from "better-auth/social-providers";
import { hasLicenseFeature } from "@/lib/license";

// Validate required environment variables
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

if (!githubClientId || !githubClientSecret) {
  console.warn(
    "GitHub OAuth credentials not found. GitHub login will be disabled."
  );
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.warn(
    "Google OAuth credentials not found. Google login will be disabled."
  );
}

// ---------------------------------------------------------------------------
// Enterprise SSO — gated by LICENSE_KEY with 'sso' feature
// ---------------------------------------------------------------------------

/**
 * Azure Entra ID SSO provider (Microsoft).
 * Requires:
 *   - LICENSE_KEY with 'sso' feature
 *   - AZURE_TENANT_ID
 *   - AZURE_CLIENT_ID
 *   - AZURE_CLIENT_SECRET
 *
 * The OIDC discovery URL used internally by Better Auth:
 *   https://login.microsoftonline.com/{tenantId}/v2.0/.well-known/openid-configuration
 */
const azureTenantId = process.env.AZURE_TENANT_ID;
const azureClientId = process.env.AZURE_CLIENT_ID;
const azureClientSecret = process.env.AZURE_CLIENT_SECRET;

const azureEnabled =
  hasLicenseFeature("sso") &&
  Boolean(azureTenantId && azureClientId && azureClientSecret);

if (azureEnabled) {
  console.log("[Auth] Azure Entra ID SSO enabled");
} else if (hasLicenseFeature("sso") && !azureEnabled) {
  if (!azureTenantId || !azureClientId || !azureClientSecret) {
    console.warn(
      "[Auth] License has SSO but Azure env vars missing (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)"
    );
  }
}

/**
 * Generic OIDC provider (Okta, Auth0, Ping, etc.).
 * Requires:
 *   - LICENSE_KEY with 'sso' feature
 *   - OIDC_ISSUER    — e.g. https://your-org.okta.com
 *   - OIDC_CLIENT_ID
 *   - OIDC_CLIENT_SECRET
 */
const oidcIssuer = process.env.OIDC_ISSUER;
const oidcClientId = process.env.OIDC_CLIENT_ID;
const oidcClientSecret = process.env.OIDC_CLIENT_SECRET;

const oidcEnabled =
  hasLicenseFeature("sso") &&
  Boolean(oidcIssuer && oidcClientId && oidcClientSecret);

if (oidcEnabled) {
  console.log(`[Auth] Generic OIDC SSO enabled (issuer: ${oidcIssuer})`);
} else if (hasLicenseFeature("sso") && !oidcEnabled) {
  if (!oidcIssuer || !oidcClientId || !oidcClientSecret) {
    console.warn(
      "[Auth] License has SSO but generic OIDC env vars missing (OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET)"
    );
  }
}

// Build the genericOAuth plugin configs for enterprise OIDC providers
const eeGenericOAuthConfigs = [
  // Azure Entra ID via OIDC discovery
  ...(azureEnabled && azureTenantId && azureClientId && azureClientSecret
    ? [
        {
          providerId: "azure-entra-id",
          // Better Auth's genericOAuth supports discoveryUrl to auto-resolve
          // the authorization + token endpoints from the OIDC well-known config.
          discoveryUrl: `https://login.microsoftonline.com/${azureTenantId}/v2.0/.well-known/openid-configuration`,
          clientId: azureClientId,
          clientSecret: azureClientSecret,
          scopes: ["openid", "profile", "email"],
          pkce: true,
        },
      ]
    : []),
  // Generic OIDC (Okta, Auth0, Ping Identity, etc.)
  ...(oidcEnabled && oidcIssuer && oidcClientId && oidcClientSecret
    ? [
        {
          providerId: "oidc",
          // Attempt OIDC discovery; falls back gracefully if the issuer
          // does not expose /.well-known/openid-configuration.
          discoveryUrl: `${oidcIssuer}/.well-known/openid-configuration`,
          clientId: oidcClientId,
          clientSecret: oidcClientSecret,
          scopes: ["openid", "profile", "email"],
          pkce: true,
        },
      ]
    : []),
];

const eePlugins =
  eeGenericOAuthConfigs.length > 0
    ? [genericOAuth({ config: eeGenericOAuthConfigs })]
    : [];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, account: accounts, session: sessions, verification: verifications },
  }),
  advanced: {
    // Tell better-auth to generate UUIDs — required because our schema uses uuid columns
    database: {
      generateId: "uuid",
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // If an email provider is configured via env vars, use it here.
      // For now, log the reset URL so self-hosted users can still reset passwords
      // via server logs until an email provider is wired up.
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Auth] Password reset URL for ${user.email}: ${url}`);
      } else {
        // In production, log at a lower level so ops can extract it if needed
        console.info(`[Auth] Password reset requested for ${user.email}`);
        console.info(`[Auth] Reset URL: ${url}`);
      }
    },
  },
  socialProviders: {
    ...(githubClientId && githubClientSecret
      ? {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          },
        }
      : {}),
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
    // Azure Entra ID built-in provider — added when SSO license + env vars are present
    ...(azureEnabled && azureTenantId && azureClientId && azureClientSecret
      ? {
          microsoft: {
            clientId: azureClientId,
            clientSecret: azureClientSecret,
            tenantId: azureTenantId,
          },
        }
      : {}),
  },
  plugins: eePlugins,
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
    },
    // Hook to create personal workspace on user creation
    onCreate: async (user: any) => {
      // Check if this is the first user - if so, make them SUPER_ADMIN
      const userCount = await prisma.user.count();

      if (userCount === 1) {
        // First user - promote to SUPER_ADMIN
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "SUPER_ADMIN" },
        });
        console.log(
          `First user registered - promoted ${user.email} to SUPER_ADMIN`
        );
      }

      // Create personal workspace
      const userName = user.name || user.email.split("@")[0] || "user";
      const slug = `${userName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

      await prisma.workspace.create({
        data: {
          name: "Personal",
          slug,
          ownerId: user.id,
        },
      });

      // Create FREE subscription for new user
      const freePlan = PLANS[PlanTier.FREE];
      const now = new Date();
      const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1); // First day of next month

      await prisma.subscription.create({
        data: {
          userId: user.id,
          planTier: PlanTier.FREE,
          status: "ACTIVE",
          searchesPerMonth: freePlan.features.searchesPerMonth,
          maxSources: freePlan.features.maxSources,
          maxWorkspaces: freePlan.features.maxWorkspaces,
          maxPagesIndexed: freePlan.features.maxPagesIndexed,
          apiRateLimit: freePlan.features.apiRateLimit,
          searchesUsed: 0,
          sourcesUsed: 0,
          workspacesUsed: 1, // They just created their personal workspace
          pagesIndexed: 0,
          resetAt,
        },
      });

      console.log(`Created FREE subscription for user ${user.email}`);
    },
  },
});

// Type inference for session
export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
