import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import QuoteEditor from "./QuoteEditor";
import type { StudioQuote, QuoteItem, QuoteAdjustment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const profile = await requireStudio();
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Báo giá chỉ dành cho tài khoản gói <b>Studio</b>.</p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data: quote } = await supabase.from("studio_quotes").select("*").eq("id", params.id).eq("owner_id", profile.id).maybeSingle();
  if (!quote) notFound();

  const [{ data: items }, { data: adjustments }] = await Promise.all([
    supabase.from("quote_items").select("*").eq("quote_id", params.id).order("position"),
    supabase.from("quote_adjustments").select("*").eq("quote_id", params.id).order("created_at", { ascending: false }),
  ]);

  return (
    <QuoteEditor
      quote={quote as StudioQuote}
      initialItems={(items ?? []) as QuoteItem[]}
      initialAdjustments={(adjustments ?? []) as QuoteAdjustment[]}
    />
  );
}
