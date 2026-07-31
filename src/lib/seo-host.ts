import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Site } from "@/lib/types";

/* Nhận diện host của request để robots.txt / sitemap.xml trả nội dung đúng cho
   từng loại trang: host chính (mstudo.com) hay website riêng của một studio
   (<sub>.mstudo.com / tên miền riêng). */

const MAIN_HOST = process.env.NEXT_PUBLIC_MAIN_HOST || "";
const THIEP_HOST = process.env.NEXT_PUBLIC_THIEP_HOST || "";

export function requestHost(req: Request): string {
  return (req.headers.get("host") || "").split(":")[0].toLowerCase();
}

export function isMainHost(host: string): boolean {
  return !MAIN_HOST || host === MAIN_HOST || host === `www.${MAIN_HOST}` || host.endsWith(".vercel.app") ||
    host === "localhost" || host.startsWith("127.");
}

export function isThiepHost(host: string): boolean {
  return !!THIEP_HOST && host === THIEP_HOST;
}

/**
 * Site đã xuất bản gắn với host này (subdomain hoặc tên miền riêng).
 *
 * Phân biệt rõ hai trường hợp:
 *   • site = null, failed = false → chắc chắn KHÔNG có site nào ở host này.
 *   • failed = true              → không tra được (DB lỗi/không tới được).
 * Việc phân biệt là quan trọng với robots.txt: lỡ trả "Disallow: /" chỉ vì DB
 * chớp nháy thì Google có thể rút trang của studio khỏi kết quả tìm kiếm.
 */
export async function tenantSiteForHost(host: string): Promise<{ site: Site | null; failed: boolean }> {
  if (!host || isMainHost(host) || isThiepHost(host)) return { site: null, failed: false };

  let db;
  try {
    db = createAdminClient();
  } catch {
    return { site: null, failed: true };
  }

  const pick = async () => {
    if (MAIN_HOST && host.endsWith(`.${MAIN_HOST}`)) {
      const sub = host.slice(0, -(`.${MAIN_HOST}`.length));
      if (!sub || sub.includes(".")) return { data: null, error: null };
      return db.from("sites").select("*").eq("subdomain", sub).maybeSingle();
    }
    return db
      .from("sites")
      .select("*")
      .eq("custom_domain", host)
      .eq("custom_domain_verified", true)
      .maybeSingle();
  };

  try {
    const { data, error } = await pick();
    if (error) return { site: null, failed: true };
    const site = (data as Site) ?? null;
    return { site: site?.published ? site : null, failed: false };
  } catch {
    return { site: null, failed: true };
  }
}
