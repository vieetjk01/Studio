import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import { vnd, CREW_ROLE_LABEL, type CrewRole } from "@/lib/types";


const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

type Row = { name: string | null; phone: string | null; role: CrewRole; status: string; salary: number };

export default async function RankingPage() {
  const profile = await requireStudio();
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("contract_crew")
    .select("name, phone, role, status, salary, contract:studio_contracts!inner(owner_id)")
    .eq("contract.owner_id", profile.id);

  const rows = (data ?? []) as unknown as Row[];
  type Agg = { key: string; name: string; role: CrewRole; jobs: number; accepted: number; earned: number };
  const map = new Map<string, Agg>();
  for (const r of rows) {
    const key = digits(r.phone) || (r.name || "").trim().toLowerCase();
    if (!key) continue;
    const a = map.get(key) ?? { key, name: r.name || r.phone || "—", role: r.role, jobs: 0, accepted: 0, earned: 0 };
    a.jobs += 1;
    if (r.status === "accepted") {
      a.accepted += 1;
      a.earned += r.salary || 0;
    }
    if (r.name) a.name = r.name;
    map.set(key, a);
  }
  const ranked = Array.from(map.values()).sort((x, y) => y.accepted - x.accepted || y.earned - x.earned);

  const medal = ["#e0b85c", "#c0c0c8", "#cd7f44"];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-medium">Xếp hạng photographer</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Theo số buổi đã nhận &amp; thu nhập từ studio.</p>
      </div>

      {ranked.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Chưa có dữ liệu.</div>
      ) : (
        <div className="space-y-2">
          {ranked.map((r, i) => (
            <div key={r.key} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full font-serif font-medium" style={{ background: "var(--surface2)", color: i < 3 ? medal[i] : "var(--text3)" }}>
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs" style={{ color: "var(--text3)" }}>
                    {CREW_ROLE_LABEL[r.role] ?? r.role} · {r.accepted}/{r.jobs} buổi nhận
                  </p>
                </div>
              </div>
              <p className="font-serif text-lg font-medium">{vnd(r.earned)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
