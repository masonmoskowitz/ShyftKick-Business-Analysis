/**
 * Credential verification (scope §3–§4: validate the connection before
 * payment where feasible; provider selection alone is not proof of
 * access).
 *
 * Verifiers run ONLY server-side. They receive credentials transiently,
 * call the provider's API over HTTPS, and return a structured result.
 * Credentials are never logged, never stored by these functions, and
 * never echoed back in results.
 */

export interface VerifiedLocation {
  providerLocationId: string;
  name: string;
  address?: string;
  timezone?: string;
}

export type VerifyFailureCode =
  | "invalid_credentials"
  | "permission_denied"
  | "provider_unreachable"
  | "invalid_request"
  | "unsupported_provider";

export type VerifyResult =
  | {
      ok: true;
      providerId: string;
      environment?: "production" | "sandbox";
      locations: VerifiedLocation[];
      /** Honest caveat, e.g. discovery not available for this access type. */
      note?: string;
    }
  | {
      ok: false;
      providerId: string;
      code: VerifyFailureCode;
      message: string;
    };

export const VERIFY_TIMEOUT_MS = 10_000;

/** fetch with a timeout; network-level failures become provider_unreachable. */
export async function providerFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS) });
}
