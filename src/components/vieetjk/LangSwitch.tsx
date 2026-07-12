"use client";

import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/vieetjk/content";

/** Nút chuyển VI/EN — lưu vào cookie vjk_lang rồi tải lại (trang đọc cookie ở server). */
export default function LangSwitch({ lang }: { lang: Lang }) {
  const router = useRouter();
  function set(l: Lang) {
    if (l === lang) return;
    document.cookie = `vjk_lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }
  return (
    <div className="vjk-lang" role="group" aria-label="Language">
      <button type="button" className={lang === "vi" ? "on" : ""} onClick={() => set("vi")}>VI</button>
      <span aria-hidden="true">/</span>
      <button type="button" className={lang === "en" ? "on" : ""} onClick={() => set("en")}>EN</button>
    </div>
  );
}
