import type { WeddingInvitation } from "@/lib/types";
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
export default function WeddingRenderer({ inv, wishes = [] }: { inv: WeddingInvitation; wishes?: Wish[] }) {
  const Template = TEMPLATES[inv.template as keyof typeof TEMPLATES] ?? ClassicTemplate;
  return <Template inv={inv} wishes={wishes} />;
}
