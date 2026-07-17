import HtmlEmbed from "@/components/HtmlEmbed";
import SiteNav from "@/components/SiteNav";
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
    "--s-accentInk": isLightHex(t.accent) ? "#171717" : "#ffffff",
    "--s-border": dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
    "--s-card": dark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.03)",
    "--s-radius": t.radius === "sharp" ? "0px" : "14px",
    "--s-maxw": "100%",
    background: "var(--s-bg)",
    color: "var(--s-text)",
    minHeight: "100vh",
    // KHÔNG dùng overflow-x:hidden ở đây — nó sẽ phá position:sticky của menu.
    // Full-bleed dùng width:100% (không 100vw) nên vốn không gây tràn ngang.
  } as React.CSSProperties;

  // Advanced: user-authored CSS applied site-wide (scoped under the site root).
  // Bỏ '<'/'>' để chặn thoát khỏi <style> (vd "</style><img onerror=...>") → XSS.
  const safeCss = t.customCss ? String(t.customCss).replace(/[<>]/g, "") : "";
  const customCssTag = safeCss ? <style dangerouslySetInnerHTML={{ __html: safeCss }} /> : null;

  const navPos = t.navPosition || "top";
  const navItems = blocks
    .filter((b) => b.type !== "hero" && b.config?.navHidden !== true)
    .map((b) => ({ id: b.id, label: str(b.config?.navLabel) || str(b.config?.heading) || SITE_BLOCK_LABEL[b.type] }));

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
      (() => {
        // Render theo ĐOẠN: khối full-bleed (hero / html full) chiếm nguyên bề
        // rộng trang bằng width:100% (KHÔNG dùng 100vw → tránh lệch do thanh
        // cuộn); các khối thường gom vào cột giới hạn (căn giữa).
        const maxw = t.contentWidth === "full" ? "100%" : 1040;
        const out: React.ReactNode[] = [];
        let boxed: React.ReactNode[] = [];
        const flush = () => {
          if (!boxed.length) return;
          out.push(
            <div key={`box-${out.length}`} style={{ maxWidth: maxw, margin: "0 auto", width: "100%", display: "flex", flexWrap: "wrap", alignItems: "flex-start" }}>
              {boxed}
            </div>,
          );
          boxed = [];
        };
        for (const b of blocks) {
          const isHero = b.type === "hero";
          const isFullHtml = b.type === "html" && b.config?.width !== "contained";
          if (isHero || isFullHtml) {
            flush();
            out.push(
              <div id={`sec-${b.id}`} key={b.id} style={{ width: "100%" }}>
                <Block block={b} data={data} fontVar={fontVar} demo={demo} />
              </div>,
            );
          } else {
            const half = b.config?.width === "half";
            boxed.push(
              <div id={`sec-${b.id}`} key={b.id} style={{ flex: half ? "1 1 calc(50% - 0.5px)" : "1 1 100%", minWidth: half ? 300 : 0 }}>
                <Block block={b} data={data} fontVar={fontVar} demo={demo} />
              </div>,
            );
          }
        }
        flush();
        return <div style={{ width: "100%" }}>{out}</div>;
      })()
    );

  const footer = (
    <footer style={{ borderTop: "1px solid var(--s-border)", padding: "28px 24px", textAlign: "center", fontSize: 13, opacity: 0.55 }}>
      © {name}
    </footer>
  );

  // Top / bottom navigation — responsive header (hamburger trên mobile).
  if (navPos === "top" || navPos === "bottom") {
    const bottom = navPos === "bottom";
    const bar = blocks.length > 0 && (
      <SiteNav
        items={navItems}
        bookingHref={owner?.booking_token ? `/book/${owner.booking_token}` : null}
        logo={t.logo || null}
        name={name}
        bottom={bottom}
        fontVar={fontVar}
      />
    );
    return (
      <div style={wrap}>
        {customCssTag}
        {!bottom && bar}
        {content}
        {footer}
        {/* leave room so the fixed bottom bar doesn't cover the footer */}
        {bottom && blocks.length > 0 && <div style={{ height: 72 }} />}
        {bottom && bar}
      </div>
    );
  }

  // Left / right sidebar navigation.
  return (
    <div style={wrap}>
      {customCssTag}
      <div className="s-shell" style={{ display: "flex", flexDirection: navPos === "right" ? "row-reverse" : "row", minHeight: "100vh" }}>
        {blocks.length > 0 && (
          <aside
            className="s-sidebar"
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
            <nav style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, alignItems: "flex-start" }}>
              {navItems.map((n) => (
                <a key={n.id} href={`#sec-${n.id}`} className="s-navlink">{n.label}</a>
              ))}
            </nav>
            {owner?.booking_token && (
              <a href={`/book/${owner.booking_token}`} className="s-cta" style={{ marginTop: "auto", justifyContent: "center" }}>Đặt lịch</a>
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
            // Tiêu điểm ảnh bìa (chỉnh khi chủ thể lệch): center/top/left/right…
            backgroundPosition: str(c.imagePos, "center"),
            color: img ? "#fff" : undefined,
          }}
        >
          <div style={{ maxWidth: 820 }}>
            <h1 style={{ fontFamily: fontVar, fontSize: "clamp(36px,7vw,72px)", lineHeight: 1.05 }}>{str(c.heading, name)}</h1>
            {str(c.subheading) && <p style={{ marginTop: 14, fontSize: 18, opacity: 0.85 }}>{str(c.subheading)}</p>}
            {owner?.booking_token && (
              <a href={`/book/${owner.booking_token}`} style={ctaStyle()}>Đặt lịch</a>
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
                  <a key={a.id} href={`/album/${a.slug}`} style={{ display: "block", color: "inherit" }}>
                    <div style={{ aspectRatio: "4/3", borderRadius: "var(--s-radius)", overflow: "hidden", background: "var(--s-card)" }}>
                      {a.cover_url && <img src={a.cover_url} alt={a.title} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
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
      const plKey = str(c.list_key);
      const shownPl = plKey ? pricelist.filter((p) => (p.list_key || "") === plKey) : pricelist;
      if (shownPl.length === 0) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Bảng giá")}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            {shownPl.map((p) => (
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
            <a href={`/book/${owner.booking_token}`} style={ctaStyle()}>Đặt lịch ngay</a>
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
    case "cta": {
      return (
        <section style={{ maxWidth: "var(--s-maxw)", margin: "0 auto", padding: "24px" }}>
          <div style={{ borderRadius: "var(--s-radius)", border: "1px solid var(--s-border)", padding: "clamp(28px,6vw,56px)", textAlign: "center", background: "color-mix(in srgb, var(--s-accent) 8%, transparent)" }}>
            <h2 style={{ fontFamily: fontVar, fontSize: "clamp(26px,4vw,40px)" }}>{str(c.heading, "Sẵn sàng lưu giữ khoảnh khắc của bạn?")}</h2>
            {str(c.text) && <p style={{ marginTop: 10, opacity: 0.85, lineHeight: 1.6 }}>{str(c.text)}</p>}
            {owner?.booking_token && (
              <a href={`/book/${owner.booking_token}`} style={ctaStyle()}>{str(c.button, "Đặt lịch")}</a>
            )}
          </div>
        </section>
      );
    }
    case "team": {
      const items = lines(c.items)
        .map((line) => { const [n, role, img] = line.split("|"); return { n: (n || "").trim(), role: (role || "").trim(), img: (img || "").trim() }; })
        .filter((x) => x.n);
      if (items.length === 0) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Đội ngũ")}>
          <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", textAlign: "center" }}>
            {items.map((it, i) => (
              <div key={i}>
                <div style={{ width: 120, height: 120, margin: "0 auto", borderRadius: 999, overflow: "hidden", border: "1px solid var(--s-border)", background: "color-mix(in srgb, var(--s-text) 8%, transparent)" }}>
                  {it.img && <img src={it.img} alt={it.n} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <p style={{ fontFamily: fontVar, fontSize: 17, marginTop: 10 }}>{it.n}</p>
                {it.role && <p style={{ opacity: 0.75, fontSize: 13 }}>{it.role}</p>}
              </div>
            ))}
          </div>
        </Section>
      );
    }
    case "quote": {
      if (!str(c.text)) return null;
      return (
        <section style={{ maxWidth: "var(--s-maxw)", margin: "0 auto", padding: "56px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: fontVar, fontSize: "clamp(22px,3.4vw,34px)", lineHeight: 1.4, fontStyle: "italic" }}>
            “{str(c.text)}”
          </p>
          {str(c.author) && <p style={{ marginTop: 16, color: "var(--s-accent)", fontWeight: 600 }}>— {str(c.author)}</p>}
        </section>
      );
    }
    case "logos": {
      const items = lines(c.items);
      if (items.length === 0) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading)}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center", justifyContent: "center" }}>
            {items.map((src, i) => (
              <img key={i} src={src} alt="" style={{ height: 40, maxWidth: 160, objectFit: "contain", opacity: 0.7, filter: "grayscale(1)" }} />
            ))}
          </div>
        </Section>
      );
    }
    case "map": {
      const addr = str(c.address);
      if (!addr) return null;
      return (
        <Section fontVar={fontVar} heading={str(c.heading, "Địa chỉ")}>
          <div style={{ borderRadius: "var(--s-radius)", overflow: "hidden", border: "1px solid var(--s-border)" }}>
            <iframe
              title="map"
              src={`https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`}
              style={{ width: "100%", height: 360, border: 0 }}
              loading="lazy"
            />
          </div>
        </Section>
      );
    }
    case "html": {
      // User-authored HTML/embed for their own public site. CSP (script-src
      // whitelist) is the safety net against injected external scripts.
      const html = str(c.html);
      if (!html) return null;
      const heading = str(c.heading);
      // Contained = boxed widget; otherwise full-bleed (the wrapper already
      // breaks it out to 100vw) so the embed owns the whole page width.
      if (c.width === "contained") {
        return (
          <Section fontVar={fontVar} heading={heading || undefined}>
            <HtmlEmbed html={html} />
          </Section>
        );
      }
      return (
        <div style={{ width: "100%" }}>
          {heading && <h2 style={{ fontFamily: fontVar, fontSize: 30, textAlign: "center", margin: "32px 0 0" }}>{heading}</h2>}
          <HtmlEmbed html={html} />
        </div>
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
