// better-auth Server Configuration
// Configures authentication with Prisma adapter and providers

import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/subscriptions/plans";
import { PlanTier } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// Validate required environment variables
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

if (!githubClientId || !githubClientSecret) {
  console.warn(
    "GitHub OAuth credentials not found. GitHub login will be disabled."
  );
  console.warn(
    "Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your .env file"
  );
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === "production",
  },
  socialProviders:
    githubClientId && githubClientSecret
      ? {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          },
        }
      : {},
  // Additional configuration
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
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
  advanced: {
    cookiePrefix: "contextstream",
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});

// Type inference for session
export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
