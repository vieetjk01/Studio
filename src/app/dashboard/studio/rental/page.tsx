import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import type { RentalItem, RentalOrder, RentalOrderItem, RentalOrderWithItems } from "@/lib/types";
import RentalManager from "./RentalManager";

export default async function RentalPage() {
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

  const [itemsRes, ordersRes] = await Promise.all([
    supabase
      .from("rental_items")
      .select("*")
      .eq("owner_id", profile.id)
      .order("category")
      .order("name"),
    supabase
      .from("rental_orders")
      .select("*")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false }),
  ]);

  const items = (itemsRes.data ?? []) as RentalItem[];
  const orders = (ordersRes.data ?? []) as RentalOrder[];

  // Fetch the line items for the orders we loaded and group them by order.
  let ordersWithItems: RentalOrderWithItems[] = orders.map((o) => ({ ...o, items: [] }));
  if (orders.length > 0) {
    const { data: lineRows } = await supabase
      .from("rental_order_items")
      .select("*")
      .in("order_id", orders.map((o) => o.id));
    const lines = (lineRows ?? []) as RentalOrderItem[];
    const byOrder = new Map<string, RentalOrderItem[]>();
    for (const l of lines) {
      const arr = byOrder.get(l.order_id) ?? [];
      arr.push(l);
      byOrder.set(l.order_id, arr);
    }
    ordersWithItems = orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
  }

  return (
    <RentalManager
      ownerId={profile.id}
      initialItems={items}
      initialOrders={ordersWithItems}
    />
  );
}
