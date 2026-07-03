"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Check, ImagePlus } from "lucide-react";

/** Guest uploads a photo/video → saved to the couple's own Google Drive. */
export default function ContributeForm({ slug, accent }: { slug: string; accent: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function send(file: File | undefined | null) {
    if (!file) return;
    setBusy(true); setErr(null); setDone(false);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("guest_name", name.trim());
    const res = await fetch(`/api/story/contribute/${slug}`, { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) { setDone(true); setTimeout(() => setDone(false), 4000); return; }
    const d = await res.json().catch(() => ({}));
    setErr(d.hint || (d.error === "too_large" ? "File quá lớn (tối đa 60MB)." : d.error === "bad_type" ? "Chỉ nhận ảnh hoặc video." : "Gửi không thành công, thử lại nhé."));
  }

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: `color-mix(in srgb, ${accent} 30%, #fff)`, background: `color-mix(in srgb, ${accent} 5%, #fff)` }}>
      <p className="text-center text-sm font-medium" style={{ color: accent }}>Bạn có ảnh/khoảnh khắc đẹp? Gửi tặng cô dâu chú rể 💐</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tên của bạn (không bắt buộc)"
        className="mt-3 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />
      <div className="mt-3 flex gap-2">
        <button onClick={() => camRef.current?.click()} disabled={busy} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: accent }}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />} Chụp ngay
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium disabled:opacity-60" style={{ borderColor: accent, color: accent }}>
          <ImagePlus size={15} /> Chọn từ máy
        </button>
      </div>
      <input ref={camRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => send(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => send(e.target.files?.[0])} />
      {done && <p className="mt-2 flex items-center justify-center gap-1 text-xs text-emerald-600"><Check size={13} /> Đã gửi! Cảm ơn bạn 💕</p>}
      {err && <p className="mt-2 text-center text-xs text-red-600">{err}</p>}
      <p className="mt-2 text-center text-[11px] text-neutral-400">Ảnh/video tối đa 60MB, lưu trực tiếp vào Drive của cô dâu chú rể.</p>
    </div>
  );
}
