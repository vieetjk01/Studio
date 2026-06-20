import { createClient } from "@/lib/supabase/server";
import { effectivePlan } from "@/lib/plans";
import SiteManager from "./SiteManager";
import type { Site, SiteBlock } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SiteBuilderPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // middleware redirects unauthenticated users

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const plan = profile ? effectivePlan(profile.plan, profile.plan_expires_at) : "free";
  const allowed = profile?.role === "admin" || plan === "photographer" || plan === "studio";
  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Photographer trở lên</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Trang web portfolio riêng dành cho tài khoản gói <b>Photographer</b> hoặc <b>Studio</b>.</p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem các gói</a>
        </div>
      </div>
    );
  }

  let { data: site } = await supabase.from("sites").select("*").eq("owner_id", user.id).maybeSingle();
  if (!site) {
    const { data: created } = await supabase.from("sites").insert({ owner_id: user.id }).select("*").single();
    site = created;
  }
  const { data: blocks } = await supabase.from("site_blocks").select("*").eq("site_id", (site as Site).id).order("position");

  return (
    <SiteManager
      site={site as Site}
      initialBlocks={(blocks ?? []) as SiteBlock[]}
      plan={plan}
      isAdmin={profile?.role === "admin"}
      mainHost={process.env.NEXT_PUBLIC_MAIN_HOST || ""}
    />
  );
}
