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

type Kind = "basic" | "picker";

interface Status {
  userId: string;
  isAdmin: boolean;
  basicLimit: number | null; // per day; null = unlimited
  basicUsed: number; // today
  pickerLimit: number | null; // lifetime; null = unlimited
  pickerUsed: number; // lifetime total
}

async function getStatus(): Promise<Status | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, compress_daily_limit, compress_picker_limit")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  const db = createAdminClient();

  const { count: basicUsed } = await db
    .from("compress_usages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("kind", "basic")
    .gte("created_at", startOfTodayVN());

  const { count: pickerUsed } = await db
    .from("compress_usages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("kind", "picker");

  return {
    userId: user.id,
    isAdmin,
    basicLimit: isAdmin ? null : profile?.compress_daily_limit ?? null,
    basicUsed: basicUsed ?? 0,
    pickerLimit: isAdmin ? null : profile?.compress_picker_limit ?? null,
    pickerUsed: pickerUsed ?? 0,
  };
}

function quota(limit: number | null, used: number) {
  const unlimited = limit === null;
  return {
    unlimited,
    limit,
    used,
    remaining: unlimited ? null : Math.max(0, (limit ?? 0) - used),
  };
}

function body(s: Status) {
  return {
    ok: true,
    basic: quota(s.basicLimit, s.basicUsed),
    picker: quota(s.pickerLimit, s.pickerUsed),
  };
}

/** Read the caller's compress quota status (basic + picker). */
export async function GET() {
  const s = await getStatus();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(body(s));
}

/** Consume one compress use of the given kind (call right before compressing). */
export async function POST(req: Request) {
  const s = await getStatus();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { kind } = (await req.json().catch(() => ({}))) as { kind?: Kind };
  const k: Kind = kind === "picker" ? "picker" : "basic";

  const limit = k === "picker" ? s.pickerLimit : s.basicLimit;
  const used = k === "picker" ? s.pickerUsed : s.basicUsed;

  if (limit !== null && used >= limit) {
    return NextResponse.json({ ok: false, kind: k, ...body(s) }, { status: 429 });
  }

  const db = createAdminClient();
  await db.from("compress_usages").insert({ user_id: s.userId, kind: k });

  // Reflect the just-consumed use in the returned counts.
  if (k === "picker") s.pickerUsed += 1;
  else s.basicUsed += 1;
  return NextResponse.json({ ...body(s), kind: k });
}
