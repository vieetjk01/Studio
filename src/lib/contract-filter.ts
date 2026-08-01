/**
 * Lọc & tách nhóm danh sách hợp đồng cho trang "Quản lý hợp đồng".
 *
 * Để riêng ra khỏi component (và KHÔNG import gì) vì đây là phần dễ sai nhất —
 * nhờ vậy desktop/test/contract-filter.mjs nạp được thẳng file này để kiểm thử,
 * không cần bước build.
 */

/** Chỉ những cột mà bộ lọc thực sự đọc — nhận cả ContractRow đầy đủ. */
export type FilterableContract = {
  code: string | null;
  title: string;
  client_name: string | null;
  client_phone: string | null;
  event_date: string | null;
  status: string;
};

export type ContractFilters = {
  /** Tìm chung: tên HĐ, tên khách, ngày thực hiện, mã, SĐT. */
  q?: string;
  /** Lọc riêng theo mã hợp đồng. */
  code?: string;
  /** Ngày thực hiện từ (YYYY-MM-DD). */
  from?: string;
  /** Ngày thực hiện đến (YYYY-MM-DD). */
  to?: string;
};

/**
 * "2026-03-15" → "15/03/2026" để gõ ngày y như đang hiện trên danh sách là tìm
 * được. Cố tình làm tại chỗ (thay vì dùng fmtDate ở lib/date) để file này không
 * phụ thuộc gì và test nạp được trực tiếp; chỉ nhận đúng dạng ISO của cột date.
 */
function dmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/**
 * Áp tìm kiếm + mã + khoảng ngày thực hiện. KHÔNG lọc trạng thái — việc đó do
 * splitContracts làm, để số đếm hai tab cùng phản ánh một bộ lọc.
 */
export function filterContracts<T extends FilterableContract>(
  rows: readonly T[],
  { q = "", code = "", from = "", to = "" }: ContractFilters
): T[] {
  const needle = q.trim().toLowerCase();
  const codeNeedle = code.trim().toLowerCase();
  return rows.filter((c) => {
    if (codeNeedle && !(c.code || "").toLowerCase().includes(codeNeedle)) return false;
    // HĐ chưa có ngày thực hiện thì không thể nằm trong khoảng ngày đã chọn.
    if (from && (!c.event_date || c.event_date < from)) return false;
    if (to && (!c.event_date || c.event_date > to)) return false;
    if (!needle) return true;
    const hay = [
      c.title,
      c.client_name,
      c.code,
      c.client_phone,
      c.event_date,
      c.event_date ? dmy(c.event_date) : "",
    ];
    return hay.some((v) => !!v && v.toLowerCase().includes(needle));
  });
}

/**
 * Tách HĐ đã hoàn thành sang nhóm riêng. Ở nhóm "đang thực hiện" mới áp thêm
 * lọc trạng thái ("all" = mọi trạng thái chưa hoàn thành, kể cả nháp/đã huỷ).
 */
export function splitContracts<T extends FilterableContract>(
  matched: readonly T[],
  tab: "active" | "completed",
  status: string = "all"
): T[] {
  return matched.filter((c) => {
    if (tab === "completed") return c.status === "completed";
    if (c.status === "completed") return false;
    return status === "all" || c.status === status;
  });
}
