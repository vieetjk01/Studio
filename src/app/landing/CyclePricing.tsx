"use client";

import { useState, type ReactNode } from "react";

/**
 * Island nhỏ cho khối bảng giá: giữ state chu kỳ tháng/năm và phát nó ra DOM
 * qua thuộc tính `data-cycle`. Các thẻ giá là CHILDREN đã render sẵn trên
 * server (chứa cả hai biến thể giá); CSS ẩn/hiện theo data-cycle — nhờ vậy
 * toàn bộ nội dung bảng giá không phải ship thành JS.
 */
export default function CyclePricing({
  monthLabel,
  yearLabel,
  children,
}: {
  monthLabel: string;
  yearLabel: string;
  children: ReactNode;
}) {
  const [cycle, setCycle] = useState<"month" | "year">("month");
  return (
    <div data-cycle={cycle}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
        <div style={{ display: "inline-flex", gap: 4, padding: 4, border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 999 }}>
          {(["month", "year"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              style={{
                border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5,
                padding: "8px 20px", borderRadius: 999,
                background: cycle === c ? "var(--accent)" : "transparent",
                color: cycle === c ? "var(--accentFg)" : "var(--muted)",
              }}
            >
              {c === "month" ? monthLabel : yearLabel}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
