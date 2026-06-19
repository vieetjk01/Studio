import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c));

/** Send a reminder/notification email to a client. Studio-plan accounts only. */
export async function POST(req: Request) {
  const me = await requireStudio();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { to, subject, message } = (await req.json().catch(() => ({}))) as {
    to?: string;
    subject?: string;
    message?: string;
  };
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }
  const body = (message || "").trim();
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.6">${esc(body).replace(/\n/g, "<br>")}</div>`;

  const r = await sendEmail({ to, subject: subject?.trim() || "Thông báo từ studio", html });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "not_configured" ? 503 : 500 });
  return NextResponse.json({ ok: true });
}
