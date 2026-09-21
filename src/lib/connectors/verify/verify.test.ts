import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyCredentials } from "./index";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyCredentials dispatch", () => {
  it("reports providers without live verification honestly", async () => {
    const result = await verifyCredentials("hotschedules", { token: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unsupported_provider");
  });
});

describe("square verifier", () => {
  it("rejects empty credentials without calling the API", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await verifyCredentials("square", {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_request");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns discovered locations on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          locations: [
            {
              id: "L1",
              name: "Queen Creek",
              status: "ACTIVE",
              timezone: "America/Phoenix",
              address: { address_line_1: "123 Main St", locality: "Queen Creek" },
            },
            { id: "L2", name: "Closed spot", status: "INACTIVE" },
          ],
        }),
      ),
    );
    const result = await verifyCredentials("square", { accessToken: "tok" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.environment).toBe("production");
      expect(result.locations).toEqual([
        {
          providerLocationId: "L1",
          name: "Queen Creek",
          address: "123 Main St, Queen Creek",
          timezone: "America/Phoenix",
        },
      ]);
    }
  });

  it("falls back to sandbox on production 401 and labels it", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string) =>
        String(url).includes("squareupsandbox")
          ? Promise.resolve(jsonResponse(200, { locations: [] }))
          : Promise.resolve(jsonResponse(401, { errors: [] })),
      );
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyCredentials("square", { accessToken: "sandbox-tok" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.environment).toBe("sandbox");
      expect(result.note).toContain("sandbox");
    }
  });

  it("maps a double 401 to invalid_credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(401, { errors: [] })),
    );
    const result = await verifyCredentials("square", { accessToken: "bad" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_credentials");
  });

  it("maps network failure to provider_unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const result = await verifyCredentials("square", { accessToken: "tok" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("provider_unreachable");
  });
});

describe("toast verifier", () => {
  it("maps auth rejection to invalid_credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(401, {})),
    );
    const result = await verifyCredentials("toast", {
      clientId: "id",
      clientSecret: "bad",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_credentials");
  });

  it("passes with an honest note when discovery is unavailable", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      String(url).includes("authentication")
        ? Promise.resolve(
            jsonResponse(200, { token: { accessToken: "jwt" } }),
          )
        : Promise.resolve(jsonResponse(403, {})),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyCredentials("toast", {
      clientId: "id",
      clientSecret: "secret",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.locations).toEqual([]);
      expect(result.note).toContain("restaurant GUID");
    }
  });

  it("enriches discovered restaurants with site name, address, and timezone", async () => {
    const details: Record<string, unknown> = {
      "guid-1": {
        general: { name: "Angie's", locationName: "Queen Creek", timeZone: "America/Phoenix" },
        location: { address1: "123 Rittenhouse Rd", city: "Queen Creek", stateCode: "AZ" },
      },
      "guid-2": {
        general: { name: "Angie's", locationName: "Tempe", timeZone: "America/Phoenix" },
        location: { address1: "500 Mill Ave", city: "Tempe", stateCode: "AZ" },
      },
    };
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes("authentication")) {
        return Promise.resolve(jsonResponse(200, { token: { accessToken: "jwt" } }));
      }
      if (u.includes("/partners/")) {
        return Promise.resolve(
          jsonResponse(200, [
            { restaurantGuid: "guid-1", restaurantName: "Angie's" },
            { restaurantGuid: "guid-2", restaurantName: "Angie's" },
          ]),
        );
      }
      const guid = u.split("/").pop() ?? "";
      return Promise.resolve(jsonResponse(200, details[guid] ?? {}));
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyCredentials("toast", {
      clientId: "id",
      clientSecret: "secret",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.locations).toEqual([
        {
          providerLocationId: "guid-1",
          name: "Angie's — Queen Creek",
          address: "123 Rittenhouse Rd, Queen Creek, AZ",
          timezone: "America/Phoenix",
        },
        {
          providerLocationId: "guid-2",
          name: "Angie's — Tempe",
          address: "500 Mill Ave, Tempe, AZ",
          timezone: "America/Phoenix",
        },
      ]);
    }
  });

  it("disambiguates identical names with the city when detail lacks a site name", async () => {
    const details: Record<string, unknown> = {
      "guid-1": {
        general: { name: "Angie's" },
        location: { address1: "123 Rittenhouse Rd", city: "Queen Creek", stateCode: "AZ" },
      },
      "guid-2": {
        general: { name: "Angie's" },
        location: { address1: "500 Mill Ave", city: "Tempe", stateCode: "AZ" },
      },
    };
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes("authentication")) {
        return Promise.resolve(jsonResponse(200, { token: { accessToken: "jwt" } }));
      }
      if (u.includes("/partners/")) {
        return Promise.resolve(
          jsonResponse(200, [
            { restaurantGuid: "guid-1", restaurantName: "Angie's" },
            { restaurantGuid: "guid-2", restaurantName: "Angie's" },
          ]),
        );
      }
      const guid = u.split("/").pop() ?? "";
      return Promise.resolve(jsonResponse(200, details[guid] ?? {}));
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyCredentials("toast", {
      clientId: "id",
      clientSecret: "secret",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.locations.map((l) => l.name)).toEqual([
        "Angie's (Queen Creek)",
        "Angie's (Tempe)",
      ]);
    }
  });

  it("falls back to list names when detail fetches fail", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes("authentication")) {
        return Promise.resolve(jsonResponse(200, { token: { accessToken: "jwt" } }));
      }
      if (u.includes("/partners/")) {
        return Promise.resolve(
          jsonResponse(200, [
            { restaurantGuid: "guid-1", restaurantName: "Main St" },
          ]),
        );
      }
      return Promise.resolve(jsonResponse(500, {}));
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyCredentials("toast", {
      clientId: "id",
      clientSecret: "secret",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.locations).toEqual([
        { providerLocationId: "guid-1", name: "Main St" },
      ]);
    }
  });
});

describe("clover verifier", () => {
  it("returns the merchant as the location", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { id: "M1", name: "Copper Fork" })),
    );
    const result = await verifyCredentials("clover", {
      merchantId: "M1",
      apiToken: "tok",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.locations[0]).toEqual({
        providerLocationId: "M1",
        name: "Copper Fork",
      });
    }
  });

  it("maps a mismatched merchant to permission_denied", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(403, {})),
    );
    const result = await verifyCredentials("clover", {
      merchantId: "OTHER",
      apiToken: "tok",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("permission_denied");
  });
});

describe("7shifts verifier", () => {
  it("verifies and discovers company locations", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("whoami")) {
        return Promise.resolve(
          jsonResponse(200, { data: { company_ids: [77] } }),
        );
      }
      return Promise.resolve(
        jsonResponse(200, {
          data: [{ id: 5, name: "Queen Creek", timezone: "America/Phoenix" }],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyCredentials("seven_shifts", { accessToken: "tok" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.locations).toEqual([
        {
          providerLocationId: "5",
          name: "Queen Creek",
          address: undefined,
          timezone: "America/Phoenix",
        },
      ]);
    }
  });

  it("still verifies when discovery fails, with a note", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      String(url).includes("whoami")
        ? Promise.resolve(jsonResponse(200, { data: {} }))
        : Promise.resolve(jsonResponse(404, {})),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyCredentials("seven_shifts", { accessToken: "tok" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.note).toContain("import validation");
  });
});
