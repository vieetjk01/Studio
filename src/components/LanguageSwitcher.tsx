"use client";

import { useLang } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-ink-700 text-xs">
      <button
        onClick={() => setLang("vi")}
        aria-pressed={lang === "vi"}
        aria-label="Tiếng Việt"
        className={`px-3 py-1.5 transition-colors ${
          lang === "vi" ? "bg-accent text-ink-950" : "text-accent-muted hover:bg-ink-800"
        }`}
      >
        VI
      </button>
      <button
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        aria-label="English"
        className={`px-3 py-1.5 transition-colors ${
          lang === "en" ? "bg-accent text-ink-950" : "text-accent-muted hover:bg-ink-800"
        }`}
      >
        EN
      </button>
    </div>
  );
}
