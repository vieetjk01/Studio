"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { contractTotal, vnd, CONTRACT_STATUS_LABEL, type ContractStatus } from "@/lib/types";

export type BoardCard = {
  id: string;
  title: string;
  client_name: string | null;
  status: ContractStatus;
  event_date: string | null;
  delivery_due: string | null;
  contract_items: { qty: number; unit_price: number }[];
  contract_tasks: { done: boolean }[];
};

const COLUMNS: ContractStatus[] = ["draft", "sent", "approved", "in_progress", "completed", "cancelled"];
const TONE: Record<ContractStatus, string> = {
  draft: "var(--text3)",
  sent: "#c7a76b",
  approved: "#7bb38a",
  in_progress: "#6ba3c7",
  completed: "#7bb38a",
  cancelled: "#c77b7b",
};

export default function BoardView({ initial }: { initial: BoardCard[] }) {
  const supabase = createClient();
  const [cards, setCards] = useState<BoardCard[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<ContractStatus | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function moveTo(id: string, status: ContractStatus) {
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === status) return;
    setCards((p) => p.map((c) => (c.id === id ? { ...c, status } : c)));
    await supabase.from("studio_contracts").update({ status }).eq("id", id);
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Quản lý studio</p>
        <h1 className="font-serif text-3xl font-medium">Bảng công việc</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Kéo thẻ hợp đồng sang cột khác để đổi trạng thái.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colCards = cards.filter((c) => c.status === col);
          return (
            <div
              key={col}
              onDragOver={(e) => { e.preventDefault(); setOver(col); }}
              onDragLeave={() => setOver((o) => (o === col ? null : o))}
              onDrop={() => { if (dragId) moveTo(dragId, col); setDragId(null); setOver(null); }}
              className="w-64 shrink-0 rounded-2xl p-3"
              style={{ background: over === col ? "var(--surface2)" : "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-medium" style={{ color: TONE[col] }}>{CONTRACT_STATUS_LABEL[col]}</span>
                <span className="text-xs" style={{ color: "var(--text3)" }}>{colCards.length}</span>
              </div>
              <div className="space-y-2">
                {colCards.map((c) => {
                  const total = contractTotal(c.contract_items || []);
                  const tasks = c.contract_tasks || [];
                  const doneN = tasks.filter((t) => t.done).length;
                  const late = c.delivery_due && c.delivery_due < today && c.status !== "completed" && c.status !== "cancelled";
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => { setDragId(null); setOver(null); }}
                      className="cursor-grab rounded-xl p-3 active:cursor-grabbing"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", opacity: dragId === c.id ? 0.5 : 1 }}
                    >
                      <Link href={`/dashboard/studio/contracts/${c.id}`} className="block">
                        <p className="text-sm font-medium leading-snug">{c.title}</p>
                        <p className="mt-0.5 text-[11px]" style={{ color: "var(--text3)" }}>{c.client_name || "—"}</p>
                        <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: "var(--text3)" }}>
                          <span>{vnd(total)}</span>
                          {tasks.length > 0 && <span>{doneN}/{tasks.length} việc</span>}
                        </div>
                        {(c.event_date || late) && (
                          <p className="mt-1 text-[11px]" style={{ color: late ? "#c77b7b" : "var(--text3)" }}>
                            {late ? `Trễ giao · hạn ${c.delivery_due}` : `Chụp ${c.event_date}`}
                          </p>
                        )}
                      </Link>
                    </div>
                  );
                })}
                {colCards.length === 0 && <p className="px-1 py-4 text-center text-[11px]" style={{ color: "var(--text3)" }}>—</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
