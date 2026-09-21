/**
 * Toast credential verification (standard API access: client ID +
 * secret, read-only).
 *
 * Authentication against Toast's login endpoint is the hard gate.
 * Restaurant discovery uses the partners endpoint, which some access
 * types cannot call — in that case verification still passes with an
 * honest note, and the customer enters restaurant GUIDs on the
 * Locations step. Discovery behavior must be confirmed against real
 * standard-access credentials during Stage 1 validation.
 */

import { providerFetch, type VerifiedLocation, type VerifyResult } from "./types";

const HOST = "https://ws-api.toasttab.com";

interface ToastRestaurant {
  restaurantGuid?: string;
  guid?: string;
  restaurantName?: string;
  name?: string;
  locationName?: string;
}

export async function verifyToast(
  credentials: Record<string, string>,
): Promise<VerifyResult> {
  const providerId = "toast";
  const clientId = credentials.clientId?.trim();
  const clientSecret = credentials.clientSecret?.trim();
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      providerId,
      code: "invalid_request",
      message: "Toast client ID and client secret are both required.",
    };
  }

  try {
    const authResponse = await providerFetch(
      `${HOST}/authentication/v1/authentication/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          clientSecret,
          userAccessType: "TOAST_MACHINE_CLIENT",
        }),
      },
    );

    if (authResponse.status === 401 || authResponse.status === 403) {
      return {
        ok: false,
        providerId,
        code: "invalid_credentials",
        message:
          "Toast rejected these credentials. Check the client ID and secret from your standard API access setup.",
      };
    }
    if (!authResponse.ok) {
      return {
        ok: false,
        providerId,
        code: "provider_unreachable",
        message: `Toast returned an unexpected status (${authResponse.status}). Try again shortly.`,
      };
    }

    const authBody = (await authResponse.json()) as {
      token?: { accessToken?: string };
    };
    const accessToken = authBody.token?.accessToken;
    if (!accessToken) {
      return {
        ok: false,
        providerId,
        code: "provider_unreachable",
        message: "Toast authentication succeeded but returned no token. Try again shortly.",
      };
    }

    // Discovery is best-effort: standard access may not include this endpoint.
    const discoveryResponse = await providerFetch(`${HOST}/partners/v1/restaurants`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (discoveryResponse.ok) {
      const restaurants = (await discoveryResponse.json()) as ToastRestaurant[];
      const locations: VerifiedLocation[] = (restaurants ?? []).map((r) => ({
        providerLocationId: r.restaurantGuid ?? r.guid ?? "",
        name: r.restaurantName ?? r.name ?? r.locationName ?? "Toast restaurant",
      }));
      return { ok: true, providerId, environment: "production", locations };
    }

    return {
      ok: true,
      providerId,
      environment: "production",
      locations: [],
      note:
        "Credentials verified. Your access type doesn't expose automatic restaurant discovery — add your restaurant GUID(s) on the Locations step (shown in Toast Web where your API access was issued).",
    };
  } catch {
    return {
      ok: false,
      providerId,
      code: "provider_unreachable",
      message: "Could not reach Toast. Check your connection and try again.",
    };
  }
}
