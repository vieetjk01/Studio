import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Domain split (set these on Vercel to enable it):
//   NEXT_PUBLIC_MAIN_HOST = vieetjk.com         -> public profile / showcase
//   NEXT_PUBLIC_APP_HOST  = album.vieetjk.com   -> login / dashboard / selection
// When unset (local dev, *.vercel.app previews) the full app is served on one host.
const MAIN_HOST = process.env.NEXT_PUBLIC_MAIN_HOST;
const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST;
// Image-tools subdomain (img.vieetjk.com) — home of the "Nén ảnh" compress tool.
const IMG_HOST = process.env.NEXT_PUBLIC_IMG_HOST;
// Studio-management subdomain (studio.vieetjk.com).
const STUDIO_HOST = process.env.NEXT_PUBLIC_STUDIO_HOST;
const COMPRESS_PATH = "/dashboard/compress";
const STUDIO_PATH = "/dashboard/studio";
// Client delivery galleries are part of the studio module (studio.vieetjk.com).
const GALLERIES_PATH = "/dashboard/galleries";

// Paths that are allowed to live on the image-tools host.
function isImgPath(path: string) {
  return (
    path === COMPRESS_PATH ||
    path.startsWith("/login") ||
    path.startsWith("/auth")
  );
}

// Paths allowed on the studio host: the studio dashboard, auth, and the public
// client-contract (/c/) + crew (/crew) portals.
function isStudioPath(path: string) {
  return (
    path.startsWith(STUDIO_PATH) ||
    path.startsWith(GALLERIES_PATH) ||
    path.startsWith("/c/") ||
    path.startsWith("/crew") ||
    path.startsWith("/login") ||
    path.startsWith("/auth")
  );
}

const APP_PREFIXES = ["/dashboard", "/login", "/a/", "/start", "/auth"];
const MAIN_PREFIXES = ["/showcase", "/album"];

function isAppPath(path: string) {
  return APP_PREFIXES.some((p) => path === p || path.startsWith(p));
}
function isMainOnlyPath(path: string) {
  return path === "/" || MAIN_PREFIXES.some((p) => path === p || path.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;

  // ── Tenant sites: <subdomain>.vieetjk.com → /site/<subdomain> ─────────────
  // Any *.MAIN_HOST that isn't a known system host is treated as a tenant site.
  if (MAIN_HOST && host.endsWith(`.${MAIN_HOST}`)) {
    const systemHosts = new Set(
      [MAIN_HOST, APP_HOST, IMG_HOST, STUDIO_HOST, `www.${MAIN_HOST}`].filter(Boolean) as string[]
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
    // App routes requested on the public site -> send to the app subdomain.
    if (host === MAIN_HOST && isAppPath(pathname)) {
      return NextResponse.redirect(new URL(pathname + search, `https://${APP_HOST}`));
    }
    if (host === APP_HOST) {
      // The compress tool is centralised on the image-tools subdomain.
      if (IMG_HOST && pathname.startsWith(COMPRESS_PATH)) {
        return NextResponse.redirect(new URL(pathname + search, `https://${IMG_HOST}`));
      }
      // Studio management + client galleries are centralised on the studio subdomain.
      if (STUDIO_HOST && (pathname.startsWith(STUDIO_PATH) || pathname.startsWith(GALLERIES_PATH))) {
        return NextResponse.redirect(new URL(pathname + search, `https://${STUDIO_HOST}`));
      }
      // App subdomain home = the public "create album" landing + guide.
      if (pathname === "/") {
        return NextResponse.rewrite(new URL("/start", request.url));
      }
      // Marketing pages live on the main site.
      if (MAIN_PREFIXES.some((p) => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL(pathname + search, `https://${MAIN_HOST}`));
      }
    }

    // Image-tools subdomain: only the compress tool + auth live here.
    if (IMG_HOST && host === IMG_HOST) {
      if (pathname === "/") {
        // Redirect (not rewrite) so the dashboard auth check below can attach
        // ?next=/dashboard/compress and return here after sign-in.
        return NextResponse.redirect(new URL(COMPRESS_PATH, request.url));
      }
      if (!isImgPath(pathname)) {
        return NextResponse.redirect(new URL(pathname + search, `https://${APP_HOST}`));
      }
    }

    // Studio subdomain: only the studio dashboard, auth + public portals.
    if (STUDIO_HOST && host === STUDIO_HOST) {
      if (pathname === "/") {
        return NextResponse.redirect(new URL(STUDIO_PATH, request.url));
      }
      if (!isStudioPath(pathname)) {
        return NextResponse.redirect(new URL(pathname + search, `https://${APP_HOST}`));
      }
    }
  }

  // ── Dashboard auth + Supabase session refresh ─────────────────
  if (pathname.startsWith("/dashboard")) {
    let response = NextResponse.next({ request });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // Share the session cookie across vieetjk.com subdomains (album / img).
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
