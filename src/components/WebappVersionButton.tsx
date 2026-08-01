"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, Check, RotateCcw } from "lucide-react";
import {
  WEBAPP_V2_HEADLINE,
  WEBAPP_V2_HIGHLIGHTS,
  WEBAPP_V2_LABEL,
  WEBAPP_V2_SEEN_KEY,
  webappV2Note,
  webappV2StageLabel,
  type WebappUi,
  type WebappV2Stage,
} from "@/lib/webapp-version";

/** Sự kiện nội bộ: đã xem thông báo → mọi nút đang hiển thị cùng tắt chấm đỏ. */
const SEEN_EVENT = "mstudo:v2-teaser-seen";

/**
 * Nút thông báo "sắp có giao diện 2.0" — và cũng là nút CHUYỂN phiên bản khi
 * admin đã bật cờ `webapp_v2` (beta/live) trong Cài đặt hệ thống.
 *
 * Ở trạng thái mặc định (coming_soon) nút CHỈ báo tin: bảng thông báo hiện danh
 * sách điểm mới, còn nút chuyển bị vô hiệu kèm ghi chú "đang kiểm thử". Không
 * có gì trong giao diện hiện tại bị thay đổi.
 *
 * variant="icon" → nút vuông trên thanh topbar (desktop).
 * variant="row"  → hàng đầy chiều ngang trong ngăn kéo/menu (điện thoại).
 */
export default function WebappVersionButton({
  stage,
  ui,
  canSwitch,
  variant = "icon",
}: {
  stage: WebappV2Stage;
  ui: WebappUi;
  canSwitch: boolean;
  variant?: "icon" | "row";
}) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(true); // mặc định coi như đã xem → không nháy chấm trước khi đọc localStorage
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSeen(window.localStorage.getItem(WEBAPP_V2_SEEN_KEY) === "1");
    } catch {
      setSeen(true);
    }
    // Trên điện thoại có 2 nút cùng tồn tại (topbar + ngăn kéo) → xem ở nút này
    // thì nút kia cũng phải tắt chấm đỏ, không đợi tải lại trang.
    const off = () => setSeen(true);
    window.addEventListener(SEEN_EVENT, off);
    return () => window.removeEventListener(SEEN_EVENT, off);
  }, []);

  function openPanel() {
    setOpen(true);
    setErr(null);
    if (!seen) {
      setSeen(true);
      try {
        window.localStorage.setItem(WEBAPP_V2_SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event(SEEN_EVENT));
    }
  }

  /** Ghi lựa chọn giao diện rồi tải lại trang để server dựng lại đúng phiên bản. */
  async function switchTo(next: WebappUi) {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/webapp-version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ui: next }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setBusy(false);
      setErr(res?.status === 403 ? "Giao diện 2.0 chưa mở cho tài khoản này." : "Không đổi được giao diện, thử lại sau.");
      return;
    }
    window.location.reload();
  }

  const onV2 = ui === "v2";
  const dot = !seen && !onV2;

  const panel = (
    <div
      className="rounded-2xl p-4 shadow-xl"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
          style={{ background: "var(--brandSoft, rgba(63,185,138,.14))", color: "var(--brand, var(--gold))" }}
        >
          <Sparkles size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
              mstudo {WEBAPP_V2_LABEL}
            </p>
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ background: "var(--brandSoft, rgba(63,185,138,.14))", color: "var(--brand, var(--gold))" }}
            >
              {webappV2StageLabel(stage)}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] font-medium" style={{ color: "var(--text2)" }}>
            {onV2 ? `Bạn đang dùng giao diện ${WEBAPP_V2_LABEL}` : WEBAPP_V2_HEADLINE}
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="-mr-1 -mt-1 shrink-0 rounded-md p-1 transition-colors hover:bg-[var(--surface2)]"
          style={{ color: "var(--text3)" }}
          aria-label="Đóng"
        >
          <X size={15} />
        </button>
      </div>

      <ul className="mt-3 grid gap-1.5">
        {WEBAPP_V2_HIGHLIGHTS.map((h) => (
          <li key={h} className="flex items-start gap-2 text-[12px]" style={{ color: "var(--text2)" }}>
            <Check size={13} className="mt-0.5 flex-none" style={{ color: "var(--brand, var(--gold))" }} />
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px]" style={{ color: "var(--text3)" }}>
        {webappV2Note(stage)}
      </p>

      {err && (
        <p className="mt-2 text-[11px] font-medium" style={{ color: "var(--s-red, var(--danger))" }}>
          {err}
        </p>
      )}

      {canSwitch ? (
        <button
          onClick={() => switchTo(onV2 ? "v1" : "v2")}
          disabled={busy}
          className="btn-primary mt-3 w-full justify-center gap-2 text-[13px]"
        >
          {onV2 ? <RotateCcw size={14} /> : <Sparkles size={14} />}
          {busy ? "Đang chuyển…" : onV2 ? "Trở về giao diện 1.0" : `Dùng giao diện ${WEBAPP_V2_LABEL}`}
        </button>
      ) : (
        <div
          className="mt-3 w-full rounded-xl px-3 py-2 text-center text-[12px] font-semibold"
          style={{ background: "var(--surface2)", color: "var(--text3)", cursor: "not-allowed" }}
          aria-disabled="true"
        >
          Sắp ra mắt · đang kiểm thử
        </div>
      )}
    </div>
  );

  if (variant === "row") {
    return (
      <>
        <button
          onClick={openPanel}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
          style={{ background: "var(--brandSoft, rgba(63,185,138,.14))", color: "var(--brand, var(--gold))" }}
        >
          <Sparkles size={18} style={{ flex: "none" }} />
          <span className="flex-1 text-left">
            {onV2 ? `Đang dùng giao diện ${WEBAPP_V2_LABEL}` : `Giao diện ${WEBAPP_V2_LABEL} mới`}
          </span>
          {dot && (
            <span className="h-2 w-2 flex-none rounded-full" style={{ background: "var(--s-red, var(--danger))" }} />
          )}
        </button>
        {open && (
          <>
            <div
              className="fixed inset-0 z-[95]"
              style={{ background: "rgba(0,0,0,.5)" }}
              onClick={() => setOpen(false)}
            />
            <div className="fixed inset-x-4 top-1/2 z-[96] -translate-y-1/2">
              <div className="mx-auto w-full max-w-sm animate-[vkFade_.25s_ease_both]">{panel}</div>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={openPanel}
        aria-label={`Giao diện ${WEBAPP_V2_LABEL}`}
        title={onV2 ? `Đang dùng giao diện ${WEBAPP_V2_LABEL}` : WEBAPP_V2_HEADLINE}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
        style={{
          border: "1px solid var(--border)",
          background: onV2 || open ? "var(--brandSoft, rgba(63,185,138,.14))" : "var(--surface2)",
          color: onV2 || open ? "var(--brand, var(--gold))" : "var(--text)",
        }}
      >
        <Sparkles size={16} />
        {dot && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--s-red, var(--danger))", border: "2px solid var(--surface)" }}
          />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(88vw,320px)] animate-[vkFade_.2s_ease_both]">
            {panel}
          </div>
        </>
      )}
    </div>
  );
}
