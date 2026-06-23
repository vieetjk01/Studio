// Helpers for the domain split (mstudo.com vs album.mstudo.com).
// When the host env vars are unset, links stay relative so the full app works
// on a single host (local dev, *.vercel.app previews).

export const MAIN_HOST = process.env.NEXT_PUBLIC_MAIN_HOST || "";
export const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST || "";
export const IMG_HOST = process.env.NEXT_PUBLIC_IMG_HOST || "";
export const STUDIO_HOST = process.env.NEXT_PUBLIC_STUDIO_HOST || "";
export const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST || "";

/**
 * Cookie domain shared across the apex + all subdomains so the auth session is
 * shared between mstudo.com / album.mstudo.com / img.mstudo.com. Derived from
 * the apex (MAIN_HOST). Undefined on local dev / *.vercel.app (host-only cookies).
 */
export const COOKIE_DOMAIN = MAIN_HOST ? `.${MAIN_HOST}` : undefined;

/** URL to a route on the app subdomain (album.mstudo.com). */
export function appUrl(path: string): string {
  return APP_HOST ? `https://${APP_HOST}${path}` : path;
}

/** URL to a route on the main marketing site (mstudo.com). */
export function mainUrl(path: string): string {
  return MAIN_HOST ? `https://${MAIN_HOST}${path}` : path;
}

/** URL to a route on the image-tools subdomain (img.mstudo.com). */
export function imgUrl(path: string): string {
  return IMG_HOST ? `https://${IMG_HOST}${path}` : path;
}

/** URL to a route on the studio subdomain (studio.mstudo.com). */
export function studioUrl(path: string): string {
  return STUDIO_HOST ? `https://${STUDIO_HOST}${path}` : path;
}

/** URL to a route on the admin subdomain (admin.mstudo.com). */
export function adminUrl(path: string): string {
  return ADMIN_HOST ? `https://${ADMIN_HOST}${path}` : path;
}
