import { ABOUT, BRAND, SERVICES } from "@/lib/vieetjk/content";
import { albumsForCategories, bookingHref, type VjkData } from "@/lib/vieetjk/data";
import { Gallery } from "./parts";

function Arrow() {
  return (
    <svg className="arw" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function VieetjkHome({ data }: { data: VjkData }) {
  const book = bookingHref(data.bookingToken);
  const featured = data.albums.slice(0, 9);

  return (
    <>
      {/* Hero */}
      <section className="vjk-hero">
        <div className="vjk-wrap vjk-hero-in">
          <span className="vjk-eyebrow">{BRAND.tagline}</span>
          <h1 className="vjk-serif">{BRAND.heroTitle}</h1>
          <p>{BRAND.heroSub}</p>
          <div className="vjk-btnrow">
            {book && <a href={book} className="vjk-cta">Đặt lịch ngay</a>}
            <a href="#dich-vu" className="vjk-cta vjk-cta-ghost">Khám phá dịch vụ</a>
          </div>
        </div>
      </section>

      {/* Dịch vụ */}
      <section className="vjk-section" id="dich-vu">
        <div className="vjk-wrap">
          <div style={{ maxWidth: 620, marginBottom: 44 }}>
            <span className="vjk-eyebrow">Dịch vụ của chúng tôi</span>
            <h2 className="vjk-h2" style={{ marginTop: 12 }}>Ba mảng dịch vụ chính</h2>
            <p className="vjk-lead" style={{ marginTop: 14 }}>
              Chọn dịch vụ phù hợp để xem chi tiết, sản phẩm và bảng giá riêng của từng mảng.
            </p>
          </div>
          <div className="vjk-grid3">
            {SERVICES.map((s) => {
              const cover = albumsForCategories(data.albums, s.categories)[0]?.cover_url ?? null;
              return (
                <a key={s.slug} href={`/${s.slug}`} className="vjk-scard">
                  <div className="vjk-scard-media">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={s.title} loading="lazy" />
                    ) : (
                      <div className="vjk-scard-ph">Đang cập nhật</div>
                    )}
                  </div>
                  <div className="vjk-scard-body">
                    <span className="tag">{s.tagline}</span>
                    <h3 className="vjk-serif">{s.title}</h3>
                    <p>{s.cardDesc}</p>
                    <span className="vjk-scard-link">Xem chi tiết <Arrow /></span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Về Vieetjk */}
      <section className="vjk-section alt">
        <div className="vjk-wrap vjk-about">
          <div>
            <span className="vjk-eyebrow">{ABOUT.heading}</span>
            <h2 className="vjk-h2" style={{ marginTop: 12 }}>Kể câu chuyện của bạn bằng hình ảnh</h2>
            <p className="vjk-lead" style={{ marginTop: 16 }}>{ABOUT.body}</p>
          </div>
          <div className="vjk-stats">
            {ABOUT.stats.map((st) => (
              <div className="vjk-stat" key={st.label}>
                <div className="n vjk-serif">{st.value}</div>
                <div className="l">{st.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio nổi bật */}
      <section className="vjk-section">
        <div className="vjk-wrap">
          <div style={{ maxWidth: 620, marginBottom: 40 }}>
            <span className="vjk-eyebrow">Sản phẩm</span>
            <h2 className="vjk-h2" style={{ marginTop: 12 }}>Khoảnh khắc chúng tôi đã lưu giữ</h2>
          </div>
          <Gallery albums={featured} emptyHint="Bộ sưu tập đang được cập nhật. Ghé lại sớm để xem sản phẩm mới nhất của Vieetjk nhé!" />
        </div>
      </section>

      {/* CTA */}
      <section className="vjk-section tight">
        <div className="vjk-wrap">
          <div className="vjk-band">
            <h2 className="vjk-serif">Sẵn sàng lưu giữ khoảnh khắc của bạn?</h2>
            <p>Liên hệ Vieetjk để được tư vấn gói dịch vụ phù hợp và nhận báo giá chi tiết.</p>
            <div className="vjk-btnrow">
              {book && <a href={book} className="vjk-cta">Đặt lịch ngay</a>}
              <a href="#lien-he" className="vjk-cta vjk-cta-ghost">Thông tin liên hệ</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
