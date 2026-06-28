import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ContractView from "./ContractView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const db = createAdminClient();
  const { data } = await db
    .from("studio_contracts")
    .select("title, client_name, shoot_type, studio_contracts_owner:profiles!owner_id(full_name)")
    .eq("client_token", params.token)
    .maybeSingle();

  const studioName = (data?.studio_contracts_owner as { full_name?: string } | null)?.full_name || "Studio";
  const title = data?.title
    ? `${data.title}${data.client_name ? ` · ${data.client_name}` : ""}`
    : "Hợp đồng dịch vụ";
  const description = `${studioName} — xem và ký hợp đồng dịch vụ nhiếp ảnh trực tuyến.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: { card: "summary", title, description },
  };
}

export default function PublicContractPage({ params }: { params: { token: string } }) {
  return <ContractView token={params.token} />;
}
