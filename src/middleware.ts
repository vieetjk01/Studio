import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Domain split (set these on Vercel to enable it):
//   NEXT_PUBLIC_MAIN_HOST = vieetjk.com         -> public profile / showcase
//   NEXT_PUBLIC_APP_HOST  = album.vieetjk.com   -> login / dashboard / selection
// When unset (local dev, *.vercel.app previews) the full app is served on one host.
const MAIN_HOST = process.env.NEXT_PUBLIC_MAIN_HOST;
const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST;

const APP_PREFIXES = ["/dashboard", "/login", "/a/"];
const MAIN_PREFIXES = ["/showcase"];

function isAppPath(path: string) {
  return APP_PREFIXES.some((p) => path === p || path.startsWith(p));
}
function isMainOnlyPath(path: string) {
  return path === "/" || MAIN_PREFIXES.some((p) => path === p || path.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;

  // ── Host-based routing ────────────────────────────────────────
  if (MAIN_HOST && APP_HOST && host) {
    // App routes requested on the public site -> send to the app subdomain.
    if (host === MAIN_HOST && isAppPath(pathname)) {
      return NextResponse.redirect(new URL(pathname + search, `https://${APP_HOST}`));
    }
    if (host === APP_HOST) {
      // The app subdomain has no marketing pages.
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/dashboard", `https://${APP_HOST}`));
      }
      if (MAIN_PREFIXES.some((p) => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL(pathname + search, `https://${MAIN_HOST}`));
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
