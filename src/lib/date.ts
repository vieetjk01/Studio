// Centralised date formatting — the whole app shows dates as ngày/tháng/năm
// (dd/mm/yyyy). Accepts a Date, an ISO string ("2026-06-27") or a timestamp.
import { solarToLunar } from "@/lib/lunar";

function toDate(v: string | number | Date | null | undefined): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  // "YYYY-MM-DD" → treat as a local date (avoid TZ shifting the day).
  if (typeof v === "string") {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Hôm nay theo giờ Việt Nam (UTC+7) dạng "YYYY-MM-DD" — dùng cho các so sánh
 * ngày (hôm nay/quá hạn/mốc nhắc) để không lệch 1 ngày vào buổi tối như khi
 * lấy trực tiếp toISOString() (UTC). An toàn cả client lẫn server.
 */
export function todayVN(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/** dd/mm/yyyy. Returns "" for empty/invalid input. */
export function fmtDate(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** dd/mm/yyyy HH:mm. Returns "" for empty/invalid input. */
export function fmtDateTime(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Lunar (âm lịch) date: "dd/mm/yyyy" (+ " nhuận" for a leap month). "" if invalid. */
export function fmtLunar(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "";
  const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const l = solarToLunar(iso);
  return `${pad(l.day)}/${pad(l.month)}/${l.year}${l.leap ? " nhuận" : ""}`;
}

/** Solar + lunar together: "dd/mm/yyyy (ÂL dd/mm/yyyy)". "" if invalid. */
export function fmtDateLunar(v: string | number | Date | null | undefined): string {
  const s = fmtDate(v);
  if (!s) return "";
  const l = fmtLunar(v);
  return l ? `${s} (ÂL ${l})` : s;
}
