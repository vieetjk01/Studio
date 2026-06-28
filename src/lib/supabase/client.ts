"use client";

import { createBrowserClient } from "@supabase/ssr";
import { cookieDomainForHost } from "@/lib/hosts";

// Fallbacks so building (static prerender) never crashes when env vars aren't
// present. Real values are required at runtime for anything to actually work.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export function createClient() {
  // Only share across subdomains when the page is actually on mstudo.com; on any
  // other host a `.mstudo.com` cookie would be rejected by the browser.
  const domain =
    typeof window !== "undefined" ? cookieDomainForHost(window.location.hostname) : undefined;
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON,
    domain ? { cookieOptions: { domain } } : undefined
  );
}
