// better-auth Client Configuration
// Use this in client components and pages for authentication

import { createAuthClient } from "better-auth/react";

// Get the correct base URL, handling www subdomain redirects
function getBaseURL() {
  if (typeof window !== "undefined") {
    // Client-side: use current origin
    return window.location.origin;
  }
  // Server-side: use environment variable
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

// Export hooks for use in components
export const { useSession, signIn, signUp, signOut } = authClient;
