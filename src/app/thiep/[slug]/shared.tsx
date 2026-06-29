import type { WeddingBank, WeddingConfig, WeddingInvitation } from "@/lib/types";

export type Wish = { guest_name: string; wish: string; created_at: string };

export type TemplateProps = { inv: WeddingInvitation; wishes: Wish[] };

export function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtShort(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function vietqrUrl(bank?: WeddingBank): string | null {
  if (!bank?.bin || !bank?.account) return null;
  const acc = bank.account.replace(/\s/g, "");
  const params = new URLSearchParams();
  if (bank.holder) params.set("accountName", bank.holder);
  const qs = params.toString();
  return `https://img.vietqr.io/image/${bank.bin}-${acc}-compact2.png${qs ? `?${qs}` : ""}`;
}

export type Palette = { surface: string; border: string; accent: string; muted: string };

/** VietQR "mừng cưới" card, styled by the calling template's palette. */
export function GiftCard({ title, bank, defaultName, pal, round = 16 }: { title: string; bank?: WeddingBank; defaultName?: string; pal: Palette; round?: number }) {
  const url = vietqrUrl(bank);
  if (!url) return null;
  return (
    <div className="flex flex-col items-center gap-2 p-5 text-center shadow-sm" style={{ background: pal.surface, border: `1px solid ${pal.border}`, borderRadius: round }}>
      <p className="font-serif text-lg" style={{ color: pal.accent }}>Mừng cưới {title}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" width={190} height={190} style={{ width: 190, height: "auto", borderRadius: 12, background: "#fff" }} />
      {(bank?.holder || defaultName) && <p className="text-sm font-medium">{bank?.holder || defaultName}</p>}
      <p className="text-xs" style={{ color: pal.muted }}>{bank?.account?.replace(/\s/g, "")}{bank?.name ? ` · ${bank.name}` : ""}</p>
    </div>
  );
}

/** Normalised, render-ready view of a config (defaults + filtered lists). */
export function readConfig(inv: WeddingInvitation) {
  const c = inv.config as WeddingConfig;
  return {
    c,
    groom: c.groom_name || "Chú rể",
    bride: c.bride_name || "Cô dâu",
    events: (c.events ?? []).filter((e) => e.label || e.date || e.venue),
    gallery: (c.gallery ?? []).filter(Boolean),
    hasGift: !!c.gift_enabled && (!!vietqrUrl(c.groom_bank) || !!vietqrUrl(c.bride_bank)),
  };
}
