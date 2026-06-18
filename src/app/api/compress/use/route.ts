import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // Vietnam is UTC+7 (no DST)

/** ISO timestamp for the start of "today" in Vietnam time. */
function startOfTodayVN(): string {
  const vn = new Date(Date.now() + VN_OFFSET_MS);
  const startUtcMs =
    Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - VN_OFFSET_MS;
  return new Date(startUtcMs).toISOString();
}

interface Status {
  userId: string;
  isAdmin: boolean;
  limit: number | null; // null = unlimited
  used: number;
}

async function getStatus(): Promise<Status | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, compress_daily_limit")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  const limit = isAdmin ? null : profile?.compress_daily_limit ?? null;

  const db = createAdminClient();
  const { count } = await db
    .from("compress_usages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfTodayVN());

  return { userId: user.id, isAdmin, limit, used: count ?? 0 };
}

function payload(s: Status, used = s.used) {
  const unlimited = s.limit === null;
  return {
    unlimited,
    limit: s.limit,
    used,
    remaining: unlimited ? null : Math.max(0, (s.limit ?? 0) - used),
  };
}

/** Read the caller's daily compress quota status. */
export async function GET() {
  const s = await getStatus();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...payload(s) });
}

/** Consume one daily compress use (call right before compressing). */
export async function POST() {
  const s = await getStatus();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const unlimited = s.limit === null;
  if (!unlimited && s.used >= (s.limit ?? 0)) {
    return NextResponse.json({ ok: false, ...payload(s) }, { status: 429 });
  }

  const db = createAdminClient();
  await db.from("compress_usages").insert({ user_id: s.userId });

  return NextResponse.json({ ok: true, ...payload(s, s.used + 1) });
}
