"use client";

import { createBrowserClient } from "@supabase/ssr";
import { COOKIE_DOMAIN } from "@/lib/hosts";

// Fallbacks so building (static prerender) never crashes when env vars aren't
// present. Real values are required at runtime for anything to actually work.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON,
    // Share the session cookie across mstudo.com subdomains (album / img).
    COOKIE_DOMAIN ? { cookieOptions: { domain: COOKIE_DOMAIN } } : undefined
  );
}
