"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Calendar, Lock, Pin } from "lucide-react";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { GALLERY_CATEGORIES } from "@/lib/types";

export interface GalleryCard {
  slug: string;
  title: string;
  client_name: string | null;
  event_date: string | null;
  category: string | null;
  category_label: string | null;
  cover_url: string | null;
  gallery_pinned: boolean;
}

const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

function catLabel(cat: string | null, custom: string | null) {
  if (cat === "khac" && custom) return custom;
  return GALLERY_CATEGORIES.find((c) => c.value === cat)?.label ?? "Khác";
}
function periodKey(d: string | null) {
  if (!d) return "Khác";
  const dt = new Date(d);
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

export default function AlbumBrowse({ galleries }: { galleries: GalleryCard[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GalleryCard[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [cat, setCat] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const PER_MONTH = 4;

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/album/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data.galleries ?? []);
    setSearching(false);
  }

  const base = results ?? galleries;
  const shown = useMemo(
    () => (cat === "all" ? base : base.filter((g) => g.category === cat)),
    [base, cat]
  );

  // Group by month/year (only when not searching).
  const groups = useMemo(() => {
    if (results) return null;
    const map = new Map<string, GalleryCard[]>();
    for (const g of shown) {
      const k = periodKey(g.event_date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(g);
    }
    return [...map.entries()];
  }, [shown, results]);

  return (
    <main className="min-h-screen pb-24">
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3.5 md:px-10"
        style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}
      >
        <Brand />
        <div className="flex items-center gap-3">
          <Link href="/#dat-lich" className="btn-ghost px-4 py-2 text-[13.5px]">Đặt lịch</Link>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-6 pt-8 md:px-10">
        <p className="eyebrow mb-1.5">Bộ sưu tập</p>
        <h1 className="font-serif text-[clamp(30px,5vw,52px)] font-medium leading-none">Album khách hàng</h1>
        <p className="mt-3 text-[14.5px]" style={{ color: "var(--text2)" }}>
          Tìm album theo tên hoặc số điện thoại. Mở album cần nhập mật khẩu là <b style={{ color: "var(--text)" }}>số điện thoại</b> của khách.
        </p>

        <form onSubmit={runSearch} className="mt-6 flex max-w-md gap-2.5">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tên album hoặc số điện thoại…" className="input pl-[42px]" />
          </div>
          <button className="btn-primary whitespace-nowrap">{searching ? "Đang tìm…" : "Tìm"}</button>
          {results && (
            <button type="button" onClick={() => { setResults(null); setQuery(""); }} className="btn-ghost whitespace-nowrap">Xóa</button>
          )}
        </form>

        {/* Category filter */}
        <div className="mt-5 flex flex-wrap gap-2">
          <CatTab active={cat === "all"} onClick={() => setCat("all")}>Tất cả</CatTab>
          {GALLERY_CATEGORIES.map((c) => (
            <CatTab key={c.value} active={cat === c.value} onClick={() => setCat(c.value)}>{c.label}</CatTab>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="py-20 text-center text-sm" style={{ color: "var(--text3)" }}>
            {results ? "Không tìm thấy album phù hợp." : "Chưa có album nào."}
          </p>
        ) : results ? (
          <div className="mt-8">
            <Grid items={shown} />
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {groups!.map(([period, items]) => {
              const isOpen = expanded[period];
              const visible = isOpen ? items : items.slice(0, PER_MONTH);
              return (
                <section key={period}>
                  <h2 className="mb-4 font-serif text-2xl font-medium">{period}</h2>
                  <Grid items={visible} />
                  {items.length > PER_MONTH && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setExpanded((e) => ({ ...e, [period]: !isOpen }))}
                        className="btn-ghost"
                      >
                        {isOpen ? "Thu gọn" : `Xem thêm (${items.length - PER_MONTH})`}
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function CatTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-1.5 text-[13px] transition-colors"
      style={active ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
    >
      {children}
    </button>
  );
}

function Grid({ items }: { items: GalleryCard[] }) {
  return (
    <div className="grid gap-[clamp(14px,2vw,20px)] [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
      {items.map((g) => (
        <Link
          key={g.slug}
          href={`/album/${g.slug}`}
          className="group relative overflow-hidden rounded-xl animate-[vkFade_.5s_ease_both]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="relative aspect-[4/5] overflow-hidden">
            {g.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.cover_url} alt={g.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0" style={{ background: "var(--surface2)" }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.82) 0%, rgba(0,0,0,0) 55%)" }} />
            <span className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "rgba(10,10,12,.6)", color: "#fff", backdropFilter: "blur(6px)" }}>
              {catLabel(g.category, g.category_label)}
            </span>
            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "rgba(10,10,12,.6)", color: "#fff", backdropFilter: "blur(6px)" }}>
              {g.gallery_pinned ? <Pin size={12} /> : <Lock size={12} />}
            </span>
            <div className="absolute inset-x-3 bottom-3">
              <h3 className="font-serif text-xl font-medium leading-tight text-white">{g.title}</h3>
              {g.event_date && (
                <p className="mt-0.5 flex items-center gap-1 text-[11.5px]" style={{ color: "rgba(255,255,255,.7)" }}>
                  <Calendar size={11} /> {new Date(g.event_date).toLocaleDateString("vi-VN")}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
