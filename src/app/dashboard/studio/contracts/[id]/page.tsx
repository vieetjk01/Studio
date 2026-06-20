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
  StudioCrew,
  StudioEvent,
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

  const [{ data: milestones }, { data: tasks }] = await Promise.all([
    supabase.from("studio_events").select("*").eq("contract_id", params.id).order("event_date"),
    supabase.from("contract_tasks").select("*").eq("contract_id", params.id).order("position"),
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
    for (const r of (bookings ?? []) as Array<{ phone: string | null; contract: { id: string; title: string } | null }>) {
      if (r.contract?.id === params.id) continue;
      const p = digits(r.phone);
      if (p) conflictByPhone[p] = `Trùng lịch: ${r.contract?.title || "HĐ khác"}`;
    }
    for (const r of (unavail ?? []) as Array<{ phone: string; note: string | null }>) {
      const p = digits(r.phone);
      if (p && !conflictByPhone[p]) conflictByPhone[p] = r.note ? `Đã báo bận: ${r.note}` : "Đã báo bận ngày này";
    }
  }

  return (
    <ContractEditor
      contract={contract as StudioContract}
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
    />
  );
}
