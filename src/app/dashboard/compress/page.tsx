"use client";

import { useEffect, useState } from "react";
import { Minimize2, Stamp, FileImage } from "lucide-react";
import { pickerConfigured, preloadGoogle, requestDriveToken } from "@/lib/google-picker";
import ToolPanel, { type Tool, type QuotaState } from "./ToolPanel";

export default function CompressPage() {
  const [tool, setTool] = useState<Tool>("compress");
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);

  useEffect(() => {
    if (pickerConfigured) preloadGoogle();
    refreshQuota();
  }, []);

  async function refreshQuota() {
    try {
      const r = await fetch("/api/compress/use");
      if (r.ok) {
        const d = await r.json();
        setQuota({ basic: d.basic, picker: d.picker });
      }
    } catch {
      /* ignore */
    }
  }

  async function ensureDriveToken(force = false): Promise<string> {
    if (driveToken && !force) return driveToken;
    const t = await requestDriveToken(force);
    setDriveToken(t);
    return t;
  }

  async function consumeQuota(kind: "basic" | "picker") {
    const r = await fetch("/api/compress/use", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const data = await r.json().catch(() => null);
    if (data?.basic) setQuota({ basic: data.basic, picker: data.picker });
    return { ok: r.ok, status: r.status, data };
  }

  const tabs: { key: Tool; label: string; Icon: typeof Minimize2 }[] = [
    { key: "compress", label: "Nén ảnh", Icon: Minimize2 },
    { key: "watermark", label: "Gắn watermark", Icon: Stamp },
    { key: "convert", label: "Đổi định dạng", Icon: FileImage },
  ];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Công cụ ảnh</p>
        <h1 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Xử lý ảnh</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--text2)" }}>
          Nén ảnh, gắn watermark, đổi định dạng — từ máy tính hoặc Google Drive. Xử lý ngay trên
          trình duyệt, ảnh không tải lên máy chủ.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTool(key)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
            style={
              tool === key
                ? { background: "var(--accent)", color: "var(--accentInk)" }
                : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }
            }
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <ToolPanel
        key={tool}
        tool={tool}
        ensureDriveToken={ensureDriveToken}
        quota={quota}
        consumeQuota={consumeQuota}
      />
    </div>
  );
}
