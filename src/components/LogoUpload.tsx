"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 150 * 1024; // 150 KB

interface Props {
  value: string;
  onChange: (url: string) => void;
  ownerId: string;
  bucket?: string; // default: "logos"
  label?: string;
}

export default function LogoUpload({ value, onChange, ownerId, bucket = "logos", label = "Logo" }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target) return;
    if (!file) return;
    setErr(null);

    if (file.size > MAX_BYTES) {
      setErr(`Ảnh quá lớn (${Math.round(file.size / 1024)} KB). Giới hạn 150 KB.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErr("Chỉ chấp nhận file ảnh (PNG, JPG, SVG, WEBP).");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${ownerId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (upErr) {
        // Bucket not found — give a helpful message
        if (upErr.message.includes("not found") || upErr.message.includes("Bucket")) {
          setErr(`Chưa tạo bucket "${bucket}" trong Supabase Storage. Vào Storage → New bucket → đặt tên "${bucket}" → Public.`);
        } else {
          setErr(upErr.message);
        }
        return;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div>
      <label className="label">{label} <span style={{ color: "var(--text3)", fontWeight: 400 }}>(tối đa 150 KB)</span></label>
      <div className="flex items-center gap-2">
        {/* Preview */}
        {value ? (
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="logo" className="h-10 w-10 rounded-lg object-contain" style={{ border: "1px solid var(--border)", background: "var(--surface2)" }} />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              <X size={9} />
            </button>
          </div>
        ) : null}

        {/* URL input */}
        <input
          className="input flex-1"
          placeholder="https://… hoặc tải lên ↓"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />

        {/* Upload button */}
        <button
          type="button"
          disabled={uploading}
          onClick={() => ref.current?.click()}
          className="btn-ghost shrink-0 gap-2 px-3 py-2 text-xs"
        >
          <Upload size={14} />
          {uploading ? "Đang tải…" : "Tải lên"}
        </button>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>
      {err && <p className="mt-1 text-xs" style={{ color: "#e0746f" }}>{err}</p>}
    </div>
  );
}
