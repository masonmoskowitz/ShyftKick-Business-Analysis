import { verifyClover } from "./clover";
import { verifySevenShifts } from "./sevenShifts";
import { verifySquare } from "./square";
import { verifyToast } from "./toast";
import type { VerifyResult } from "./types";

export type { VerifiedLocation, VerifyResult } from "./types";

type Verifier = (credentials: Record<string, string>) => Promise<VerifyResult>;

const VERIFIERS: Record<string, Verifier> = {
  square: verifySquare,
  toast: verifyToast,
  clover: verifyClover,
  seven_shifts: verifySevenShifts,
};

export function hasVerifier(providerId: string): boolean {
  return providerId in VERIFIERS;
}

export async function verifyCredentials(
  providerId: string,
  credentials: Record<string, string>,
): Promise<VerifyResult> {
  const verifier = VERIFIERS[providerId];
  if (!verifier) {
    return {
      ok: false,
      providerId,
      code: "unsupported_provider",
      message:
        "Live verification isn't available for this provider yet. If you have API credentials, request a scoped evaluation.",
    };
  }
  return verifier(credentials);
}
