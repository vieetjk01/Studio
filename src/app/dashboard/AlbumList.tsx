"use client";

import Link from "next/link";
import { Plus, Image as ImageIcon, CheckSquare, ExternalLink } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { thumbnailUrl } from "@/lib/drive";
import PlanUsage from "@/components/PlanUsage";

interface AlbumRow {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  status: "draft" | "published";
  photos: { drive_file_id: string }[];
  selections: { count: number }[];
}

export default function AlbumList({ albums }: { albums: AlbumRow[] }) {
  const { t } = useLang();

  return (
    <div className="animate-fade-in">
      <PlanUsage />
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-light text-accent">{t("myAlbums")}</h1>
        <Link href="/dashboard/create" className="btn-primary">
          <Plus size={16} /> {t("newAlbum")}
        </Link>
      </div>

      {albums.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <p className="text-accent-muted">{t("noAlbums")}</p>
          <Link href="/dashboard/create" className="btn-ghost mt-4">
            <Plus size={16} /> {t("newAlbum")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a) => {
            const cover =
              a.cover_url ||
              (a.photos?.[0]?.drive_file_id
                ? thumbnailUrl(a.photos[0].drive_file_id, 800)
                : null);
            return (
            <div key={a.id} className="card group overflow-hidden">
              <div className="relative aspect-[4/3] bg-ink-850">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={a.title}
                    className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-600">
                    <ImageIcon size={32} />
                  </div>
                )}
                <span
                  className={`absolute left-3 top-3 rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    a.status === "published"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-ink-700 text-accent-muted"
                  }`}
                >
                  {a.status === "published" ? t("published") : t("draft")}
                </span>
              </div>
              <div className="p-4">
                <h3 className="truncate font-medium text-accent">{a.title}</h3>
                <div className="mt-2 flex items-center gap-4 text-xs text-accent-muted">
                  <span className="flex items-center gap-1">
                    <ImageIcon size={13} /> {a.photos?.length ?? 0} {t("photos")}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckSquare size={13} /> {a.selections?.[0]?.count ?? 0}{" "}
                    {t("selections")}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/dashboard/albums/${a.id}/selections`}
                    className="btn-primary flex-1 py-1.5 text-xs"
                  >
                    <CheckSquare size={13} /> {t("customerSelections")}
                  </Link>
                  <Link
                    href={`/dashboard/albums/${a.id}`}
                    className="btn-ghost py-1.5 text-xs"
                  >
                    {t("edit")}
                  </Link>
                  <Link
                    href={`/a/${a.slug}`}
                    target="_blank"
                    className="btn-ghost py-1.5 text-xs"
                  >
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
