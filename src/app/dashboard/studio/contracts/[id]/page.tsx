import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import type {
  StudioContract,
  ContractItem,
  ContractCrew,
  ContractEditRequest,
  ContractPayment,
  ContractTask,
  ContractPaymentPlan,
  ContractProduct,
  ContractQuoteOption,
  StudioCrew,
  StudioEvent,
  StudioExpense,
} from "@/lib/types";
import ContractEditor from "./ContractEditor";

export const dynamic = "force-dynamic";

export default async function ContractPage({ params }: { params: { id: string } }) {
  const profile = await requireStudio();
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Tính năng này chỉ dành cho tài khoản gói Studio.
          </p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data: contract } = await supabase
    .from("studio_contracts")
    .select("*")
    .eq("id", params.id)
    .eq("owner_id", profile.id)
    .maybeSingle();

  if (!contract) notFound();

  // Staff role: may only open contracts assigned to them.
  if (profile.actingRole === "staff" && contract.assigned_to !== profile.actingUserId) notFound();
  const canAssign = profile.actingRole !== "staff";

  // Staff list for the "giao cho nhân viên" selector (managers/owner only).
  const { data: staffList } = canAssign
    ? await supabase.from("profiles").select("id, full_name, email").eq("studio_owner_id", profile.id).order("full_name")
    : { data: [] as { id: string; full_name: string | null; email: string }[] };

  const [{ data: items }, { data: crew }, { data: requests }, { data: payments }, { data: roster }, { data: galleries }, { data: selectionAlbums }] =
    await Promise.all([
      supabase.from("contract_items").select("*").eq("contract_id", params.id).order("position"),
      supabase.from("contract_crew").select("*").eq("contract_id", params.id).order("position"),
      supabase
        .from("contract_edit_requests")
        .select("*")
        .eq("contract_id", params.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contract_payments")
        .select("*")
        .eq("contract_id", params.id)
        .order("paid_at", { ascending: false }),
      supabase.from("studio_crew").select("*").eq("owner_id", profile.id).order("name"),
      supabase
        .from("albums")
        .select("id, title, slug")
        .eq("owner_id", profile.id)
        .eq("is_gallery", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("albums")
        .select("id, title, slug")
        .eq("owner_id", profile.id)
        .eq("is_gallery", false)
        .order("created_at", { ascending: false }),
    ]);

  const [{ data: milestones }, { data: tasks }, { data: expenses }, { data: plan }, { data: products }, { data: quoteOptions }] = await Promise.all([
    supabase.from("studio_events").select("*").eq("contract_id", params.id).order("event_date"),
    supabase.from("contract_tasks").select("*").eq("contract_id", params.id).order("position"),
    supabase.from("studio_expenses").select("*").eq("contract_id", params.id).order("spent_at", { ascending: false }),
    supabase.from("contract_payment_plan").select("*").eq("contract_id", params.id).order("due_date", { nullsFirst: false }),
    supabase.from("contract_products").select("*").eq("contract_id", params.id).order("position"),
    supabase.from("contract_quote_options").select("*").eq("contract_id", params.id).order("position"),
  ]);

  // Scheduling conflicts for the contract's date: crew already booked on another
  // of this studio's contracts that day, or crew who marked the day as busy.
  const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");
  const conflictByPhone: Record<string, string> = {};
  if (contract.event_date) {
    const [{ data: bookings }, { data: unavail }] = await Promise.all([
      supabase
        .from("contract_crew")
        .select("phone, contract:studio_contracts!inner(id, owner_id, event_date, title)")
        .eq("contract.owner_id", profile.id)
        .eq("contract.event_date", contract.event_date)
        .not("phone", "is", null),
      supabase.from("crew_unavailable").select("phone, note").eq("date", contract.event_date),
    ]);
    for (const r of (bookings ?? []) as unknown as Array<{ phone: string | null; contract: { id: string; title: string } | null }>) {
      if (r.contract?.id === params.id) continue;
      const p = digits(r.phone);
      if (p) conflictByPhone[p] = `Trùng lịch: ${r.contract?.title || "HĐ khác"}`;
    }
    for (const r of (unavail ?? []) as unknown as Array<{ phone: string; note: string | null }>) {
      const p = digits(r.phone);
      if (p && !conflictByPhone[p]) conflictByPhone[p] = r.note ? `Đã báo bận: ${r.note}` : "Đã báo bận ngày này";
    }
  }

  // Active price-list packages, to quick-add as contract items.
  const { data: pricelistRows } = await supabase
    .from("studio_pricelist")
    .select("name, price, unit")
    .eq("owner_id", profile.id)
    .eq("active", true)
    .gt("price", 0)
    .order("position");

  // Same-day scheduling: other non-cancelled contracts on this contract's date.
  let sameDayContracts: { id: string; title: string; client_name: string | null }[] = [];
  if (contract.event_date) {
    const { data: sd } = await supabase
      .from("studio_contracts")
      .select("id, title, client_name")
      .eq("owner_id", profile.id)
      .eq("event_date", contract.event_date)
      .neq("id", params.id)
      .neq("status", "cancelled");
    sameDayContracts = (sd ?? []) as { id: string; title: string; client_name: string | null }[];
  }

  return (
    <ContractEditor
      contract={contract as StudioContract}
      bank={{
        bin: (profile.pl_bank_bin as string | null) ?? null,
        account: (profile.pl_bank_account as string | null) ?? null,
        holder: (profile.pl_bank_holder as string | null) ?? null,
        name: (profile.pl_bank_name as string | null) ?? null,
      }}
      sameDayContracts={sameDayContracts}
      pricelist={(pricelistRows ?? []) as { name: string; price: number; unit: string | null }[]}
      initialItems={(items ?? []) as ContractItem[]}
      initialCrew={(crew ?? []) as ContractCrew[]}
      initialRequests={(requests ?? []) as ContractEditRequest[]}
      initialPayments={(payments ?? []) as ContractPayment[]}
      roster={(roster ?? []) as StudioCrew[]}
      galleries={(galleries ?? []) as { id: string; title: string; slug: string }[]}
      selectionAlbums={(selectionAlbums ?? []) as { id: string; title: string; slug: string }[]}
      initialMilestones={(milestones ?? []) as StudioEvent[]}
      studioName={profile.full_name || "Studio"}
      conflictByPhone={conflictByPhone}
      initialTasks={(tasks ?? []) as ContractTask[]}
      initialExpenses={(expenses ?? []) as StudioExpense[]}
      initialPlan={(plan ?? []) as ContractPaymentPlan[]}
      initialProducts={(products ?? []) as ContractProduct[]}
      initialQuoteOptions={(quoteOptions ?? []) as ContractQuoteOption[]}
      staffList={(staffList ?? []) as { id: string; full_name: string | null; email: string }[]}
      canAssign={canAssign}
    />
  );
}
