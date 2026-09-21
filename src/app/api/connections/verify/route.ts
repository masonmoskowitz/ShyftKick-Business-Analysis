/**
 * POST /api/connections/verify
 *
 * Server-side credential verification: the browser never calls a POS
 * provider directly, and credentials transit this route transiently —
 * they are not persisted anywhere yet (server-side secret storage
 * arrives with the Supabase backend) and are never logged.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCredentials } from "@/lib/connectors/verify";

const requestSchema = z.object({
  providerId: z.string().min(1).max(64),
  credentials: z
    .record(z.string().max(64), z.string().max(4096))
    .refine((creds) => Object.keys(creds).length <= 8, {
      message: "Too many credential fields",
    }),
});

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = requestSchema.safeParse(await request.json());
  } catch {
    parsed = { success: false as const, error: null };
  }
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_request",
        message: "Invalid verification request.",
      },
      { status: 400 },
    );
  }

  const { providerId, credentials } = parsed.data;
  const result = await verifyCredentials(providerId, credentials);
  return NextResponse.json(result);
}
