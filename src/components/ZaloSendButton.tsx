"use client";

import { useState } from "react";
import { MessageCircle, Check, Loader2, AlertCircle, Users, Search } from "lucide-react";

/**
 * Nút "Gửi Zalo" — gửi tin qua tài khoản Zalo studio ĐÃ kết nối (kênh cá nhân),
 * gọi /api/studio/zalo/send. Gửi TỰ ĐỘNG (khác MessengerButton mở app + copy tay).
 *
 * 3 cách xác định người nhận:
 *  - `phone` có sẵn (album/HĐ kèm khách) → gửi thẳng.
 *  - `askPhone` + không có số → hiện ô nhập SĐT.
 *  - "Chọn bạn Zalo" → chọn trực tiếp từ danh sách bạn bè (gửi theo uid, KHÔNG
 *    phụ thuộc quyền "tìm bằng SĐT" của người nhận → gửi được cho bạn bè dù họ
 *    tắt tìm-bằng-SĐT).
 */
const ERROR_VI: Record<string, string> = {
  not_connected: "Chưa kết nối Zalo. Vào Tin nhắn → kết nối trước.",
  no_personal_session: "Phiên Zalo hết hạn — kết nối lại ở trang Tin nhắn.",
  not_personal: "Chọn bạn Zalo chỉ dùng cho kênh tài khoản cá nhân.",
  recipient_not_found: "Không tìm thấy Zalo của số này. Thử 'Chọn bạn Zalo' nếu đã kết bạn.",
  missing_recipient: "Thiếu người nhận.",
  personal_needs_body: "Thiếu nội dung tin.",
  zca_js_not_installed: "Máy chủ chưa bật gửi Zalo — liên hệ hỗ trợ.",
  list_failed: "Không tải được danh sách bạn Zalo.",
};
const mapErr = (e: string) => ERROR_VI[e] || e || "Lỗi";

// Cache danh sách bạn bè ở cấp module → nhiều nút không phải tải lại.
let _friendsCache: Array<{ uid: string; name: string; avatar: string }> | null = null;

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
  askPhone?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<null | "sending" | "ok" | "fail">(null);
  const [err, setErr] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  // Picker bạn bè
  const [pickOpen, setPickOpen] = useState(false);
  const [friends, setFriends] = useState<Array<{ uid: string; name: string; avatar: string }>>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendsErr, setFriendsErr] = useState("");
  const [q, setQ] = useState("");

  const fixed = (phone || "").trim();
  const inputMode = !fixed && askPhone;

  async function doSend(payload: { toPhone?: string; toUid?: string; toName?: string | null }) {
    setState("sending");
    setErr("");
    try {
      const res = await fetch("/api/studio/zalo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, body: message, audience, contractId, kind }),
      }).then((x) => x.json());
      if (res.ok) {
        setState("ok");
        setTimeout(() => setState(null), 2500);
      } else {
        setState("fail");
        setErr(mapErr(res.error));
      }
    } catch {
      setState("fail");
      setErr("Lỗi mạng, thử lại.");
    }
  }

  function sendByPhone() {
    const to = fixed || manualPhone.trim();
    if (!to) {
      setState("fail");
      setErr("Nhập số điện thoại trước.");
      return;
    }
    doSend({ toPhone: to, toName: name ?? null });
  }

  async function togglePicker() {
    const next = !pickOpen;
    setPickOpen(next);
    if (next && !_friendsCache && !loadingFriends) {
      setLoadingFriends(true);
      setFriendsErr("");
      try {
        const r = await fetch("/api/studio/zalo/friends", { cache: "no-store" }).then((x) => x.json());
        if (r.ok) {
          _friendsCache = r.friends || [];
          setFriends(_friendsCache!);
        } else setFriendsErr(mapErr(r.error));
      } catch {
        setFriendsErr("Lỗi mạng, thử lại.");
      }
      setLoadingFriends(false);
    } else if (next && _friendsCache) {
      setFriends(_friendsCache);
    }
  }

  function pickFriend(f: { uid: string; name: string }) {
    setPickOpen(false);
    setQ("");
    doSend({ toUid: f.uid, toName: f.name });
  }

  const icon =
    state === "sending" ? <Loader2 size={14} className="inline animate-spin" />
    : state === "ok" ? <Check size={14} className="inline" />
    : state === "fail" ? <AlertCircle size={14} className="inline" />
    : <MessageCircle size={14} className="inline" />;

  const shown = q.trim()
    ? friends.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase()))
    : friends;

  return (
    <span className="relative inline-flex flex-col items-start gap-0.5">
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
          onClick={sendByPhone}
          disabled={state === "sending"}
          className={className}
          title="Gửi tự động qua Zalo studio"
          style={{ color: "#0068FF" }}
        >
          {icon} {state === "ok" ? "Đã gửi" : label}
        </button>
        <button
          type="button"
          onClick={togglePicker}
          className="btn-ghost px-2 py-1.5 text-xs"
          title="Chọn từ danh sách bạn Zalo (gửi được dù người nhận tắt tìm-bằng-SĐT)"
          style={{ color: "#0068FF" }}
        >
          <Users size={14} className="inline" />
        </button>
      </span>

      {pickOpen && (
        <div
          className="absolute z-50 mt-1 rounded-xl border p-2 shadow-xl"
          style={{ top: "100%", left: 0, width: 260, background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: "var(--surface2)" }}>
            <Search size={13} style={{ color: "var(--text3)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm bạn theo tên…"
              className="w-full bg-transparent text-xs outline-none"
              autoFocus
            />
          </div>
          <div className="mt-1.5 max-h-56 overflow-y-auto">
            {loadingFriends ? (
              <div className="flex items-center gap-2 px-2 py-3 text-xs opacity-70">
                <Loader2 size={13} className="animate-spin" /> Đang tải bạn bè…
              </div>
            ) : friendsErr ? (
              <div className="px-2 py-3 text-xs" style={{ color: "var(--s-red)" }}>{friendsErr}</div>
            ) : shown.length === 0 ? (
              <div className="px-2 py-3 text-xs opacity-60">{friends.length ? "Không khớp." : "Chưa có bạn bè."}</div>
            ) : (
              shown.slice(0, 200).map((f) => (
                <button
                  key={f.uid}
                  type="button"
                  onClick={() => pickFriend(f)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white/5"
                >
                  {f.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px]">
                      {f.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="truncate">{f.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {state === "fail" && err && (
        <span className="text-[10px]" style={{ color: "var(--s-red)" }}>{err}</span>
      )}
    </span>
  );
}
