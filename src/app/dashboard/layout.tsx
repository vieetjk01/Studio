import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/DashboardHeader";
import type { Profile } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Authenticated but no profile row (e.g. the account was created before
  // schema.sql ran, so the new-user trigger never created a profile).
  // Don't bounce to /login — that loops. Explain how to fix it.
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="card max-w-lg p-8">
          <h1 className="font-serif text-2xl font-medium">Chưa có hồ sơ cho tài khoản này</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Bạn đã đăng nhập với <b>{user.email}</b> nhưng chưa có hàng trong bảng{" "}
            <code>profiles</code>. Chạy lệnh sau trong Supabase SQL Editor để tạo
            &amp; cấp quyền admin:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg p-4 text-left text-xs" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
{`insert into public.profiles (id, email, role, is_active, full_name)
select id, email, 'admin', true, 'Admin'
from auth.users where email = '${user.email}'
on conflict (id) do update set role='admin', is_active=true;`}
          </pre>
          <a href="/dashboard" className="btn-ghost mt-5">Tải lại</a>
        </div>
      </div>
    );
  }

  if (!profile.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="card max-w-md p-8">
          <h1 className="text-lg font-medium text-accent">
            Tài khoản chưa được kích hoạt
          </h1>
          <p className="mt-2 text-sm text-accent-muted">
            Account pending activation. Vui lòng liên hệ quản trị viên để được
            cấp quyền truy cập.
          </p>
        </div>
      </div>
    );
  }

  // On the image-tools subdomain (img.vieetjk.com) the header shows a focused
  // menu (just the compress tool) instead of the full album-management nav.
  const host = headers().get("host")?.split(":")[0] ?? "";
  const kind = process.env.NEXT_PUBLIC_IMG_HOST && host === process.env.NEXT_PUBLIC_IMG_HOST ? "img" : "app";

  return (
    <div className="min-h-screen">
      <DashboardHeader profile={profile as Profile} kind={kind} />
      <main className="mx-auto max-w-6xl px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
