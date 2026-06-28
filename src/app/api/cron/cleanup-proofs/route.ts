import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BUCKET = "payment-proofs";
const MARKER = `/${BUCKET}/`;

// Extract the in-bucket path from a public storage URL.
function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const i = url.indexOf(MARKER);
  return i === -1 ? null : url.slice(i + MARKER.length);
}

// Daily job: ~1 month after a contract is marked "completed", delete the
// client transfer-proof images (to reclaim storage) and notify the studio.
// Scheduled via vercel.json crons.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  // Completed long enough ago and not yet purged.
  const { data: contracts } = await db
    .from("studio_contracts")
    .select("id, owner_id, title, code")
    .eq("status", "completed")
    .lt("completed_at", cutoff)
    .is("proofs_purged_at", null)
    .limit(200);

  let purged = 0;
  for (const c of contracts ?? []) {
    // Gather every proof image tied to this contract.
    const [{ data: clientProofs }, { data: payments }] = await Promise.all([
      db.from("contract_client_proofs").select("url").eq("contract_id", c.id),
      db.from("contract_payments").select("id, proof_url").eq("contract_id", c.id).not("proof_url", "is", null),
    ]);

    const paths = [
      ...(clientProofs ?? []).map((r) => pathFromUrl(r.url)),
      ...(payments ?? []).map((r) => pathFromUrl(r.proof_url)),
    ].filter((p): p is string => !!p);

    if (paths.length > 0) {
      await db.storage.from(BUCKET).remove(paths);
    }
    // Drop the records / references that pointed at the deleted files.
    await db.from("contract_client_proofs").delete().eq("contract_id", c.id);
    if ((payments ?? []).length > 0) {
      await db.from("contract_payments").update({ proof_url: null }).eq("contract_id", c.id).not("proof_url", "is", null);
    }

    await db.from("studio_contracts").update({ proofs_purged_at: new Date().toISOString() }).eq("id", c.id);

    if (paths.length > 0) {
      await db.from("studio_notifications").insert({
        owner_id: c.owner_id,
        contract_id: c.id,
        kind: "info",
        message: `Đã tự động xoá ${paths.length} ảnh chuyển khoản của hợp đồng "${c.title || c.code || ""}" (sau 1 tháng hoàn thành) để tiết kiệm dung lượng.`,
      });
    }
    purged++;
  }

  return NextResponse.json({ ok: true, contracts: purged });
}
