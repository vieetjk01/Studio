"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, Check, RotateCcw } from "lucide-react";
import {
  WEBAPP_V2_BANNER_HIDDEN_KEY,
  WEBAPP_V2_HIGHLIGHTS,
  WEBAPP_V2_LABEL,
  WEBAPP_V2_LEAD,
  requestWebappUi,
  webappV2Note,
  webappV2StageLabel,
  type WebappUi,
  type WebappV2Stage,
} from "@/lib/webapp-version";

/**
 * Bảng thông báo giao diện 2.0 ngay trên trang Tổng quan (bảng chính) — nơi
 * studio nhìn thấy đầu tiên mỗi ngày. Điểm nhấn số 1 là GIAO DIỆN, nên bảng
 * này nói thẳng vào việc đó thay vì liệt kê tính năng.
 *
 * Mặc định (cờ webapp_v2 = coming_soon) chỉ là THÔNG BÁO: nút chuyển bị vô
 * hiệu. Khi admin mở cờ beta/live thì chính bảng này chuyển được phiên bản.
 * Ẩn được (lưu localStorage) — nút ✨ trên thanh trên vẫn là cửa vào lâu dài.
 */
export default function WebappV2Banner({
  stage,
  ui,
  canSwitch,
}: {
  stage: WebappV2Stage;
  ui: WebappUi;
  canSwitch: boolean;
}) {
  // Chưa đọc localStorage thì chưa vẽ → tránh nháy bảng rồi biến mất.
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      setShow(window.localStorage.getItem(WEBAPP_V2_BANNER_HIDDEN_KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);

  function hide() {
    setShow(false);
    try {
      window.localStorage.setItem(WEBAPP_V2_BANNER_HIDDEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function switchTo(next: WebappUi) {
    setBusy(true);
    setErr(null);
    const problem = await requestWebappUi(next);
    if (problem) {
      setBusy(false);
      setErr(problem);
      return;
    }
    window.location.reload();
  }

  if (!show) return null;

  const onV2 = ui === "v2";

  return (
    <div
      className="mb-5 overflow-hidden rounded-2xl p-4 sm:p-5"
      style={{
        border: "1px solid var(--border)",
        background:
          "linear-gradient(105deg, var(--brandSoft, rgba(63,185,138,.14)) 0%, var(--surface) 62%)",
      }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl sm:h-12 sm:w-12"
          style={{ background: "var(--brand, var(--gold))", color: "var(--brandFg, #fff)" }}
        >
          <Sparkles size={22} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="font-serif text-lg font-medium sm:text-xl" style={{ color: "var(--text)" }}>
              {onV2 ? `Bạn đang dùng giao diện ${WEBAPP_V2_LABEL}` : `Giao diện mới mstudo ${WEBAPP_V2_LABEL}`}
            </h2>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: "var(--brandSoft, rgba(63,185,138,.14))", color: "var(--brand, var(--gold))" }}
            >
              {webappV2StageLabel(stage)}
            </span>
          </div>

          <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--text2)" }}>
            {WEBAPP_V2_LEAD}
          </p>

          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {WEBAPP_V2_HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-2 text-[12px]" style={{ color: "var(--text2)" }}>
                <Check size={13} className="mt-0.5 flex-none" style={{ color: "var(--brand, var(--gold))" }} />
                <span>{h}</span>
              </li>
            ))}
          </ul>

          {err && (
            <p className="mt-2 text-[12px] font-medium" style={{ color: "var(--s-red, var(--danger))" }}>
              {err}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canSwitch ? (
              <button onClick={() => switchTo(onV2 ? "v1" : "v2")} disabled={busy} className="btn-primary gap-2 text-[13px]">
                {onV2 ? <RotateCcw size={14} /> : <Sparkles size={14} />}
                {busy ? "Đang chuyển…" : onV2 ? "Trở về giao diện 1.0" : `Dùng giao diện ${WEBAPP_V2_LABEL}`}
              </button>
            ) : (
              <span
                className="rounded-xl px-3 py-2 text-[12px] font-semibold"
                style={{ background: "var(--surface2)", color: "var(--text3)" }}
                aria-disabled="true"
              >
                Sắp ra mắt · đang kiểm thử
              </span>
            )}
            <span className="text-[11px]" style={{ color: "var(--text3)" }}>
              {webappV2Note(stage)}
            </span>
          </div>
        </div>

        <button
          onClick={hide}
          className="-mr-1 -mt-1 flex-none rounded-lg p-1.5 transition-colors hover:bg-[var(--surface2)]"
          style={{ color: "var(--text3)" }}
          aria-label="Ẩn thông báo"
          title="Ẩn thông báo (vẫn xem lại được ở nút ✨ trên thanh trên)"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
