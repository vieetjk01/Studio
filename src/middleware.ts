import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Domain split (set these on Vercel to enable it). When unset (local dev,
// *.vercel.app previews) the full app is served on one host.
//   MAIN_HOST  = mstudo.com        -> landing, public sites/showcase,
//                                     STUDIO MANAGEMENT (/dashboard/studio,
//                                     galleries) + client portals (/c /q /crew)
//   APP_HOST   = album.mstudo.com  -> login, album dashboard (/dashboard,
//                                     create, filter), client selection (/a)
//   IMG_HOST   = img.mstudo.com    -> image-compress tool
//   ADMIN_HOST = admin.mstudo.com  -> site administration + settings
const MAIN_HOST = process.env.NEXT_PUBLIC_MAIN_HOST;
const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST;
const IMG_HOST = process.env.NEXT_PUBLIC_IMG_HOST;
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST;
const COMPRESS_PATH = "/dashboard/compress";
const ADMIN_PATH = "/dashboard/admin";

/**
 * The canonical host a path should be served on, or undefined when it may be
 * served on whichever host the request arrived at (auth pages, the apex `/`).
 * Falls back to APP_HOST when an optional host (img/admin) isn't configured.
 */
function hostForPath(path: string): string | undefined {
  // Auth pages are shared across hosts (cookie spans .mstudo.com).
  if (path.startsWith("/login") || path.startsWith("/auth")) return undefined;
  // Studio management, client galleries + the public client/crew portals.
  if (
    path.startsWith("/dashboard/studio") ||
    path.startsWith("/dashboard/galleries") ||
    path.startsWith("/c/") ||
    path.startsWith("/q/") ||
    path.startsWith("/crew") ||
    path.startsWith("/showcase") ||
    path.startsWith("/album")
  ) {
    return MAIN_HOST;
  }
  // Admin console.
  if (path.startsWith(ADMIN_PATH) || path.startsWith("/dashboard/settings")) {
    return ADMIN_HOST || APP_HOST;
  }
  // Image-compress tool.
  if (path.startsWith(COMPRESS_PATH)) return IMG_HOST || APP_HOST;
  // The album dashboard + client selection + the create-album landing.
  if (path.startsWith("/dashboard") || path === "/start" || path.startsWith("/a/")) {
    return APP_HOST;
  }
  return undefined;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;

  // ── www → apex redirect ───────────────────────────────────────
  if (MAIN_HOST && host === `www.${MAIN_HOST}`) {
    return NextResponse.redirect(new URL(pathname + search, `https://${MAIN_HOST}`), 301);
  }

  // ── Tenant sites: <subdomain>.mstudo.com → /site/<subdomain> ─────────────
  // Any *.MAIN_HOST that isn't a known system host is treated as a tenant site.
  if (MAIN_HOST && host.endsWith(`.${MAIN_HOST}`)) {
    const systemHosts = new Set(
      [MAIN_HOST, APP_HOST, IMG_HOST, ADMIN_HOST, `www.${MAIN_HOST}`].filter(Boolean) as string[]
    );
    if (!systemHosts.has(host)) {
      const sub = host.slice(0, -(`.${MAIN_HOST}`.length));
      if (sub && !sub.includes(".")) {
        // Public tenant page (single page in v1); ignore deeper paths.
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
      // App host home = the public "create album" landing + guide.
      if (host === APP_HOST) return NextResponse.rewrite(new URL("/start", request.url));
      // Img/Admin hosts have no landing — send to their main tool. Redirect (not
      // rewrite) so the dashboard auth check can attach ?next= and return here.
      if (IMG_HOST && host === IMG_HOST) return NextResponse.redirect(new URL(COMPRESS_PATH, request.url));
      if (ADMIN_HOST && host === ADMIN_HOST) return NextResponse.redirect(new URL(ADMIN_PATH, request.url));
      // MAIN_HOST `/` = marketing landing — served below.
    } else {
      // Redirect any path requested on the "wrong" host to its canonical home.
      const target = hostForPath(pathname);
      if (target && target !== host) {
        return NextResponse.redirect(new URL(pathname + search, `https://${target}`));
      }
    }
  }

  // ── Dashboard auth + Supabase session refresh ─────────────────
  if (pathname.startsWith("/dashboard")) {
    // Next.js fires prefetch requests (Next-Router-Prefetch: 1) on Link hover,
    // before the user clicks. These don't need auth validation — the actual
    // navigation will enforce auth. Skipping getUser() here saves a Supabase
    // network round-trip (~200-600ms) on every hover, letting the route cache
    // warm up before the user even clicks.
    if (request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch") {
      // Check if a session cookie exists. If it does, let the prefetch through
      // so the RSC payload can be cached. If not, block it (unauthenticated
      // prefetches would just be wasted work anyway).
      const hasSession = request.cookies.getAll().some(
        (c) => c.name.includes("sb-") && c.name.includes("-auth-token")
      );
      if (!hasSession) {
        return NextResponse.redirect(new URL(`/login?next=${pathname}`, request.url));
      }
      return NextResponse.next();
    }

    let response = NextResponse.next({ request });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // Share the session cookie across mstudo.com subdomains (album / img).
        ...(MAIN_HOST ? { cookieOptions: { domain: `.${MAIN_HOST}` } } : {}),
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
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except static assets and API routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-full.png|logo-mark.png|api/).*)"],
};
