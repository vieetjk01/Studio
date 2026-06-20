import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSiteBundle } from "@/lib/site-loader";
import SiteRenderer from "@/components/SiteRenderer";
import type { Site } from "@/lib/types";

export const dynamic = "force-dynamic";

// Owner-only live preview of their site (renders even when unpublished).
export default async function SitePreviewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: site } = await supabase.from("sites").select("*").eq("owner_id", user.id).maybeSingle();
  if (!site) {
    return <div className="p-10 text-center text-sm" style={{ color: "var(--text3)" }}>Chưa có trang để xem trước.</div>;
  }

  const db = createAdminClient();
  const data = await loadSiteBundle(db, site as Site, true);
  return <SiteRenderer data={data} />;
}
