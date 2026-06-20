import { mainUrl } from "@/lib/hosts";
import { vnd, type Site, type SiteBlock } from "@/lib/types";

export type SiteData = {
  site: Site;
  blocks: SiteBlock[];
  owner: { full_name: string | null; pl_phone: string | null; pl_facebook: string | null; booking_token: string | null } | null;
  albums: { id: string; slug: string; title: string; cover_url: string | null }[];
  pricelist: { id: string; name: string; price: number; unit: string | null; category: string | null; description: string | null }[];
  feedback: { id: string; client_name: string | null; rating: number | null; content: string }[];
};

const str = (v: unknown, fallback = "") => (typeof v === "string" && v.trim() ? v : fallback);
const lines = (v: unknown) => str(v).split("\n").map((s) => s.trim()).filter(Boolean);

export default function SiteRenderer({ data }: { data: SiteData }) {
  const { site, blocks, owner } = data;
  const t = site.theme || {};
  const name = owner?.full_name || site.subdomain || "Studio";
  const fontVar = t.font === "sans" ? "var(--font-hanken)" : "var(--font-cormorant)";

  const wrap = {
    // Theme-driven tokens (configurable per tenant).
    "--s-bg": t.bg || "#0c0c0d",
    "--s-text": t.text || "#ececec",
    "--s-accent": t.accent || "#c7a76b",
    background: "var(--s-bg)",
    color: "var(--s-text)",
    minHeight: "100vh",
  } as React.CSSProperties;

  return (
    <div style={wrap}>
      {blocks.length === 0 ? (
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
          <div>
            <h1 style={{ fontFamily: fontVar, fontSize: 40 }}>{name}</h1>
            <p style={{ opacity: 0.6, marginTop: 8 }}>Trang đang được hoàn thiện.</p>
          </div>
        </div>
      ) : (
        blocks.map((b) => <Block key={b.id} block={b} data={data} fontVar={fontVar} />)
      )}

      <footer style={{ borderTop: "1px solid rgba(255,255,255,.1)", padding: "28px 24px", textAlign: "center", fontSize: 13, opacity: 0.55 }}>
        © {name}
        {site.template !== "studio-pro" && (
          <>
            {" · "}
            <a href={mainUrl("/")} style={{ color: "inherit" }}>Tạo bởi Vieetjk</a>
          </>
        )}
      </footer>
    </div>
  );
}

function Section({ children, fontVar, heading }: { children: React.ReactNode; fontVar: string; heading?: string }) {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
      {heading && <h2 style={{ fontFamily: fontVar, fontSize: 30, marginBottom: 24 }}>{heading}</h2>}
      {children}
    </section>
  );
}

function Block({ block, data, fontVar }: { block: SiteBlock; data: SiteData; fontVar: string }) {
  const c = block.config || {};
  const { owner, albums, pricelist, feedback } = data;
  const name = owner?.full_name || data.site.subdomain || "Studio";

  switch (block.type) {
    case "hero": {
      const img = str(c.image);
      return (
        <section
          style={{
            position: "relative",
            minHeight: "70vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 24,
            backgroundImage: img ? `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.55)), url(${img})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div>
            <h1 style={{ fontFamily: fontVar, fontSize: "clamp(36px,7vw,72px)", lineHeight: 1.05 }}>{str(c.heading, name)}</h1>
            {str(c.subheading) && <p style={{ marginTop: 14, fontSize: 18, opacity: 0.85 }}>{str(c.subheading)}</p>}
            {owner?.booking_token && (
              <a href={mainUrl(`/book/${owner.booking_token}`)} style={ctaStyle()}>Đặt lịch</a>
            )}
          </div>
        </section>
      );
    }
    case "about": {
      const img = str(c.image);
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Giới thiệu")}>
          <div style={{ display: "grid", gap: 28, gridTemplateColumns: img ? "1fr 1fr" : "1fr", alignItems: "center" }}>
            <div style={{ lineHeight: 1.7, opacity: 0.9 }}>
              {lines(c.text).map((p, i) => <p key={i} style={{ marginBottom: 12 }}>{p}</p>)}
            </div>
            {img && <img src={img} alt="" style={{ width: "100%", borderRadius: 14, objectFit: "cover" }} />}
          </div>
        </Section>
      );
    }
    case "gallery": {
      if (albums.length === 0) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Bộ sưu tập")}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" }}>
            {albums.map((a) => (
              <a key={a.id} href={mainUrl(`/album/${a.slug}`)} style={{ display: "block", color: "inherit" }}>
                <div style={{ aspectRatio: "4/3", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,.06)" }}>
                  {a.cover_url && <img src={a.cover_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <p style={{ marginTop: 8, fontSize: 14 }}>{a.title}</p>
              </a>
            ))}
          </div>
        </Section>
      );
    }
    case "pricing": {
      if (pricelist.length === 0) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Bảng giá")}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            {pricelist.map((p) => (
              <div key={p.id} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", padding: 20 }}>
                {p.category && <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6 }}>{p.category}</p>}
                <p style={{ fontFamily: fontVar, fontSize: 20, marginTop: 2 }}>{p.name}</p>
                <p style={{ fontFamily: fontVar, fontSize: 24, color: "var(--s-accent)", marginTop: 4 }}>{vnd(p.price)}{p.unit ? ` ${p.unit}` : ""}</p>
                {p.description && <ul style={{ marginTop: 10, paddingLeft: 16, fontSize: 13, opacity: 0.85 }}>{lines(p.description).map((l, i) => <li key={i}>{l}</li>)}</ul>}
              </div>
            ))}
          </div>
        </Section>
      );
    }
    case "testimonials": {
      if (feedback.length === 0) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Khách hàng nói gì")}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
            {feedback.map((f) => (
              <div key={f.id} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", padding: 20 }}>
                {f.rating ? <p style={{ color: "var(--s-accent)" }}>{"★".repeat(f.rating)}</p> : null}
                <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6, opacity: 0.9 }}>{f.content}</p>
                {f.client_name && <p style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>— {f.client_name}</p>}
              </div>
            ))}
          </div>
        </Section>
      );
    }
    case "contact": {
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Liên hệ")}>
          <div style={{ fontSize: 16, lineHeight: 2, opacity: 0.9 }}>
            {owner?.pl_phone && <p>Điện thoại: <b>{owner.pl_phone}</b></p>}
            {owner?.pl_facebook && <p>Facebook: {owner.pl_facebook}</p>}
            {str(c.email) && <p>Email: {str(c.email)}</p>}
            {str(c.address) && <p>Địa chỉ: {str(c.address)}</p>}
          </div>
          {owner?.booking_token && (
            <a href={mainUrl(`/book/${owner.booking_token}`)} style={ctaStyle()}>Đặt lịch ngay</a>
          )}
        </Section>
      );
    }
    default:
      return null;
  }
}

function ctaStyle(): React.CSSProperties {
  return {
    display: "inline-block",
    marginTop: 24,
    padding: "12px 28px",
    borderRadius: 999,
    background: "var(--s-accent)",
    color: "#171717",
    fontWeight: 600,
    textDecoration: "none",
  };
}
