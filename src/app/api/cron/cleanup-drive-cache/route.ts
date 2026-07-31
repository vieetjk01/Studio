import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// The /api/img durable cache (DRIVE_IMG_CACHE_BUCKET). Files are content-
// addressed (`<id>_w<width>.jpg`, `<id>_orig`) and never mutate, so nothing
// tracks them in the DB — this job bounds bucket growth on its own.
const BUCKET = process.env.DRIVE_IMG_CACHE_BUCKET || "";
// Evict cache objects older than this many days. A deleted object is simply
// re-fetched + re-cached on its next request (one Vercel fetch), so eviction is
// safe — it only trades a rare cache miss for reclaimed Supabase storage.
const MAX_AGE_DAYS = Number(process.env.DRIVE_IMG_CACHE_MAX_AGE_DAYS || "21");
// Hard ceiling on the bucket, in bytes. Age alone cannot bound storage: a busy
// month fills the bucket long before anything turns 21 days old, which is how
// the free plan's 1 GB gets blown through. After the age sweep, keep deleting
// oldest-first until the bucket fits. Default 500 MB leaves headroom for the
// other buckets (wedding-photos, payment-proofs, logos) inside 1 GB.
const MAX_BYTES = Number(process.env.DRIVE_IMG_CACHE_MAX_BYTES || String(500 * 1024 * 1024));
const PAGE = 1000; // Supabase Storage list() hard cap per call.

type StorageObject = {
  id: string | null;
  name: string;
  created_at: string | null;
  metadata: { size?: number } | null;
};

/** Oldest-first page of real files (folder placeholders have id === null). */
async function listOldest(db: ReturnType<typeof createAdminClient>, offset: number) {
  const { data, error } = await db.storage
    .from(BUCKET)
    .list("", { limit: PAGE, offset, sortBy: { column: "created_at", order: "asc" } });
  if (error || !data) return null;
  return (data as StorageObject[]).filter((o) => o.id);
}

function sizeOf(o: StorageObject) {
  return Number(o.metadata?.size ?? 0);
}

/**
 * Daily job: prune the drive-image cache bucket so Supabase storage doesn't grow
 * unbounded as new albums are viewed. Scheduled via vercel.json crons.
 *
 * `?purge=1` empties the bucket outright — use it to reclaim space immediately
 * when the project is already over quota. Nothing is lost: every object is
 * re-derivable from Drive on the next request.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!BUCKET) return NextResponse.json({ ok: true, skipped: "no cache bucket configured" });

  const db = createAdminClient();
  const purge = req.nextUrl.searchParams.get("purge") === "1";
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 3600 * 1000;
  let removed = 0;
  let scanned = 0;
  let freed = 0;

  // ── Pass 1: age (or purge everything) ─────────────────────────────────────
  // Oldest-first from offset 0: each round removes the stale head of the
  // bucket. Because deleted objects vanish, re-listing from 0 keeps surfacing
  // the next stale batch until a page holds a non-stale object — the age
  // boundary — at which point we stop. Bounded rounds guard against runaway
  // loops and long function runs.
  for (let round = 0; round < 100; round++) {
    const files = await listOldest(db, 0);
    if (!files || files.length === 0) break;
    scanned += files.length;

    const stale = purge
      ? files
      : files.filter((o) => o.created_at && new Date(o.created_at).getTime() < cutoff);
    if (stale.length === 0) break;

    const { error: rmErr } = await db.storage.from(BUCKET).remove(stale.map((o) => o.name));
    if (rmErr) break;
    removed += stale.length;
    freed += stale.reduce((n, o) => n + sizeOf(o), 0);

    // This page still held recent files → we've passed the boundary. Done.
    if (stale.length < files.length) break;
  }

  // ── Pass 2: size ceiling ──────────────────────────────────────────────────
  // Measure what's left, then evict oldest-first until the bucket is under
  // MAX_BYTES. Skipped after a purge (bucket is already empty).
  let bytesBefore = 0;
  let bytesAfter = 0;
  if (!purge) {
    const all: StorageObject[] = [];
    for (let offset = 0; offset < 100 * PAGE; offset += PAGE) {
      const page = await listOldest(db, offset);
      if (!page || page.length === 0) break;
      all.push(...page);
      if (page.length < PAGE) break;
    }
    bytesBefore = all.reduce((n, o) => n + sizeOf(o), 0);
    bytesAfter = bytesBefore;

    if (bytesAfter > MAX_BYTES) {
      // `all` is already oldest-first; walk forward marking victims until the
      // running total fits, then delete them in list()-sized batches.
      const victims: string[] = [];
      for (const o of all) {
        if (bytesAfter <= MAX_BYTES) break;
        victims.push(o.name);
        bytesAfter -= sizeOf(o);
      }
      for (let i = 0; i < victims.length; i += PAGE) {
        const batch = victims.slice(i, i + PAGE);
        const { error } = await db.storage.from(BUCKET).remove(batch);
        if (error) break;
        removed += batch.length;
      }
      freed += bytesBefore - bytesAfter;
    }
  }

  return NextResponse.json({
    ok: true,
    bucket: BUCKET,
    mode: purge ? "purge" : "prune",
    maxAgeDays: MAX_AGE_DAYS,
    maxBytes: MAX_BYTES,
    scanned,
    removed,
    freedBytes: freed,
    bucketBytes: bytesAfter,
  });
}
