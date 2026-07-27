import { getSessionUser } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectivePlan, studioTier } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Trang chẩn đoán quyền truy cập (tạm thời). Đăng nhập bằng tài khoản cần kiểm
 * tra rồi mở /dashboard/whoami để xem vì sao bị/không bị chặn — đặc biệt cho
 * nhân viên báo "cần gói studio".
 */
export default async function WhoAmIPage() {
  const user = await getSessionUser();
  if (!user) return <div className="p-6 text-sm">Chưa đăng nhập.</div>;

  const db = createAdminClient();
  const { data: me } = await db
    .from("profiles")
    .select("id, email, full_name, role, plan, plan_expires_at, is_active, studio_owner_id, studio_role")
    .eq("id", user.id)
    .maybeSingle();

  type OwnerRow = { id: string; email: string | null; role: string | null; plan: string | null; plan_expires_at: string | null; is_active: boolean | null };
  let owner: OwnerRow | null = null;
  if (me?.studio_owner_id) {
    const { data } = await db
      .from("profiles")
      .select("id, email, role, plan, plan_expires_at, is_active")
      .eq("id", me.studio_owner_id)
      .maybeSingle();
    owner = (data as OwnerRow | null) ?? null;
  }

  const base = me?.studio_owner_id && owner ? owner : me;
  const effPlan = base ? effectivePlan(base.plan as never, base.plan_expires_at as never) : "free";
  const tier = base ? studioTier(effPlan, base.role === "admin") : "none";
  const canFull = tier === "full";
  const isStaff = !!me?.studio_owner_id;

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ width: 220, color: "var(--text3)" }}>{k}</div>
      <div style={{ fontWeight: 600, wordBreak: "break-all" }}>{v}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-xl p-2 text-sm">
      <h1 className="mb-1 font-serif text-2xl font-medium">Chẩn đoán quyền truy cập</h1>
      <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>
        Chụp màn hình trang này gửi cho kỹ thuật nếu nhân viên không truy cập được.
      </p>

      <div className="card p-4">
        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--text3)" }}>Tài khoản đang đăng nhập</p>
        <Row k="Email" v={me?.email || user.email} />
        <Row k="Là nhân viên (staff)?" v={isStaff ? "CÓ" : "KHÔNG (đây là tài khoản riêng)"} />
        <Row k="studio_owner_id" v={me?.studio_owner_id || "— (chưa gắn vào studio nào)"} />
        <Row k="studio_role" v={me?.studio_role || "—"} />
        <Row k="role" v={me?.role || "—"} />
        <Row k="plan (của chính mình)" v={me?.plan || "free"} />
        <Row k="is_active" v={me?.is_active ? "true" : "FALSE (bị khoá)"} />
      </div>

      {isStaff && (
        <div className="card mt-3 p-4">
          <p className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--text3)" }}>Chủ studio (kế thừa quyền từ đây)</p>
          {owner ? (
            <>
              <Row k="Owner email" v={owner.email} />
              <Row k="Owner role" v={owner.role} />
              <Row k="Owner plan" v={owner.plan || "free"} />
              <Row k="Owner plan (hiệu lực)" v={effPlan} />
              <Row k="Owner is_active" v={owner.is_active ? "true" : "FALSE"} />
            </>
          ) : (
            <p style={{ color: "var(--s-red)" }}>Không tìm thấy hồ sơ chủ studio ứng với studio_owner_id → đây là lỗi liên kết.</p>
          )}
        </div>
      )}

      <div className="card mt-3 p-4">
        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--text3)" }}>Kết luận</p>
        <Row k="Tier tính được" v={tier} />
        <Row k="Truy cập nội dung studio (full)?" v={canFull ? "ĐƯỢC ✅" : "KHÔNG ❌ → sẽ báo 'cần gói studio'"} />
        {!canFull && (
          <p className="mt-2 text-xs" style={{ color: "var(--s-amber)" }}>
            {isStaff
              ? owner
                ? "Nhân viên đã gắn đúng studio, nhưng gói hiệu lực của CHỦ STUDIO không phải 'studio' (hoặc đã hết hạn). Cần chủ studio ở gói Studio còn hiệu lực."
                : "studio_owner_id trỏ tới hồ sơ không tồn tại → lỗi liên kết, cần tạo lại nhân viên."
              : "Tài khoản này CHƯA được gắn vào studio nào (studio_owner_id trống) → đang bị coi là user tự do. Chủ studio cần tạo lại nhân viên với email này."}
          </p>
        )}
      </div>
    </div>
  );
}
