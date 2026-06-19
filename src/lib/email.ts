import "server-only";

/**
 * Minimal transactional email via Resend (https://resend.com).
 * Set RESEND_API_KEY (and optionally EMAIL_FROM) on Vercel to enable sending.
 * Without a key, returns { ok: false, error: "not_configured" } so callers can
 * show a friendly message instead of failing.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Vieetjk Studio <onboarding@resend.dev>";
  if (!key) return { ok: false, error: "not_configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, error: t || `http_${res.status}` };
  }
  return { ok: true };
}
