import Link from "next/link";
import { Plus, Calendar, ExternalLink, Image as ImageIcon, Pin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { thumbnailUrl } from "@/lib/drive";
import { GALLERY_CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

function catLabel(cat: string | null, custom: string | null) {
  if (cat === "khac" && custom) return custom;
  return GALLERY_CATEGORIES.find((c) => c.value === cat)?.label ?? "Khác";
}

export default async function GalleriesPage() {
  const supabase = createClient();
  const { data: galleries } = await supabase
    .from("albums")
    .select("*, photos(drive_file_id)")
    .eq("is_gallery", true)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const list = galleries ?? [];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1.5">Giao khách</p>
          <h1 className="font-serif text-3xl font-medium">Gallery khách</h1>
        </div>
        <Link href="/dashboard/galleries/new" className="btn-primary">
          <Plus size={16} /> Tạo gallery
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <p style={{ color: "var(--text2)" }}>Chưa có gallery nào.</p>
          <Link href="/dashboard/galleries/new" className="btn-ghost mt-4">
            <Plus size={16} /> Tạo gallery
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((g) => {
            const cover =
              g.cover_url ||
              (g.photos?.[0]?.drive_file_id ? thumbnailUrl(g.photos[0].drive_file_id, 800) : null);
            return (
              <div key={g.id} className="card group overflow-hidden">
                <div className="relative aspect-[4/3] bg-ink-850">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={g.title} className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-600">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  {g.gallery_pinned && (
                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--gold)", color: "#1a1205" }}>
                      <Pin size={11} /> Trang chủ
                    </span>
                  )}
                  <span
                    className="absolute left-3 top-3 rounded px-2 py-0.5 text-[10px] uppercase tracking-wide"
                    style={g.status === "published" ? { background: "rgba(16,185,129,.2)", color: "#6ee7b7" } : { background: "var(--surface2)", color: "var(--text2)" }}
                  >
                    {g.status === "published" ? "Đã xuất bản" : "Nháp"}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="truncate font-medium">{g.title}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text2)" }}>
                    <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "var(--surface2)" }}>
                      {catLabel(g.category, g.category_label)}
                    </span>
                    {g.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {new Date(g.event_date).toLocaleDateString("vi-VN")}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ImageIcon size={12} /> {g.photos?.length ?? 0}
                    </span>
                  </div>
                  {g.client_name && (
                    <p className="mt-1 truncate text-xs" style={{ color: "var(--text3)" }}>
                      KH: {g.client_name}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <Link href={`/dashboard/galleries/${g.id}`} className="btn-ghost flex-1 py-1.5 text-xs">
                      Sửa
                    </Link>
                    <Link href={`/album/${g.slug}`} target="_blank" className="btn-ghost py-1.5 text-xs">
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
