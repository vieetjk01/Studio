import { ABOUT, BRAND, SERVICES, UI, tr, type Lang } from "@/lib/vieetjk/content";
import { bookingHref, type VjkData } from "@/lib/vieetjk/data";
import { Gallery } from "./parts";

function Arrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function VieetjkHome({ data, lang }: { data: VjkData; lang: Lang }) {
  const featured = data.albums.slice(0, 9);

  return (
    <>
      {/* Hero */}
      <section className="vjk-hero">
        <div className="vjk-wrap vjk-hero-in">
          <span className="vjk-eyebrow">{tr(lang, BRAND.tagline)}</span>
          <h1 className="vjk-serif">{tr(lang, BRAND.heroTitle)}</h1>
          <p>{tr(lang, BRAND.heroSub)}</p>
          <div className="vjk-btnrow">
            <a href="#dat-lich" className="vjk-cta">{tr(lang, UI.bookNow)}</a>
            <a href="#tac-pham" className="vjk-cta vjk-cta-ghost">{tr(lang, UI.ourWork)}</a>
          </div>
        </div>
      </section>

      {/* Đặt lịch — chọn 1 trong 3 dịch vụ */}
      <section className="vjk-section" id="dat-lich">
        <div className="vjk-wrap">
          <div style={{ maxWidth: 620, marginBottom: 40 }}>
            <span className="vjk-eyebrow">{tr(lang, UI.book)}</span>
            <h2 className="vjk-h2" style={{ marginTop: 12 }}>{tr(lang, UI.bookPickTitle)}</h2>
            <p className="vjk-lead" style={{ marginTop: 14 }}>{tr(lang, UI.bookPickLead)}</p>
          </div>
          <div className="vjk-bookpick">
            {SERVICES.map((s) => {
              const href = bookingHref(data.bookingToken, s.bookingListKey) || "#lien-he";
              return (
                <div className="vjk-bookcard" key={s.slug}>
                  <div className="bt">{tr(lang, s.title)}</div>
                  <div className="bd">{tr(lang, s.tagline)}</div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 4 }}>
                    <a href={href} className="bk">{tr(lang, UI.bookThis)} <Arrow /></a>
                    <a href={`/${s.slug}`} style={{ color: "var(--ink3)", fontSize: 13, fontWeight: 600 }}>{tr(lang, UI.viewService)}</a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Về Vieetjk */}
      <section className="vjk-section alt">
        <div className="vjk-wrap vjk-about">
          <div>
            <span className="vjk-eyebrow">{tr(lang, UI.aboutHeading)}</span>
            <h2 className="vjk-h2" style={{ marginTop: 12 }}>{tr(lang, UI.aboutTitle)}</h2>
            <p className="vjk-lead" style={{ marginTop: 16 }}>{tr(lang, ABOUT.body)}</p>
          </div>
          <div className="vjk-stats">
            {ABOUT.stats.map((st) => (
              <div className="vjk-stat" key={st.value}>
                <div className="n vjk-serif">{st.value}</div>
                <div className="l">{tr(lang, st.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio nổi bật */}
      <section className="vjk-section" id="tac-pham">
        <div className="vjk-wrap">
          <div style={{ maxWidth: 620, marginBottom: 40 }}>
            <span className="vjk-eyebrow">{tr(lang, UI.ourWork)}</span>
            <h2 className="vjk-h2" style={{ marginTop: 12 }}>{tr(lang, UI.homeWorkTitle)}</h2>
          </div>
          <Gallery albums={featured} lang={lang} />
        </div>
      </section>

      {/* CTA */}
      <section className="vjk-section tight">
        <div className="vjk-wrap">
          <div className="vjk-band">
            <h2 className="vjk-serif">{tr(lang, UI.ctaHomeTitle)}</h2>
            <p>{tr(lang, UI.ctaHomeSub)}</p>
            <div className="vjk-btnrow">
              <a href="#dat-lich" className="vjk-cta">{tr(lang, UI.bookNow)}</a>
              <a href="#lien-he" className="vjk-cta vjk-cta-ghost">{tr(lang, UI.contactInfo)}</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
