/**
 * Server-side Cloudflare Turnstile token verification.
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

// Sentinel the client sends when the Turnstile script cannot load (ad-blockers,
// strict network policy). We must not lock these users out — the captcha is a
// defense-in-depth anti-spam layer, not the only gate.
const UNAVAILABLE = "turnstile-unavailable";

export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // If no secret is configured we cannot enforce the captcha. Rather than block
  // every legitimate submission (which would take the whole site down on a
  // missing env var), allow the request through.
  if (!secret) return true;

  // Client could not load the widget — don't punish the user for it.
  if (token === UNAVAILABLE) return true;

  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
