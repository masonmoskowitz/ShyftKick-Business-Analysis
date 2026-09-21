/**
 * Clover credential verification.
 *
 * Clover merchants can generate their own API tokens per merchant.
 * Tokens are scoped to one merchant, so a multi-location group enters
 * one token per location; verification returns the merchant as the
 * discovered location.
 */

import { providerFetch, type VerifyResult } from "./types";

const HOST = "https://api.clover.com";

export async function verifyClover(
  credentials: Record<string, string>,
): Promise<VerifyResult> {
  const providerId = "clover";
  const merchantId = credentials.merchantId?.trim();
  const apiToken = credentials.apiToken?.trim();
  if (!merchantId || !apiToken) {
    return {
      ok: false,
      providerId,
      code: "invalid_request",
      message: "Clover merchant ID and API token are both required.",
    };
  }

  try {
    const response = await providerFetch(
      `${HOST}/v3/merchants/${encodeURIComponent(merchantId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${apiToken}` },
      },
    );

    if (response.status === 401) {
      return {
        ok: false,
        providerId,
        code: "invalid_credentials",
        message:
          "Clover rejected this token. Check the API token generated in your Clover dashboard.",
      };
    }
    if (response.status === 403 || response.status === 404) {
      return {
        ok: false,
        providerId,
        code: "permission_denied",
        message:
          "This token can't read that merchant. Confirm the merchant ID matches the account the token was created in.",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        providerId,
        code: "provider_unreachable",
        message: `Clover returned an unexpected status (${response.status}). Try again shortly.`,
      };
    }

    const merchant = (await response.json()) as { id: string; name?: string };
    return {
      ok: true,
      providerId,
      environment: "production",
      locations: [
        {
          providerLocationId: merchant.id,
          name: merchant.name ?? "Clover merchant",
        },
      ],
      note: "Clover tokens are per merchant — add one connection per location for multi-location groups.",
    };
  } catch {
    return {
      ok: false,
      providerId,
      code: "provider_unreachable",
      message: "Could not reach Clover. Check your connection and try again.",
    };
  }
}
