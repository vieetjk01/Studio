import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import NewContractForm, { type TemplateOption } from "./NewContractForm";


export default async function NewContractPage() {
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
  const { data: templates } = await supabase
    .from("contract_templates")
    .select("id, name, shoot_type, note, contract_template_items(name, qty, unit_price, position)")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false });

  const assignTo = profile.actingRole === "staff" ? (profile.actingUserId as string) : null;
  return <NewContractForm ownerId={profile.id} assignTo={assignTo} templates={(templates ?? []) as unknown as TemplateOption[]} />;
}
