import { mainUrl } from "@/lib/hosts";
import { vnd, SITE_BLOCK_LABEL, type SiteBlock } from "@/lib/types";
import type { SiteData } from "@/lib/site-loader";

const str = (v: unknown, fallback = "") => (typeof v === "string" && v.trim() ? v : fallback);
const lines = (v: unknown) => str(v).split("\n").map((s) => s.trim()).filter(Boolean);

function isLightHex(hex?: string): boolean {
  if (!hex) return false;
  const m = hex.replace("#", "");
  if (m.length < 6) return false;
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/** Extract a YouTube/Vimeo embed URL from a pasted link. */
function embedUrl(raw: string): string | null {
  const u = raw.trim();
  if (!u) return null;
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = u.match(/vimeo\.com\/(\d+)/i);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default function SiteRenderer({ data, demo = false }: { data: SiteData; demo?: boolean }) {
  const { site, blocks, owner } = data;
  const t = site.theme || {};
  const name = owner?.full_name || site.subdomain || "Studio";
  const fontVar = t.font === "sans" ? "var(--font-hanken)" : "var(--font-cormorant)";

  const dark = (t.mode ?? (isLightHex(t.bg) ? "light" : "dark")) === "dark";
  const wrap = {
    "--s-bg": t.bg || "#0c0c0d",
    "--s-text": t.text || "#ececec",
    "--s-accent": t.accent || "#c7a76b",
    "--s-border": dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
    "--s-card": dark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.03)",
    "--s-radius": t.radius === "sharp" ? "0px" : "14px",
    "--s-maxw": t.contentWidth === "full" ? "1360px" : "1040px",
    background: "var(--s-bg)",
    color: "var(--s-text)",
    minHeight: "100vh",
  } as React.CSSProperties;

  const navPos = t.navPosition || "top";
  const navItems = blocks.filter((b) => b.type !== "hero").map((b) => ({ id: b.id, label: str(b.config?.heading) || SITE_BLOCK_LABEL[b.type] }));

  const brand = t.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={t.logo} alt={name} style={{ height: 36, width: "auto" }} />
  ) : (
    <span style={{ fontFamily: fontVar, fontSize: 20, letterSpacing: 1 }}>{name}</span>
  );

  const content =
    blocks.length === 0 ? (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontFamily: fontVar, fontSize: 40 }}>{name}</h1>
          <p style={{ opacity: 0.6, marginTop: 8 }}>Trang đang được hoàn thiện.</p>
        </div>
      </div>
    ) : (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start" }}>
        {blocks.map((b) => {
          const half = b.config?.width === "half" && b.type !== "hero";
          return (
            <div id={`sec-${b.id}`} key={b.id} style={{ flex: half ? "1 1 420px" : "1 1 100%", minWidth: 0 }}>
              <Block block={b} data={data} fontVar={fontVar} demo={demo} />
            </div>
          );
        })}
      </div>
    );

  const footer = (
    <footer style={{ borderTop: "1px solid var(--s-border)", padding: "28px 24px", textAlign: "center", fontSize: 13, opacity: 0.55 }}>
      © {name}
      {site.template !== "studio-pro" && (
        <>
          {" · "}
          <a href={mainUrl("/")} style={{ color: "inherit" }}>Tạo bởi Vieetjk</a>
        </>
      )}
    </footer>
  );

  // Top navigation (default).
  if (navPos === "top") {
    return (
      <div style={wrap}>
        {blocks.length > 0 && (
          <header style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 20, justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid var(--s-border)", background: "color-mix(in srgb, var(--s-bg) 82%, transparent)", backdropFilter: "blur(8px)" }}>
            {brand}
            <nav style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14 }}>
              {navItems.map((n) => (
                <a key={n.id} href={`#sec-${n.id}`} style={{ color: "inherit", opacity: 0.85, textDecoration: "none" }}>{n.label}</a>
              ))}
            </nav>
          </header>
        )}
        {content}
        {footer}
      </div>
    );
  }

  // Left / right sidebar navigation.
  return (
    <div style={wrap}>
      <div style={{ display: "flex", flexDirection: navPos === "right" ? "row-reverse" : "row", minHeight: "100vh" }}>
        {blocks.length > 0 && (
          <aside
            style={{
              width: 230,
              flexShrink: 0,
              position: "sticky",
              top: 0,
              alignSelf: "flex-start",
              height: "100vh",
              padding: "28px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              borderRight: navPos === "left" ? "1px solid var(--s-border)" : undefined,
              borderLeft: navPos === "right" ? "1px solid var(--s-border)" : undefined,
            }}
          >
            <div>{brand}</div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
              {navItems.map((n) => (
                <a key={n.id} href={`#sec-${n.id}`} style={{ color: "inherit", opacity: 0.85, textDecoration: "none" }}>{n.label}</a>
              ))}
            </nav>
            {owner?.booking_token && (
              <a href={mainUrl(`/book/${owner.booking_token}`)} style={{ marginTop: "auto", padding: "10px 16px", borderRadius: 999, background: "var(--s-accent)", color: "#171717", fontWeight: 600, textAlign: "center", textDecoration: "none", fontSize: 14 }}>Đặt lịch</a>
            )}
          </aside>
        )}
        <main style={{ flex: 1, minWidth: 0 }}>
          {content}
          {footer}
        </main>
      </div>
    </div>
  );
}

function Section({ children, fontVar, heading }: { children: React.ReactNode; fontVar: string; heading?: string }) {
  return (
    <section style={{ maxWidth: "var(--s-maxw)", margin: "0 auto", padding: "56px 24px" }}>
      {heading && <h2 style={{ fontFamily: fontVar, fontSize: 30, marginBottom: 24 }}>{heading}</h2>}
      {children}
    </section>
  );
}

function Block({ block, data, fontVar, demo = false }: { block: SiteBlock; data: SiteData; fontVar: string; demo?: boolean }) {
  const c = block.config || {};
  const t = data.site.theme || {};
  const { owner, albums, pricelist, feedback } = data;
  const name = owner?.full_name || data.site.subdomain || "Studio";

  switch (block.type) {
    case "hero": {
      const img = str(c.image);
      const left = t.heroAlign === "left";
      const heroH = t.heroSize === "small" ? "42vh" : t.heroSize === "large" ? "74vh" : "54vh";
      return (
        <section
          style={{
            position: "relative",
            minHeight: heroH,
            display: "flex",
            alignItems: "center",
            justifyContent: left ? "flex-start" : "center",
            textAlign: left ? "left" : "center",
            padding: left ? "24px 6vw" : 24,
            backgroundImage: img ? `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.55)), url(${img})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: img ? "#fff" : undefined,
          }}
        >
          <div style={{ maxWidth: 820 }}>
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
            {img && <img src={img} alt="" style={{ width: "100%", borderRadius: "var(--s-radius)", objectFit: "cover" }} />}
          </div>
        </Section>
      );
    }
    case "gallery": {
      const ids = Array.isArray(c.album_ids) ? (c.album_ids as string[]) : [];
      const picked = ids.length ? ids.map((id) => albums.find((a) => a.id === id)).filter(Boolean) as typeof albums : albums;
      if (picked.length === 0 && !demo) return null;
      const cols = Number(t.galleryCols) || 0;
      const minW = cols === 2 ? 320 : cols === 3 ? 230 : cols === 4 ? 175 : 240;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Bộ sưu tập")}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: `repeat(auto-fill,minmax(${minW}px,1fr))` }}>
            {picked.length > 0
              ? picked.map((a) => (
                  <a key={a.id} href={mainUrl(`/album/${a.slug}`)} style={{ display: "block", color: "inherit" }}>
                    <div style={{ aspectRatio: "4/3", borderRadius: "var(--s-radius)", overflow: "hidden", background: "var(--s-card)" }}>
                      {a.cover_url && <img src={a.cover_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <p style={{ marginTop: 8, fontSize: 14 }}>{a.title}</p>
                  </a>
                ))
              : Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <div style={{ aspectRatio: "4/3", borderRadius: "var(--s-radius)", overflow: "hidden", background: "var(--s-card)" }}>
                      <img src={`https://picsum.photos/seed/vk-demo${i}/600/450`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <p style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>Album mẫu {i + 1}</p>
                  </div>
                ))}
          </div>
          {picked.length === 0 && demo && <p style={{ marginTop: 10, fontSize: 12, opacity: 0.55 }}>(Ảnh mẫu — sẽ thay bằng album của bạn khi xuất bản)</p>}
        </Section>
      );
    }
    case "pricing": {
      if (pricelist.length === 0) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Bảng giá")}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            {pricelist.map((p) => (
              <div key={p.id} style={{ borderRadius: "var(--s-radius)", border: "1px solid var(--s-border)", padding: 20 }}>
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
              <div key={f.id} style={{ borderRadius: "var(--s-radius)", border: "1px solid var(--s-border)", padding: 20 }}>
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
    case "video": {
      const url = embedUrl(str(c.url));
      if (!url) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Video")}>
          <div style={{ position: "relative", paddingBottom: "56.25%", borderRadius: "var(--s-radius)", overflow: "hidden" }}>
            <iframe src={url} title="video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
          </div>
        </Section>
      );
    }
    case "social": {
      const links: { label: string; url: string }[] = [
        { label: "Facebook", url: str(c.facebook) },
        { label: "Instagram", url: str(c.instagram) },
        { label: "TikTok", url: str(c.tiktok) },
        { label: "YouTube", url: str(c.youtube) },
      ].filter((l) => l.url);
      if (links.length === 0) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Theo dõi")}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {links.map((l) => (
              <a key={l.label} href={l.url} target="_blank" rel="noreferrer" style={{ padding: "10px 20px", borderRadius: 999, border: "1px solid var(--s-accent)", color: "inherit", textDecoration: "none" }}>
                {l.label}
              </a>
            ))}
          </div>
        </Section>
      );
    }
    case "faq": {
      const items = lines(c.items)
        .map((line) => { const [q, ...a] = line.split("|"); return { q: q.trim(), a: a.join("|").trim() }; })
        .filter((x) => x.q);
      if (items.length === 0) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Câu hỏi thường gặp")}>
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((it, i) => (
              <div key={i} style={{ borderRadius: "var(--s-radius)", border: "1px solid var(--s-border)", padding: 18 }}>
                <p style={{ fontWeight: 600 }}>{it.q}</p>
                {it.a && <p style={{ marginTop: 6, opacity: 0.85, lineHeight: 1.6 }}>{it.a}</p>}
              </div>
            ))}
          </div>
        </Section>
      );
    }
    case "services": {
      const items = lines(c.items)
        .map((line) => { const [title, ...d] = line.split("|"); return { title: title.trim(), desc: d.join("|").trim() }; })
        .filter((x) => x.title);
      if (items.length === 0) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Dịch vụ")}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            {items.map((it, i) => (
              <div key={i} style={{ borderRadius: "var(--s-radius)", border: "1px solid var(--s-border)", padding: 20 }}>
                <span style={{ color: "var(--s-accent)", fontFamily: fontVar, fontSize: 22 }}>{String(i + 1).padStart(2, "0")}</span>
                <p style={{ fontFamily: fontVar, fontSize: 19, marginTop: 4 }}>{it.title}</p>
                {it.desc && <p style={{ marginTop: 6, opacity: 0.85, lineHeight: 1.6, fontSize: 14 }}>{it.desc}</p>}
              </div>
            ))}
          </div>
        </Section>
      );
    }
    case "stats": {
      const items = lines(c.items)
        .map((line) => { const [value, ...l] = line.split("|"); return { value: value.trim(), label: l.join("|").trim() }; })
        .filter((x) => x.value);
      if (items.length === 0) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading)}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: `repeat(${Math.min(items.length, 4)},1fr)`, textAlign: "center" }}>
            {items.map((it, i) => (
              <div key={i}>
                <p style={{ fontFamily: fontVar, fontSize: "clamp(28px,5vw,48px)", color: "var(--s-accent)" }}>{it.value}</p>
                {it.label && <p style={{ opacity: 0.8, fontSize: 14 }}>{it.label}</p>}
              </div>
            ))}
          </div>
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
