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
} as const;

/** Dispatches to the chosen template — each is its own distinct design. */
export default function WeddingRenderer({ inv, wishes = [], guest = "" }: { inv: WeddingInvitation; wishes?: Wish[]; guest?: string }) {
  const Template = TEMPLATES[inv.template as keyof typeof TEMPLATES] ?? ClassicTemplate;
  const cfg = inv.config as WeddingConfig;
  const accent = cfg?.accent || "#b08968";
  const label = cfg?.guest_greeting?.trim() || "Trân trọng kính mời";
  const couple = [cfg?.groom_name, cfg?.bride_name].filter(Boolean).join(" & ");
  return (
    <>
      {guest && <EnvelopeIntro name={guest} label={label} couple={couple} accent={accent} />}
      {guest && <GuestSection name={guest} accent={accent} label={label} />}
      <Template inv={inv} wishes={wishes} />
    </>
  );
}

/**
 * Phần "tên khách mời + lời mời" — là MỘT KHỐI RIÊNG nằm ĐẦU nội dung thiệp
 * (cuộn theo trang, không cố định). Hiển thị trên mọi mẫu. Tên khách dùng FONT
 * VIẾT TAY (Great Vibes / --font-hand).
 */
function GuestSection({ name, accent, label }: { name: string; accent: string; label: string }) {
  return (
    <section style={{ background: `linear-gradient(180deg, ${accent}14, transparent)`, borderBottom: `1px solid ${accent}33`, padding: "44px 20px 40px", textAlign: "center" }}>
      <div style={{ margin: "0 auto", maxWidth: 560 }}>
        <p style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 13, letterSpacing: ".22em", textTransform: "uppercase", color: accent }}>{label}</p>
        <p style={{ fontFamily: "var(--font-hand), cursive", fontSize: 46, lineHeight: 1.1, color: "#2c2621", margin: "6px 0 14px" }}>{name}</p>
        <span style={{ display: "inline-block", width: 66, height: 1, background: accent, opacity: 0.55 }} />
      </div>
    </section>
  );
}
