import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Manage booking / upgrade requests: toggle handled or delete. Admin only. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { kind, action, id, handled } = (await req.json().catch(() => ({}))) as {
    kind?: "booking" | "upgrade" | "feedback";
    action?: "handled" | "delete";
    id?: string;
    handled?: boolean;
  };

  const table = kind === "upgrade" ? "upgrade_requests" : kind === "feedback" ? "feedbacks" : kind === "booking" ? "bookings" : null;
  if (!table || !id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = createAdminClient();
  const { error } =
    action === "delete"
      ? await db.from(table).delete().eq("id", id)
      : await db.from(table).update({ handled: !!handled }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
