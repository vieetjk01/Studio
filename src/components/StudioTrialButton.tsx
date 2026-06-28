"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

interface Props {
  /** Has this user already used the Studio trial? */
  used: boolean;
}

export default function StudioTrialButton({ used: initialUsed }: Props) {
  const [used, setUsed] = useState(initialUsed);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function activate() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/trial/studio", { method: "POST" });
    const d = await res.json().catch(() => null);
    setBusy(false);
    if (res.ok && d?.ok) {
      setUsed(true);
      setMsg("Đã kích hoạt Studio 1 ngày! Tải lại trang để dùng ngay.");
    } else {
      setMsg(
        d?.error === "already_used" ? "Bạn đã dùng thử Studio rồi."
        : d?.error === "already_studio" ? "Bạn đang dùng gói Studio."
        : "Không thể kích hoạt. Vui lòng thử lại."
      );
    }
  }

  if (used) {
    return msg ? (
      <p className="text-xs font-medium" style={{ color: "#3fb98a" }}>{msg}</p>
    ) : (
      <p className="text-xs" style={{ color: "var(--text3)" }}>Đã dùng thử Studio.</p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={activate}
        disabled={busy}
        className="btn-ghost text-sm"
        style={{ opacity: busy ? 0.6 : 1 }}
      >
        <Sparkles size={14} /> {busy ? "Đang kích hoạt…" : "Dùng thử Studio 1 ngày"}
      </button>
      {msg && <p className="text-xs" style={{ color: msg.includes("Đã kích") ? "#3fb98a" : "#e0746f" }}>{msg}</p>}
    </div>
  );
}
