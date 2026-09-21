import { describe, expect, it } from "vitest";
import { evaluateCompatibility } from "./compatibility";
import { canTransition } from "../connectors/contract";

describe("evaluateCompatibility", () => {
  it("rejects location counts outside 1–10", () => {
    const result = evaluateCompatibility({
      posProviderId: "square",
      locationCount: 14,
      hasAdminAccess: true,
    });
    expect(result.status).toBe("out_of_segment");
    expect(result.purchasable).toBe(false);
  });

  it("unknown systems are not purchasable", () => {
    const result = evaluateCompatibility({
      posProviderId: "mystery-pos",
      locationCount: 3,
      hasAdminAccess: true,
    });
    expect(result.status).toBe("not_supported");
    expect(result.purchasable).toBe(false);
  });

  it("report-supported systems are purchasable with the daily-analysis caveat", () => {
    const result = evaluateCompatibility({
      posProviderId: "toast",
      locationCount: 2,
      hasAdminAccess: true,
    });
    expect(result.status).toBe("supported_reports");
    expect(result.purchasable).toBe(true);
    expect(result.explanation).toContain("Daily reports enable daily analysis");
  });

  it("access-required systems never charge before verification", () => {
    const result = evaluateCompatibility({
      posProviderId: "square",
      locationCount: 1,
      hasAdminAccess: true,
    });
    expect(result.status).toBe("access_required");
    expect(result.purchasable).toBe(false);
  });

  it("non-admins are told they can invite the account controller", () => {
    const result = evaluateCompatibility({
      posProviderId: "toast",
      locationCount: 2,
      hasAdminAccess: false,
    });
    expect(result.nextSteps.join(" ")).toContain("Invite the person");
  });
});

describe("connection state model", () => {
  it("allows the happy path", () => {
    expect(canTransition("not_connected", "authorizing")).toBe(true);
    expect(canTransition("authorizing", "validating")).toBe(true);
    expect(canTransition("validating", "importing")).toBe(true);
    expect(canTransition("importing", "ready")).toBe(true);
  });

  it("blocks nonsensical jumps", () => {
    expect(canTransition("not_connected", "ready")).toBe(false);
    expect(canTransition("disconnected", "ready")).toBe(false);
  });

  it("reconnection goes back through authorization", () => {
    expect(canTransition("permission_required", "authorizing")).toBe(true);
    expect(canTransition("disconnected", "authorizing")).toBe(true);
  });
});
