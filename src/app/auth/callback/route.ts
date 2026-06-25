import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_DOMAIN } from "@/lib/hosts";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * OAuth (Google) callback — exchange the code for a session, then continue.
 *
 * IMPORTANT: We MUST create the redirect response first and let
 * `exchangeCodeForSession` write the session cookies ONTO that same response.
 * Returning a brand-new `NextResponse.redirect(...)` after the exchange drops
 * the `Set-Cookie` headers, which is what was causing OAuth sign-in to loop
 * back to /login (the cookies never made it to the browser).
 *
 * See Supabase SSR docs (server-side auth, advanced guide).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard/studio";
  const oauthError = searchParams.get("error");

  // Provider-side error (e.g. user cancelled the Google consent screen).
  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // 1) Build the redirect response we'll return on success.
  //    Cookies set during the exchange below will be attached to THIS response.
  const response = NextResponse.redirect(`${origin}${next}`);

  // 2) Create a Supabase server client bound to the request cookies (for the
  //    PKCE code_verifier) and the response cookies (for the new session).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Share the session cookie across mstudo.com subdomains (album/img/studio).
      ...(COOKIE_DOMAIN ? { cookieOptions: { domain: COOKIE_DOMAIN } } : {}),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(
              name,
              value,
              options as Parameters<typeof response.cookies.set>[2]
            )
          );
        },
      },
    }
  );

  // 3) Exchange the auth code for a session. Cookies land on `response`.
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message || "oauth")}`
    );
  }

  // 4) Save affiliate referral code if present and user has no referrer yet.
  const affRef = request.cookies.get("aff_ref")?.value;
  if (affRef) {
    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      const db = createAdminClient();
      const { data: profile } = await db.from("profiles").select("referred_by").eq("id", newUser.id).maybeSingle();
      if (profile && !profile.referred_by) {
        const { data: affCode } = await db.from("affiliate_codes").select("user_id").eq("code", affRef).eq("active", true).maybeSingle();
        // Don't let users refer themselves
        if (affCode && affCode.user_id !== newUser.id) {
          await db.from("profiles").update({ referred_by: affRef }).eq("id", newUser.id);
        }
      }
      // Clear the cookie once stored
      response.cookies.set("aff_ref", "", { maxAge: 0, path: "/" });
    }
  }

  // 5) Return the SAME response object that now carries the Set-Cookie headers.
  return response;
}
