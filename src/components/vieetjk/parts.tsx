import type { VjkAlbum, VjkPriceItem } from "@/lib/vieetjk/data";
import type { PriceTier } from "@/lib/vieetjk/content";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

/** Lưới ảnh (masonry) từ album showcase; click mở album công khai /showcase/<slug>. */
export function Gallery({ albums, emptyHint }: { albums: VjkAlbum[]; emptyHint?: string }) {
  if (!albums.length) {
    return (
      <div className="vjk-empty">
        {emptyHint || "Bộ sưu tập đang được cập nhật. Vui lòng quay lại sau nhé!"}
      </div>
    );
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

/** Bảng giá lấy từ studio_pricelist — gom theo "category" (nhóm gói). */
export function PriceList({ items }: { items: VjkPriceItem[] }) {
  // Gom theo category, giữ thứ tự xuất hiện.
  const groups: { title: string; rows: VjkPriceItem[] }[] = [];
  for (const it of items) {
    const g = groups.find((x) => x.title === (it.category || ""));
    if (g) g.rows.push(it);
    else groups.push({ title: it.category || "Bảng giá", rows: [it] });
  }
  return (
    <div>
      {groups.map((g) => (
        <div className="vjk-pl-group" key={g.title}>
          <div className="vjk-pl-gtitle">{g.title}</div>
          <div className="vjk-pl-rows">
            {g.rows.map((r, i) => (
              <div className="vjk-pl-row" key={`${r.name}-${i}`}>
                <div>
                  <div className="nm">{r.name}</div>
                  {r.description && <div className="ds">{r.description}</div>}
                </div>
                {r.price > 0 && <div className="pr">{fmt(r.price)}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Bảng giá "báo giá riêng" dạng thẻ (sự kiện / doanh nghiệp). */
export function PriceTiers({ tiers }: { tiers: PriceTier[] }) {
  return (
    <div className="vjk-tiers">
      {tiers.map((t) => (
        <div className={`vjk-tier${t.featured ? " feat" : ""}`} key={t.name}>
          {t.featured && <span className="badge">Phổ biến</span>}
          <div>
            <div className="tn">{t.name}</div>
            <div className="tp">{t.price}</div>
          </div>
          <ul>
            {t.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
