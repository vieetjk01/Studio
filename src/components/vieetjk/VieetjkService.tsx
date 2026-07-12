import type { ServiceContent } from "@/lib/vieetjk/content";
import {
  albumsForCategories,
  bookingHref,
  priceItemsForLists,
  type VjkData,
} from "@/lib/vieetjk/data";
import { Gallery, PriceList, PriceTiers } from "./parts";

export default function VieetjkService({
  service,
  data,
}: {
  service: ServiceContent;
  data: VjkData;
}) {
  const book = bookingHref(data.bookingToken);
  const albums = albumsForCategories(data.albums, service.categories);
  const priceItems =
    service.priceSource === "pricelist"
      ? priceItemsForLists(data.priceByList, service.priceListKeys ?? [])
      : [];

  return (
    <>
      {/* Header dịch vụ */}
      <section className="vjk-shead">
        <div className="vjk-wrap">
          <div className="vjk-crumb">
            <a href="/">Trang chủ</a> &nbsp;/&nbsp; {service.title}
          </div>
          <span className="vjk-eyebrow" style={{ display: "block", marginTop: 18 }}>{service.tagline}</span>
          <h1 className="vjk-serif">{service.title}</h1>
          <p>{service.intro}</p>
          <div className="vjk-btnrow" style={{ marginTop: 28 }}>
            {book && <a href={book} className="vjk-cta">Đặt lịch dịch vụ này</a>}
            <a href="#bang-gia" className="vjk-cta vjk-cta-ghost">Xem bảng giá</a>
          </div>
        </div>
      </section>

      {/* Sản phẩm / portfolio */}
      <section className="vjk-section">
        <div className="vjk-wrap">
          <div style={{ maxWidth: 620, marginBottom: 40 }}>
            <span className="vjk-eyebrow">Sản phẩm</span>
            <h2 className="vjk-h2" style={{ marginTop: 12 }}>Một số dự án {service.title.toLowerCase()}</h2>
          </div>
          <Gallery
            albums={albums}
            emptyHint={`Sản phẩm ${service.title.toLowerCase()} đang được cập nhật. Liên hệ Vieetjk để xem thêm sản phẩm nhé!`}
          />
        </div>
      </section>

      {/* Bảng giá */}
      <section className="vjk-section alt" id="bang-gia">
        <div className="vjk-wrap">
          <div style={{ maxWidth: 620, marginBottom: 40 }}>
            <span className="vjk-eyebrow">Bảng giá</span>
            <h2 className="vjk-h2" style={{ marginTop: 12 }}>Chi phí dịch vụ {service.title.toLowerCase()}</h2>
          </div>
          {service.priceSource === "pricelist" ? (
            <PriceList items={priceItems} />
          ) : (
            <PriceTiers tiers={service.priceTiers ?? []} />
          )}
          {service.priceNote && <div className="vjk-note">{service.priceNote}</div>}
        </div>
      </section>

      {/* CTA */}
      <section className="vjk-section tight">
        <div className="vjk-wrap">
          <div className="vjk-band">
            <h2 className="vjk-serif">Quan tâm dịch vụ {service.title.toLowerCase()}?</h2>
            <p>Đặt lịch hoặc liên hệ Vieetjk để nhận tư vấn và báo giá chi tiết theo nhu cầu của bạn.</p>
            <div className="vjk-btnrow">
              {book && <a href={book} className="vjk-cta">Đặt lịch ngay</a>}
              <a href="/#lien-he" className="vjk-cta vjk-cta-ghost">Thông tin liên hệ</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
