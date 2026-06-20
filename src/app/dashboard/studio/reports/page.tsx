import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import type { StudioExpense } from "@/lib/types";
import ReportsView, { type PaymentRow, type SalaryRow } from "./ReportsView";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
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
  if (profile.actingRole === "staff") {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Không có quyền</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Mục tài chính chỉ dành cho quản lý / kế toán.</p>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const [{ data: payments }, { data: salaries }, { data: expenses }] = await Promise.all([
    supabase
      .from("contract_payments")
      .select("id, amount, kind, paid_at, contract:studio_contracts!inner(owner_id, title)")
      .eq("contract.owner_id", profile.id),
    supabase
      .from("contract_crew")
      .select("id, name, salary, paid, paid_at, contract:studio_contracts!inner(owner_id, title)")
      .eq("contract.owner_id", profile.id)
      .eq("paid", true),
    supabase.from("studio_expenses").select("*").eq("owner_id", profile.id),
  ]);

  return (
    <ReportsView
      ownerId={profile.id}
      payments={(payments ?? []) as unknown as PaymentRow[]}
      salaries={(salaries ?? []) as unknown as SalaryRow[]}
      initialExpenses={(expenses ?? []) as StudioExpense[]}
      initialTarget={Number(profile.monthly_revenue_target) || 0}
    />
  );
}
