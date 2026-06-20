import Link from "next/link";
import { Phone, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import { contractTotal, sumAmounts, vnd, LEAD_SOURCE_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  const profile = await requireStudio();
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Tính năng này chỉ dành cho tài khoản gói Studio.</p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("studio_contracts")
    .select("client_name, client_phone, event_date, source, status, contract_items(qty, unit_price), contract_payments(amount)")
    .eq("owner_id", profile.id);

  const rows = (data ?? []) as unknown as Row[];

  type Agg = {
    key: string;
    name: string;
    phone: string;
    count: number;
    value: number;
    collected: number;
    last: string | null;
    source: string | null;
  };
  const map = new Map<string, Agg>();
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
  const returning = clients.filter((c) => c.count > 1).length;

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Quản lý studio</p>
        <h1 className="font-serif text-3xl font-medium">Khách hàng</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          {clients.length} khách · {returning} khách quay lại (chụp ≥ 2 lần)
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Chưa có khách hàng nào.</div>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <Link
              key={c.key}
              href={`/dashboard/studio/clients/${encodeURIComponent(digits(c.phone) || c.key)}`}
              className="card flex flex-col gap-2 p-4 transition-colors hover:bg-[var(--surface2)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {c.name}
                  {c.count > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--surface2)", color: "#7bb38a" }}>
                      <Repeat size={10} /> khách cũ
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text3)" }}>
                  <Phone size={12} /> {c.phone || "—"} · {c.count} hợp đồng
                  {c.source ? ` · ${LEAD_SOURCE_LABEL[c.source] || c.source}` : ""}
                  {c.last ? ` · gần nhất ${c.last}` : ""}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-serif text-lg font-medium">{vnd(c.value)}</p>
                <p className="text-xs" style={{ color: "var(--text3)" }}>đã thu {vnd(c.collected)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
