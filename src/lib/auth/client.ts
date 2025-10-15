// better-auth Client Configuration
// Use this in client components and pages for authentication

import { createAuthClient } from "better-auth/react";

// Client on same domain as server - no baseURL needed
export const authClient = createAuthClient();

// Export hooks for use in components
export const { useSession, signIn, signUp, signOut } = authClient;
