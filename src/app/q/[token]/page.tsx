import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectivePlan, studioTier } from "@/lib/plans";
import QuoteClientView from "./QuoteClientView";
import type { StudioQuote, QuoteItem, QuoteAdjustment } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const db = createAdminClient();
  const { data } = await db.from("studio_quotes").select("title, client_name").eq("client_token", params.token).maybeSingle();
  return { title: data?.title ? `${data.title}${data.client_name ? ` · ${data.client_name}` : ""}` : "Báo giá · Vieetjk" };
}

export default async function QuoteClientPage({ params }: { params: { token: string } }) {
  const db = createAdminClient();
  const { data: quote } = await db.from("studio_quotes").select("*").eq("client_token", params.token).maybeSingle();
  if (!quote) notFound();

  // Mark as 'viewed' on first open (don't downgrade later statuses).
  if (quote.status === "sent") {
    await db.from("studio_quotes").update({ status: "viewed", viewed_at: new Date().toISOString() }).eq("id", quote.id);
  }

  const [{ data: items }, { data: adjustments }, { data: owner }] = await Promise.all([
    db.from("quote_items").select("*").eq("quote_id", quote.id).order("position"),
    db.from("quote_adjustments").select("*").eq("quote_id", quote.id).order("created_at", { ascending: true }),
    db.from("profiles").select("full_name, email, plan, plan_expires_at, role").eq("id", quote.owner_id).maybeSingle(),
  ]);

  // Photographers (booking tier) don't have the contract feature, so we hide
  // the "tự động tạo hợp đồng" checkbox for their quotes.
  const studioCanContract = owner
    ? studioTier(effectivePlan(owner.plan, owner.plan_expires_at), owner.role === "admin") === "full"
    : false;

  return (
    <QuoteClientView
      quote={quote as StudioQuote}
      initialItems={(items ?? []) as QuoteItem[]}
      initialAdjustments={(adjustments ?? []) as QuoteAdjustment[]}
      studioName={(owner?.full_name || "Studio") as string}
      studioCanContract={studioCanContract}
    />
  );
}
