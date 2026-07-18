import type { WeddingConfig, WeddingInvitation } from "@/lib/types";
import type { Wish } from "./shared";
import EnvelopeIntro from "./EnvelopeIntro";
import ClassicTemplate from "./designs/ClassicTemplate";
import ElegantTemplate from "./designs/ElegantTemplate";
import FloralTemplate from "./designs/FloralTemplate";
import ModernTemplate from "./designs/ModernTemplate";
import CinematicTemplate from "./designs/CinematicTemplate";
import StorySlideTemplate from "./designs/StorySlideTemplate";
import EditorialTemplate from "./designs/EditorialTemplate";
import RoyalTemplate from "./designs/RoyalTemplate";
import SweetTemplate from "./designs/SweetTemplate";

export type { Wish };

const TEMPLATES = {
  classic: ClassicTemplate,
  elegant: ElegantTemplate,
  floral: FloralTemplate,
  modern: ModernTemplate,
  cinematic: CinematicTemplate,
  story: StorySlideTemplate,
  editorial: EditorialTemplate,
  royal: RoyalTemplate,
  sweet: SweetTemplate,
} as const;

/** Dispatches to the chosen template — each is its own distinct design. */
export default function WeddingRenderer({ inv, wishes = [], guest = "", storyUrl = "" }: { inv: WeddingInvitation; wishes?: Wish[]; guest?: string; storyUrl?: string }) {
  const Template = TEMPLATES[inv.template as keyof typeof TEMPLATES] ?? ClassicTemplate;
  const cfg = inv.config as WeddingConfig;
  const accent = cfg?.accent || "#b08968";
  const label = cfg?.guest_greeting?.trim() || "Trân trọng kính mời";
  const couple = [cfg?.groom_name, cfg?.bride_name].filter(Boolean).join(" & ");
  return (
    <>
      {guest && <EnvelopeIntro name={guest} label={label} couple={couple} accent={accent} />}
      {/* Tên khách mời được đưa VÀO nội dung mỗi mẫu (sau phần "Ngày trọng đại"),
          không còn cố định ở đầu trang. */}
      <Template inv={inv} wishes={wishes} guest={guest} />
      {storyUrl && <StoryCta url={guest ? `${storyUrl}${storyUrl.includes("?") ? "&" : "?"}guest=${encodeURIComponent(guest)}` : storyUrl} accent={accent} />}
    </>
  );
}

/** Màu chữ dễ đọc (đen/trắng) trên một màu nền bất kỳ — chọn theo tương phản
 *  WCAG cao hơn, để nút không bị chữ trắng mờ trên accent sáng studio chọn. */
function readableInk(hex: string): string {
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec((hex || "").trim());
  if (!m) return "#fff";
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const chan = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * chan(0) + 0.7152 * chan(2) + 0.0722 * chan(4);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastDark = (L + 0.05) / 0.05;
  return contrastDark >= contrastWhite ? "#1a1205" : "#fff";
}

/** Nút "Xem Love Story" ở CUỐI thiệp (cạnh phần xác nhận tham dự). */
function StoryCta({ url, accent }: { url: string; accent: string }) {
  return (
    <section style={{ padding: "48px 24px 60px", textAlign: "center", borderTop: `1px solid ${accent}33` }}>
      <p style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 12.5, letterSpacing: ".24em", textTransform: "uppercase", color: accent }}>Chuyện tình yêu</p>
      <p style={{ fontFamily: "var(--font-hand), cursive", fontSize: 40, lineHeight: 1.1, color: accent, margin: "4px 0 18px" }}>Love Story</p>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: accent, color: readableInk(accent), borderRadius: 999, padding: "12px 30px", fontSize: 15, fontWeight: 600, textDecoration: "none", boxShadow: "0 8px 22px rgba(0,0,0,.16)" }}>💌 Xem Love Story của chúng mình</a>
    </section>
  );
}
