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
  const cfg = inv.config as WeddingConfig;
  const accent = cfg?.accent || "#b08968";
  const label = cfg?.guest_greeting?.trim() || "Trân trọng kính mời";
  return (
    <>
      {guest && <GuestGreeting name={guest} accent={accent} label={label} />}
      <Template inv={inv} wishes={wishes} />
    </>
  );
}

/**
 * Ô "tên khách mời" cá nhân hóa — hiện khi khách mở link riêng (?guest=…).
 * Nổi trên cùng, hiển thị trên MỌI mẫu thiệp mà không cần sửa từng template.
 * Tên khách dùng FONT VIẾT TAY (Dancing Script / --font-script).
 */
function GuestGreeting({ name, accent, label }: { name: string; accent: string; label: string }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60, display: "flex", justifyContent: "center", padding: "12px", pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", maxWidth: "94%", background: "rgba(255,255,255,0.94)", backdropFilter: "blur(8px)", border: `1px solid ${accent}`, color: "#3a3530", borderRadius: 18, padding: "10px 26px", boxShadow: "0 8px 28px rgba(0,0,0,.16)", textAlign: "center", lineHeight: 1.15 }}>
        <span style={{ display: "block", fontFamily: "var(--font-cormorant), serif", fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: accent }}>{label}</span>
        <span style={{ display: "block", marginTop: 2, fontFamily: "var(--font-script), cursive", fontSize: 30, lineHeight: 1.1, color: "#2c2621" }}>{name}</span>
      </div>
    </div>
  );
}
