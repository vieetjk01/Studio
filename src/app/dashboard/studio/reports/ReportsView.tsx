"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { vnd, EXPENSE_CATEGORY_LABEL, type StudioExpense, type PaymentKind } from "@/lib/types";

export type PaymentRow = {
  id: string;
  amount: number;
  kind: PaymentKind;
  paid_at: string;
  contract: { title: string } | null;
};
export type SalaryRow = {
  id: string;
  name: string;
  salary: number;
  paid: boolean;
  paid_at: string | null;
  contract: { title: string } | null;
};

const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

export default function ReportsView({
  ownerId,
  payments,
  salaries,
  initialExpenses,
}: {
  ownerId: string;
  payments: PaymentRow[];
  salaries: SalaryRow[];
  initialExpenses: StudioExpense[];
}) {
  const supabase = createClient();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [expenses, setExpenses] = useState<StudioExpense[]>(initialExpenses);

  const [exp, setExp] = useState({ title: "", amount: 0, category: "equipment", spent_at: now.toISOString().slice(0, 10), note: "" });
  const [busy, setBusy] = useState(false);

  const ym = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const monthPayments = useMemo(() => payments.filter((p) => (p.paid_at || "").startsWith(ym)), [payments, ym]);
  const monthSalaries = useMemo(() => salaries.filter((s) => (s.paid_at || "").startsWith(ym)), [salaries, ym]);
  const monthExpenses = useMemo(() => expenses.filter((e) => (e.spent_at || "").startsWith(ym)), [expenses, ym]);

  const income = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const salaryOut = monthSalaries.reduce((s, p) => s + (p.salary || 0), 0);
  const otherOut = monthExpenses.reduce((s, p) => s + (p.amount || 0), 0);
  const profit = income - salaryOut - otherOut;

  function move(d: number) {
    setCursor((c) => {
      const m = c.month + d;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  async function addExpense() {
    const amount = Math.max(0, Math.round(Number(exp.amount) || 0));
    if (!exp.title.trim() || !amount) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("studio_expenses")
      .insert({
        owner_id: ownerId,
        title: exp.title.trim(),
        amount,
        category: exp.category,
        spent_at: exp.spent_at,
        note: exp.note.trim() || null,
      })
      .select("*")
      .single();
    setBusy(false);
    if (!error && data) {
      setExpenses((p) => [...p, data as StudioExpense]);
      setExp({ title: "", amount: 0, category: "equipment", spent_at: now.toISOString().slice(0, 10), note: "" });
    }
  }

  async function delExpense(id: string) {
    await supabase.from("studio_expenses").delete().eq("id", id);
    setExpenses((p) => p.filter((e) => e.id !== id));
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">Quản lý studio</p>
          <h1 className="font-serif text-3xl font-medium">Thu chi &amp; doanh thu</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="btn-ghost p-2"><ChevronLeft size={16} /></button>
          <span className="min-w-[120px] text-center font-medium">{MONTHS[cursor.month]} {cursor.year}</span>
          <button onClick={() => move(1)} className="btn-ghost p-2"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <TrendingUp size={18} style={{ color: "#7bb38a" }} />
          <p className="mt-3 font-serif text-2xl font-medium" style={{ color: "#7bb38a" }}>{vnd(income)}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>Doanh thu (đã thu)</p>
        </div>
        <div className="card p-5">
          <TrendingDown size={18} style={{ color: "#c77b7b" }} />
          <p className="mt-3 font-serif text-2xl font-medium">{vnd(salaryOut)}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>Chi lương nhân sự</p>
        </div>
        <div className="card p-5">
          <TrendingDown size={18} style={{ color: "#c77b7b" }} />
          <p className="mt-3 font-serif text-2xl font-medium">{vnd(otherOut)}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>Chi phí khác</p>
        </div>
        <div className="card p-5" style={{ borderColor: profit >= 0 ? "#7bb38a55" : "#c77b7b55" }}>
          <Wallet size={18} style={{ color: profit >= 0 ? "#7bb38a" : "#c77b7b" }} />
          <p className="mt-3 font-serif text-2xl font-medium" style={{ color: profit >= 0 ? "#7bb38a" : "#c77b7b" }}>{vnd(profit)}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>Lợi nhuận</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income detail */}
        <div className="card p-6">
          <h2 className="mb-4 font-serif text-lg font-medium" style={{ color: "#7bb38a" }}>Khoản thu</h2>
          {monthPayments.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có khoản thu trong tháng.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {monthPayments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.contract?.title || "Hợp đồng"} <span style={{ color: "var(--text3)" }}>· {p.paid_at}</span></span>
                  <span className="font-medium">{vnd(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Expense detail + salaries */}
        <div className="card p-6">
          <h2 className="mb-4 font-serif text-lg font-medium" style={{ color: "#c77b7b" }}>Khoản chi</h2>
          {monthSalaries.length === 0 && monthExpenses.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có khoản chi trong tháng.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {monthSalaries.map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>Lương · {s.name} <span style={{ color: "var(--text3)" }}>· {s.contract?.title || ""}</span></span>
                  <span className="font-medium">{vnd(s.salary)}</span>
                </li>
              ))}
              {monthExpenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between">
                  <span>
                    {e.title} <span style={{ color: "var(--text3)" }}>· {EXPENSE_CATEGORY_LABEL[e.category || "other"] || e.category} · {e.spent_at}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{vnd(e.amount)}</span>
                    <button onClick={() => delExpense(e.id)} style={{ color: "var(--text3)" }}><Trash2 size={13} /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add expense */}
      <div className="card mt-6 p-6">
        <h2 className="mb-4 font-serif text-lg font-medium">Thêm chi phí</h2>
        <div className="grid gap-2 sm:grid-cols-12">
          <input className="input sm:col-span-4" placeholder="Nội dung chi" value={exp.title} onChange={(e) => setExp((p) => ({ ...p, title: e.target.value }))} />
          <input type="number" className="input sm:col-span-2" placeholder="Số tiền" value={exp.amount || ""} onChange={(e) => setExp((p) => ({ ...p, amount: Number(e.target.value) }))} />
          <select className="input sm:col-span-3" value={exp.category} onChange={(e) => setExp((p) => ({ ...p, category: e.target.value }))}>
            {Object.keys(EXPENSE_CATEGORY_LABEL).map((k) => (
              <option key={k} value={k}>{EXPENSE_CATEGORY_LABEL[k]}</option>
            ))}
          </select>
          <input type="date" className="input sm:col-span-3" value={exp.spent_at} onChange={(e) => setExp((p) => ({ ...p, spent_at: e.target.value }))} />
        </div>
        <button onClick={addExpense} disabled={busy} className="btn-primary mt-3">
          <Plus size={15} /> {busy ? "Đang thêm…" : "Thêm chi phí"}
        </button>
      </div>
    </div>
  );
}
