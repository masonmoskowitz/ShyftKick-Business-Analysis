/**
 * POST /api/activation
 *
 * Fires the setup-completion email and the first (preview) briefing
 * immediately — the early proof-of-concept moment. The preview
 * briefing runs through the real engine on illustrative data and is
 * labeled as such; real briefings replace it when the import pipeline
 * lands.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { sampleBriefing } from "@/lib/briefing/sample";
import { sendEmail } from "@/lib/email/send";
import {
  renderBriefingEmail,
  renderSetupCompleteEmail,
} from "@/lib/email/templates";

const requestSchema = z.object({
  email: z.string().email().max(320),
  businessName: z.string().min(1).max(200),
  locationCount: z.number().int().min(1).max(50).default(1),
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
      { ok: false, message: "Invalid activation request." },
      { status: 400 },
    );
  }

  const { email, businessName, locationCount } = parsed.data;

  const setupEmail = renderSetupCompleteEmail({ businessName, locationCount });
  const setupResult = await sendEmail({ to: email, ...setupEmail });

  const briefingEmail = renderBriefingEmail(sampleBriefing(businessName), {
    preview: true,
  });
  const briefingResult = await sendEmail({ to: email, ...briefingEmail });

  return NextResponse.json({
    ok: true,
    emails: [
      { kind: "setup_complete", ...setupResult },
      { kind: "first_briefing_preview", ...briefingResult },
    ],
  });
}
