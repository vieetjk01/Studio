"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Check, X, AlertTriangle, Loader2, QrCode, Building2, User } from "lucide-react";

type Channel = "oa" | "personal";
type AutoCfg = { client?: boolean; crew?: boolean; templateId?: string };

type Status = {
  connected: boolean;
  channel: Channel | null;
  status?: string;
  displayName?: string | null;
  oaId?: string | null;
  self?: { id?: string; name?: string; avatar?: string } | null;
  autoEvents?: Record<string, AutoCfg>;
  connectedAt?: string | null;
  lastError?: string | null;
  qr?: string | null;
  oaConfigured?: boolean;
  personalAvailable?: boolean;
};

const EVENTS: { key: string; label: string; audiences: ("client" | "crew")[] }[] = [
  { key: "booking_confirm", label: "Xác nhận đặt lịch", audiences: ["client"] },
  { key: "deposit_confirm", label: "Xác nhận đã nhận cọc", audiences: ["client"] },
  { key: "shoot_reminder", label: "Nhắc lịch chụp (trước 1 ngày)", audiences: ["client", "crew"] },
  { key: "payment_due", label: "Nhắc thanh toán tới hạn", audiences: ["client"] },
  { key: "select_ready", label: "Mời khách chọn ảnh", audiences: ["client"] },
  { key: "delivery_ready", label: "Báo đã giao ảnh", audiences: ["client"] },
];

export default function ZaloPanel() {
  const [st, setSt] = useState<Status | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [savingEvt, setSavingEvt] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("Xin chào, đây là tin nhắn thử từ studio qua MStudo.");
  const [testState, setTestState] = useState<null | "sending" | "ok" | "fail">(null);
  const [testErr, setTestErr] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/studio/zalo/status", { cache: "no-store" }).then((x) => x.json());
    setSt(r);
    if (r.qr) setQr(r.qr);
    return r as Status;
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  const autoEvents = st?.autoEvents ?? {};

  async function saveEvents(next: Record<string, AutoCfg>) {
    setSavingEvt(true);
    setSt((s) => (s ? { ...s, autoEvents: next } : s));
    await fetch("/api/studio/zalo/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoEvents: next }),
    });
    setSavingEvt(false);
  }

  function toggle(key: string, aud: "client" | "crew") {
    const cur = autoEvents[key] ?? {};
    const next = { ...autoEvents, [key]: { ...cur, [aud]: !cur[aud] } };
    saveEvents(next);
  }

  async function setChannel(channel: Channel) {
    setSt((s) => (s ? { ...s, channel } : s));
    await fetch("/api/studio/zalo/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    refresh();
  }

  function connectOA() {
    window.location.href = "/api/studio/zalo/oa/connect";
  }

  async function connectPersonal() {
    setConnecting(true);
    setQr(null);
    // Poll trạng thái để lấy ảnh QR + phát hiện đã kết nối trong lúc request dài chạy.
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const r = await refresh();
      if (r.connected) {
        if (pollRef.current) clearInterval(pollRef.current);
        setConnecting(false);
        setQr(null);
      }
    }, 2000);
    try {
      const res = await fetch("/api/studio/zalo/personal", { method: "POST" }).then((x) => x.json());
      if (!res.ok && res.error) {
        // hết hạn quét / lỗi
      }
    } finally {
      if (pollRef.current) clearInterval(pollRef.current);
      setConnecting(false);
      refresh();
    }
  }

  async function disconnect() {
    if (!confirm("Ngắt kết nối Zalo? Tin tự động sẽ ngừng gửi cho tới khi kết nối lại.")) return;
    await fetch("/api/studio/zalo/disconnect", { method: "POST" });
    setQr(null);
    refresh();
  }

  async function sendTest() {
    if (!testPhone.trim()) return;
    setTestState("sending");
    setTestErr("");
    const res = await fetch("/api/studio/zalo/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toPhone: testPhone.trim(), body: testMsg, kind: "test" }),
    }).then((x) => x.json());
    if (res.ok) setTestState("ok");
    else {
      setTestState("fail");
      setTestErr(res.error || "Gửi thất bại");
    }
  }

  const channel = st?.channel ?? "personal";

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <MessageCircle size={18} className="text-[#0068FF]" />
        <h2 className="font-serif text-xl font-medium">Tự động nhắn tin Zalo</h2>
        {st?.connected && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-400">
            <Check size={13} /> Đã kết nối
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm opacity-70">
        Kết nối Zalo để studio tự động nhắn khách &amp; thợ ở các mốc hợp đồng (xác nhận lịch, nhắc
        cọc, mời chọn ảnh, báo giao ảnh…). Chỉ dùng được với gói Studio.
      </p>

      {/* Chọn kênh */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setChannel("oa")}
          className={`rounded-xl border p-4 text-left transition ${
            channel === "oa" ? "border-[#0068FF] bg-[#0068FF]/5" : "border-white/10 hover:border-white/25"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <Building2 size={16} /> Official Account (khuyến nghị)
          </div>
          <p className="mt-1 text-xs opacity-65">
            Chính thống. Gửi ZNS tới bất kỳ số điện thoại nào có Zalo. Tính phí ~200–600đ/tin. An
            toàn, không lo khoá tài khoản.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setChannel("personal")}
          className={`rounded-xl border p-4 text-left transition ${
            channel === "personal" ? "border-[#0068FF] bg-[#0068FF]/5" : "border-white/10 hover:border-white/25"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <User size={16} /> Tài khoản cá nhân
          </div>
          <p className="mt-1 text-xs opacity-65">
            Miễn phí, đăng nhập bằng QR. Chỉ nhắn được cho người đã kết bạn.
          </p>
        </button>
      </div>

      {/* Cảnh báo cho kênh cá nhân */}
      {channel === "personal" && (
        <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <b>Rủi ro:</b> gửi tin tự động qua tài khoản cá nhân vi phạm điều khoản của Zalo và có
            thể khiến tài khoản <b>bị khoá</b>. Chỉ dùng để nhắn khách/thợ đã kết bạn, số lượng vừa
            phải. Studio tự chịu trách nhiệm khi bật kênh này.
          </div>
        </div>
      )}

      {/* Kết nối / trạng thái */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {st?.connected ? (
          <>
            <span className="text-sm">
              {channel === "oa" ? "OA" : "Tài khoản"}:{" "}
              <b>{st.displayName || st.self?.name || st.oaId || "đã kết nối"}</b>
            </span>
            <button type="button" onClick={disconnect} className="btn-ghost px-3 py-1.5 text-xs">
              <X size={14} /> Ngắt kết nối
            </button>
          </>
        ) : channel === "oa" ? (
          <>
            <button type="button" onClick={connectOA} disabled={st?.oaConfigured === false} className="btn-primary px-4 py-2 text-sm">
              <Building2 size={15} /> Kết nối Official Account
            </button>
            {st?.oaConfigured === false && (
              <span className="text-xs text-amber-400">Máy chủ chưa cấu hình Zalo App (ZALO_OA_*).</span>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={connectPersonal} disabled={connecting || st?.personalAvailable === false} className="btn-primary px-4 py-2 text-sm">
              {connecting ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
              {connecting ? "Đang chờ quét…" : "Đăng nhập bằng QR"}
            </button>
            {st?.personalAvailable === false && (
              <span className="text-xs text-amber-400">Máy chủ chưa cài zca-js.</span>
            )}
          </>
        )}
        {st?.lastError && !st.connected && (
          <span className="text-xs text-rose-400">Lỗi: {st.lastError}</span>
        )}
      </div>

      {/* QR để quét */}
      {connecting && channel === "personal" && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-white/10 p-5">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/png;base64,${qr}`} alt="Zalo QR" className="h-52 w-52 rounded bg-white p-2" />
          ) : (
            <Loader2 size={28} className="animate-spin opacity-60" />
          )}
          <p className="text-center text-xs opacity-70">
            Mở Zalo trên điện thoại → <b>Cá nhân</b> → biểu tượng quét mã → quét QR này. Giữ trang mở
            đến khi kết nối xong.
          </p>
        </div>
      )}

      {/* Bật/tắt tự động theo mốc */}
      <div className="mt-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          Tự động gửi theo mốc
          {savingEvt && <Loader2 size={13} className="animate-spin opacity-60" />}
        </div>
        <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs opacity-70">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Mốc</th>
                <th className="px-3 py-2 text-center font-medium">Gửi khách</th>
                <th className="px-3 py-2 text-center font-medium">Gửi thợ</th>
              </tr>
            </thead>
            <tbody>
              {EVENTS.map((e) => {
                const cfg = autoEvents[e.key] ?? {};
                return (
                  <tr key={e.key} className="border-t border-white/5">
                    <td className="px-3 py-2">{e.label}</td>
                    <td className="px-3 py-2 text-center">
                      {e.audiences.includes("client") ? (
                        <input type="checkbox" checked={!!cfg.client} onChange={() => toggle(e.key, "client")} className="h-4 w-4 accent-[#0068FF]" />
                      ) : (
                        <span className="opacity-30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {e.audiences.includes("crew") ? (
                        <input type="checkbox" checked={!!cfg.crew} onChange={() => toggle(e.key, "crew")} className="h-4 w-4 accent-[#0068FF]" />
                      ) : (
                        <span className="opacity-30">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {channel === "oa" && (
          <p className="mt-2 text-xs opacity-60">
            Kênh OA gửi qua ZNS cần template đã được Zalo duyệt cho từng mốc — cấu hình template ID
            trong phần nâng cao (liên hệ hỗ trợ nếu chưa có).
          </p>
        )}
      </div>

      {/* Gửi thử */}
      {st?.connected && (
        <div className="mt-6 rounded-xl border border-white/10 p-4">
          <div className="text-sm font-medium">Gửi thử</div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Số điện thoại khách (đã kết bạn nếu dùng cá nhân)"
              className="input flex-1"
            />
            <button type="button" onClick={sendTest} disabled={testState === "sending"} className="btn-primary px-4 py-2 text-sm">
              {testState === "sending" ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />} Gửi thử
            </button>
          </div>
          <textarea value={testMsg} onChange={(e) => setTestMsg(e.target.value)} rows={2} className="input mt-2 w-full" />
          {testState === "ok" && <p className="mt-1 text-xs text-emerald-400">Đã gửi ✓</p>}
          {testState === "fail" && <p className="mt-1 text-xs text-rose-400">Lỗi: {testErr}</p>}
        </div>
      )}
    </div>
  );
}
