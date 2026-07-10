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
export default function WeddingRenderer({ inv, wishes = [], guest = "" }: { inv: WeddingInvitation; wishes?: Wish[]; guest?: string }) {
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
    </>
  );
}
