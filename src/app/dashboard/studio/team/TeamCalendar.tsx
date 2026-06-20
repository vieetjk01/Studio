"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarOff } from "lucide-react";
import { CREW_ROLE_LABEL, CREW_STATUS_LABEL, type CrewRole, type CrewStatus } from "@/lib/types";

export type TeamAssignment = {
  name: string;
  phone: string | null;
  role: CrewRole;
  status: CrewStatus;
  date: string; // YYYY-MM-DD
  contractId: string;
  contractTitle: string;
};

const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
const STATUS_TONE: Record<CrewStatus, string> = { pending: "var(--text3)", accepted: "#7bb38a", declined: "#c77b7b" };

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function TeamCalendar({
  assignments,
  busyByDate,
}: {
  assignments: TeamAssignment[];
  busyByDate: Record<string, string[]>;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [y, mIdx] = todayStr.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: y, month: mIdx - 1 });
  const [selected, setSelected] = useState<string | null>(todayStr);

  const byDate = useMemo(() => {
    const map: Record<string, TeamAssignment[]> = {};
    for (const a of assignments) (map[a.date] ||= []).push(a);
    return map;
  }, [assignments]);

  const grid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const startWd = (first.getDay() + 6) % 7;
    const days = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWd; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  function move(delta: number) {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  const selAssign = selected ? byDate[selected] ?? [] : [];
  const selBusy = selected ? busyByDate[selected] ?? [] : [];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Quản lý studio</p>
        <h1 className="font-serif text-3xl font-medium">Lịch đội ngũ</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Ai làm gì ngày nào — toàn đội trong một màn hình.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium">{MONTHS[cursor.month]} {cursor.year}</h2>
            <div className="flex gap-2">
              <button onClick={() => move(-1)} className="btn-ghost p-2"><ChevronLeft size={16} /></button>
              <button onClick={() => move(1)} className="btn-ghost p-2"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WD.map((w) => (
              <div key={w} className="py-1 text-center text-[11px] font-medium" style={{ color: "var(--text3)" }}>{w}</div>
            ))}
            {grid.map((d, i) => {
              if (d === null) return <div key={i} />;
              const dateStr = ymd(cursor.year, cursor.month, d);
              const a = byDate[dateStr] ?? [];
              const busy = busyByDate[dateStr] ?? [];
              const isToday = dateStr === todayStr;
              const isSel = dateStr === selected;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(dateStr)}
                  className="flex min-h-[64px] flex-col rounded-lg p-1.5 text-left text-sm transition-colors"
                  style={{ background: isSel ? "var(--surface2)" : "transparent", border: isToday ? "1px solid var(--border2)" : "1px solid transparent" }}
                >
                  <span style={{ color: isToday ? "var(--accent)" : "var(--text)" }}>{d}</span>
                  <span className="mt-0.5 space-y-0.5">
                    {a.slice(0, 2).map((x, k) => (
                      <span key={k} className="block truncate text-[10px]" style={{ color: STATUS_TONE[x.status] }}>{x.name}</span>
                    ))}
                    {a.length > 2 && <span className="block text-[10px]" style={{ color: "var(--text3)" }}>+{a.length - 2}</span>}
                    {busy.length > 0 && <span className="block text-[10px]" style={{ color: "#c7a76b" }}>bận {busy.length}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px]" style={{ color: "var(--text3)" }}>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#7bb38a" }} /> Đã nhận</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--text3)" }} /> Chờ phản hồi</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#c7a76b" }} /> Báo bận</span>
          </div>
        </div>

        {/* Day detail */}
        <div className="card p-5">
          <h2 className="mb-3 font-serif text-lg font-medium">{selected || "Chọn ngày"}</h2>
          {selAssign.length === 0 && selBusy.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text3)" }}>Không có lịch trong ngày.</p>
          ) : (
            <div className="space-y-3">
              {selAssign.map((a, k) => (
                <Link key={k} href={`/dashboard/studio/contracts/${a.contractId}`} className="block rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{a.name}</span>
                    <span className="text-[11px]" style={{ color: STATUS_TONE[a.status] }}>{CREW_STATUS_LABEL[a.status]}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text3)" }}>{CREW_ROLE_LABEL[a.role]} · {a.contractTitle}</p>
                </Link>
              ))}
              {selBusy.length > 0 && (
                <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                  <p className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "#c7a76b" }}>
                    <CalendarOff size={12} /> Báo bận
                  </p>
                  <p className="mt-1 text-sm">{selBusy.join(", ")}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
