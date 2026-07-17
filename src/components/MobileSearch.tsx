"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, X, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Hit = { id: string; title: string; client_name: string | null; code: string | null };

/** Full-screen search overlay triggered by the search icon in the mobile topbar. */
export default function MobileSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
    else { setQ(""); setHits([]); }
  }, [open]);

  // Debounced search
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setSearching(false); return; }
    setSearching(true);
    const safe = term.replace(/[%,()]/g, " ");
    // `stale` chặn query cũ (chậm) đè kết quả của query mới khi gõ nhanh.
    let stale = false;
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("studio_contracts")
        .select("id, title, client_name, code")
        .or(`title.ilike.%${safe}%,client_name.ilike.%${safe}%,client_phone.ilike.%${safe}%,code.ilike.%${safe}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (stale) return;
      setHits((data ?? []) as Hit[]);
      setSearching(false);
    }, 250);
    return () => { stale = true; clearTimeout(t); };
  }, [q]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open]);

  return (
    <>
      {/* Icon button shown in topbar */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg sm:hidden"
        style={{ background: "var(--surface2)", color: "var(--text)" }}
        aria-label="Tìm kiếm"
      >
        <Search size={17} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col sm:hidden"
          style={{ background: "var(--bg)" }}
        >
          {/* Search bar row */}
          <div
            className="flex items-center gap-2 px-3 py-3 shrink-0"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <button
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--surface2)", color: "var(--text)" }}
              aria-label="Đóng tìm kiếm"
            >
              <ArrowLeft size={18} />
            </button>
            <div
              className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            >
              <Search size={15} style={{ color: "var(--text3)", flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm hợp đồng, khách hàng, mã…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text)" }}
              />
              {q && (
                <button onClick={() => setQ("")} style={{ color: "var(--text3)" }} aria-label="Xoá">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-3 pt-3">
            {q.trim().length < 2 ? (
              <p className="mt-8 text-center text-sm" style={{ color: "var(--text3)" }}>
                Nhập ít nhất 2 ký tự để tìm kiếm
              </p>
            ) : searching ? (
              <div className="space-y-2 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-14 rounded-xl" />
                ))}
              </div>
            ) : hits.length === 0 ? (
              <p className="mt-8 text-center text-sm" style={{ color: "var(--text3)" }}>
                Không tìm thấy hợp đồng nào.
              </p>
            ) : (
              <div className="space-y-1 pb-8">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                  {hits.length} kết quả
                </p>
                {hits.map((h) => (
                  <Link
                    key={h.id}
                    href={`/dashboard/studio/contracts/${h.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                      style={{ background: "var(--surface2)", color: "var(--brand)" }}
                    >
                      {(h.code || "HĐ").slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{h.title}</p>
                      <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                        {h.client_name || "—"}{h.code ? ` · ${h.code}` : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
