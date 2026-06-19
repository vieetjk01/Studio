import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import type {
  StudioContract,
  ContractItem,
  ContractCrew,
  ContractEditRequest,
  ContractPayment,
  StudioCrew,
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

  const [{ data: items }, { data: crew }, { data: requests }, { data: payments }, { data: roster }, { data: galleries }] =
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
    ]);

  return (
    <ContractEditor
      contract={contract as StudioContract}
      initialItems={(items ?? []) as ContractItem[]}
      initialCrew={(crew ?? []) as ContractCrew[]}
      initialRequests={(requests ?? []) as ContractEditRequest[]}
      initialPayments={(payments ?? []) as ContractPayment[]}
      roster={(roster ?? []) as StudioCrew[]}
      galleries={(galleries ?? []) as { id: string; title: string; slug: string }[]}
    />
  );
}
