import { createAdminClient } from "@/lib/supabase/admin";
import LandingPage, { type LandingPrices } from "./LandingPage";
import { PLAN_PRICING } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const DEFAULT_PRICES: LandingPrices = {
  basicMonth: PLAN_PRICING.basic.month,
  basicYear: PLAN_PRICING.basic.year,
  photographerMonth: PLAN_PRICING.photographer.month,
  photographerYear: PLAN_PRICING.photographer.year,
  studioMonth: PLAN_PRICING.studio.month,
  studioYear: PLAN_PRICING.studio.year,
  basicDiscount: 0,
  photographerDiscount: 0,
  studioDiscount: 0,
  studioPromo: 50,
};

export default async function HomePage() {
  let prices: LandingPrices = DEFAULT_PRICES;

  // The marketing homepage must never 500 just because Supabase isn't
  // configured/seeded yet — degrade gracefully to default pricing.
  try {
    const db = createAdminClient();
    const { data: s } = await db
      .from("site_settings")
      .select(
        "price_basic_month, price_basic_year, price_photographer_month, price_photographer_year, price_studio_month, price_studio_year, basic_discount_percent, photographer_discount_percent, studio_discount_percent, studio_promo_percent"
      )
      .eq("id", 1)
      .maybeSingle();
    if (s) {
      prices = {
        basicMonth: s.price_basic_month ?? DEFAULT_PRICES.basicMonth,
        basicYear: s.price_basic_year ?? DEFAULT_PRICES.basicYear,
        photographerMonth: s.price_photographer_month ?? DEFAULT_PRICES.photographerMonth,
        photographerYear: s.price_photographer_year ?? DEFAULT_PRICES.photographerYear,
        studioMonth: s.price_studio_month ?? DEFAULT_PRICES.studioMonth,
        studioYear: s.price_studio_year ?? DEFAULT_PRICES.studioYear,
        basicDiscount: s.basic_discount_percent ?? 0,
        photographerDiscount: s.photographer_discount_percent ?? 0,
        studioDiscount: s.studio_discount_percent ?? 0,
        studioPromo: s.studio_promo_percent ?? 50,
      };
    }
  } catch (e) {
    console.error("[home] failed to load pricing, using defaults:", e);
  }

  return <LandingPage prices={prices} />;
}
