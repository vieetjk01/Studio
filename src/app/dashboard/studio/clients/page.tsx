import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import { contractTotal, sumAmounts } from "@/lib/types";
import ClientsView, { type ClientAgg } from "./ClientsView";


const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

type Row = {
  client_name: string | null;
  client_phone: string | null;
  event_date: string | null;
  source: string | null;
  status: string;
  contract_items: { qty: number; unit_price: number }[];
  contract_payments: { amount: number }[];
};

export default async function ClientsPage() {
  const profile = await requireStudio("booking");
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Photographer trở lên</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Tính năng này chỉ dành cho tài khoản gói Studio.</p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Nâng cấp gói</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  let cq = supabase
    .from("studio_contracts")
    .select("client_name, client_phone, event_date, source, status, contract_items(qty, unit_price), contract_payments(amount)")
    .eq("owner_id", profile.id);
  if (profile.actingRole === "staff") cq = cq.eq("assigned_to", profile.actingUserId);
  const { data } = await cq;

  const rows = (data ?? []) as unknown as Row[];

  const map = new Map<string, ClientAgg>();
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    const key = digits(r.client_phone) || (r.client_name || "").trim().toLowerCase();
    if (!key) continue;
    const a = map.get(key) ?? { key, name: r.client_name || r.client_phone || "—", phone: r.client_phone || "", count: 0, value: 0, collected: 0, last: null, source: r.source };
    a.count += 1;
    a.value += contractTotal(r.contract_items || []);
    a.collected += sumAmounts(r.contract_payments || []);
    if (r.client_name) a.name = r.client_name;
    if (r.event_date && (!a.last || r.event_date > a.last)) a.last = r.event_date;
    if (r.source) a.source = r.source;
    map.set(key, a);
  }
  const clients = Array.from(map.values()).sort((x, y) => (y.last || "").localeCompare(x.last || ""));

  return <ClientsView clients={clients} />;
}
