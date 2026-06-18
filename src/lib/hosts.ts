// Helpers for the domain split (vieetjk.com vs album.vieetjk.com).
// When the host env vars are unset, links stay relative so the full app works
// on a single host (local dev, *.vercel.app previews).

export const MAIN_HOST = process.env.NEXT_PUBLIC_MAIN_HOST || "";
export const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST || "";
export const IMG_HOST = process.env.NEXT_PUBLIC_IMG_HOST || "";

/** URL to a route on the app subdomain (album.vieetjk.com). */
export function appUrl(path: string): string {
  return APP_HOST ? `https://${APP_HOST}${path}` : path;
}

/** URL to a route on the main marketing site (vieetjk.com). */
export function mainUrl(path: string): string {
  return MAIN_HOST ? `https://${MAIN_HOST}${path}` : path;
}

/** URL to a route on the image-tools subdomain (img.vieetjk.com). */
export function imgUrl(path: string): string {
  return IMG_HOST ? `https://${IMG_HOST}${path}` : path;
}
