/**
 * Square credential verification.
 *
 * A customer-created access token is verified by listing locations
 * (read scope). Production is tried first; a 401 falls back to the
 * sandbox host so developer test tokens verify too, with the
 * environment reported honestly.
 */

import { providerFetch, type VerifiedLocation, type VerifyResult } from "./types";

const HOSTS = {
  production: "https://connect.squareup.com",
  sandbox: "https://connect.squareupsandbox.com",
} as const;

interface SquareAddress {
  address_line_1?: string;
  locality?: string;
  administrative_district_level_1?: string;
}

interface SquareLocation {
  id: string;
  name?: string;
  business_name?: string;
  status?: string;
  timezone?: string;
  address?: SquareAddress;
}

function formatAddress(address?: SquareAddress): string | undefined {
  if (!address) return undefined;
  const parts = [
    address.address_line_1,
    address.locality,
    address.administrative_district_level_1,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

async function listLocations(
  host: string,
  accessToken: string,
): Promise<Response> {
  return providerFetch(`${host}/v2/locations`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

export async function verifySquare(
  credentials: Record<string, string>,
): Promise<VerifyResult> {
  const providerId = "square";
  const accessToken = credentials.accessToken?.trim();
  if (!accessToken) {
    return {
      ok: false,
      providerId,
      code: "invalid_request",
      message: "Square access token is required.",
    };
  }

  try {
    let environment: "production" | "sandbox" = "production";
    let response = await listLocations(HOSTS.production, accessToken);

    if (response.status === 401) {
      const sandboxResponse = await listLocations(HOSTS.sandbox, accessToken);
      if (sandboxResponse.ok) {
        environment = "sandbox";
        response = sandboxResponse;
      }
    }

    if (response.status === 401) {
      return {
        ok: false,
        providerId,
        code: "invalid_credentials",
        message:
          "Square rejected this access token. Check that you copied the full token from your application in the Square Developer Dashboard.",
      };
    }
    if (response.status === 403) {
      return {
        ok: false,
        providerId,
        code: "permission_denied",
        message:
          "This token is valid but lacks permission to read locations. Confirm the application has merchant profile read access.",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        providerId,
        code: "provider_unreachable",
        message: `Square returned an unexpected status (${response.status}). Try again shortly.`,
      };
    }

    const body = (await response.json()) as { locations?: SquareLocation[] };
    const locations: VerifiedLocation[] = (body.locations ?? [])
      .filter((loc) => loc.status !== "INACTIVE")
      .map((loc) => ({
        providerLocationId: loc.id,
        name: loc.name || loc.business_name || "Unnamed location",
        address: formatAddress(loc.address),
        timezone: loc.timezone,
      }));

    return {
      ok: true,
      providerId,
      environment,
      locations,
      note:
        environment === "sandbox"
          ? "Verified against the Square sandbox. Use a production token before activation."
          : undefined,
    };
  } catch {
    return {
      ok: false,
      providerId,
      code: "provider_unreachable",
      message: "Could not reach Square. Check your connection and try again.",
    };
  }
}
