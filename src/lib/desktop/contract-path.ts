import "server-only";
import { SHOOT_TYPE_LABEL, type ShootType } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Quy ước đặt tên thư mục dùng CHUNG cho cả file hợp đồng (PDF/Word) lẫn ảnh/video
 * trên MStudo Desktop → cả hai nằm cùng cấu trúc:
 *   {gốc} / {Loại dịch vụ} / Thang{tháng ngày thực hiện} / {Tên hợp đồng}
 */

export const cleanFolderName = (name: string) =>
  (name || "").trim().replace(/[\\/]/g, " ").replace(/\s+/g, " ").slice(0, 100);

/** Tên thư mục LOẠI DỊCH VỤ: tên dịch vụ studio đặt (service_id) → nhãn loại chụp. */
export async function serviceFolderName(
  db: any,
  contract: { service_id?: string | null; shoot_type?: string | null }
): Promise<string> {
  if (contract.service_id) {
    const { data: svc } = await db.from("studio_services").select("name").eq("id", contract.service_id).maybeSingle();
    const n = cleanFolderName((svc as { name?: string } | null)?.name || "");
    if (n) return n;
  }
  const st = (contract.shoot_type || "") as ShootType;
  return cleanFolderName(SHOOT_TYPE_LABEL[st] || "") || "Khac";
}

/** Thư mục THÁNG theo ngày thực hiện hợp đồng: "Thang 8". Chưa có ngày → null. */
export function monthFolderName(eventDate?: string | null): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(eventDate || "");
  return m ? `Thang ${parseInt(m[2], 10)}` : null;
}

/**
 * Đường dẫn tương đối [Loại dịch vụ, Thang N?, Tên hợp đồng] — leaf là thư mục
 * hợp đồng (nơi chứa cả file HĐ lẫn Photo/Video). Chỉ đọc DB.
 */
export async function contractFolderSegments(
  db: any,
  contract: { service_id?: string | null; shoot_type?: string | null; event_date?: string | null },
  contractFolderName: string
): Promise<string[]> {
  const svc = await serviceFolderName(db, contract);
  const month = monthFolderName(contract.event_date);
  return [svc, ...(month ? [month] : []), contractFolderName];
}
