"use client";

import { useEffect, useState } from "react";

/**
 * Ô nhập giờ 24h, KHÔNG dùng `<input type="time">`.
 *
 * Vì sao tự làm: `<input type="time">` render theo locale của máy. Ở locale 12
 * giờ nó thêm một đoạn AM/PM, và chừng nào đoạn đó còn trống thì `input.value`
 * trả về CHUỖI RỖNG — dù người dùng đã gõ "06:00" và trên màn hình vẫn thấy
 * "06:00". Với input có kiểm soát, React không bao giờ nhận được giá trị, nên
 * giờ biến mất im lặng lúc lưu. Ô text thuần thì hành xử giống nhau ở mọi máy.
 *
 * Nhập rời rạc: gõ số, tự chèn dấu hai chấm. Chuẩn hoá khi rời ô (blur) chứ
 * không phải từng phím, để "9:5" đang gõ dở không bị nhảy thành "09:05".
 */
export default function TimeInput({
  value,
  onChange,
  className = "input",
  ariaLabel,
  placeholder = "08:00",
}: {
  /** "HH:MM" hoặc "" */
  value: string;
  onChange: (v: string) => void;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);

  // Giá trị từ ngoài đổi (nạp lại dữ liệu, chọn dòng khác) thì đồng bộ vào ô.
  useEffect(() => setDraft(value), [value]);

  /** Chỉ giữ chữ số, tự chèn ":" sau 2 số đầu. Tối đa 4 số. */
  function retype(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 4);
    const next = d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
    setDraft(next);
    // Đủ 4 số là đã thành giờ hợp lệ → báo lên ngay, khỏi bắt người dùng blur.
    if (d.length === 4) {
      const norm = clamp(d.slice(0, 2), d.slice(2));
      if (norm) onChange(norm);
    } else if (d.length === 0) {
      onChange("");
    }
  }

  function commit() {
    const d = draft.replace(/\D/g, "");
    if (!d) {
      setDraft("");
      onChange("");
      return;
    }
    // "9" → 09:00 · "930" → 09:30 · "0930" → 09:30
    const padded = d.length <= 2 ? d.padStart(2, "0") + "00" : d.padStart(4, "0");
    const norm = clamp(padded.slice(0, 2), padded.slice(2));
    setDraft(norm ?? value);
    onChange(norm ?? value);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={draft}
      onChange={(e) => retype(e.target.value)}
      onBlur={commit}
    />
  );
}

/** "25","70" → null; "09","30" → "09:30". */
function clamp(hh: string, mm: string): string | null {
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
