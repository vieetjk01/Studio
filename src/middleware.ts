import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Domain split (set these on Vercel to enable it). When unset (local dev,
// *.vercel.app previews) the full app is served on one host.
//   MAIN_HOST  = mstudo.com        -> landing + studio management
//   APP_HOST   = album.mstudo.com  -> album dashboard, create, filter, /a/
//   IMG_HOST   = img.mstudo.com    -> image-compress tool
//   ADMIN_HOST = admin.mstudo.com  -> site administration + settings
const MAIN_HOST = process.env.NEXT_PUBLIC_MAIN_HOST;
const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST;
const IMG_HOST = process.env.NEXT_PUBLIC_IMG_HOST;
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST;
const COMPRESS_PATH = "/dashboard/compress";
const ADMIN_PATH = "/dashboard/admin";

/**
 * Returns the canonical host for a path, or undefined when no forced redirect
 * is needed (path may be served on whatever host the request arrived at).
 *
 * Domain split intent:
 *   mstudo.com        → marketing landing + the WHOLE studio management app
 *                       (studio dashboard, contracts, calendar, galleries,
 *                       clients, settings, admin, …)
 *   album.mstudo.com  → ONLY the album-creation / photo-filter tool
 *   img.mstudo.com    → image-compress tool
 */
function hostForPath(path: string): string | undefined {
  // Auth pages are shared — never redirect.
  if (path.startsWith("/login") || path.startsWith("/auth")) return undefined;

  // Image-compress tool → img.mstudo.com (or app host).
  if (path.startsWith(COMPRESS_PATH)) return IMG_HOST || APP_HOST;

  // Album-only paths live on album.mstudo.com: the album dashboard, album
  // creation, photo filter and the public album viewer.
  if (
    path === "/dashboard" ||
    path.startsWith("/dashboard/create") ||
    path.startsWith("/dashboard/filter") ||
    path.startsWith("/a/") ||
    path === "/start"
  ) return APP_HOST;

  // Everything else under /dashboard is the studio management app → force it
  // onto the MAIN host so studio never runs on album.mstudo.com. Admin/settings
  // included (they're role-guarded server-side).
  if (path.startsWith("/dashboard")) return MAIN_HOST;

  return undefined;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;

  // ── Tenant sites: <subdomain>.mstudo.com → /site/<subdomain> ─────────────
  // Any *.MAIN_HOST that isn't a known system host is treated as a tenant site.
  if (MAIN_HOST && host.endsWith(`.${MAIN_HOST}`) && host !== MAIN_HOST) {
    const systemHosts = new Set(
      [MAIN_HOST, APP_HOST, IMG_HOST, ADMIN_HOST, `www.${MAIN_HOST}`].filter(Boolean) as string[]
    );
    if (!systemHosts.has(host)) {
      const sub = host.slice(0, -(`.${MAIN_HOST}`.length));
      if (sub && !sub.includes(".")) {
        const url = request.nextUrl.clone();
        url.pathname = `/site/${sub}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  // ── Host-based routing ────────────────────────────────────────
  if (MAIN_HOST && APP_HOST && host) {
    // Per-host home pages.
    if (pathname === "/") {
      if (host === APP_HOST) return NextResponse.rewrite(new URL("/start", request.url));
      if (IMG_HOST && host === IMG_HOST) return NextResponse.redirect(new URL(COMPRESS_PATH, request.url));
      if (ADMIN_HOST && host === ADMIN_HOST) return NextResponse.redirect(new URL(ADMIN_PATH, request.url));
      // MAIN_HOST / = marketing landing — fall through.
    } else {
      const target = hostForPath(pathname);
      // Treat the apex and its www. variant as the SAME host, so we never
      // bounce between mstudo.com ⇄ www.mstudo.com (Vercel canonicalises one
      // to the other, which would cause an infinite redirect loop).
      const sameAsMain =
        target === MAIN_HOST && (host === MAIN_HOST || host === `www.${MAIN_HOST}`);
      if (target && target !== host && !sameAsMain) {
        return NextResponse.redirect(new URL(pathname + search, `https://${target}`));
      }
    }
  }

  // ── Supabase session refresh (runs on every non-static request) ──────────
  // This keeps the access token alive regardless of which page the user is on.
  // Without this, the token would only refresh on /dashboard routes and would
  // expire silently while the user is on the landing page.
  if (request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch") {
    // Prefetch: skip full auth round-trip, just check cookie presence for dashboard.
    if (pathname.startsWith("/dashboard")) {
      const hasSession = request.cookies.getAll().some(
        (c) => c.name.includes("sb-") && c.name.includes("-auth-token")
      );
      if (!hasSession) return NextResponse.redirect(new URL(`/login?next=${pathname}`, request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(MAIN_HOST ? { cookieOptions: { domain: `.${MAIN_HOST}` } } : {}),
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Only enforce auth for dashboard routes.
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg|.*\\.png|.*\\.jpg|api/).*)"],
};
