"use client";

import { useLang } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-ink-700 text-xs">
      <button
        onClick={() => setLang("vi")}
        className={`px-2.5 py-1 transition-colors ${
          lang === "vi" ? "bg-accent text-ink-950" : "text-accent-muted hover:bg-ink-800"
        }`}
      >
        VI
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 transition-colors ${
          lang === "en" ? "bg-accent text-ink-950" : "text-accent-muted hover:bg-ink-800"
        }`}
      >
        EN
      </button>
    </div>
  );
}
