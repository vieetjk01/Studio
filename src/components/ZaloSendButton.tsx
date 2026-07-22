"use client";

import { useState } from "react";
import { MessageCircle, Check, Loader2, AlertCircle } from "lucide-react";

/**
 * Nút "Gửi Zalo" — gửi tin qua tài khoản Zalo studio ĐÃ kết nối (kênh cá nhân),
 * gọi /api/studio/zalo/send. Khác với MessengerButton (mở app + copy tay), nút này
 * gửi TỰ ĐỘNG. Chỉ gửi được cho người đã kết bạn Zalo với tài khoản đăng nhập.
 *
 * Nếu có sẵn `phone` (vd album kèm hợp đồng) → 1 nút gửi thẳng. Nếu KHÔNG có
 * `phone` và bật `askPhone` (vd album lẻ) → hiện ô nhập SĐT rồi gửi.
 */
const ERROR_VI: Record<string, string> = {
  not_connected: "Chưa kết nối Zalo. Vào Tin nhắn → kết nối trước.",
  no_personal_session: "Phiên Zalo hết hạn — kết nối lại ở trang Tin nhắn.",
  recipient_not_found: "Không tìm thấy Zalo của số này (số sai, chưa có Zalo, hoặc đã tắt 'cho phép tìm bằng SĐT').",
  missing_recipient: "Thiếu số điện thoại người nhận.",
  personal_needs_body: "Thiếu nội dung tin.",
  zca_js_not_installed: "Máy chủ chưa bật gửi Zalo — liên hệ hỗ trợ.",
};

export default function ZaloSendButton({
  phone,
  name,
  message,
  label = "Gửi Zalo",
  audience,
  contractId,
  kind = "manual",
  askPhone = false,
  className = "btn-ghost px-2.5 py-1.5 text-xs",
}: {
  phone?: string | null;
  name?: string | null;
  message: string;
  label?: string;
  audience?: "client" | "crew";
  contractId?: string | null;
  kind?: string;
  /** Không có `phone` → hiện ô nhập SĐT để gửi (dùng cho album lẻ không kèm HĐ). */
  askPhone?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<null | "sending" | "ok" | "fail">(null);
  const [err, setErr] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const fixed = (phone || "").trim();
  // Album lẻ (không có số sẵn) và cho phép nhập tay → hiện ô nhập.
  const inputMode = !fixed && askPhone;

  async function send() {
    const to = fixed || manualPhone.trim();
    if (!to) {
      setState("fail");
      setErr("Nhập số điện thoại trước.");
      return;
    }
    setState("sending");
    setErr("");
    try {
      const res = await fetch("/api/studio/zalo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toPhone: to, toName: name ?? null, body: message, audience, contractId, kind }),
      }).then((x) => x.json());
      if (res.ok) {
        setState("ok");
        setTimeout(() => setState(null), 2500);
      } else {
        setState("fail");
        setErr(ERROR_VI[res.error] || res.error || "Gửi thất bại");
      }
    } catch {
      setState("fail");
      setErr("Lỗi mạng, thử lại.");
    }
  }

  const icon =
    state === "sending" ? (
      <Loader2 size={14} className="inline animate-spin" />
    ) : state === "ok" ? (
      <Check size={14} className="inline" />
    ) : state === "fail" ? (
      <AlertCircle size={14} className="inline" />
    ) : (
      <MessageCircle size={14} className="inline" />
    );

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1.5">
        {inputMode && (
          <input
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            placeholder="SĐT khách"
            inputMode="tel"
            className="input px-2 py-1 text-xs"
            style={{ width: 120 }}
          />
        )}
        <button
          type="button"
          onClick={send}
          disabled={state === "sending"}
          className={className}
          title="Gửi tự động qua Zalo studio (người nhận phải đã kết bạn Zalo)"
          style={{ color: "#0068FF" }}
        >
          {icon} {state === "ok" ? "Đã gửi" : label}
        </button>
      </span>
      {state === "fail" && err && (
        <span className="text-[10px]" style={{ color: "var(--s-red)" }}>
          {err}
        </span>
      )}
    </span>
  );
}
