import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSiteBundle } from "@/lib/site-loader";
import SiteRenderer from "@/components/SiteRenderer";
import type { Site } from "@/lib/types";

export const dynamic = "force-dynamic";

// Owner-only live preview (full-bleed, no dashboard chrome — meant for the
// builder's embedded iframe). Renders even when the site is unpublished.
export default async function SitePreviewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Cần đăng nhập để xem trước.</div>;
  }

  const { data: site } = await supabase.from("sites").select("*").eq("owner_id", user.id).maybeSingle();
  if (!site) {
    return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Chưa có trang để xem trước.</div>;
  }

  const db = createAdminClient();
  const data = await loadSiteBundle(db, site as Site, true);
  return <SiteRenderer data={data} />;
}
