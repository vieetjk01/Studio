"use client";

import Link from "next/link";
import { FilePlus, Eye, Pencil, ExternalLink } from "lucide-react";
import { vnd, QUOTE_STATUS_LABEL, quoteSelectedTotal, type StudioQuote, type QuoteStatus } from "@/lib/types";
import { mainUrl } from "@/lib/hosts";

export type QuoteRow = StudioQuote & {
  quote_items: { qty: number; unit_price: number; selected: boolean; is_optional: boolean; is_discount: boolean }[];
  quote_adjustments: { id: string; resolved: boolean }[];
};

const STATUS_COLOR: Record<QuoteStatus, string> = {
  draft: "var(--text3)",
  sent: "#60a5fa",
  viewed: "#a78bfa",
  adjust_requested: "#f59e0b",
  accepted: "#34d399",
  converted: "#10b981",
  expired: "var(--text3)",
  cancelled: "var(--text3)",
};

export default function QuotesListView({ list }: { list: QuoteRow[] }) {
  return (
    <div className="space-y-6" data-testid="quotes-list-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-medium">Báo giá khách hàng</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
            Tạo báo giá → gửi link cho khách → khách chọn hạng mục → tự tạo hợp đồng khi đồng ý.
          </p>
        </div>
        <Link href="/dashboard/studio/quotes/new" className="btn-primary" data-testid="quote-new-btn">
          <FilePlus size={16} /> Tạo báo giá mới
        </Link>
      </header>

      {list.length === 0 ? (
        <div className="card p-10 text-center">
          <p style={{ color: "var(--text2)" }}>Chưa có báo giá nào. Bấm <b>“Tạo báo giá mới”</b> để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map((q) => {
            const total = quoteSelectedTotal(q.quote_items || []);
            const pendingAdj = (q.quote_adjustments || []).filter((a) => !a.resolved).length;
            return (
              <div key={q.id} className="card p-5" data-testid={`quote-row-${q.id}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
                      <span>{q.code || "—"}</span>
                      <span>•</span>
                      <span style={{ color: STATUS_COLOR[q.status] }}>{QUOTE_STATUS_LABEL[q.status]}</span>
                      {pendingAdj > 0 && (
                        <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "#f59e0b22", color: "#f59e0b" }}>
                          {pendingAdj} yêu cầu chỉnh
                        </span>
                      )}
                    </div>
                    <h3 className="mt-0.5 truncate text-base font-medium">{q.title}</h3>
                    <p className="mt-0.5 truncate text-sm" style={{ color: "var(--text2)" }}>
                      {q.client_name || "Chưa có tên khách"} {q.client_phone ? `• ${q.client_phone}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-accent">{vnd(total)}</p>
                    <p className="text-xs" style={{ color: "var(--text3)" }}>
                      {(q.quote_items || []).length} hạng mục
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <Link href={`/dashboard/studio/quotes/${q.id}`} className="btn-ghost px-2.5 py-1.5" data-testid={`quote-edit-${q.id}`}>
                    <Pencil size={12} /> Chỉnh sửa
                  </Link>
                  <a
                    href={mainUrl(`/q/${q.client_token}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost px-2.5 py-1.5"
                    data-testid={`quote-view-public-${q.id}`}
                  >
                    <Eye size={12} /> Xem trang khách
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
