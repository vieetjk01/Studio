/**
 * Ca làm việc theo công ty của thợ freelancer.
 *
 * Hòa Phát chia 3 ca A/B/C. Mỗi ca làm 12 tiếng rồi nghỉ 24 tiếng, nên ngày được
 * chia thành hai khối 12 tiếng chạy nối nhau vô tận:
 *
 *   khối 0: 01/08 08:00–20:00   → A
 *   khối 1: 01/08 20:00–08:00   → B   (vắt sang 02/08)
 *   khối 2: 02/08 08:00–20:00   → C
 *   khối 3: 02/08 20:00–08:00   → A   (A nghỉ đúng 24h kể từ 01/08 20:00)
 *   khối 4: 03/08 08:00–20:00   → B
 *   …
 *
 * Tức là ca của khối thứ n chỉ là n mod 3. Vì đây là công thức thuần tuý nên
 * KHÔNG lưu ca nào vào DB — chỉ nhớ thợ thuộc ca gì (bảng crew_shift_plan), còn
 * lịch thì tính ra lúc hiển thị. Nhờ vậy lịch đúng ở mọi tháng, quá khứ lẫn
 * tương lai, và đổi ca chỉ là sửa một chữ cái.
 */

export type ShiftLetter = "A" | "B" | "C";

export const SHIFT_LETTERS: ShiftLetter[] = ["A", "B", "C"];

export const SHIFT_COMPANY_LABEL: Record<string, string> = {
  hoa_phat: "Hòa Phát",
};

/** Mốc neo của chu kỳ: 01/08/2026 là ca A, khối ngày (08:00–20:00). */
const ANCHOR_UTC = Date.UTC(2026, 7, 1);
const DAY_MS = 86_400_000;

export interface ShiftBlock {
  shift: ShiftLetter;
  /** "HH:MM" giờ bắt đầu, luôn nằm trong ngày đang xét. */
  start: string;
  /** "HH:MM" giờ kết thúc; nếu overnight thì thuộc ngày HÔM SAU. */
  end: string;
  overnight: boolean;
}

/**
 * Số ngày từ mốc neo tới `dateStr` ("YYYY-MM-DD").
 *
 * Tính bằng Date.UTC chứ không phải Date địa phương: chênh lệch luôn là bội số
 * chẵn của 24h nên không bị lệch một ngày ở múi giờ nào, và cũng không dính giờ
 * mùa hè. Ngày trước mốc neo cho số âm — vẫn đúng nhờ phép mod ở dưới.
 */
function dayOffset(dateStr: string): number {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 0;
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.round((utc - ANCHOR_UTC) / DAY_MS);
}

/** Ca của khối thứ n. Mod an toàn với n âm (ngày trước mốc neo). */
function letterFor(block: number): ShiftLetter {
  return SHIFT_LETTERS[((block % 3) + 3) % 3];
}

/**
 * Hai khối 12 tiếng BẮT ĐẦU trong ngày `dateStr`: khối ngày (08:00–20:00) và
 * khối đêm (20:00 → 08:00 hôm sau).
 *
 * Mỗi ngày chỉ có 2 trong 3 ca xuất hiện — ca còn lại nghỉ trọn ngày hôm đó.
 */
export function shiftBlocksOn(dateStr: string): ShiftBlock[] {
  const base = dayOffset(dateStr) * 2;
  return [
    { shift: letterFor(base), start: "08:00", end: "20:00", overnight: false },
    { shift: letterFor(base + 1), start: "20:00", end: "08:00", overnight: true },
  ];
}

/**
 * Khối mà ca `shift` làm trong ngày `dateStr`, hoặc null nếu hôm đó ca này nghỉ.
 */
export function shiftBlockFor(dateStr: string, shift: ShiftLetter): ShiftBlock | null {
  return shiftBlocksOn(dateStr).find((b) => b.shift === shift) ?? null;
}

/** Nhãn ngắn cho ô lịch: "Ca A 08:00–20:00". */
export function shiftBlockLabel(b: ShiftBlock): string {
  return `Ca ${b.shift} ${b.start}–${b.end}${b.overnight ? " (+1)" : ""}`;
}
