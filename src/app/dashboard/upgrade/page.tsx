"use client";

import { useState } from "react";
import { Check, Crown, Sparkles, Send } from "lucide-react";
import PlanUsage from "@/components/PlanUsage";

const FREE = [
  "Tối đa 5 album mỗi tháng",
  "Khách chọn ảnh & gửi lại studio",
  "Mã QR + link chia sẻ",
  "Watermark tự động",
];
const PRO = [
  "Tạo album không giới hạn",
  "Cho khách tải ảnh (ZIP / từng ảnh)",
  "Cho khách ghi chú trên ảnh",
  "Ưu tiên hỗ trợ",
];

export default function UpgradePage() {
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request() {
    setSending(true);
    setError(null);
    const res = await fetch("/api/upgrade-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
      setNote("");
    } else {
      setError("Gửi yêu cầu thất bại, thử lại sau.");
    }
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8">
        <p className="eyebrow mb-1.5">Gói dịch vụ</p>
        <h1 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Nâng cấp gói</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--text2)" }}>
          Mở khoá tạo album không giới hạn, cho khách tải ảnh và ghi chú trực tiếp trên từng tấm.
        </p>
      </div>

      <PlanUsage showUpgrade={false} />

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {/* Free */}
        <div className="card p-7">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
              <Sparkles size={18} />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-medium">Miễn phí</h2>
              <p className="text-[12.5px]" style={{ color: "var(--text3)" }}>Gói hiện tại của tài khoản mới</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {FREE.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: "var(--text2)" }}>
                <Check size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--text3)" }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Studio / Pro */}
        <div className="card p-7" style={{ borderColor: "var(--gold)" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--gold)", color: "#1a1205" }}>
              <Crown size={18} />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-medium">Studio</h2>
              <p className="text-[12.5px]" style={{ color: "var(--gold)" }}>Mở khoá toàn bộ tính năng</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {PRO.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[13.5px]">
                <Check size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--gold)" }} />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--border)" }}>
            {sent ? (
              <div className="flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ background: "color-mix(in srgb,#3fbf7f 14%,transparent)", border: "1px solid color-mix(in srgb,#3fbf7f 40%,transparent)" }}>
                <Check size={17} style={{ color: "#5fd29a" }} />
                <span className="text-[13.5px]">Đã gửi yêu cầu nâng cấp! Quản trị viên sẽ liên hệ sớm.</span>
              </div>
            ) : (
              <>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Lời nhắn (tuỳ chọn): nhu cầu của bạn, số lượng album dự kiến…"
                  className="input min-h-[80px] resize-y"
                />
                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
                <button onClick={request} disabled={sending} className="btn-primary mt-3 w-full rounded-xl py-3.5 text-[15px]">
                  <Send size={16} /> {sending ? "Đang gửi…" : "Gửi yêu cầu nâng cấp"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
