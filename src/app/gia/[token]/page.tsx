import { createAdminClient } from "@/lib/supabase/admin";
import { vnd, type PricelistItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PublicPricelist({ params }: { params: { token: string } }) {
  const db = createAdminClient();
  const { data: owner } = await db
    .from("profiles")
    .select("id, full_name")
    .eq("booking_token", params.token)
    .maybeSingle();

  if (!owner) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Không tìm thấy</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Link bảng giá không hợp lệ.</p>
        </div>
      </div>
    );
  }

  const { data } = await db
    .from("studio_pricelist")
    .select("*")
    .eq("owner_id", owner.id)
    .eq("active", true)
    .order("position");

  const items = (data ?? []) as PricelistItem[];

  // Group by category (keep insertion order).
  const groups: { name: string; items: PricelistItem[] }[] = [];
  for (const it of items) {
    const cat = it.category?.trim() || "Dịch vụ";
    let g = groups.find((x) => x.name === cat);
    if (!g) { g = { name: cat, items: [] }; groups.push(g); }
    g.items.push(it);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="eyebrow mb-1.5">{owner.full_name || "Studio"}</p>
      <h1 className="font-serif text-4xl font-medium">Bảng giá dịch vụ</h1>

      {items.length === 0 ? (
        <p className="mt-8 text-sm" style={{ color: "var(--text3)" }}>Chưa cập nhật bảng giá.</p>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((g) => (
            <div key={g.name}>
              <h2 className="mb-3 font-serif text-xl font-medium" style={{ color: "var(--accent)" }}>{g.name}</h2>
              <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
                {g.items.map((it) => (
                  <div key={it.id} className="flex items-start justify-between gap-4 p-4" style={{ borderColor: "var(--border)" }}>
                    <div>
                      <p className="font-medium">{it.name}</p>
                      {it.description && <p className="mt-0.5 text-sm" style={{ color: "var(--text2)" }}>{it.description}</p>}
                    </div>
                    <p className="shrink-0 font-serif text-lg font-medium">
                      {vnd(it.price)}
                      {it.unit && <span className="text-xs" style={{ color: "var(--text3)" }}> {it.unit}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs" style={{ color: "var(--text3)" }}>
        Giá có thể thay đổi theo yêu cầu cụ thể — vui lòng liên hệ studio để được tư vấn.
      </p>
    </div>
  );
}
