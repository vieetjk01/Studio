"use client";

import { useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useLang, type Lang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const ghostBtn: CSSProperties = { height: 36, padding: "0 14px", border: "1px solid var(--border)", background: "transparent", color: "var(--fg)", borderRadius: 9, fontFamily: "inherit", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", textDecoration: "none" };

/**
 * Island tương tác duy nhất trên thanh nav của landing: nút đổi ngôn ngữ và
 * nút đổi giao diện. Landing render trên SERVER theo cookie `vk_lang`, nên đổi
 * ngôn ngữ = ghi cookie + router.refresh() (đồng thời ghi localStorage để phần
 * còn lại của app — vốn dùng useLang — thấy cùng lựa chọn).
 */
export default function LandingControls({ lang }: { lang: Lang }) {
  const router = useRouter();
  const { setLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // Người dùng cũ chỉ có lựa chọn trong localStorage (chưa có cookie): đồng bộ
  // một lần sang cookie rồi refresh để server render đúng ngôn ngữ đã chọn.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("vk_lang");
      const hasCookie = document.cookie.split("; ").some((c) => c.startsWith("vk_lang="));
      if (!hasCookie && (stored === "en" || stored === "vi") && stored !== lang) {
        document.cookie = `vk_lang=${stored}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }
    } catch {
      /* ignore */
    }
  }, [lang, router]);

  function switchLang() {
    const next: Lang = lang === "vi" ? "en" : "vi";
    try {
      setLang(next); // giữ localStorage + context đồng bộ cho các trang client khác
    } catch {
      /* ngoài LangProvider thì bỏ qua */
    }
    document.cookie = `vk_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <>
      <button onClick={switchLang} aria-label={lang === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"} style={{ ...ghostBtn, gap: 6, padding: "0 12px", fontSize: 13, letterSpacing: ".02em" }}>
        {lang === "vi" ? "EN" : "VI"}
      </button>
      <button onClick={toggleTheme} aria-label={isDark ? (lang === "en" ? "Switch to light mode" : "Chuyển giao diện sáng") : (lang === "en" ? "Switch to dark mode" : "Chuyển giao diện tối")} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", background: "transparent", color: "var(--fg)", borderRadius: 9, cursor: "pointer" }}>
        {isDark ? (
          <svg width="17" height="17" viewBox="0 0 24 24"><path d="M21 12.8A8.5 8.5 0 0 1 11.2 3a7 7 0 1 0 9.8 9.8Z" fill="var(--fg)" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--fg)" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" /></svg>
        )}
      </button>
    </>
  );
}
