"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Shirt, PackageOpen, Boxes, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  RENTAL_CATEGORIES,
  RENTAL_CATEGORY_LABEL,
  RENTAL_ITEM_STATUS_LABEL,
  RENTAL_ORDER_STATUS_LABEL,
  vnd,
  type RentalCategory,
  type RentalItem,
  type RentalItemStatus,
  type RentalOrderStatus,
  type RentalOrderWithItems,
} from "@/lib/types";

type Tab = "inventory" | "orders";

const ITEM_STATUSES: RentalItemStatus[] = ["available", "maintenance", "retired"];
const ORDER_STATUSES: RentalOrderStatus[] = [
  "booked",
  "picked_up",
  "returned",
  "overdue",
  "canceled",
];

export default function RentalManager({
  ownerId,
  initialItems,
  initialOrders,
}: {
  ownerId: string;
  initialItems: RentalItem[];
  initialOrders: RentalOrderWithItems[];
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("inventory");
  const [items, setItems] = useState<RentalItem[]>(initialItems);
  const [orders, setOrders] = useState<RentalOrderWithItems[]>(initialOrders);

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-medium">Thuê đồ</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          Quản lý kho trang phục (váy cưới, vest, áo dài, phụ kiện) &amp; đơn cho thuê.
        </p>
      </div>

      <div className="mb-5 inline-flex rounded-xl p-1" style={{ background: "var(--surface2, var(--bg2))" }}>
        <button
          onClick={() => setTab("inventory")}
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition"
          style={tab === "inventory" ? { background: "var(--card, #fff)", boxShadow: "0 1px 2px rgba(0,0,0,.08)" } : { color: "var(--text2)" }}
        >
          <Boxes size={15} /> Kho trang phục
        </button>
        <button
          onClick={() => setTab("orders")}
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition"
          style={tab === "orders" ? { background: "var(--card, #fff)", boxShadow: "0 1px 2px rgba(0,0,0,.08)" } : { color: "var(--text2)" }}
        >
          <ClipboardList size={15} /> Đơn thuê
        </button>
      </div>

      {tab === "inventory" ? (
        <Inventory supabase={supabase} ownerId={ownerId} items={items} setItems={setItems} />
      ) : (
        <Orders supabase={supabase} ownerId={ownerId} items={items} orders={orders} setOrders={setOrders} />
      )}
    </div>
  );
}

/* ─────────────────────────── Kho trang phục ─────────────────────────── */

function Inventory({
  supabase,
  ownerId,
  items,
  setItems,
}: {
  supabase: ReturnType<typeof createClient>;
  ownerId: string;
  items: RentalItem[];
  setItems: React.Dispatch<React.SetStateAction<RentalItem[]>>;
}) {
  const emptyForm = {
    name: "",
    category: "dress" as RentalCategory,
    code: "",
    size: "",
    color: "",
    rental_price: "",
    deposit: "",
    quantity: "1",
  };
  const [f, setF] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<RentalCategory, RentalItem[]>();
    for (const it of items) {
      const arr = map.get(it.category) ?? [];
      arr.push(it);
      map.set(it.category, arr);
    }
    return map;
  }, [items]);

  async function add() {
    if (!f.name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("rental_items")
      .insert({
        owner_id: ownerId,
        name: f.name.trim(),
        category: f.category,
        code: f.code.trim() || null,
        size: f.size.trim() || null,
        color: f.color.trim() || null,
        rental_price: Number(f.rental_price) || 0,
        deposit: Number(f.deposit) || 0,
        quantity: Number(f.quantity) || 1,
      })
      .select("*")
      .single();
    setBusy(false);
    if (!error && data) {
      setItems((p) => [...p, data as RentalItem]);
      setF(emptyForm);
    }
  }

  async function remove(id: string) {
    await supabase.from("rental_items").delete().eq("id", id);
    setItems((p) => p.filter((e) => e.id !== id));
  }

  async function setStatus(id: string, status: RentalItemStatus) {
    await supabase.from("rental_items").update({ status }).eq("id", id);
    setItems((p) => p.map((e) => (e.id === id ? { ...e, status } : e)));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card h-fit p-6">
        <h2 className="mb-4 font-serif text-lg font-medium">Thêm trang phục</h2>
        <div className="space-y-3">
          <div className="field"><label className="label">Tên</label><input className="input" placeholder="VD: Váy cưới đuôi cá trắng" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} /></div>
          <div className="field">
            <label className="label">Loại</label>
            <select className="input" value={f.category} onChange={(e) => setF((p) => ({ ...p, category: e.target.value as RentalCategory }))}>
              {RENTAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{RENTAL_CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field"><label className="label">Mã</label><input className="input" placeholder="SKU" value={f.code} onChange={(e) => setF((p) => ({ ...p, code: e.target.value }))} /></div>
            <div className="field"><label className="label">Số lượng</label><input className="input" type="number" min={1} value={f.quantity} onChange={(e) => setF((p) => ({ ...p, quantity: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field"><label className="label">Size</label><input className="input" value={f.size} onChange={(e) => setF((p) => ({ ...p, size: e.target.value }))} /></div>
            <div className="field"><label className="label">Màu</label><input className="input" value={f.color} onChange={(e) => setF((p) => ({ ...p, color: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field"><label className="label">Giá thuê</label><input className="input" type="number" min={0} placeholder="0" value={f.rental_price} onChange={(e) => setF((p) => ({ ...p, rental_price: e.target.value }))} /></div>
            <div className="field"><label className="label">Tiền cọc</label><input className="input" type="number" min={0} placeholder="0" value={f.deposit} onChange={(e) => setF((p) => ({ ...p, deposit: e.target.value }))} /></div>
          </div>
          <button onClick={add} disabled={busy} className="btn-primary w-full"><Plus size={15} /> {busy ? "Đang thêm…" : "Thêm vào kho"}</button>
        </div>
      </div>

      <div className="lg:col-span-2">
        {items.length === 0 ? (
          <div className="card flex items-center justify-center py-16 text-sm" style={{ color: "var(--text3)" }}>Chưa có trang phục nào.</div>
        ) : (
          <div className="space-y-6">
            {RENTAL_CATEGORIES.filter((c) => grouped.has(c)).map((c) => (
              <div key={c}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text2)" }}>
                  <Shirt size={15} /> {RENTAL_CATEGORY_LABEL[c]}
                  <span className="text-xs font-normal" style={{ color: "var(--text3)" }}>({grouped.get(c)!.length})</span>
                </h3>
                <div className="space-y-2">
                  {grouped.get(c)!.map((e) => (
                    <div key={e.id} className="card flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {e.name}
                          {e.code ? <span className="ml-2 text-xs font-normal" style={{ color: "var(--text3)" }}>#{e.code}</span> : null}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text3)" }}>
                          {[e.size && `Size ${e.size}`, e.color, `SL ${e.quantity}`].filter(Boolean).join(" · ")}
                          {e.rental_price ? ` · Thuê ${vnd(e.rental_price)}` : ""}
                          {e.deposit ? ` · Cọc ${vnd(e.deposit)}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <select
                          className="input !h-8 !py-0 text-xs"
                          value={e.status}
                          onChange={(ev) => setStatus(e.id, ev.target.value as RentalItemStatus)}
                        >
                          {ITEM_STATUSES.map((s) => (
                            <option key={s} value={s}>{RENTAL_ITEM_STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                        <button onClick={() => remove(e.id)} className="btn-ghost px-2.5 py-1.5 text-xs"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Đơn thuê ─────────────────────────────── */

type Line = { item_id: string; name: string; price: number; qty: number };

function Orders({
  supabase,
  ownerId,
  items,
  orders,
  setOrders,
}: {
  supabase: ReturnType<typeof createClient>;
  ownerId: string;
  items: RentalItem[];
  orders: RentalOrderWithItems[];
  setOrders: React.Dispatch<React.SetStateAction<RentalOrderWithItems[]>>;
}) {
  const emptyForm = {
    client_name: "",
    client_phone: "",
    pickup_date: "",
    return_date: "",
    deposit_paid: "",
  };
  const [f, setF] = useState(emptyForm);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);

  const availableItems = items.filter((i) => i.status === "available");
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  function addLine(itemId: string) {
    const it = items.find((i) => i.id === itemId);
    if (!it) return;
    setLines((p) => {
      if (p.some((l) => l.item_id === itemId)) return p;
      return [...p, { item_id: it.id, name: it.name, price: it.rental_price, qty: 1 }];
    });
  }

  function removeLine(itemId: string) {
    setLines((p) => p.filter((l) => l.item_id !== itemId));
  }

  async function create() {
    if (!f.client_name.trim() || lines.length === 0) return;
    setBusy(true);
    const { data: order, error } = await supabase
      .from("rental_orders")
      .insert({
        owner_id: ownerId,
        client_name: f.client_name.trim(),
        client_phone: f.client_phone.trim() || null,
        pickup_date: f.pickup_date || null,
        return_date: f.return_date || null,
        total_price: total,
        deposit_paid: Number(f.deposit_paid) || 0,
      })
      .select("*")
      .single();

    if (error || !order) {
      setBusy(false);
      return;
    }

    const { data: lineRows } = await supabase
      .from("rental_order_items")
      .insert(
        lines.map((l) => ({
          order_id: order.id,
          item_id: l.item_id,
          name: l.name,
          price: l.price,
          qty: l.qty,
        }))
      )
      .select("*");

    setBusy(false);
    setOrders((p) => [{ ...(order as RentalOrderWithItems), items: lineRows ?? [] }, ...p]);
    setF(emptyForm);
    setLines([]);
  }

  async function setStatus(id: string, status: RentalOrderStatus) {
    const patch: Record<string, unknown> = { status };
    if (status === "returned") patch.returned_at = new Date().toISOString().slice(0, 10);
    await supabase.from("rental_orders").update(patch).eq("id", id);
    setOrders((p) => p.map((o) => (o.id === id ? { ...o, status, returned_at: status === "returned" ? patch.returned_at as string : o.returned_at } : o)));
  }

  async function remove(id: string) {
    await supabase.from("rental_orders").delete().eq("id", id);
    setOrders((p) => p.filter((o) => o.id !== id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card h-fit p-6">
        <h2 className="mb-4 font-serif text-lg font-medium">Tạo đơn thuê</h2>
        <div className="space-y-3">
          <div className="field"><label className="label">Tên khách</label><input className="input" value={f.client_name} onChange={(e) => setF((p) => ({ ...p, client_name: e.target.value }))} /></div>
          <div className="field"><label className="label">SĐT</label><input className="input" value={f.client_phone} onChange={(e) => setF((p) => ({ ...p, client_phone: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field"><label className="label">Ngày nhận</label><input className="input" type="date" value={f.pickup_date} onChange={(e) => setF((p) => ({ ...p, pickup_date: e.target.value }))} /></div>
            <div className="field"><label className="label">Ngày trả</label><input className="input" type="date" value={f.return_date} onChange={(e) => setF((p) => ({ ...p, return_date: e.target.value }))} /></div>
          </div>

          <div className="field">
            <label className="label">Chọn trang phục</label>
            <select className="input" value="" onChange={(e) => { if (e.target.value) addLine(e.target.value); }}>
              <option value="">+ Thêm món…</option>
              {availableItems.map((i) => (
                <option key={i.id} value={i.id}>{RENTAL_CATEGORY_LABEL[i.category]} · {i.name} ({vnd(i.rental_price)})</option>
              ))}
            </select>
          </div>

          {lines.length > 0 && (
            <div className="space-y-2 rounded-xl p-3" style={{ background: "var(--surface2, var(--bg2))" }}>
              {lines.map((l) => (
                <div key={l.item_id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{l.name}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span style={{ color: "var(--text3)" }}>{vnd(l.price * l.qty)}</span>
                    <button onClick={() => removeLine(l.item_id)} className="text-xs" style={{ color: "var(--text3)" }}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
                <span>Tổng</span><span>{vnd(total)}</span>
              </div>
            </div>
          )}

          <div className="field"><label className="label">Cọc đã thu</label><input className="input" type="number" min={0} placeholder="0" value={f.deposit_paid} onChange={(e) => setF((p) => ({ ...p, deposit_paid: e.target.value }))} /></div>
          <button onClick={create} disabled={busy || !f.client_name.trim() || lines.length === 0} className="btn-primary w-full"><Plus size={15} /> {busy ? "Đang tạo…" : "Tạo đơn"}</button>
        </div>
      </div>

      <div className="lg:col-span-2">
        {orders.length === 0 ? (
          <div className="card flex items-center justify-center py-16 text-sm" style={{ color: "var(--text3)" }}>Chưa có đơn thuê nào.</div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <PackageOpen size={15} style={{ color: "var(--text3)" }} />
                      {o.client_name}
                      {o.client_phone ? <span className="text-xs font-normal" style={{ color: "var(--text3)" }}>· {o.client_phone}</span> : null}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text3)" }}>
                      {o.items.map((l) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ""}`).join(", ") || "—"}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text3)" }}>
                      {[o.pickup_date && `Nhận ${o.pickup_date}`, o.return_date && `Trả ${o.return_date}`].filter(Boolean).join(" · ")}
                      {` · Tổng ${vnd(o.total_price)}`}
                      {o.deposit_paid ? ` · Cọc ${vnd(o.deposit_paid)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      className="input !h-8 !py-0 text-xs"
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value as RentalOrderStatus)}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>{RENTAL_ORDER_STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                    <button onClick={() => remove(o.id)} className="btn-ghost px-2.5 py-1.5 text-xs"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
