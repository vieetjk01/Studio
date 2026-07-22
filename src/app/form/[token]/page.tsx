import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import IntakeForm from "./IntakeForm";

export const dynamic = "force-dynamic";

/**
 * Form điền thông tin trước buổi chụp — CÔNG KHAI, mở bằng intake_token (không
 * mật khẩu). Studio gửi link này cho khách qua Zalo kèm tin nhắc lịch.
 */
export default async function IntakeFormPage({ params }: { params: { token: string } }) {
  const db = createAdminClient();
  const { data: c } = await db
    .from("studio_contracts")
    .select("owner_id, shoot_type, client_name, title, intake_submitted_at")
    .eq("intake_token", params.token)
    .maybeSingle();

  if (!c) notFound();

  const { data: owner } = await db.from("profiles").select("full_name").eq("id", c.owner_id).maybeSingle();

  return (
    <IntakeForm
      token={params.token}
      shootType={c.shoot_type || "photo"}
      clientName={c.client_name}
      title={c.title}
      studio={owner?.full_name ?? null}
      submitted={!!c.intake_submitted_at}
    />
  );
}
