"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Image as ImageIcon, CheckSquare, ExternalLink, Settings2, Globe } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { thumbnailUrl } from "@/lib/drive";
import { createClient } from "@/lib/supabase/client";
import PlanUsage from "@/components/PlanUsage";
import StudioTrialButton from "@/components/StudioTrialButton";

interface AlbumRow {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  status: "draft" | "published";
  watermark_enabled: boolean;
  download_enabled: boolean;
  phase?: "selection" | "delivery";
  photos: { drive_file_id: string }[];
  selections: { count: number }[];
}

export default function AlbumList({ albums, showTrial = false, trialUsed = false }: { albums: AlbumRow[]; showTrial?: boolean; trialUsed?: boolean }) {
  const { t } = useLang();

  return (
    <div className="animate-fade-in">
      <PlanUsage />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-light text-accent">{t("myAlbums")}</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/site" className="btn-ghost">
            <Globe size={16} /> Website riêng
          </Link>
          <Link href="/dashboard/create" className="btn-primary">
            <Plus size={16} /> {t("newAlbum")}
          </Link>
        </div>
      </div>

      {showTrial && (
        <div className="mb-6 card p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderColor: "rgba(214,164,74,.4)", background: "rgba(214,164,74,.06)" }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "#d6a44a" }}>Trải nghiệm gói Studio miễn phí 1 ngày</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>Hợp đồng, lịch chụp, quản lý khách hàng và toàn bộ tính năng Studio trong 24 giờ.</p>
          </div>
          <div className="shrink-0">
            <StudioTrialButton used={trialUsed} />
          </div>
        </div>
      )}

      {albums.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <p className="text-accent-muted">{t("noAlbums")}</p>
          <Link href="/dashboard/create" className="btn-ghost mt-4">
            <Plus size={16} /> {t("newAlbum")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a) => (
            <AlbumCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlbumCard({ a }: { a: AlbumRow }) {
  const { t } = useLang();
  const supabase = createClient();
  const [menu, setMenu] = useState(false);
  const [status, setStatus] = useState(a.status);
  const [watermark, setWatermark] = useState(a.watermark_enabled);
  const [download, setDownload] = useState(a.download_enabled);
  const [phase, setPhase] = useState<"selection" | "delivery">(a.phase ?? "selection");

  const cover =
    a.cover_url || (a.photos?.[0]?.drive_file_id ? thumbnailUrl(a.photos[0].drive_file_id, 800) : null);

  async function patch(fields: Record<string, unknown>) {
    await supabase.from("albums").update(fields).eq("id", a.id);
  }

  return (
    <div className="card group relative overflow-hidden">
      {/* Cover → editor */}
      <Link href={`/dashboard/albums/${a.id}`} className="relative block aspect-[4/3] bg-ink-850">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={a.title} loading="lazy" decoding="async" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-600">
            <ImageIcon size={32} />
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            status === "published" ? "bg-emerald-500/20 text-emerald-300" : "bg-ink-700 text-accent-muted"
          }`}
        >
          {status === "published" ? t("published") : t("draft")}
        </span>
        <span
          className={`absolute right-3 top-3 rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            phase === "delivery" ? "bg-emerald-500/20 text-emerald-300" : "bg-accent-gold/20 text-accent-gold"
          }`}
        >
          {phase === "delivery" ? "Giao khách" : "Chọn ảnh"}
        </span>
      </Link>

      <div className="p-4">
        <h3 className="truncate font-medium text-accent">{a.title}</h3>
        <div className="mt-2 flex items-center gap-4 text-xs text-accent-muted">
          <span className="flex items-center gap-1">
            <ImageIcon size={13} /> {a.photos?.length ?? 0} {t("photos")}
          </span>
          <span className="flex items-center gap-1">
            <CheckSquare size={13} /> {a.selections?.[0]?.count ?? 0} {t("selections")}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Link href={`/dashboard/albums/${a.id}/selections`} className="btn-primary flex-1 py-1.5 text-xs">
            <CheckSquare size={13} /> {t("customerSelections")}
          </Link>
          <button onClick={() => setMenu((v) => !v)} className="btn-ghost py-1.5 text-xs" title="Bật/tắt nhanh">
            <Settings2 size={13} /> {t("edit")}
          </button>
          <Link href={`/a/${a.slug}`} target="_blank" className="btn-ghost py-1.5 text-xs">
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* Quick toggles */}
      {menu && (
        <div className="absolute inset-x-3 bottom-3 z-20 rounded-xl p-3 shadow-xl" style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
          <Toggle label="Đã xuất bản" on={status === "published"} onChange={(v) => { setStatus(v ? "published" : "draft"); patch({ status: v ? "published" : "draft" }); }} />
          <Toggle label="Giao khách (ảnh hoàn thiện)" on={phase === "delivery"} onChange={(v) => { const next = v ? "delivery" : "selection"; setPhase(next); patch({ phase: next }); }} />
          <Toggle label="Watermark" on={watermark} onChange={(v) => { setWatermark(v); patch({ watermark_enabled: v }); }} />
          <Toggle label="Cho tải xuống" on={download} onChange={(v) => { setDownload(v); patch({ download_enabled: v }); }} />
          <div className="mt-2 flex gap-2">
            <Link href={`/dashboard/albums/${a.id}`} className="btn-ghost flex-1 py-1.5 text-xs">Chỉnh sửa đầy đủ</Link>
            <button onClick={() => setMenu(false)} className="btn-ghost py-1.5 text-xs">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between py-1.5 text-sm text-accent">
      <span>{label}</span>
      <span className="relative h-[22px] w-[40px] flex-shrink-0 rounded-full transition-all" style={on ? { background: "var(--gold)" } : { background: "var(--surface)", border: "1px solid var(--border2)" }}>
        <span className="absolute top-[3px] h-4 w-4 rounded-full transition-all" style={on ? { left: "20px", background: "#0a0a0c" } : { left: "3px", background: "var(--text2)" }} />
      </span>
    </button>
  );
}
