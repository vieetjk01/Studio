import type { VjkAlbum } from "@/lib/vieetjk/data";
import { UI, tr, type Lang, type PriceTier, type InfoItem } from "@/lib/vieetjk/content";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

/** Lưới ảnh (masonry) từ album showcase; click mở album công khai /album/<slug>. */
export function Gallery({ albums, lang, emptyHint }: { albums: VjkAlbum[]; lang: Lang; emptyHint?: string }) {
  if (!albums.length) {
    return <div className="vjk-empty">{emptyHint || tr(lang, UI.galleryEmpty)}</div>;
  }
  return (
    <div className="vjk-gal">
      {albums.map((a) => (
        <a key={a.id} href={`/album/${a.slug}`} className="vjk-gal-item" title={a.title}>
          {a.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.cover_url} alt={a.title} loading="lazy" />
          ) : (
            <div className="vjk-scard-ph" style={{ aspectRatio: "4 / 3" }} />
          )}
          <span className="vjk-gal-cap">{a.title}</span>
        </a>
      ))}
    </div>
  );
}

export type WeddingCard = { label: string; note: string; price: number | null };
export type WeddingRow = { title: string; cards: WeddingCard[] };

/** Bảng giá cưới gọn: mỗi hàng (Cưới / Đính hôn) là 1 dải ô gói chính. */
export function WeddingPackages({ rows, lang }: { rows: WeddingRow[]; lang: Lang }) {
  return (
    <div>
      {rows.map((row) => (
        <div className="vjk-wrow" key={row.title}>
          <div className="vjk-wrow-h">{row.title}</div>
          <div className="vjk-wgrid">
            {row.cards.map((c, i) => (
              <div className="vjk-wcard" key={`${c.label}-${i}`}>
                <div className="wl">{c.label}</div>
                <div className="wn">{c.note}</div>
                <div className="wp">{c.price != null ? fmt(c.price) : tr(lang, UI.contactPrice)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Bảng giá "báo giá riêng" dạng thẻ (sự kiện / doanh nghiệp). */
export function PriceTiers({ tiers, lang }: { tiers: PriceTier[]; lang: Lang }) {
  return (
    <div className="vjk-tiers">
      {tiers.map((t) => (
        <div className={`vjk-tier${t.featured ? " feat" : ""}`} key={tr(lang, t.name)}>
          {t.featured && <span className="badge">{lang === "vi" ? "Phổ biến" : "Popular"}</span>}
          <div>
            <div className="tn">{tr(lang, t.name)}</div>
            <div className="tp">{tr(lang, t.price)}</div>
          </div>
          <ul>
            {t.items.map((it) => (
              <li key={tr(lang, it)}>{tr(lang, it)}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Lưới thẻ giới thiệu (loại sự kiện / dịch vụ doanh nghiệp). */
export function InfoGrid({ items, lang }: { items: InfoItem[]; lang: Lang }) {
  return (
    <div className="vjk-info">
      {items.map((it) => (
        <div className="vjk-infocard" key={tr(lang, it.label)}>
          <h4>{tr(lang, it.label)}</h4>
          <p>{tr(lang, it.desc)}</p>
        </div>
      ))}
    </div>
  );
}

/** Quy trình đánh số (đúng nghĩa là một trình tự). */
export function ProcessSteps({ steps, lang }: { steps: InfoItem[]; lang: Lang }) {
  return (
    <div className="vjk-steps">
      {steps.map((s) => (
        <div className="vjk-step" key={tr(lang, s.label)}>
          <h4>{tr(lang, s.label)}</h4>
          <p>{tr(lang, s.desc)}</p>
        </div>
      ))}
    </div>
  );
}

/** Dải "vì sao chọn" (doanh nghiệp). */
export function WhyUs({ items, lang }: { items: InfoItem[]; lang: Lang }) {
  return (
    <div className="vjk-why">
      {items.map((it) => (
        <div key={tr(lang, it.label)}>
          <div className="n">{tr(lang, it.label)}</div>
          <p>{tr(lang, it.desc)}</p>
        </div>
      ))}
    </div>
  );
}
