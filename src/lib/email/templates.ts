/**
 * Transactional email templates, styled to the ShyftKick brand
 * (sand / midnight / coral, serif headings). Email-safe inline styles
 * only; the serif falls back to Georgia where Cormorant isn't
 * available, which is most inboxes.
 */

import type { Briefing } from "../briefing/sample";

const palette = {
  canvas: "#f6f2e8",
  surface: "#ffffff",
  ink: "#0d1321",
  muted: "#657289",
  line: "#e3ddcf",
  coral: "#e04e39",
  teal: "#008c82",
};

const serif = `'Cormorant Garamond', 'Iowan Old Style', Georgia, serif`;
const sans = `'Inter', 'Helvetica Neue', Arial, sans-serif`;
const mono = `'JetBrains Mono', 'SFMono-Regular', Menlo, monospace`;

function shell(title: string, body: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${palette.canvas};">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;font-family:${sans};color:${palette.ink};">
      <p style="font-family:${serif};font-size:20px;letter-spacing:6px;margin:0 0 4px;">SHYFTKICK</p>
      <p style="font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:${palette.muted};margin:0 0 24px;">Restaurant Intelligence</p>
      <div style="background:${palette.surface};border:1px solid ${palette.line};border-radius:6px;overflow:hidden;">
        <div style="height:4px;background:${palette.coral};"></div>
        <div style="padding:28px;">
          <h1 style="font-family:${serif};font-weight:500;font-size:26px;line-height:1.2;margin:0 0 16px;">${title}</h1>
          ${body}
        </div>
      </div>
      <p style="font-size:12px;color:${palette.muted};margin:20px 4px 0;line-height:1.6;">
        Built by a working restaurant operator. Read-only connections — your
        systems stay yours. ShyftKick never changes schedules, payroll, menus,
        or POS records.
      </p>
    </div>
  </body>
</html>`;
}

export function renderSetupCompleteEmail(input: {
  businessName: string;
  locationCount: number;
}): { subject: string; html: string } {
  const locationLine =
    input.locationCount === 1
      ? "your location"
      : `all ${input.locationCount} locations`;
  return {
    subject: `✅ ${input.businessName} is set up on ShyftKick`,
    html: shell(
      `Setup complete — ShyftKick is watching the numbers.`,
      `<p style="margin:0 0 14px;line-height:1.65;">
        <strong>${input.businessName}</strong> finished guided setup with a
        verified read-only connection covering ${locationLine}. From here,
        briefings assemble themselves: after each business day closes, the
        numbers are computed, compared against your own baselines, and
        delivered — with the evidence attached.
      </p>
      <p style="margin:0 0 14px;line-height:1.65;">What happens next:</p>
      <ul style="margin:0 0 14px;padding-left:20px;line-height:1.8;">
        <li>Your history imports and reconciles against your own reports</li>
        <li>Baselines form from your comparable days (never a guess)</li>
        <li>Your first full briefing arrives at your configured delivery time</li>
      </ul>
      <p style="margin:0;line-height:1.65;color:${palette.muted};">
        A preview of your daily briefing follows in a separate email so you
        can see the format today.
      </p>`,
    ),
  };
}

export function renderBriefingEmail(
  briefing: Briefing,
  options: { preview: boolean },
): { subject: string; html: string } {
  const previewBanner = options.preview
    ? `<p style="margin:0 0 16px;padding:8px 12px;background:${palette.canvas};border-radius:4px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${palette.coral};">Preview — illustrative data until your history import completes</p>`
    : "";

  const scorecard = briefing.scorecard
    .map(
      (row) => `
      <td style="padding:12px;border:1px solid ${palette.line};vertical-align:top;">
        <p style="margin:0;font-size:11px;color:${palette.muted};">${row.label}</p>
        <p style="margin:2px 0 0;font-family:${mono};font-size:18px;font-weight:600;">${row.value}</p>
        ${row.deltaLabel ? `<p style="margin:2px 0 0;font-size:11px;color:${row.tone === "bad" ? palette.coral : row.tone === "good" ? palette.teal : palette.muted};">${row.deltaLabel}</p>` : ""}
      </td>`,
    )
    .join("");

  const findings = briefing.quiet
    ? `<p style="margin:0;line-height:1.65;color:${palette.muted};">A quiet day — every tracked metric stayed within its normal range.</p>`
    : briefing.findings
        .map(
          (finding) => `
      <div style="border:1px solid ${palette.line};border-radius:4px;padding:16px;margin:0 0 12px;">
        <p style="margin:0 0 8px;font-weight:600;line-height:1.4;">${finding.severity === "priority" ? "●" : "○"} ${finding.title}</p>
        <ul style="margin:0 0 10px;padding-left:18px;font-size:13px;color:${palette.muted};line-height:1.7;">
          ${finding.evidence.map((line) => `<li>${line}</li>`).join("")}
        </ul>
        <p style="margin:0 0 6px;font-size:13px;line-height:1.6;"><strong style="color:${palette.coral};">Suggested:</strong> ${finding.suggestedAction}</p>
        <p style="margin:0;font-size:12px;color:${palette.muted};line-height:1.6;">${finding.boundary}</p>
      </div>`,
        )
        .join("");

  return {
    subject: `📊 ${briefing.businessName} — daily briefing, ${briefing.weekdayName} ${briefing.businessDate}`,
    html: shell(
      `${briefing.locationName} — ${briefing.weekdayName}, ${briefing.businessDate}`,
      `${previewBanner}
      <p style="margin:0 0 16px;font-size:12px;color:${palette.teal};">✓ ${briefing.dataStatus}</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>${scorecard}</tr>
      </table>
      ${findings}`,
    ),
  };
}
