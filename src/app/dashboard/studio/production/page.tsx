import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import ProductionView, { type ProductRow } from "./ProductionView";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const profile = await requireStudio();
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Tính năng này chỉ dành cho tài khoản gói Studio.</p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  let q = supabase
    .from("contract_products")
    .select("id, name, qty, cost, status, note, contract:studio_contracts!inner(id, owner_id, title, client_name, delivery_due, assigned_to)")
    .eq("contract.owner_id", profile.id)
    .order("created_at", { ascending: true });
  if (profile.actingRole === "staff") q = q.eq("contract.assigned_to", profile.actingUserId);
  const { data } = await q;

  return <ProductionView initial={(data ?? []) as unknown as ProductRow[]} />;
}
