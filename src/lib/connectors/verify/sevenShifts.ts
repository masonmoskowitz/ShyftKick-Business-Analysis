/**
 * 7shifts credential verification (customer API access token).
 *
 * Authentication is the hard gate; company/location discovery is
 * best-effort and confirmed fully during import validation.
 */

import { providerFetch, type VerifiedLocation, type VerifyResult } from "./types";

const HOST = "https://api.7shifts.com";

export async function verifySevenShifts(
  credentials: Record<string, string>,
): Promise<VerifyResult> {
  const providerId = "seven_shifts";
  const accessToken = credentials.accessToken?.trim();
  if (!accessToken) {
    return {
      ok: false,
      providerId,
      code: "invalid_request",
      message: "7shifts access token is required.",
    };
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  try {
    const whoami = await providerFetch(`${HOST}/v2/whoami`, {
      method: "GET",
      headers,
    });

    if (whoami.status === 401 || whoami.status === 403) {
      return {
        ok: false,
        providerId,
        code: "invalid_credentials",
        message:
          "7shifts rejected this token. Check the access token from Company Settings → Developer Tools.",
      };
    }
    if (!whoami.ok) {
      return {
        ok: false,
        providerId,
        code: "provider_unreachable",
        message: `7shifts returned an unexpected status (${whoami.status}). Try again shortly.`,
      };
    }

    const body = (await whoami.json()) as {
      data?: { company_ids?: number[] };
    };
    const companyId = body.data?.company_ids?.[0];

    if (companyId) {
      const locationsResponse = await providerFetch(
        `${HOST}/v2/company/${companyId}/locations`,
        { method: "GET", headers },
      );
      if (locationsResponse.ok) {
        const locationsBody = (await locationsResponse.json()) as {
          data?: { id: number; name?: string; address?: string; timezone?: string }[];
        };
        const locations: VerifiedLocation[] = (locationsBody.data ?? []).map(
          (loc) => ({
            providerLocationId: String(loc.id),
            name: loc.name ?? "7shifts location",
            address: loc.address,
            timezone: loc.timezone,
          }),
        );
        return { ok: true, providerId, environment: "production", locations };
      }
    }

    return {
      ok: true,
      providerId,
      environment: "production",
      locations: [],
      note: "Token verified. Location discovery will be completed during import validation.",
    };
  } catch {
    return {
      ok: false,
      providerId,
      code: "provider_unreachable",
      message: "Could not reach 7shifts. Check your connection and try again.",
    };
  }
}
