"use client";

import { useRouter } from "next/navigation";

export type VjkTheme = "dark" | "light";

/** Nút chuyển giao diện sáng/tối — lưu cookie vjk_theme, trang đọc ở server. */
export default function ThemeSwitch({ theme }: { theme: VjkTheme }) {
  const router = useRouter();
  function toggle() {
    const next: VjkTheme = theme === "dark" ? "light" : "dark";
    document.cookie = `vjk_theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }
  return (
    <button type="button" className="vjk-theme" onClick={toggle} aria-label={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"} title={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}>
      {theme === "dark" ? (
        // moon → hiện đang tối, bấm để sáng
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      ) : (
        // sun → hiện đang sáng, bấm để tối
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
