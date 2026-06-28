import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import ContractsListView, { type ContractRow } from "./ContractsListView";


export default async function ContractsList() {
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
  let q = supabase
    .from("studio_contracts")
    .select("id, code, title, client_name, client_phone, event_date, status, shoot_type, contract_items(qty, unit_price), contract_payments(amount)")
    .eq("owner_id", profile.id);
  if (profile.actingRole === "staff") q = q.eq("assigned_to", profile.actingUserId);
  const { data } = await q.order("created_at", { ascending: false });

  return <ContractsListView list={(data ?? []) as unknown as ContractRow[]} />;
}
