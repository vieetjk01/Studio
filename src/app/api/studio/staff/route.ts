import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectivePlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

const ROLES = ["manager", "staff", "accountant"];

/** Studio owner creates a staff sub-account. */
export async function POST(req: Request) {
  const ctx = await requireStudio();
  if (!ctx || (ctx.actingRole !== "owner" && ctx.actingRole !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { email, password, full_name, role } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    full_name?: string;
    role?: string;
  };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password || password.length < 6) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  const studioRole = ROLES.includes(role || "") ? role : "staff";
  const emailNorm = email.trim().toLowerCase();
  const fullName = full_name?.trim() || emailNorm;

  const db = createAdminClient();

  // 1) Tạo tài khoản auth. Nếu email đã tồn tại → nhận tài khoản đó làm nhân viên
  //    (nhưng KHÔNG chiếm tài khoản đang trả phí / admin / thuộc studio khác).
  let userId: string;
  const { data: created, error } = await db.auth.admin.createUser({
    email: emailNorm,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created?.user) {
    userId = created.user.id;
  } else {
    const { data: existing } = await db
      .from("profiles")
      .select("id, role, plan, plan_expires_at, studio_owner_id")
      .eq("email", emailNorm)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: error?.message || "create_failed" }, { status: 500 });
    }
    const alreadyMine = existing.studio_owner_id === ctx.id;
    const isFreeUnclaimed =
      existing.role !== "admin" &&
      !existing.studio_owner_id &&
      effectivePlan(existing.plan, existing.plan_expires_at) === "free";
    if (!alreadyMine && !isFreeUnclaimed) {
      // Email đã thuộc một tài khoản trả phí / admin / studio khác.
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    userId = existing.id;
    // Đặt lại mật khẩu theo mật khẩu chủ studio nhập để nhân viên đăng nhập được.
    await db.auth.admin.updateUserById(userId, { password });
  }

  // 2) Bảo đảm hồ sơ tồn tại VÀ đã gắn với studio này. Dùng upsert thay cho update
  //    mù — không phụ thuộc thời điểm trigger handle_new_user tạo hàng profiles
  //    (tránh trường hợp update trúng 0 hàng mà vẫn báo thành công → nhân viên
  //    thành user tự do, bị bắt nâng cấp gói).
  const { error: upErr } = await db
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: emailNorm,
        full_name: fullName,
        studio_owner_id: ctx.id,
        studio_role: studioRole,
        is_active: true,
      },
      { onConflict: "id" }
    );
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // 3) Xác nhận đã gắn thành công (nếu không, báo lỗi rõ thay vì im lặng).
  const { data: check } = await db.from("profiles").select("studio_owner_id").eq("id", userId).maybeSingle();
  if (!check || check.studio_owner_id !== ctx.id) {
    return NextResponse.json({ error: "link_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Remove a staff sub-account (must belong to this studio). */
export async function DELETE(req: Request) {
  const ctx = await requireStudio();
  if (!ctx || (ctx.actingRole !== "owner" && ctx.actingRole !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const db = createAdminClient();
  const { data: staff } = await db.from("profiles").select("studio_owner_id").eq("id", id).maybeSingle();
  if (!staff || staff.studio_owner_id !== ctx.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
