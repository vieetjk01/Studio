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
 * IMPORTANT: we intentionally do NOT force studio paths to mstudo.com via
 * redirect — that would loop if Vercel has domain aliases configured. Instead
 * the header links guide users to the right host; the app serves on both.
 */
function hostForPath(path: string): string | undefined {
  // Auth pages are shared — never redirect.
  if (path.startsWith("/login") || path.startsWith("/auth")) return undefined;

  // Admin console + settings: serve on whatever host the user arrived at.
  // (We used to force a redirect to admin.mstudo.com, but that made admin
  // unreachable whenever that subdomain wasn't configured. The pages are
  // role-guarded server-side, so serving them anywhere is safe.)
  if (path.startsWith(ADMIN_PATH) || path.startsWith("/dashboard/settings")) {
    return undefined;
  }

  // Image-compress tool → img.mstudo.com (or app host).
  if (path.startsWith(COMPRESS_PATH)) return IMG_HOST || APP_HOST;

  // Album-only paths: push FROM mstudo.com TO album.mstudo.com.
  // Everything else (studio, galleries, upgrade, site, client portals…) is
  // served wherever the user arrives — links guide, not forced redirects.
  if (
    path === "/dashboard" ||
    path.startsWith("/dashboard/create") ||
    path.startsWith("/dashboard/filter") ||
    path.startsWith("/a/") ||
    path === "/start"
  ) return APP_HOST;

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
      if (target && target !== host) {
        return NextResponse.redirect(new URL(pathname + search, `https://${target}`));
      }
    }
  }

  // ── Dashboard auth + Supabase session refresh ─────────────────
  if (pathname.startsWith("/dashboard")) {
    if (request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch") {
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
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg|.*\\.png|.*\\.jpg|api/).*)"],
};
