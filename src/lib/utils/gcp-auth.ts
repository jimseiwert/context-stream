/**
 * GCP Service Account authentication using Node.js built-in crypto.
 *
 * Implements the JWT Bearer Token flow:
 * https://developers.google.com/identity/protocols/oauth2/service-account
 *
 * This avoids google-auth-library's internal fetch behaviour which can fail
 * in Docker / devcontainer environments due to network policy or TLS config.
 */

import { createSign } from "crypto";

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
  [key: string]: unknown;
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signedJwt(serviceAccount: ServiceAccountJson, scope: string): string {
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  const unsigned = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = base64url(sign.sign(serviceAccount.private_key));

  return `${unsigned}.${signature}`;
}

/**
 * Exchange a GCP service account JSON for a short-lived Bearer token.
 * Falls back to the GCP metadata server (Application Default Credentials)
 * if no service account is provided — works inside GCP environments.
 */
export async function getGcpBearerToken(
  serviceAccountJson: object | undefined,
  scope = "https://www.googleapis.com/auth/cloud-platform"
): Promise<string> {
  if (serviceAccountJson) {
    const sa = serviceAccountJson as ServiceAccountJson;

    if (!sa.client_email || !sa.private_key) {
      throw new Error(
        "Service account JSON is missing client_email or private_key."
      );
    }

    const jwt = signedJwt(sa, scope);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error_description?: string; error?: string };
      throw new Error(
        data.error_description ?? data.error ?? `Token exchange failed (${res.status})`
      );
    }

    const data = (await res.json()) as { access_token: string };
    if (!data.access_token) throw new Error("Token response did not include access_token");
    return data.access_token;
  }

  // Application Default Credentials via GCP metadata server (runs on GCP only)
  const metaRes = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } }
  );

  if (!metaRes.ok) {
    throw new Error(
      "No credentials available: service account JSON not provided and the GCP metadata server is unreachable. " +
        "Upload a service account JSON key to authenticate outside of GCP."
    );
  }

  const data = (await metaRes.json()) as { access_token: string };
  return data.access_token;
}
