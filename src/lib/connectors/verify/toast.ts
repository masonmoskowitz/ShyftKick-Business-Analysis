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

interface ToastRestaurantDetail {
  general?: { name?: string; locationName?: string; timeZone?: string };
  location?: {
    address1?: string;
    city?: string;
    stateCode?: string;
    zipCode?: string;
  };
}

/**
 * The list endpoint only carries brand-level names, so a multi-location
 * group looks like five identical rows. The per-restaurant config
 * endpoint adds the site name, address, and timezone.
 */
async function fetchRestaurantDetail(
  accessToken: string,
  guid: string,
): Promise<VerifiedLocation | null> {
  try {
    const response = await providerFetch(
      `${HOST}/restaurants/v1/restaurants/${encodeURIComponent(guid)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Toast-Restaurant-External-ID": guid,
        },
      },
    );
    if (!response.ok) return null;
    const detail = (await response.json()) as ToastRestaurantDetail;
    const brand = detail.general?.name;
    const site = detail.general?.locationName;
    const name =
      site && brand && site !== brand
        ? `${brand} — ${site}`
        : (site ?? brand ?? null);
    const addressParts = [
      detail.location?.address1,
      detail.location?.city,
      detail.location?.stateCode,
    ].filter(Boolean);
    return {
      providerLocationId: guid,
      name: name ?? "Toast restaurant",
      address: addressParts.length > 0 ? addressParts.join(", ") : undefined,
      timezone: detail.general?.timeZone,
    };
  } catch {
    return null;
  }
}

/** Same-named locations get their city appended so rows are tellable apart. */
function disambiguate(locations: VerifiedLocation[]): VerifiedLocation[] {
  const nameCounts = new Map<string, number>();
  for (const loc of locations) {
    nameCounts.set(loc.name, (nameCounts.get(loc.name) ?? 0) + 1);
  }
  return locations.map((loc) => {
    if ((nameCounts.get(loc.name) ?? 0) < 2 || !loc.address) return loc;
    const city = loc.address.split(", ")[1];
    return city ? { ...loc, name: `${loc.name} (${city})` } : loc;
  });
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
      const listed = (restaurants ?? [])
        .map((r) => ({
          providerLocationId: r.restaurantGuid ?? r.guid ?? "",
          name:
            r.locationName ??
            r.restaurantName ??
            r.name ??
            "Toast restaurant",
        }))
        .filter((r) => r.providerLocationId !== "");

      // Enrich with site name, address, and timezone (segment cap: 20).
      const details = await Promise.all(
        listed
          .slice(0, 20)
          .map((r) => fetchRestaurantDetail(accessToken, r.providerLocationId)),
      );
      const locations = disambiguate(
        listed.map((fallback, i) => details[i] ?? fallback),
      );
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
