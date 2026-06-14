import { redirect } from "next/navigation";
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
    .single();

  if (!profile) redirect("/login");

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

  return (
    <div className="min-h-screen">
      <DashboardHeader profile={profile as Profile} />
      <main className="mx-auto max-w-6xl px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
