// Enterprise License Validation
// Validates the LICENSE_KEY environment variable to unlock enterprise features.
//
// SECURITY NOTE: This implementation uses base64-encoded JSON for simplicity.
// A production implementation would use Ed25519 digital signatures to prevent
// tampering. The key would be signed with a private key held by the vendor, and
// verified here using the corresponding public key embedded in this binary.
// See: https://en.wikipedia.org/wiki/EdDSA

export interface LicensePayload {
  /** UTC ISO string or Date — when the license expires */
  expiresAt: Date;
  /** Maximum number of seats (users) covered by this license */
  seatCount: number;
  /** Feature flags unlocked by this license, e.g. ['sso', 'saml', 'confluence', 'notion'] */
  features: string[];
  /** License tier */
  plan: "enterprise" | "team";
}

/** Raw JSON shape as decoded from the base64 key (before date coercion) */
interface RawLicensePayload {
  expiresAt: string;
  seatCount: number;
  features: string[];
  plan: "enterprise" | "team";
}

let _cached: LicensePayload | null | undefined = undefined; // undefined = not yet computed

/**
 * Decodes and validates the LICENSE_KEY environment variable.
 *
 * The key is expected to be a base64-encoded JSON object conforming to
 * RawLicensePayload. In production you would verify an Ed25519 signature
 * embedded in the key before trusting its contents.
 *
 * Returns null if:
 * - LICENSE_KEY is not set
 * - The key cannot be decoded / parsed
 * - The license has expired
 *
 * Never throws — logs warnings instead.
 */
export function validateLicense(): LicensePayload | null {
  // Return cached result to avoid repeated parsing
  if (_cached !== undefined) return _cached;

  const rawKey = process.env.LICENSE_KEY;

  if (!rawKey) {
    _cached = null;
    return null;
  }

  try {
    // base64 decode
    const json = Buffer.from(rawKey, "base64").toString("utf8");
    const raw = JSON.parse(json) as RawLicensePayload;

    // Basic shape validation
    if (
      typeof raw.expiresAt !== "string" ||
      typeof raw.seatCount !== "number" ||
      !Array.isArray(raw.features) ||
      (raw.plan !== "enterprise" && raw.plan !== "team")
    ) {
      console.warn("[License] LICENSE_KEY payload has invalid shape — ignoring");
      _cached = null;
      return null;
    }

    const expiresAt = new Date(raw.expiresAt);

    if (isNaN(expiresAt.getTime())) {
      console.warn("[License] LICENSE_KEY expiresAt is not a valid date — ignoring");
      _cached = null;
      return null;
    }

    if (expiresAt <= new Date()) {
      console.warn(
        `[License] LICENSE_KEY expired on ${expiresAt.toISOString()} — enterprise features disabled`
      );
      _cached = null;
      return null;
    }

    const payload: LicensePayload = {
      expiresAt,
      seatCount: raw.seatCount,
      features: raw.features.map(String),
      plan: raw.plan,
    };

    console.log(
      `[License] Valid ${payload.plan} license — expires ${payload.expiresAt.toISOString()}, ` +
        `seats: ${payload.seatCount}, features: [${payload.features.join(", ")}]`
    );

    _cached = payload;
    return payload;
  } catch (err) {
    console.warn("[License] Failed to decode LICENSE_KEY:", err instanceof Error ? err.message : err);
    _cached = null;
    return null;
  }
}

/**
 * Returns true if a valid, non-expired license is present.
 */
export function isLicenseValid(): boolean {
  return validateLicense() !== null;
}

/**
 * Returns true if the license is valid AND covers the requested feature.
 *
 * @example
 *   hasLicenseFeature('sso')      // true if license covers SSO
 *   hasLicenseFeature('confluence') // true if license covers Confluence
 */
export function hasLicenseFeature(feature: string): boolean {
  const license = validateLicense();
  if (!license) return false;
  return license.features.includes(feature);
}

/**
 * Resets the cached license value — useful in tests.
 * @internal
 */
export function _resetLicenseCache(): void {
  _cached = undefined;
}
