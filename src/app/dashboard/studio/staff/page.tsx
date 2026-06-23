import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import StaffManager, { type StaffRow } from "./StaffManager";


export default async function StaffPage() {
  const ctx = await requireStudio();
  if (!ctx) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }
  if (ctx.actingRole !== "owner" && ctx.actingRole !== "admin") {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Chỉ chủ studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Chỉ chủ studio mới quản lý được nhân viên.</p>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, studio_role, is_active, created_at")
    .eq("studio_owner_id", ctx.id)
    .order("created_at", { ascending: false });

  return <StaffManager initial={(data ?? []) as StaffRow[]} />;
}
