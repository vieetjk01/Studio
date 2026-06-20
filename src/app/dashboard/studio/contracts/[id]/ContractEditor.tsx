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
  PenLine,
  CalendarClock,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { studioUrl, mainUrl } from "@/lib/hosts";
import ZaloButton from "@/components/ZaloButton";
import MessengerButton from "@/components/MessengerButton";
import EmailButton from "@/components/EmailButton";
import CalendarButtons from "@/components/CalendarButtons";
import SignaturePad from "@/components/SignaturePad";
import { shootReminderMessage } from "@/lib/zalo";
import {
  contractTotal,
  vnd,
  sumAmounts,
  SHOOT_TYPE_LABEL,
  CONTRACT_STATUS_LABEL,
  CREW_ROLE_LABEL,
  CREW_STATUS_LABEL,
  PAYMENT_KIND_LABEL,
  LEAD_SOURCE_LABEL,
  type StudioContract,
  type ContractItem,
  type ContractCrew,
  type ContractEditRequest,
  type ContractPayment,
  type ContractTask,
  type ContractPaymentPlan,
  type StudioCrew,
  type StudioEvent,
  type StudioExpense,
  type StudioEquipment,
  type ContractEquipment,
  type ShootType,
  type ContractStatus,
  type CrewRole,
  type CrewStatus,
  type PaymentKind,
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
  paid?: boolean;
};

const CREW_STATUS_TONE: Record<string, string> = {
  pending: "var(--text3)",
  accepted: "#7bb38a",
  declined: "#c77b7b",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ContractEditor({
  contract,
  initialItems,
  initialCrew,
  initialRequests,
  initialPayments,
  roster,
  galleries,
  selectionAlbums,
  initialMilestones,
  studioName,
  conflictByPhone,
  initialTasks,
  initialExpenses,
  initialPlan,
  equipmentRoster,
  initialEquipment,
  equipConflict,
}: {
  contract: StudioContract;
  initialItems: ContractItem[];
  initialCrew: ContractCrew[];
  initialRequests: ContractEditRequest[];
  initialPayments: ContractPayment[];
  roster: StudioCrew[];
  galleries: { id: string; title: string; slug: string }[];
  selectionAlbums: { id: string; title: string; slug: string }[];
  initialMilestones: StudioEvent[];
  studioName: string;
  conflictByPhone: Record<string, string>;
  initialTasks: ContractTask[];
  initialExpenses: StudioExpense[];
  initialPlan: ContractPaymentPlan[];
  equipmentRoster: StudioEquipment[];
  initialEquipment: ContractEquipment[];
  equipConflict: Record<string, string>;
}) {
  const conflictFor = (phone: string) => conflictByPhone[(phone || "").replace(/\D/g, "")] || null;
  const router = useRouter();
  const supabase = createClient();

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
    note: contract.note ?? "",
    gallery_album_id: contract.gallery_album_id ?? "",
    delivery_due: contract.delivery_due ?? "",
    client_messenger: contract.client_messenger ?? "",
    selection_album_id: contract.selection_album_id ?? "",
    source: contract.source ?? "",
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
      paid: c.paid,
    }))
  );
  const [requests, setRequests] = useState<ContractEditRequest[]>(initialRequests);
  const [payments, setPayments] = useState<ContractPayment[]>(initialPayments);
  const [milestones, setMilestones] = useState<StudioEvent[]>(initialMilestones);
  const [tasks, setTasks] = useState<ContractTask[]>(initialTasks);
  const [newTask, setNewTask] = useState("");
  const [expenses, setExpenses] = useState<StudioExpense[]>(initialExpenses);
  const [exp, setExp] = useState({ title: "", amount: 0, spent_at: today() });
  const [plan, setPlan] = useState<ContractPaymentPlan[]>(initialPlan);
  const [planForm, setPlanForm] = useState({ label: "", amount: 0, due_date: "" });
  const [equipment, setEquipment] = useState<ContractEquipment[]>(initialEquipment);
  const [equipName, setEquipName] = useState("");

  // new payment form
  const [pay, setPay] = useState({ amount: 0, kind: "installment" as PaymentKind, method: "", paid_at: today(), note: "" });
  // new milestone form
  const [ms, setMs] = useState({ title: "", event_date: "", event_time: "" });
  // studio signature
  const [studioSignName, setStudioSignName] = useState(contract.studio_signed_name ?? "");
  const [studioSignature, setStudioSignature] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toast(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2200);
  }

  const total = contractTotal(items);
  const collected = sumAmounts(payments);
  const balance = total - collected;
  const payroll = crew.reduce((s, c) => s + (Number(c.salary) || 0), 0);
  const paidPayroll = crew.filter((c) => c.paid).reduce((s, c) => s + (Number(c.salary) || 0), 0);
  const expenseTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const profit = total - payroll - expenseTotal;
  // Unified client portal lives on the main site (vieetjk.com/c/<token>).
  const shareUrl = mainUrl(`/c/${contract.client_token}`);

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
        note: f.note.trim() || null,
        gallery_album_id: f.gallery_album_id || null,
        delivery_due: f.delivery_due || null,
        client_messenger: f.client_messenger.trim() || null,
        selection_album_id: f.selection_album_id || null,
        source: f.source || null,
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
        paid: c.paid,
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
      if (c.id) await supabase.from("contract_crew").update(row).eq("id", c.id);
      else await supabase.from("contract_crew").insert({ ...row, contract_id: contract.id });
    }
    await refetchCrew();
    setBusy(null);
    toast("Đã lưu nhân sự & lương.");
  }

  async function togglePaid(c: CrewRow, idx: number) {
    if (!c.id) {
      toast("Lưu nhân sự trước khi đánh dấu đã trả lương.");
      return;
    }
    const next = !c.paid;
    await supabase
      .from("contract_crew")
      .update({ paid: next, paid_at: next ? new Date().toISOString() : null })
      .eq("id", c.id);
    setCrew((p) => p.map((x, i) => (i === idx ? { ...x, paid: next } : x)));
  }

  async function deleteCrew(id?: string, idx?: number) {
    if (id) await supabase.from("contract_crew").delete().eq("id", id);
    setCrew((p) => p.filter((_, i) => i !== idx));
  }

  // ── Payments ───────────────────────────────────────────────────
  async function addPayment() {
    const amount = Math.max(0, Math.round(Number(pay.amount) || 0));
    if (!amount) {
      toast("Nhập số tiền.");
      return;
    }
    setBusy("payment");
    const { data, error } = await supabase
      .from("contract_payments")
      .insert({
        contract_id: contract.id,
        amount,
        kind: pay.kind,
        method: pay.method.trim() || null,
        paid_at: pay.paid_at || today(),
        note: pay.note.trim() || null,
      })
      .select("*")
      .single();
    setBusy(null);
    if (error) {
      toast(`Lỗi: ${error.message}`);
      return;
    }
    if (data) {
      setPayments((p) => [data as ContractPayment, ...p]);
      setPay({ amount: 0, kind: "installment", method: "", paid_at: today(), note: "" });
    }
  }

  async function deletePayment(id: string) {
    await supabase.from("contract_payments").delete().eq("id", id);
    setPayments((p) => p.filter((x) => x.id !== id));
  }

  // Open a printable receipt (phiếu thu) for one payment in a new window.
  function printReceipt(p: ContractPayment) {
    const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c));
    const collectedNow = sumAmounts(payments);
    const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu thu</title>
<style>body{font-family:Georgia,serif;color:#111;max-width:560px;margin:24px auto;padding:0 24px}
h1{text-align:center;font-size:20px;margin:0}.muted{color:#555}.row{display:flex;justify-content:space-between;padding:4px 0;font-size:14px}
.tot{border-top:1px solid #333;margin-top:8px;padding-top:8px;font-weight:700}.sign{margin-top:48px;text-align:center;font-size:13px}</style></head>
<body onload="window.print()">
<h1>PHIẾU THU</h1>
<p style="text-align:center" class="muted">Số: ${esc(p.id.slice(0, 8).toUpperCase())} · ${p.paid_at}</p>
<div class="row"><span>Studio (bên thu):</span><b>${esc(studioName)}</b></div>
<div class="row"><span>Khách hàng:</span><b>${esc(f.client_name || "—")}</b></div>
<div class="row"><span>Hợp đồng:</span><span>${esc(f.title)}${f.code ? " · " + esc(f.code) : ""}</span></div>
<div class="row"><span>Nội dung:</span><span>${esc(PAYMENT_KIND_LABEL[p.kind])}${p.method ? " · " + esc(p.method) : ""}</span></div>
<div class="row tot"><span>Số tiền thu</span><span>${vnd(p.amount)}</span></div>
<div class="row"><span class="muted">Tổng giá trị HĐ</span><span class="muted">${vnd(total)}</span></div>
<div class="row"><span class="muted">Đã thu luỹ kế</span><span class="muted">${vnd(collectedNow)}</span></div>
<div class="row"><span class="muted">Còn lại</span><span class="muted">${vnd(total - collectedNow)}</span></div>
<div class="sign"><b>NGƯỜI THU</b><div style="height:60px"></div><div>${esc(studioName)}</div></div>
</body></html>`;
    const w = window.open("", "_blank", "width=640,height=720");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  // ── Milestones (shared with the studio calendar via studio_events) ─────
  async function addMilestone() {
    if (!ms.event_date) {
      toast("Chọn ngày cho mốc lịch.");
      return;
    }
    setBusy("milestone");
    const { data, error } = await supabase
      .from("studio_events")
      .insert({
        owner_id: contract.owner_id,
        contract_id: contract.id,
        title: ms.title.trim() || "Mốc lịch",
        event_date: ms.event_date,
        event_time: ms.event_time.trim() || null,
        remind: true,
      })
      .select("*")
      .single();
    setBusy(null);
    if (error) {
      toast(`Lỗi: ${error.message}`);
      return;
    }
    if (data) {
      setMilestones((p) => [...p, data as StudioEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)));
      setMs({ title: "", event_date: "", event_time: "" });
    }
  }

  async function deleteMilestone(id: string) {
    await supabase.from("studio_events").delete().eq("id", id);
    setMilestones((p) => p.filter((m) => m.id !== id));
  }

  // ── Checklist ──────────────────────────────────────────────────
  async function addTask() {
    if (!newTask.trim()) return;
    const { data } = await supabase
      .from("contract_tasks")
      .insert({ contract_id: contract.id, label: newTask.trim(), position: tasks.length })
      .select("*")
      .single();
    if (data) {
      setTasks((p) => [...p, data as ContractTask]);
      setNewTask("");
    }
  }
  async function toggleTask(t: ContractTask) {
    setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    await supabase.from("contract_tasks").update({ done: !t.done }).eq("id", t.id);
  }
  async function deleteTask(id: string) {
    await supabase.from("contract_tasks").delete().eq("id", id);
    setTasks((p) => p.filter((x) => x.id !== id));
  }
  const tasksDone = tasks.filter((t) => t.done).length;

  // ── Per-contract expenses ──────────────────────────────────────
  async function addExpense() {
    const amount = Math.max(0, Math.round(Number(exp.amount) || 0));
    if (!exp.title.trim() || !amount) return;
    const { data, error } = await supabase
      .from("studio_expenses")
      .insert({ owner_id: contract.owner_id, contract_id: contract.id, title: exp.title.trim(), amount, spent_at: exp.spent_at || today() })
      .select("*")
      .single();
    if (error) {
      toast(`Lỗi: ${error.message}`);
      return;
    }
    if (data) {
      setExpenses((p) => [data as StudioExpense, ...p]);
      setExp({ title: "", amount: 0, spent_at: today() });
    }
  }
  async function deleteExpense(id: string) {
    await supabase.from("studio_expenses").delete().eq("id", id);
    setExpenses((p) => p.filter((e) => e.id !== id));
  }

  // ── Payment schedule ───────────────────────────────────────────
  async function addPlan() {
    const amount = Math.max(0, Math.round(Number(planForm.amount) || 0));
    if (!planForm.label.trim() && !amount) return;
    const { data } = await supabase
      .from("contract_payment_plan")
      .insert({ contract_id: contract.id, label: planForm.label.trim() || "Đợt thanh toán", amount, due_date: planForm.due_date || null, position: plan.length })
      .select("*")
      .single();
    if (data) {
      setPlan((p) => [...p, data as ContractPaymentPlan]);
      setPlanForm({ label: "", amount: 0, due_date: "" });
    }
  }
  async function togglePlanPaid(it: ContractPaymentPlan) {
    const next = !it.paid;
    await supabase.from("contract_payment_plan").update({ paid: next, paid_at: next ? new Date().toISOString() : null }).eq("id", it.id);
    setPlan((p) => p.map((x) => (x.id === it.id ? { ...x, paid: next } : x)));
  }
  async function deletePlan(id: string) {
    await supabase.from("contract_payment_plan").delete().eq("id", id);
    setPlan((p) => p.filter((x) => x.id !== id));
  }
  const todayStr = today();

  // ── Equipment ──────────────────────────────────────────────────
  async function addEquipment(name: string, equipmentId: string | null) {
    if (!name.trim()) return;
    const { data } = await supabase
      .from("contract_equipment")
      .insert({ contract_id: contract.id, equipment_id: equipmentId, name: name.trim() })
      .select("*")
      .single();
    if (data) {
      setEquipment((p) => [...p, data as ContractEquipment]);
      setEquipName("");
    }
  }
  async function deleteEquipment(id: string) {
    await supabase.from("contract_equipment").delete().eq("id", id);
    setEquipment((p) => p.filter((e) => e.id !== id));
  }

  // ── Studio counter-signature ───────────────────────────────────
  async function saveStudioSignature() {
    if (!studioSignName.trim()) {
      toast("Nhập tên người ký (Bên A).");
      return;
    }
    setBusy("sign");
    const { error } = await supabase
      .from("studio_contracts")
      .update({
        studio_signed_name: studioSignName.trim(),
        ...(studioSignature ? { studio_signature: studioSignature } : {}),
        studio_signed_at: new Date().toISOString(),
      })
      .eq("id", contract.id);
    setBusy(null);
    toast(error ? `Lỗi: ${error.message}` : "Đã lưu chữ ký Bên A.");
    if (!error) router.refresh();
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
    if (!confirm("Xoá hợp đồng này? Mọi hạng mục, nhân sự, thanh toán & yêu cầu sẽ bị xoá theo.")) return;
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
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          {msg}
        </div>
      )}

      <Link href="/dashboard/studio/contracts" className="mb-5 inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--text3)" }}>
        <ArrowLeft size={15} /> Hợp đồng
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">{SHOOT_TYPE_LABEL[f.shoot_type]}</p>
          <h1 className="font-serif text-3xl font-medium">{f.title || "Hợp đồng"}</h1>
        </div>
        <div className="flex gap-2">
          <a href={shareUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-xs">
            Xem như khách
          </a>
          <button onClick={deleteContract} disabled={busy === "delete"} className="btn-danger px-3 py-2 text-xs">
            <Trash2 size={14} /> Xoá
          </button>
        </div>
      </div>

      {/* Share link */}
      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        <LinkIcon size={16} style={{ color: "var(--text3)" }} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>
            Cổng khách: xem HĐ · lịch · ảnh · thanh toán (mật khẩu = SĐT khách)
          </p>
          <p className="truncate text-sm" style={{ color: "var(--text2)" }}>{shareUrl}</p>
          <p className="text-[11px]" style={{ color: contract.client_viewed_at ? "#7bb38a" : "var(--text3)" }}>
            {contract.client_viewed_at
              ? `Khách đã xem · ${new Date(contract.client_viewed_at).toLocaleString("vi-VN")}`
              : "Khách chưa mở link"}
          </p>
        </div>
        <ZaloButton
          phone={f.client_phone}
          label="Gửi khách qua Zalo"
          message={`Xin chào ${f.client_name || "anh/chị"}, đây là hợp đồng dịch vụ của bên em. Anh/chị xem & xác nhận tại: ${shareUrl} (mật khẩu là SĐT của anh/chị). Cảm ơn ạ!`}
        />
        <MessengerButton
          link={f.client_messenger}
          label="Nhắn Messenger"
          message={`Xin chào ${f.client_name || "anh/chị"}, đây là hợp đồng dịch vụ của bên em. Anh/chị xem & xác nhận tại: ${shareUrl} (mật khẩu là SĐT của anh/chị). Cảm ơn ạ!`}
        />
        <EmailButton
          to={f.client_email}
          label="Gửi email"
          subject={`Hợp đồng dịch vụ — ${f.title}`}
          message={`Xin chào ${f.client_name || "anh/chị"},\n\nĐây là hợp đồng dịch vụ của bên em. Anh/chị xem & xác nhận tại:\n${shareUrl}\n(Mật khẩu mở là số điện thoại của anh/chị.)\n\nCảm ơn ạ!\n— ${studioName}`}
        />
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

      {/* Ask for a review */}
      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        <Star size={16} style={{ color: "#c7a76b" }} />
        <p className="min-w-0 flex-1 text-sm" style={{ color: "var(--text2)" }}>
          Xin khách đánh giá sau khi giao ảnh (gửi kèm link cổng → mục “Đánh giá studio”).
        </p>
        {(() => {
          const reviewMsg = `Cảm ơn ${f.client_name || "anh/chị"} đã tin tưởng ${studioName}! Anh/chị đánh giá giúp em tại: ${shareUrl} (mục “Đánh giá studio”). Em cảm ơn ạ!`;
          return (
            <>
              <ZaloButton phone={f.client_phone} label="Zalo" message={reviewMsg} />
              <MessengerButton link={f.client_messenger} label="Messenger" message={reviewMsg} />
              <EmailButton to={f.client_email} label="Email" subject={`Xin đánh giá — ${studioName}`} message={reviewMsg} />
            </>
          );
        })()}
      </div>

      {/* Signature banner */}
      {contract.client_signed_at && (
        <div className="card mb-6 flex flex-wrap items-center gap-4 p-5" style={{ borderColor: "#7bb38a55" }}>
          <PenLine size={18} style={{ color: "#7bb38a" }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "#7bb38a" }}>
              Khách đã ký hợp đồng
            </p>
            <p className="text-xs" style={{ color: "var(--text3)" }}>
              {contract.client_signed_name || f.client_name} · {new Date(contract.client_signed_at).toLocaleString("vi-VN")}
            </p>
          </div>
          {contract.client_signature && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={contract.client_signature} alt="Chữ ký" className="h-16 rounded bg-white p-1" />
          )}
        </div>
      )}

      {/* Open edit requests */}
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
              <div>
                <label className="label">Link Facebook/Messenger của khách</label>
                <input className="input" placeholder="m.me/… hoặc facebook.com/…" value={f.client_messenger} onChange={(e) => set("client_messenger", e.target.value)} />
                <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>Khách cũng có thể tự dán link này trong cổng khách.</p>
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
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Địa điểm</label>
                  <input className="input" value={f.location} onChange={(e) => set("location", e.target.value)} />
                </div>
                <div>
                  <label className="label">Trạng thái</label>
                  <select className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
                    {(Object.keys(CONTRACT_STATUS_LABEL) as ContractStatus[]).map((k) => (
                      <option key={k} value={k}>{CONTRACT_STATUS_LABEL[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Nguồn khách</label>
                  <select className="input" value={f.source} onChange={(e) => set("source", e.target.value)}>
                    <option value="">— Chưa rõ —</option>
                    {Object.keys(LEAD_SOURCE_LABEL).map((k) => (
                      <option key={k} value={k}>{LEAD_SOURCE_LABEL[k]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Hạn giao ảnh</label>
                <input type="date" className="input" value={f.delivery_due} onChange={(e) => set("delivery_due", e.target.value)} />
              </div>
              <div>
                <label className="label">Gallery ảnh giao khách (gắn vào cổng khách)</label>
                <select className="input" value={f.gallery_album_id} onChange={(e) => set("gallery_album_id", e.target.value)}>
                  <option value="">— Chưa gắn —</option>
                  {galleries.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
                {galleries.length === 0 && (
                  <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>
                    Chưa có gallery nào. Tạo ở mục “Gallery khách” rồi quay lại gắn.
                  </p>
                )}
              </div>
              <div>
                <label className="label">Album chọn ảnh (khách chọn ảnh trong cổng)</label>
                <select className="input" value={f.selection_album_id} onChange={(e) => set("selection_album_id", e.target.value)}>
                  <option value="">— Chưa gắn —</option>
                  {selectionAlbums.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
                {selectionAlbums.length === 0 && (
                  <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>
                    Chưa có album chọn ảnh. Tạo album ở “Tạo album” rồi quay lại gắn.
                  </p>
                )}
              </div>
              <div>
                <label className="label">Ghi chú / Điều khoản</label>
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
              <button onClick={() => setItems((p) => [...p, { name: "", qty: 1, unit_price: 0 }])} className="btn-ghost px-2.5 py-1.5 text-xs">
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
                    <input className="input col-span-12 sm:col-span-6" placeholder="VD: Chụp phóng sự cả ngày" value={it.name}
                      onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} />
                    <input type="number" className="input col-span-3 text-center sm:col-span-2" value={it.qty}
                      onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))} />
                    <input type="number" className="input col-span-7 text-right sm:col-span-3" value={it.unit_price}
                      onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, unit_price: Number(e.target.value) } : x)))} />
                    <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="col-span-2 flex justify-center sm:col-span-1" style={{ color: "var(--text3)" }} aria-label="Xoá">
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

          {/* Payments */}
          <div className="card p-6">
            <h2 className="mb-4 font-serif text-lg font-medium">Theo dõi thanh toán</h2>
            {payments.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa ghi nhận khoản thu nào.</p>
            ) : (
              <ul className="space-y-2">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                    <div>
                      <p className="text-sm font-medium">{vnd(p.amount)} · {PAYMENT_KIND_LABEL[p.kind]}</p>
                      <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                        {p.paid_at}{p.method ? ` · ${p.method}` : ""}{p.note ? ` · ${p.note}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => printReceipt(p)} className="text-[11px]" style={{ color: "var(--text2)" }}>Phiếu thu</button>
                      <button onClick={() => deletePayment(p.id)} style={{ color: "var(--text3)" }}><Trash2 size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {/* Add payment */}
            <div className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-12" style={{ borderColor: "var(--border)" }}>
              <input type="number" className="input sm:col-span-3" placeholder="Số tiền" value={pay.amount || ""} onChange={(e) => setPay((p) => ({ ...p, amount: Number(e.target.value) }))} />
              <select className="input sm:col-span-3" value={pay.kind} onChange={(e) => setPay((p) => ({ ...p, kind: e.target.value as PaymentKind }))}>
                {(Object.keys(PAYMENT_KIND_LABEL) as PaymentKind[]).map((k) => (
                  <option key={k} value={k}>{PAYMENT_KIND_LABEL[k]}</option>
                ))}
              </select>
              <input className="input sm:col-span-3" placeholder="Hình thức (CK/tiền mặt)" value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))} />
              <input type="date" className="input sm:col-span-3" value={pay.paid_at} onChange={(e) => setPay((p) => ({ ...p, paid_at: e.target.value }))} />
            </div>
            <button onClick={addPayment} disabled={busy === "payment"} className="btn-ghost mt-3">
              <Plus size={15} /> {busy === "payment" ? "Đang thêm…" : "Ghi nhận khoản thu"}
            </button>

            {/* Payment schedule */}
            <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              <h3 className="mb-1 text-sm font-medium">Lịch thu tiền (đợt &amp; ngày đến hạn)</h3>
              <p className="mb-3 text-[11px]" style={{ color: "var(--text3)" }}>Đặt các đợt cần thu — quá hạn chưa thu sẽ cảnh báo ở Tổng quan.</p>
              {plan.length > 0 && (
                <ul className="space-y-2">
                  {plan.map((it) => {
                    const overdue = !it.paid && it.due_date && it.due_date < todayStr;
                    return (
                      <li key={it.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                        <div>
                          <p className="text-sm font-medium">{vnd(it.amount)} · {it.label}</p>
                          <p className="text-[11px]" style={{ color: overdue ? "#c77b7b" : "var(--text3)" }}>
                            {it.due_date ? `hạn ${it.due_date}` : "không hạn"}{overdue ? " · quá hạn" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => togglePlanPaid(it)} className="text-[11px]" style={{ color: it.paid ? "#7bb38a" : "var(--text3)" }}>
                            {it.paid ? "✓ Đã thu" : "Đánh dấu thu"}
                          </button>
                          <button onClick={() => deletePlan(it.id)} style={{ color: "var(--text3)" }}><Trash2 size={14} /></button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-12">
                <input className="input sm:col-span-5" placeholder="Tên đợt (vd: Cọc, Đợt 2)" value={planForm.label} onChange={(e) => setPlanForm((p) => ({ ...p, label: e.target.value }))} />
                <input type="number" className="input sm:col-span-4" placeholder="Số tiền" value={planForm.amount || ""} onChange={(e) => setPlanForm((p) => ({ ...p, amount: Number(e.target.value) }))} />
                <input type="date" className="input sm:col-span-3" value={planForm.due_date} onChange={(e) => setPlanForm((p) => ({ ...p, due_date: e.target.value }))} />
              </div>
              <button onClick={addPlan} className="btn-ghost mt-3"><Plus size={15} /> Thêm đợt thu</button>
            </div>
          </div>

          {/* Per-contract expenses */}
          <div className="card p-6">
            <h2 className="mb-1 font-serif text-lg font-medium">Chi phí hợp đồng</h2>
            <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>
              Chi phí riêng cho buổi này (di chuyển, đạo cụ, thuê ngoài…) — để tính lãi/lỗ thực &amp; vào báo cáo thu chi.
            </p>
            {expenses.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có chi phí nào.</p>
            ) : (
              <ul className="space-y-2">
                {expenses.map((e) => (
                  <li key={e.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                    <div>
                      <p className="text-sm font-medium">{vnd(e.amount)} · {e.title}</p>
                      <p className="text-[11px]" style={{ color: "var(--text3)" }}>{e.spent_at}</p>
                    </div>
                    <button onClick={() => deleteExpense(e.id)} style={{ color: "var(--text3)" }}><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-12" style={{ borderColor: "var(--border)" }}>
              <input className="input sm:col-span-6" placeholder="Nội dung chi" value={exp.title} onChange={(e) => setExp((p) => ({ ...p, title: e.target.value }))} />
              <input type="number" className="input sm:col-span-3" placeholder="Số tiền" value={exp.amount || ""} onChange={(e) => setExp((p) => ({ ...p, amount: Number(e.target.value) }))} />
              <input type="date" className="input sm:col-span-3" value={exp.spent_at} onChange={(e) => setExp((p) => ({ ...p, spent_at: e.target.value }))} />
            </div>
            <button onClick={addExpense} className="btn-ghost mt-3"><Plus size={15} /> Thêm chi phí</button>
            <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm" style={{ color: "var(--text2)" }}>Tổng chi phí hợp đồng</span>
              <span className="font-serif text-lg font-medium">{vnd(expenseTotal)}</span>
            </div>
          </div>

          {/* Milestones / schedule */}
          <div className="card p-6">
            <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium">
              <CalendarClock size={18} /> Lịch &amp; mốc thời gian
            </h2>
            <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>
              Thêm các mốc (vd: chụp pre-wedding, ngày cưới, trao ảnh). Mốc cũng hiện trên Lịch &amp; cổng khách.
            </p>
            {f.event_date && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                <span className="text-sm">Buổi chính · {f.event_date}{f.event_time ? ` · ${f.event_time}` : ""}</span>
                <CalendarButtons compact event={{ date: f.event_date, time: f.event_time, title: f.title, location: f.location }} />
              </div>
            )}
            {milestones.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có mốc nào.</p>
            ) : (
              <ul className="space-y-2">
                {milestones.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                    <div>
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-[11px]" style={{ color: "var(--text3)" }}>{m.event_date}{m.event_time ? ` · ${m.event_time}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarButtons compact event={{ date: m.event_date, time: m.event_time, title: m.title, location: f.location }} />
                      <button onClick={() => deleteMilestone(m.id)} style={{ color: "var(--text3)" }}><Trash2 size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-12" style={{ borderColor: "var(--border)" }}>
              <input className="input sm:col-span-6" placeholder="Tên mốc (vd: Ngày cưới)" value={ms.title} onChange={(e) => setMs((p) => ({ ...p, title: e.target.value }))} />
              <input type="date" className="input sm:col-span-4" value={ms.event_date} onChange={(e) => setMs((p) => ({ ...p, event_date: e.target.value }))} />
              <input className="input sm:col-span-2" placeholder="08:00" value={ms.event_time} onChange={(e) => setMs((p) => ({ ...p, event_time: e.target.value }))} />
            </div>
            <button onClick={addMilestone} disabled={busy === "milestone"} className="btn-ghost mt-3">
              <Plus size={15} /> {busy === "milestone" ? "Đang thêm…" : "Thêm mốc lịch"}
            </button>
          </div>

          {/* Checklist */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-medium">Checklist công việc</h2>
              {tasks.length > 0 && (
                <span className="text-xs" style={{ color: tasksDone === tasks.length ? "#7bb38a" : "var(--text3)" }}>
                  {tasksDone}/{tasks.length} xong
                </span>
              )}
            </div>
            {tasks.length > 0 && (
              <div className="mb-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
                <div className="h-full rounded-full" style={{ width: `${(tasksDone / tasks.length) * 100}%`, background: "#7bb38a" }} />
              </div>
            )}
            {tasks.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có việc nào. Vd: đặt cọc, chụp, chọn ảnh, retouch, in album, giao.</p>
            ) : (
              <ul className="space-y-1.5">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2.5">
                    <button onClick={() => toggleTask(t)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={{ border: "1px solid var(--border2)", background: t.done ? "#7bb38a" : "transparent" }}>
                      {t.done && <Check size={13} color="#0c0c0c" />}
                    </button>
                    <span className="flex-1 text-sm" style={{ color: t.done ? "var(--text3)" : "var(--text)", textDecoration: t.done ? "line-through" : "none" }}>{t.label}</span>
                    <button onClick={() => deleteTask(t.id)} style={{ color: "var(--text3)" }}><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <input
                className="input"
                placeholder="Thêm việc…"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
              />
              <button onClick={addTask} className="btn-ghost shrink-0"><Plus size={15} /></button>
            </div>
          </div>

          {/* Crew */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-medium">Photographer / Cameramen</h2>
              <button onClick={() => setCrew((p) => [...p, { name: "", phone: "", role: "photographer", salary: 0, note: "" }])} className="btn-ghost px-2.5 py-1.5 text-xs">
                <Plus size={14} /> Thêm người
              </button>
            </div>

            {roster.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>Chọn nhanh từ sổ thợ:</span>
                {roster.map((r) => (
                  <button key={r.id} onClick={() => setCrew((p) => [...p, { name: r.name, phone: r.phone, role: r.role, salary: 0, note: "" }])} className="rounded-full px-2.5 py-1 text-xs" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    + {r.name || r.phone}
                  </button>
                ))}
              </div>
            )}

            {crew.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa gán ai cho hợp đồng này.</p>
            ) : (
              <div className="space-y-3">
                {crew.map((c, idx) => {
                  const st = (c.status || "pending") as CrewStatus;
                  return (
                    <div key={idx} className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      <div className="grid gap-2 sm:grid-cols-12">
                        <input className="input sm:col-span-4" placeholder="Tên" value={c.name} onChange={(e) => setCrew((p) => p.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} />
                        <input className="input sm:col-span-3" placeholder="SĐT" value={c.phone} onChange={(e) => setCrew((p) => p.map((x, i) => (i === idx ? { ...x, phone: e.target.value } : x)))} />
                        <select className="input sm:col-span-3" value={c.role} onChange={(e) => setCrew((p) => p.map((x, i) => (i === idx ? { ...x, role: e.target.value as CrewRole } : x)))}>
                          {(Object.keys(CREW_ROLE_LABEL) as CrewRole[]).map((k) => (
                            <option key={k} value={k}>{CREW_ROLE_LABEL[k]}</option>
                          ))}
                        </select>
                        <input type="number" className="input text-right sm:col-span-2" placeholder="Lương" value={c.salary} onChange={(e) => setCrew((p) => p.map((x, i) => (i === idx ? { ...x, salary: Number(e.target.value) } : x)))} />
                      </div>
                      <input className="input mt-2" placeholder="Yêu cầu riêng gửi cho người này (vd: mang lens 35mm, có mặt 7:30)…" value={c.note} onChange={(e) => setCrew((p) => p.map((x, i) => (i === idx ? { ...x, note: e.target.value } : x)))} />
                      {c.phone && conflictFor(c.phone) && (
                        <p className="mt-2 rounded-lg px-2.5 py-1.5 text-[11px]" style={{ background: "rgba(199,123,123,0.12)", color: "#d99" }}>
                          ⚠ {conflictFor(c.phone)} (ngày {f.event_date})
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px]" style={{ color: CREW_STATUS_TONE[st] }}>{CREW_STATUS_LABEL[st]}</span>
                          <button onClick={() => togglePaid(c, idx)} className="text-[11px]" style={{ color: c.paid ? "#7bb38a" : "var(--text3)" }}>
                            {c.paid ? "✓ Đã trả lương" : "Chưa trả lương"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <ZaloButton
                            phone={c.phone}
                            label="Nhắc Zalo"
                            message={shootReminderMessage({
                              name: c.name,
                              title: f.title,
                              date: f.event_date,
                              time: f.event_time,
                              location: f.location,
                              role: CREW_ROLE_LABEL[c.role],
                            })}
                          />
                          <button onClick={() => deleteCrew(c.id, idx)} className="text-xs" style={{ color: "var(--text3)" }}>
                            <Trash2 size={14} className="inline" /> Xoá
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
              Thợ tự nhập SĐT tại {studioUrl("/crew")} để xem việc &amp; lương rồi nhận/từ chối.
            </p>
          </div>

          {/* Equipment */}
          <div className="card p-6">
            <h2 className="mb-1 font-serif text-lg font-medium">Thiết bị</h2>
            <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>Gán máy/lens cho buổi này — cảnh báo nếu trùng buổi khác cùng ngày.</p>
            {equipmentRoster.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>Chọn nhanh:</span>
                {equipmentRoster.map((eq) => (
                  <button key={eq.id} onClick={() => addEquipment(eq.name, eq.id)} className="rounded-full px-2.5 py-1 text-xs" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    + {eq.name}
                  </button>
                ))}
              </div>
            )}
            {equipment.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa gán thiết bị nào.</p>
            ) : (
              <ul className="space-y-2">
                {equipment.map((eq) => {
                  const conflict = eq.equipment_id ? equipConflict[eq.equipment_id] : null;
                  return (
                    <li key={eq.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                      <div>
                        <p className="text-sm font-medium">{eq.name}</p>
                        {conflict && <p className="text-[11px]" style={{ color: "#d99" }}>⚠ {conflict} (ngày {f.event_date})</p>}
                      </div>
                      <button onClick={() => deleteEquipment(eq.id)} style={{ color: "var(--text3)" }}><Trash2 size={14} /></button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <input className="input" placeholder="Hoặc nhập thiết bị tự do…" value={equipName} onChange={(e) => setEquipName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addEquipment(equipName, null); }} />
              <button onClick={() => addEquipment(equipName, null)} className="btn-ghost shrink-0"><Plus size={15} /></button>
            </div>
          </div>

          {/* Studio counter-signature (Bên A) */}
          <div className="card p-6">
            <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium">
              <PenLine size={18} /> Chữ ký Bên A (Studio)
            </h2>
            <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>
              Ký xác nhận của studio — hiển thị trên bản PDF hợp đồng.
            </p>
            {contract.studio_signed_at && (
              <div className="mb-4 flex items-center gap-4 rounded-xl p-3" style={{ background: "var(--surface2)" }}>
                {contract.studio_signature && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={contract.studio_signature} alt="Chữ ký" className="h-14 rounded bg-white p-1" />
                )}
                <div className="text-xs" style={{ color: "var(--text3)" }}>
                  {contract.studio_signed_name} · {new Date(contract.studio_signed_at).toLocaleString("vi-VN")}
                </div>
              </div>
            )}
            <input className="input" placeholder="Tên người ký (đại diện studio)" value={studioSignName} onChange={(e) => setStudioSignName(e.target.value)} />
            <div className="mt-3">
              <label className="label">Chữ ký {contract.studio_signed_at ? "(ký lại nếu muốn thay)" : ""}</label>
              <SignaturePad onChange={setStudioSignature} />
            </div>
            <button onClick={saveStudioSignature} disabled={busy === "sign"} className="btn-primary mt-3">
              <PenLine size={15} /> {busy === "sign" ? "Đang lưu…" : "Lưu chữ ký Bên A"}
            </button>
          </div>
        </div>

        {/* Right: finance summary */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 font-serif text-lg font-medium">Tài chính</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: "var(--text2)" }}>Giá trị hợp đồng</dt>
                <dd className="font-medium">{vnd(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--text2)" }}>Đã thu</dt>
                <dd className="font-medium" style={{ color: "#7bb38a" }}>{vnd(collected)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
                <dt style={{ color: "var(--text2)" }}>Còn lại</dt>
                <dd className="font-serif text-lg font-medium" style={{ color: balance > 0 ? "#c7a76b" : "#7bb38a" }}>{vnd(balance)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
                <dt style={{ color: "var(--text2)" }}>Tổng lương nhân sự</dt>
                <dd className="font-medium">{vnd(payroll)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--text2)" }}>Đã trả lương</dt>
                <dd className="font-medium">{vnd(paidPayroll)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--text2)" }}>Chi phí hợp đồng</dt>
                <dd className="font-medium">{vnd(expenseTotal)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
                <dt style={{ color: "var(--text2)" }}>Lãi/lỗ dự tính</dt>
                <dd className="font-serif text-lg font-medium" style={{ color: profit >= 0 ? "#7bb38a" : "#c77b7b" }}>
                  {vnd(profit)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
