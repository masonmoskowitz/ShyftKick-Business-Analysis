/**
 * Email delivery via Resend (scope §6: email is a launch channel).
 *
 * Logs-only by default: without RESEND_API_KEY the send is recorded
 * but nothing leaves the machine, so demos can never accidentally
 * email anyone. Message content and recipients are never logged in
 * full. The full outbox/idempotency mechanism (scope §9) arrives with
 * the delivery pipeline; this module is the transport only.
 */

export interface SendResult {
  sent: boolean;
  mode: "resend" | "logged";
  id?: string;
  error?: string;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "ShyftKick <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(
      `[email logged-only] subject="${input.subject}" (set RESEND_API_KEY to deliver)`,
    );
    return { sent: false, mode: "logged" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        sent: false,
        mode: "resend",
        error: `Resend ${response.status}: ${detail.slice(0, 200)}`,
      };
    }
    const body = (await response.json()) as { id?: string };
    return { sent: true, mode: "resend", id: body.id };
  } catch {
    return { sent: false, mode: "resend", error: "Could not reach Resend." };
  }
}
