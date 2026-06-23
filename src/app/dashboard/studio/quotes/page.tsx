import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import QuotesListView, { type QuoteRow } from "./QuotesListView";


export default async function QuotesList() {
  const profile = await requireStudio("booking");
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Photographer hoặc Studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Báo giá dành cho tài khoản gói <b>Photographer</b> trở lên.
          </p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Nâng cấp gói</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("studio_quotes")
    .select("*, quote_items(qty, unit_price, selected, is_optional, is_discount), quote_adjustments(id, resolved)")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false });

  return <QuotesListView list={(data ?? []) as unknown as QuoteRow[]} />;
}
