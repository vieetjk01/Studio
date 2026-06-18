"use client";

import { createBrowserClient } from "@supabase/ssr";
import { COOKIE_DOMAIN } from "@/lib/hosts";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Share the session cookie across vieetjk.com subdomains (album / img).
    COOKIE_DOMAIN ? { cookieOptions: { domain: COOKIE_DOMAIN } } : undefined
  );
}
