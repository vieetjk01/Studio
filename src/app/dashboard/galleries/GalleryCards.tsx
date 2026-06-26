"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, ExternalLink, Image as ImageIcon, Pin, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mainUrl } from "@/lib/hosts";
import ShareButton from "@/components/ShareButton";
import { thumbnailUrl } from "@/lib/drive";

export interface GalleryRow {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  status: "draft" | "published";
  gallery_pinned: boolean;
  download_enabled: boolean;
  category: string | null;
  category_label: string | null;
  client_name: string | null;
  event_date: string | null;
  photos: { drive_file_id: string }[];
}

function catLabel(cat: string | null, custom: string | null) {
  return cat?.trim() || custom?.trim() || "Khác";
}

export default function GalleryCards({ galleries }: { galleries: GalleryRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {galleries.map((g) => (
        <Card key={g.id} g={g} />
      ))}
    </div>
  );
}

function Card({ g }: { g: GalleryRow }) {
  const supabase = createClient();
  const [menu, setMenu] = useState(false);
  const [status, setStatus] = useState(g.status);
  const [pinned, setPinned] = useState(g.gallery_pinned);
  const [download, setDownload] = useState(g.download_enabled);

  const cover = g.cover_url || (g.photos?.[0]?.drive_file_id ? thumbnailUrl(g.photos[0].drive_file_id, 800) : null);

  async function patch(fields: Record<string, unknown>) {
    await supabase.from("albums").update(fields).eq("id", g.id);
  }

  return (
    <div className="card group relative overflow-hidden">
      <Link href={`/dashboard/galleries/${g.id}`} className="relative block aspect-[4/3] bg-ink-850">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={g.title} className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-600">
            <ImageIcon size={32} />
          </div>
        )}
        {pinned && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--gold)", color: "#1a1205" }}>
            <Pin size={11} /> Trang chủ
          </span>
        )}
        <span
          className="absolute left-3 top-3 rounded px-2 py-0.5 text-[10px] uppercase tracking-wide"
          style={status === "published" ? { background: "rgba(16,185,129,.2)", color: "#6ee7b7" } : { background: "var(--surface2)", color: "var(--text2)" }}
        >
          {status === "published" ? "Đã xuất bản" : "Nháp"}
        </span>
      </Link>

      <div className="p-4">
        <h3 className="truncate font-medium">{g.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text2)" }}>
          <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "var(--surface2)" }}>{catLabel(g.category, g.category_label)}</span>
          {g.event_date && (
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {new Date(g.event_date).toLocaleDateString("vi-VN")}
            </span>
          )}
          <span className="flex items-center gap-1"><ImageIcon size={12} /> {g.photos?.length ?? 0}</span>
        </div>
        {g.client_name && <p className="mt-1 truncate text-xs" style={{ color: "var(--text3)" }}>KH: {g.client_name}</p>}
        <div className="mt-4 flex items-center gap-2">
          <Link href={`/dashboard/galleries/${g.id}`} className="btn-primary flex-1 py-1.5 text-xs">Mở album</Link>
          <button onClick={() => setMenu((v) => !v)} className="btn-ghost py-1.5 text-xs" title="Bật/tắt nhanh">
            <Settings2 size={13} /> Sửa
          </button>
          <ShareButton path={mainUrl(`/album/${g.slug}`)} title={g.title} label="" className="btn-ghost py-1.5 text-xs" compact />
          <Link href={`/album/${g.slug}`} target="_blank" className="btn-ghost py-1.5 text-xs">
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {menu && (
        <div className="absolute inset-x-3 bottom-3 z-20 rounded-xl p-3 shadow-xl" style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
          <Toggle label="Đã xuất bản" on={status === "published"} onChange={(v) => { setStatus(v ? "published" : "draft"); patch({ status: v ? "published" : "draft" }); }} />
          <Toggle label="Ghim trang chủ" on={pinned} onChange={(v) => { setPinned(v); patch({ gallery_pinned: v }); }} />
          <Toggle label="Cho tải xuống" on={download} onChange={(v) => { setDownload(v); patch({ download_enabled: v }); }} />
          <div className="mt-2 flex gap-2">
            <Link href={`/dashboard/galleries/${g.id}`} className="btn-ghost flex-1 py-1.5 text-xs">Chỉnh sửa đầy đủ</Link>
            <button onClick={() => setMenu(false)} className="btn-ghost py-1.5 text-xs">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between py-1.5 text-sm">
      <span>{label}</span>
      <span className="relative h-[22px] w-[40px] flex-shrink-0 rounded-full transition-all" style={on ? { background: "var(--gold)" } : { background: "var(--surface)", border: "1px solid var(--border2)" }}>
        <span className="absolute top-[3px] h-4 w-4 rounded-full transition-all" style={on ? { left: "20px", background: "#0a0a0c" } : { left: "3px", background: "var(--text2)" }} />
      </span>
    </button>
  );
}
