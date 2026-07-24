import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// The /api/img durable cache (DRIVE_IMG_CACHE_BUCKET). Files are content-
// addressed (`<id>_w<width>.jpg`, `<id>_orig`) and never mutate, so nothing
// tracks them in the DB — this job bounds bucket growth by age instead.
const BUCKET = process.env.DRIVE_IMG_CACHE_BUCKET || "";
// Evict cache objects older than this many days. A deleted object is simply
// re-fetched + re-cached on its next request (one Vercel fetch), so eviction is
// safe — it only trades a rare cache miss for reclaimed Supabase storage.
const MAX_AGE_DAYS = Number(process.env.DRIVE_IMG_CACHE_MAX_AGE_DAYS || "60");
const PAGE = 1000; // Supabase Storage list() hard cap per call.

// Weekly job: prune the drive-image cache bucket so storage doesn't grow
// unbounded as new albums are viewed. Scheduled via vercel.json crons.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!BUCKET) return NextResponse.json({ ok: true, skipped: "no cache bucket configured" });

  const db = createAdminClient();
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 3600 * 1000;
  let removed = 0;
  let scanned = 0;

  // Oldest-first: each round removes the stale head of the bucket. Because the
  // deleted objects vanish, we can keep listing from offset 0 until a page
  // surfaces a non-stale (recent) object — that's the age boundary, so stop.
  // Bounded round count guards against runaway loops / long function runs.
  for (let round = 0; round < 100; round++) {
    const { data, error } = await db.storage
      .from(BUCKET)
      .list("", { limit: PAGE, offset: 0, sortBy: { column: "created_at", order: "asc" } });
    if (error || !data || data.length === 0) break;
    scanned += data.length;

    // `id === null` marks a folder placeholder — skip; only prune real files.
    const stale = data
      .filter((o) => o.id && o.created_at && new Date(o.created_at).getTime() < cutoff)
      .map((o) => o.name);
    if (stale.length === 0) break;

    const { error: rmErr } = await db.storage.from(BUCKET).remove(stale);
    if (rmErr) break;
    removed += stale.length;

    // This page still held recent files → we've passed the boundary. Done.
    if (stale.length < data.length) break;
  }

  return NextResponse.json({ ok: true, bucket: BUCKET, maxAgeDays: MAX_AGE_DAYS, scanned, removed });
}
