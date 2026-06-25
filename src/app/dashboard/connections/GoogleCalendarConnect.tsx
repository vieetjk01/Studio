"use client";

import { useState } from "react";
import { Calendar, Check, X, Loader2, ExternalLink, Info } from "lucide-react";

interface Props {
  connected: boolean;
  gcalStatus: string | null;
  gcalMsg: string | null;
}

export default function GoogleCalendarConnect({ connected: initialConnected, gcalStatus, gcalMsg }: Props) {
  const [connected, setConnected] = useState(initialConnected);
  const [disconnecting, setDisconnecting] = useState(false);

  async function disconnect() {
    setDisconnecting(true);
    await fetch("/api/gcal/disconnect", { method: "POST" });
    setConnected(false);
    setDisconnecting(false);
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8">
        <p className="eyebrow mb-1.5">Tích hợp</p>
        <h1 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Kết nối dịch vụ</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--text2)" }}>
          Đồng bộ lịch chụp với Google Calendar — sự kiện và hợp đồng tự động hiện trên lịch của bạn.
        </p>
      </div>

      {/* Status banner from OAuth redirect */}
      {gcalStatus === "connected" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: "color-mix(in srgb,#3fb98a 12%,transparent)", border: "1px solid color-mix(in srgb,#3fb98a 30%,transparent)", color: "#3fb98a" }}>
          <Check size={16} /> Đã kết nối Google Calendar thành công!
        </div>
      )}
      {gcalStatus === "error" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: "color-mix(in srgb,#e0746f 12%,transparent)", border: "1px solid color-mix(in srgb,#e0746f 30%,transparent)", color: "#e0746f" }}>
          <X size={16} /> Kết nối thất bại{gcalMsg ? `: ${gcalMsg}` : ""}. Thử lại hoặc kiểm tra cài đặt Google OAuth.
        </div>
      )}

      {/* Google Calendar card */}
      <div className="card p-6 max-w-lg">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "color-mix(in srgb,#4285f4 15%,transparent)" }}>
            <Calendar size={20} style={{ color: "#4285f4" }} />
          </span>
          <div>
            <h2 className="font-medium">Google Calendar</h2>
            <p className="text-[12px]" style={{ color: connected ? "#3fb98a" : "var(--text3)" }}>
              {connected ? "✓ Đã kết nối" : "Chưa kết nối"}
            </p>
          </div>
        </div>

        <ul className="mb-5 space-y-2 text-[13.5px]" style={{ color: "var(--text2)" }}>
          {[
            "Tạo hợp đồng có ngày chụp → tự thêm vào Google Calendar",
            "Lưu lịch/sự kiện trong studio → đồng bộ ngay lên lịch",
            "Xoá sự kiện trong studio → tự xoá khỏi Google Calendar",
            "Dùng lịch Google hiện có của bạn (primary calendar)",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check size={14} className="mt-0.5 shrink-0" style={{ color: "var(--brand, #3fb98a)" }} />
              {f}
            </li>
          ))}
        </ul>

        {connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "color-mix(in srgb,#3fb98a 10%,transparent)", border: "1px solid color-mix(in srgb,#3fb98a 25%,transparent)" }}>
              <Check size={15} style={{ color: "#3fb98a" }} />
              <span style={{ color: "#3fb98a" }}>Google Calendar đang đồng bộ tự động</span>
            </div>
            <button
              onClick={disconnect}
              disabled={disconnecting}
              className="btn-ghost w-full py-2.5 text-sm"
              style={{ color: "#e0746f" }}
            >
              {disconnecting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              {disconnecting ? "Đang ngắt kết nối…" : "Ngắt kết nối"}
            </button>
          </div>
        ) : (
          <a
            href="/api/gcal/connect"
            className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm"
          >
            <ExternalLink size={14} />
            Kết nối Google Calendar
          </a>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg p-3 text-[12px]" style={{ background: "var(--surface2)", color: "var(--text3)" }}>
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            Cần cấu hình <code>GOOGLE_CLIENT_SECRET</code> và <code>GOOGLE_CALENDAR_REDIRECT_URI</code> trong biến môi trường.
            URI callback cần được đăng ký trong <a href="https://console.cloud.google.com" target="_blank" rel="noopener" className="underline">Google Cloud Console</a>.
          </span>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-8 card p-6 max-w-lg">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
          Cách hoạt động
        </h3>
        <ol className="space-y-3 text-[13.5px]" style={{ color: "var(--text2)" }}>
          {[
            "Bấm \"Kết nối Google Calendar\" — Google yêu cầu cấp quyền",
            "Chấp nhận quyền \"Quản lý sự kiện trong Google Calendar\"",
            "Từ đây, mọi hợp đồng có ngày chụp và mọi sự kiện tạo trong studio sẽ tự đồng bộ lên lịch chính (primary) của bạn",
            "Khi cập nhật hoặc xoá → Google Calendar cũng tự cập nhật",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: "var(--brand, #3fb98a)", color: "var(--brandFg, #06120c)" }}>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
