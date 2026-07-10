import type { WeddingConfig, WeddingInvitation } from "@/lib/types";
import type { Wish } from "./shared";
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
  const accent = (inv.config as WeddingConfig)?.accent || "#b08968";
  return (
    <>
      {guest && <GuestGreeting name={guest} accent={accent} />}
      <Template inv={inv} wishes={wishes} />
    </>
  );
}

/**
 * Lời mời cá nhân hóa — dải nổi trên cùng khi khách mở link riêng (?guest=…).
 * Hiển thị trên MỌI mẫu thiệp mà không cần sửa từng template.
 */
function GuestGreeting({ name, accent }: { name: string; accent: string }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60, display: "flex", justifyContent: "center", padding: "10px 12px", pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", maxWidth: "92%", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", border: `1px solid ${accent}`, color: "#3a3530", borderRadius: 999, padding: "7px 18px", boxShadow: "0 6px 24px rgba(0,0,0,.14)", fontFamily: "var(--font-cormorant), serif", textAlign: "center", lineHeight: 1.25 }}>
        <span style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: accent }}>Trân trọng kính mời</span>
        <span style={{ display: "block", fontSize: 19, fontWeight: 600 }}>{name}</span>
      </div>
    </div>
  );
}
