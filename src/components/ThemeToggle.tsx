"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

/**
 * Shared light/dark toggle. Drop it into any header — it reads/writes the single
 * app-wide theme, so switching here changes every page.
 */
export default function ThemeToggle({ size = 16 }: { size?: number }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Giao diện sáng" : "Giao diện tối"}
      title={dark ? "Giao diện sáng" : "Giao diện tối"}
      className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface2)",
        color: "var(--text)",
      }}
    >
      {dark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  );
}
