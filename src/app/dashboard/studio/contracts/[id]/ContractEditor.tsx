"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Check,
  Link as LinkIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { studioUrl } from "@/lib/hosts";
import {
  contractTotal,
  vnd,
  SHOOT_TYPE_LABEL,
  CONTRACT_STATUS_LABEL,
  CREW_ROLE_LABEL,
  CREW_STATUS_LABEL,
  type StudioContract,
  type ContractItem,
  type ContractCrew,
  type ContractEditRequest,
  type StudioCrew,
  type ShootType,
  type ContractStatus,
  type CrewRole,
  type CrewStatus,
} from "@/lib/types";

type ItemRow = { id?: string; name: string; qty: number; unit_price: number };
type CrewRow = {
  id?: string;
  name: string;
  phone: string;
  role: CrewRole;
  salary: number;
  note: string;
  status?: string;
};

const CREW_STATUS_TONE: Record<string, string> = {
  pending: "var(--text3)",
  accepted: "#7bb38a",
  declined: "#c77b7b",
};

export default function ContractEditor({
  contract,
  initialItems,
  initialCrew,
  initialRequests,
  roster,
}: {
  contract: StudioContract;
  initialItems: ContractItem[];
  initialCrew: ContractCrew[];
  initialRequests: ContractEditRequest[];
  roster: StudioCrew[];
}) {
  const router = useRouter();
  const supabase = createClient();

  // ── Contract fields ────────────────────────────────────────────
  const [f, setF] = useState({
    title: contract.title,
    code: contract.code ?? "",
    client_name: contract.client_name ?? "",
    client_phone: contract.client_phone ?? "",
    client_email: contract.client_email ?? "",
    shoot_type: contract.shoot_type as ShootType,
    status: contract.status as ContractStatus,
    event_date: contract.event_date ?? "",
    event_time: contract.event_time ?? "",
    location: contract.location ?? "",
    deposit: contract.deposit ?? 0,
    note: contract.note ?? "",
  });
  const set = (k: keyof typeof f, v: string | number) =>
    setF((p) => ({ ...p, [k]: v }) as typeof p);

  const [items, setItems] = useState<ItemRow[]>(
    initialItems.map((i) => ({ id: i.id, name: i.name, qty: i.qty, unit_price: i.unit_price }))
  );
  const [crew, setCrew] = useState<CrewRow[]>(
    initialCrew.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
      role: c.role,
      salary: c.salary,
      note: c.note ?? "",
      status: c.status,
    }))
  );
  const [requests, setRequests] = useState<ContractEditRequest[]>(initialRequests);

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toast(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2200);
  }

  const total = contractTotal(items);
  const balance = total - (Number(f.deposit) || 0);
  const payroll = crew.reduce((s, c) => s + (Number(c.salary) || 0), 0);
  const shareUrl = studioUrl(`/c/${contract.client_token}`);

  // ── Save contract fields ───────────────────────────────────────
  async function saveContract() {
    setBusy("contract");
    const { error } = await supabase
      .from("studio_contracts")
      .update({
        title: f.title.trim() || "Hợp đồng",
        code: f.code.trim() || null,
        client_name: f.client_name.trim() || null,
        client_phone: f.client_phone.trim() || null,
        client_email: f.client_email.trim() || null,
        shoot_type: f.shoot_type,
        status: f.status,
        event_date: f.event_date || null,
        event_time: f.event_time.trim() || null,
        location: f.location.trim() || null,
        deposit: Math.max(0, Math.round(Number(f.deposit) || 0)),
        note: f.note.trim() || null,
      })
      .eq("id", contract.id);
    setBusy(null);
    toast(error ? `Lỗi: ${error.message}` : "Đã lưu thông tin hợp đồng.");
    if (!error) router.refresh();
  }

  // ── Items ──────────────────────────────────────────────────────
  async function saveItems() {
    setBusy("items");
    const clean = items
      .map((i) => ({ name: i.name.trim(), qty: Math.max(0, Math.round(Number(i.qty) || 0)), unit_price: Math.max(0, Math.round(Number(i.unit_price) || 0)) }))
      .filter((i) => i.name);
    // Items aren't mutated elsewhere — replace the whole set.
    await supabase.from("contract_items").delete().eq("contract_id", contract.id);
    if (clean.length) {
      await supabase
        .from("contract_items")
        .insert(clean.map((i, idx) => ({ ...i, contract_id: contract.id, position: idx })));
    }
    const { data } = await supabase
      .from("contract_items")
      .select("*")
      .eq("contract_id", contract.id)
      .order("position");
    setItems((data ?? []).map((i) => ({ id: i.id, name: i.name, qty: i.qty, unit_price: i.unit_price })));
    setBusy(null);
    toast("Đã lưu hạng mục.");
  }

  // ── Crew ───────────────────────────────────────────────────────
  async function refetchCrew() {
    const { data } = await supabase
      .from("contract_crew")
      .select("*")
      .eq("contract_id", contract.id)
      .order("position");
    setCrew(
      (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone ?? "",
        role: c.role,
        salary: c.salary,
        note: c.note ?? "",
        status: c.status,
      }))
    );
  }

  async function saveCrew() {
    setBusy("crew");
    for (let idx = 0; idx < crew.length; idx++) {
      const c = crew[idx];
      if (!c.name.trim() && !c.phone.trim()) continue;
      const row = {
        name: c.name.trim(),
        phone: c.phone.trim() || null,
        role: c.role,
        salary: Math.max(0, Math.round(Number(c.salary) || 0)),
        note: c.note.trim() || null,
        position: idx,
      };
      if (c.id) {
        await supabase.from("contract_crew").update(row).eq("id", c.id);
      } else {
        await supabase.from("contract_crew").insert({ ...row, contract_id: contract.id });
      }
    }
    await refetchCrew();
    setBusy(null);
    toast("Đã lưu nhân sự & lương.");
  }

  async function deleteCrew(id?: string, idx?: number) {
    if (id) await supabase.from("contract_crew").delete().eq("id", id);
    setCrew((p) => p.filter((_, i) => i !== idx));
  }

  // ── Edit requests ──────────────────────────────────────────────
  async function resolveRequest(id: string) {
    await supabase
      .from("contract_edit_requests")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    setRequests((p) => p.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));
  }

  async function deleteContract() {
    if (!confirm("Xoá hợp đồng này? Mọi hạng mục, nhân sự & yêu cầu sẽ bị xoá theo.")) return;
    setBusy("delete");
    const { error } = await supabase.from("studio_contracts").delete().eq("id", contract.id);
    if (error) {
      setBusy(null);
      toast(`Lỗi: ${error.message}`);
      return;
    }
    router.push("/dashboard/studio/contracts");
  }

  const openRequests = requests.filter((r) => r.status === "open");

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      {msg && (
        <div
          className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          {msg}
        </div>
      )}

      <Link
        href="/dashboard/studio/contracts"
        className="mb-5 inline-flex items-center gap-1.5 text-sm"
        style={{ color: "var(--text3)" }}
      >
        <ArrowLeft size={15} /> Hợp đồng
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">{SHOOT_TYPE_LABEL[f.shoot_type]}</p>
          <h1 className="font-serif text-3xl font-medium">{f.title || "Hợp đồng"}</h1>
        </div>
        <button onClick={deleteContract} disabled={busy === "delete"} className="btn-danger px-3 py-2 text-xs">
          <Trash2 size={14} /> Xoá
        </button>
      </div>

      {/* Share link */}
      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        <LinkIcon size={16} style={{ color: "var(--text3)" }} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>
            Link cho khách xem hợp đồng (mật khẩu = SĐT khách)
          </p>
          <p className="truncate text-sm" style={{ color: "var(--text2)" }}>{shareUrl}</p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="btn-ghost px-3 py-2 text-xs"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Đã chép" : "Chép link"}
        </button>
      </div>

      {/* Open edit requests banner */}
      {openRequests.length > 0 && (
        <div className="card mb-6 p-5" style={{ borderColor: "#c7a76b55" }}>
          <h2 className="mb-3 font-serif text-lg font-medium" style={{ color: "#c7a76b" }}>
            Khách yêu cầu chỉnh sửa ({openRequests.length})
          </h2>
          <ul className="space-y-2">
            {openRequests.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                <div>
                  <p className="text-sm">{r.message}</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "var(--text3)" }}>
                    {new Date(r.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
                <button onClick={() => resolveRequest(r.id)} className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs">
                  <Check size={13} /> Đã xử lý
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: details + items + crew */}
        <div className="space-y-6 lg:col-span-2">
          {/* Details */}
          <div className="card p-6">
            <h2 className="mb-4 font-serif text-lg font-medium">Thông tin hợp đồng</h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Tên hợp đồng</label>
                  <input className="input" value={f.title} onChange={(e) => set("title", e.target.value)} />
                </div>
                <div>
                  <label className="label">Mã hợp đồng</label>
                  <input className="input" placeholder="HD-2026-001" value={f.code} onChange={(e) => set("code", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Khách hàng</label>
                  <input className="input" value={f.client_name} onChange={(e) => set("client_name", e.target.value)} />
                </div>
                <div>
                  <label className="label">SĐT khách</label>
                  <input className="input" value={f.client_phone} onChange={(e) => set("client_phone", e.target.value)} />
                </div>
                <div>
                  <label className="label">Email khách</label>
                  <input className="input" value={f.client_email} onChange={(e) => set("client_email", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Loại dịch vụ</label>
                  <select className="input" value={f.shoot_type} onChange={(e) => set("shoot_type", e.target.value)}>
                    {(Object.keys(SHOOT_TYPE_LABEL) as ShootType[]).map((k) => (
                      <option key={k} value={k}>{SHOOT_TYPE_LABEL[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Ngày</label>
                  <input type="date" className="input" value={f.event_date} onChange={(e) => set("event_date", e.target.value)} />
                </div>
                <div>
                  <label className="label">Giờ</label>
                  <input className="input" placeholder="08:00" value={f.event_time} onChange={(e) => set("event_time", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Địa điểm</label>
                <input className="input" value={f.location} onChange={(e) => set("location", e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Trạng thái</label>
                  <select className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
                    {(Object.keys(CONTRACT_STATUS_LABEL) as ContractStatus[]).map((k) => (
                      <option key={k} value={k}>{CONTRACT_STATUS_LABEL[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tiền cọc (đ)</label>
                  <input type="number" className="input" value={f.deposit} onChange={(e) => set("deposit", Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="label">Ghi chú</label>
                <textarea className="input min-h-[80px]" value={f.note} onChange={(e) => set("note", e.target.value)} />
              </div>
              <button onClick={saveContract} disabled={busy === "contract"} className="btn-primary">
                {busy === "contract" ? "Đang lưu…" : "Lưu thông tin"}
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-medium">Hạng mục &amp; báo giá</h2>
              <button
                onClick={() => setItems((p) => [...p, { name: "", qty: 1, unit_price: 0 }])}
                className="btn-ghost px-2.5 py-1.5 text-xs"
              >
                <Plus size={14} /> Thêm hạng mục
              </button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có hạng mục. Bấm “Thêm hạng mục”.</p>
            ) : (
              <div className="space-y-2">
                <div className="hidden grid-cols-12 gap-2 px-1 text-[11px] uppercase tracking-wide sm:grid" style={{ color: "var(--text3)" }}>
                  <span className="col-span-6">Hạng mục</span>
                  <span className="col-span-2 text-center">SL</span>
                  <span className="col-span-3 text-right">Đơn giá</span>
                  <span className="col-span-1" />
                </div>
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center gap-2">
                    <input
                      className="input col-span-12 sm:col-span-6"
                      placeholder="VD: Chụp phóng sự cả ngày"
                      value={it.name}
                      onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                    />
                    <input
                      type="number"
                      className="input col-span-3 text-center sm:col-span-2"
                      value={it.qty}
                      onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))}
                    />
                    <input
                      type="number"
                      className="input col-span-7 text-right sm:col-span-3"
                      value={it.unit_price}
                      onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, unit_price: Number(e.target.value) } : x)))}
                    />
                    <button
                      onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                      className="col-span-2 flex justify-center sm:col-span-1"
                      style={{ color: "var(--text3)" }}
                      aria-label="Xoá"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm" style={{ color: "var(--text2)" }}>Tổng giá trị hợp đồng</span>
              <span className="font-serif text-xl font-medium">{vnd(total)}</span>
            </div>
            <button onClick={saveItems} disabled={busy === "items"} className="btn-primary mt-4">
              {busy === "items" ? "Đang lưu…" : "Lưu hạng mục"}
            </button>
          </div>

          {/* Crew */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-medium">Photographer / Cameramen</h2>
              <button
                onClick={() => setCrew((p) => [...p, { name: "", phone: "", role: "photographer", salary: 0, note: "" }])}
                className="btn-ghost px-2.5 py-1.5 text-xs"
              >
                <Plus size={14} /> Thêm người
              </button>
            </div>

            {roster.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>Chọn nhanh từ sổ thợ:</span>
                {roster.map((r) => (
                  <button
                    key={r.id}
                    onClick={() =>
                      setCrew((p) => [...p, { name: r.name, phone: r.phone, role: r.role, salary: 0, note: "" }])
                    }
                    className="rounded-full px-2.5 py-1 text-xs"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                  >
                    + {r.name || r.phone}
                  </button>
                ))}
              </div>
            )}

            {crew.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa gán ai cho hợp đồng này.</p>
            ) : (
              <div className="space-y-3">
                {crew.map((c, idx) => (
                  <div key={idx} className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <div className="grid gap-2 sm:grid-cols-12">
                      <input
                        className="input sm:col-span-4"
                        placeholder="Tên"
                        value={c.name}
                        onChange={(e) => setCrew((p) => p.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                      />
                      <input
                        className="input sm:col-span-3"
                        placeholder="SĐT"
                        value={c.phone}
                        onChange={(e) => setCrew((p) => p.map((x, i) => (i === idx ? { ...x, phone: e.target.value } : x)))}
                      />
                      <select
                        className="input sm:col-span-3"
                        value={c.role}
                        onChange={(e) => setCrew((p) => p.map((x, i) => (i === idx ? { ...x, role: e.target.value as CrewRole } : x)))}
                      >
                        {(Object.keys(CREW_ROLE_LABEL) as CrewRole[]).map((k) => (
                          <option key={k} value={k}>{CREW_ROLE_LABEL[k]}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="input text-right sm:col-span-2"
                        placeholder="Lương"
                        value={c.salary}
                        onChange={(e) => setCrew((p) => p.map((x, i) => (i === idx ? { ...x, salary: Number(e.target.value) } : x)))}
                      />
                    </div>
                    <input
                      className="input mt-2"
                      placeholder="Yêu cầu riêng gửi cho người này (vd: mang lens 35mm, có mặt 7:30)…"
                      value={c.note}
                      onChange={(e) => setCrew((p) => p.map((x, i) => (i === idx ? { ...x, note: e.target.value } : x)))}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: CREW_STATUS_TONE[c.status || "pending"] }}>
                        {CREW_STATUS_LABEL[(c.status || "pending") as CrewStatus]}
                      </span>
                      <button onClick={() => deleteCrew(c.id, idx)} className="text-xs" style={{ color: "var(--text3)" }}>
                        <Trash2 size={14} className="inline" /> Xoá
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm" style={{ color: "var(--text2)" }}>Tổng lương nhân sự</span>
              <span className="font-serif text-lg font-medium">{vnd(payroll)}</span>
            </div>
            <button onClick={saveCrew} disabled={busy === "crew"} className="btn-primary mt-4">
              {busy === "crew" ? "Đang lưu…" : "Lưu nhân sự & lương"}
            </button>
            <p className="mt-2 text-[11px]" style={{ color: "var(--text3)" }}>
              Thợ tự nhập SĐT tại {studioUrl("/crew")} để xem việc &amp; lương của mình rồi nhận/từ chối.
            </p>
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 font-serif text-lg font-medium">Tài chính</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: "var(--text2)" }}>Giá trị hợp đồng</dt>
                <dd className="font-medium">{vnd(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--text2)" }}>Tiền cọc</dt>
                <dd className="font-medium">{vnd(Number(f.deposit) || 0)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
                <dt style={{ color: "var(--text2)" }}>Còn lại</dt>
                <dd className="font-serif text-lg font-medium">{vnd(balance)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
                <dt style={{ color: "var(--text2)" }}>Tổng lương nhân sự</dt>
                <dd className="font-medium">{vnd(payroll)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--text2)" }}>Lợi nhuận tạm tính</dt>
                <dd className="font-medium" style={{ color: total - payroll >= 0 ? "#7bb38a" : "#c77b7b" }}>
                  {vnd(total - payroll)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
