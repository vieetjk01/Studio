import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainForHost } from "@/lib/hosts";

// Domain split (set these on Vercel to enable it). When unset (local dev,
// *.vercel.app previews) the full app is served on one host.
//   MAIN_HOST  = mstudo.com        -> landing + studio management
//   APP_HOST   = album.mstudo.com  -> RETIRED (album app now served by MAIN_HOST;
//                                     kept only as a known system host)
//   IMG_HOST   = img.mstudo.com    -> image-compress tool
//   ADMIN_HOST = admin.mstudo.com  -> site administration + settings
const MAIN_HOST = process.env.NEXT_PUBLIC_MAIN_HOST;
const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST;
const IMG_HOST = process.env.NEXT_PUBLIC_IMG_HOST;
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST;
// thiep.mstudo.com -> online wedding invitations. Serves /thiep/* at the root.
const THIEP_HOST = process.env.NEXT_PUBLIC_THIEP_HOST;
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

  // Photo tools (create selection-album, filter, compress) run IN-APP inside the
  // studio admin — never force them onto another subdomain. Serve on whatever
  // host the request arrived at (img.mstudo.com still works too, not forced).
  if (
    path.startsWith(COMPRESS_PATH) ||
    path.startsWith("/dashboard/create") ||
    path.startsWith("/dashboard/filter")
  ) return undefined;

  // album.mstudo.com is retired — the album app (library, public viewer /a/,
  // and the whole dashboard) is served by the main host now.
  if (path.startsWith("/dashboard") || path.startsWith("/a/") || path === "/start") return MAIN_HOST;

  // Wedding invitations belong on the thiệp host (canonical) when configured.
  if (path.startsWith("/thiep")) return THIEP_HOST || undefined;

  return undefined;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;

  // ── Canonical host: www.mstudo.com → mstudo.com ──────────────────────────
  // The apex (mstudo.com) is the canonical main domain. Send www → apex so we
  // have one source of truth for cookies/sessions. (Make sure Vercel itself
  // does NOT add an opposite apex → www redirect, or the two would loop.)
  if (MAIN_HOST && host === `www.${MAIN_HOST}`) {
    return NextResponse.redirect(new URL(pathname + search, `https://${MAIN_HOST}`));
  }

  // ── Wedding invitations: thiep.mstudo.com/<slug> → /thiep/<slug> ─────────
  // The thiệp host serves the (public) invitation pages and the client editor
  // at the root, so we prefix everything with /thiep internally. /api and
  // Next internals are left untouched.
  if (THIEP_HOST && host === THIEP_HOST) {
    // Only treat an EXACT "/thiep" or "/thiep/..." as already-prefixed; a slug
    // like "/thiep-cuoi-x" must still be rewritten to "/thiep/thiep-cuoi-x".
    const alreadyPrefixed = pathname === "/thiep" || pathname.startsWith("/thiep/");
    if (!alreadyPrefixed && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === "/" ? "/thiep" : `/thiep${pathname}`;
      return NextResponse.rewrite(url);
    }
    // Already a /thiep route, /api or asset path — serve as-is on this host.
    return NextResponse.next();
  }

  // ── Tenant sites: <subdomain>.mstudo.com → /site/<subdomain> ─────────────
  // Any *.MAIN_HOST that isn't a known system host is treated as a tenant site.
  if (MAIN_HOST && host.endsWith(`.${MAIN_HOST}`) && host !== MAIN_HOST) {
    const systemHosts = new Set(
      [MAIN_HOST, APP_HOST, IMG_HOST, ADMIN_HOST, THIEP_HOST, `www.${MAIN_HOST}`].filter(Boolean) as string[]
    );
    if (!systemHosts.has(host)) {
      const sub = host.slice(0, -(`.${MAIN_HOST}`.length));
      if (sub && !sub.includes(".")) {
        // Studio admin & auth always live on the main host.
        if (pathname.startsWith("/dashboard") || pathname === "/start" || pathname.startsWith("/login") || pathname.startsWith("/auth")) {
          return NextResponse.redirect(new URL(pathname + search, `https://${MAIN_HOST}`));
        }
        // Customer/app routes are SERVED on the studio's own subdomain so every
        // activity a studio shares runs under its personalised URL.
        const CUSTOMER = ["/a/", "/album", "/c/", "/q/", "/gia/", "/book/", "/crew", "/quote", "/showcase", "/story"];
        if (CUSTOMER.some((p) => pathname.startsWith(p))) {
          return NextResponse.next();
        }
        // Everything else on the subdomain is the portfolio site.
        const url = request.nextUrl.clone();
        url.pathname = `/site/${sub}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  // ── Custom domains: an external host (studio.com) mapped to a studio's site.
  // Any host that isn't mstudo / a system host / localhost / a *.vercel.app
  // preview is treated as a tenant custom domain and served like the subdomain.
  if (
    MAIN_HOST && host && host !== MAIN_HOST && !host.endsWith(`.${MAIN_HOST}`) &&
    host !== "localhost" && !host.startsWith("127.") && !host.endsWith(".vercel.app")
  ) {
    if (pathname.startsWith("/dashboard") || pathname === "/start" || pathname.startsWith("/login") || pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL(pathname + search, `https://${MAIN_HOST}`));
    }
    const CUSTOMER = ["/a/", "/album", "/c/", "/q/", "/gia/", "/book/", "/crew", "/showcase", "/story"];
    if (CUSTOMER.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }
    // Portfolio: the /site route resolves the tenant by custom_domain.
    const url = request.nextUrl.clone();
    url.pathname = `/site/${host}`;
    return NextResponse.rewrite(url);
  }

  // ── Main workspace is the studio dashboard ───────────────────────────────
  // On mstudo.com the studio management app is the user's home, so the bare
  // /dashboard goes to /dashboard/studio instead of bouncing to the album host.
  // (Free/Basic accounts have no studio tier — StudioOverview sends them on to
  // the album dashboard, so there's no loop.) Album host keeps /dashboard = albums.
  if (MAIN_HOST && host === MAIN_HOST && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/dashboard/studio", request.url));
  }

  // ── Host-based routing ────────────────────────────────────────
  if (MAIN_HOST && host) {
    // Per-host home pages.
    if (pathname === "/") {
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
      ...((() => { const d = cookieDomainForHost(host); return d ? { cookieOptions: { domain: d } } : {}; })()),
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

  // Affiliate ref tracking: set a 30-day cookie when ?ref=CODE is present.
  const refParam = request.nextUrl.searchParams.get("ref");
  if (refParam && /^[A-Z0-9]{4,16}$/.test(refParam) && !request.cookies.get("aff_ref")) {
    response.cookies.set("aff_ref", refParam, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", httpOnly: true });
  }

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
