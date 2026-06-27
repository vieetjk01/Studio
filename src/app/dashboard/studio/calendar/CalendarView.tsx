"use client";

import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/date";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Trash2, Bell, BellOff, Camera, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ZaloButton from "@/components/ZaloButton";
import { shootReminderMessage } from "@/lib/zalo";
import { SHOOT_TYPE_LABEL, type StudioEvent, type ShootType } from "@/lib/types";
import { lunarCellLabel, lunarFull } from "@/lib/lunar";

export type ContractMarker = {
  id: string;
  title: string;
  client_name: string | null;
  client_phone: string | null;
  location: string | null;
  event_date: string;
  event_time: string | null;
  status: string;
  shoot_type: ShootType;
  calendar_color: string | null;
  contract_items: { name: string; qty: number }[];
  contract_crew: { id: string }[];
};

const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// Default marker colour + the swatch palette the user can pick from per shoot.
const DEFAULT_MARK = "#c7a76b";
const MARK_COLORS = ["#c7a76b", "#3fb98a", "#6ba3c7", "#e0746f", "#b07ad0", "#d6a44a", "#7bb38a", "#e0719e"];
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarView({
  ownerId,
  initialEvents,
  contracts,
  feedUrl,
}: {
  ownerId: string;
  initialEvents: StudioEvent[];
  contracts: ContractMarker[];
  feedUrl: string;
}) {
  const [feedCopied, setFeedCopied] = useState(false);
  const supabase = createClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [y, mIdx] = todayStr.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: y, month: mIdx - 1 });
  const [events, setEvents] = useState<StudioEvent[]>(initialEvents);
  const [contractList, setContractList] = useState<ContractMarker[]>(contracts);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "week">("month");
  const [weekAnchor, setWeekAnchor] = useState(todayStr); // any date inside the displayed week

  // add-note form
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [remind, setRemind] = useState(true);
  const [busy, setBusy] = useState(false);

  const grid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const startWd = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWd; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  // Mon–Sun days of the week containing weekAnchor.
  const weekDays = useMemo(() => {
    const [wy, wm, wd] = weekAnchor.split("-").map(Number);
    const base = new Date(wy, wm - 1, wd);
    const startWd = (base.getDay() + 6) % 7; // Mon=0
    const monday = new Date(base);
    monday.setDate(base.getDate() - startWd);
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      return ymd(dt.getFullYear(), dt.getMonth(), dt.getDate());
    });
  }, [weekAnchor]);

  function moveWeek(delta: number) {
    setSelected(null);
    const [wy, wm, wd] = weekAnchor.split("-").map(Number);
    const dt = new Date(wy, wm - 1, wd);
    dt.setDate(dt.getDate() + delta * 7);
    setWeekAnchor(ymd(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  }

  function eventsOn(dateStr: string) {
    return events.filter((e) => e.event_date === dateStr);
  }
  function contractsOn(dateStr: string) {
    return contractList.filter((c) => c.event_date === dateStr);
  }

  // Assign a distinct colour to a shoot so several on the same day stand apart.
  async function setContractColor(id: string, color: string) {
    setContractList((p) => p.map((c) => (c.id === id ? { ...c, calendar_color: color } : c)));
    await supabase.from("studio_contracts").update({ calendar_color: color }).eq("id", id);
  }

  function move(delta: number) {
    setSelected(null);
    setCursor((c) => {
      const m = c.month + delta;
      const year = c.year + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12;
      return { year, month };
    });
  }

  async function addNote() {
    if (!selected || (!title.trim() && !note.trim())) return;
    setBusy(true);
    const { data } = await supabase
      .from("studio_events")
      .insert({
        owner_id: ownerId,
        title: title.trim() || "Ghi chú",
        event_date: selected,
        event_time: time.trim() || null,
        note: note.trim() || null,
        remind,
      })
      .select("*")
      .single();
    setBusy(false);
    if (data) {
      setEvents((p) => [...p, data as StudioEvent]);
      setTitle("");
      setTime("");
      setNote("");
      setRemind(true);
      // Sync to Google Calendar (fire-and-forget).
      fetch("/api/gcal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "event", id: data.id, action: "upsert" }),
      }).catch(() => {});
    }
  }

  async function delEvent(id: string) {
    // Sync deletion to Google Calendar before removing locally.
    fetch("/api/gcal/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "event", id, action: "delete" }),
    }).catch(() => {});
    await supabase.from("studio_events").delete().eq("id", id);
    setEvents((p) => p.filter((e) => e.id !== id));
  }

  const selEvents = selected ? eventsOn(selected) : [];
  const selContracts = selected ? contractsOn(selected) : [];

  // Upcoming reminders (next 30 days)
  const upcoming = useMemo(() => {
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const lim = in30.toISOString().slice(0, 10);
    return events
      .filter((e) => e.remind && e.event_date >= todayStr && e.event_date <= lim)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 8);
  }, [events, todayStr]);

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-medium">Lịch chụp &amp; ghi chú</h1>
        <div className="flex rounded-lg p-0.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: view === v ? "var(--brand, var(--accent))" : "transparent",
                color: view === v ? "var(--brandFg, #06120c)" : "var(--text2)",
              }}
            >
              {v === "month" ? "Tháng" : "Tuần"}
            </button>
          ))}
        </div>
      </div>

      {feedUrl && (
        <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
          <CalendarDays size={16} style={{ color: "var(--text3)" }} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>
              Đồng bộ Google Calendar (link đăng ký — tự cập nhật buổi chụp &amp; mốc lịch)
            </p>
            <p className="truncate text-sm" style={{ color: "var(--text2)" }}>{feedUrl}</p>
            <p className="text-[11px]" style={{ color: "var(--text3)" }}>
              Google Calendar → Cài đặt → Thêm lịch → <b>Từ URL</b> → dán link trên.
            </p>
          </div>
          <button
            onClick={() => { navigator.clipboard?.writeText(feedUrl); setFeedCopied(true); setTimeout(() => setFeedCopied(false), 1500); }}
            className="btn-ghost px-3 py-2 text-xs"
          >
            {feedCopied ? "Đã chép" : "Chép link"}
          </button>
        </div>
      )}

      {view === "week" ? (
        <WeekView
          weekDays={weekDays}
          todayStr={todayStr}
          eventsOn={eventsOn}
          contractsOn={contractsOn}
          moveWeek={moveWeek}
          onDelEvent={delEvent}
        />
      ) : (
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium">
              {MONTHS[cursor.month]} {cursor.year}
            </h2>
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
              const evs = eventsOn(dateStr);
              const cons = contractsOn(dateStr);
              const isToday = dateStr === todayStr;
              const isSel = dateStr === selected;
              const has = evs.length + cons.length > 0;
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(dateStr)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelected(dateStr); }}
                  className="flex min-h-[72px] cursor-pointer flex-col items-stretch rounded-lg p-1.5 text-sm transition-colors"
                  style={{
                    background: isSel ? "var(--surface2)" : "transparent",
                    border: isToday ? "1px solid var(--border2)" : "1px solid transparent",
                  }}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span style={{ color: isToday ? "var(--accent)" : "var(--text)" }}>{d}</span>
                    <span className="text-[9px] leading-none" style={{ color: "var(--text3)" }}>{lunarCellLabel(dateStr)}</span>
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5 text-left">
                    {cons.map((c) => {
                      const mc = c.calendar_color || DEFAULT_MARK;
                      return (
                        <Link
                          key={c.id}
                          href={`/dashboard/studio/contracts/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block truncate rounded px-1 py-0.5 text-[9px] leading-tight"
                          style={{ background: `color-mix(in srgb,${mc} 22%,transparent)`, borderLeft: `2px solid ${mc}`, color: "var(--text2)" }}
                          title={`Mở hợp đồng: ${c.title}`}
                        >
                          {c.event_time ? `${c.event_time} ` : ""}{c.client_name || c.title}
                        </Link>
                      );
                    })}
                    {evs.map((e) => (
                      <span key={e.id} className="truncate rounded px-1 py-0.5 text-[9px] leading-tight" style={{ background: "color-mix(in srgb,#6ba3c7 18%,transparent)", color: "var(--text2)" }} title={e.title}>
                        {e.title}
                      </span>
                    ))}
                  </div>
                  {has && <span className="sr-only">có lịch</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[11px]" style={{ color: "var(--text3)" }}>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: DEFAULT_MARK }} /> Hợp đồng</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#6ba3c7" }} /> Ghi chú</span>
            <span style={{ color: "var(--text3)" }}>· Chọn ngày để đổi màu từng hợp đồng</span>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          {selected ? (
            <div className="card p-5">
              <h2 className="font-serif text-lg font-medium">{fmtDate(selected)}</h2>
              <p className="mb-3 text-xs" style={{ color: "var(--text3)" }}>{lunarFull(selected)}</p>

              {selContracts.map((c) => {
                const mc = c.calendar_color || DEFAULT_MARK;
                return (
                <div key={c.id} className="mb-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)", borderLeft: `3px solid ${mc}` }}>
                  <Link href={`/dashboard/studio/contracts/${c.id}`} className="flex items-center gap-2">
                    <Camera size={15} style={{ color: mc }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                        {c.client_name || "—"}{c.event_time ? ` · ${c.event_time}` : ""}
                      </p>
                    </div>
                  </Link>

                  {/* Per-contract colour picker — tell apart multiple shoots on the same day */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px]" style={{ color: "var(--text3)" }}>Màu:</span>
                    {MARK_COLORS.map((col) => (
                      <button
                        key={col}
                        onClick={() => setContractColor(c.id, col)}
                        title={col}
                        aria-label={`Đổi màu ${col}`}
                        className="h-4 w-4 rounded-full transition-transform hover:scale-110"
                        style={{ background: col, border: mc.toLowerCase() === col.toLowerCase() ? "2px solid var(--text)" : "1px solid var(--border)" }}
                      />
                    ))}
                  </div>
                  <dl className="mt-2 space-y-0.5 text-[11px]" style={{ color: "var(--text2)" }}>
                    <div><span style={{ color: "var(--text3)" }}>Dịch vụ: </span>{SHOOT_TYPE_LABEL[c.shoot_type] || c.shoot_type}</div>
                    {c.contract_items.length > 0 && (
                      <div><span style={{ color: "var(--text3)" }}>Hạng mục: </span>{c.contract_items.map((it) => `${it.name}${it.qty > 1 ? ` x${it.qty}` : ""}`).join(", ")}</div>
                    )}
                    <div><span style={{ color: "var(--text3)" }}>Nhân sự: </span>{c.contract_crew.length} người</div>
                    {c.location && <div><span style={{ color: "var(--text3)" }}>Địa điểm: </span>{c.location}</div>}
                  </dl>
                  {c.client_phone && (
                    <div className="mt-2">
                      <ZaloButton
                        phone={c.client_phone}
                        label="Nhắc khách qua Zalo"
                        message={shootReminderMessage({
                          name: c.client_name,
                          title: c.title,
                          date: c.event_date,
                          time: c.event_time,
                          location: c.location,
                        })}
                      />
                    </div>
                  )}
                </div>
                );
              })}

              {selEvents.map((e) => (
                <div key={e.id} className="mb-2 flex items-start justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {e.remind ? <Bell size={12} style={{ color: "#6ba3c7" }} /> : <BellOff size={12} style={{ color: "var(--text3)" }} />}
                      {e.title}{e.event_time ? ` · ${e.event_time}` : ""}
                    </p>
                    {e.note && <p className="text-[11px]" style={{ color: "var(--text3)" }}>{e.note}</p>}
                  </div>
                  <button onClick={() => delEvent(e.id)} style={{ color: "var(--text3)" }}><Trash2 size={14} /></button>
                </div>
              ))}

              {/* Add note */}
              <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                <input className="input" placeholder="Tiêu đề ghi chú" value={title} onChange={(e) => setTitle(e.target.value)} />
                <div className="flex gap-2">
                  <input className="input" placeholder="Giờ (08:00)" value={time} onChange={(e) => setTime(e.target.value)} />
                  <button
                    onClick={() => setRemind((r) => !r)}
                    className="btn-ghost shrink-0 px-3"
                    title={remind ? "Có nhắc" : "Không nhắc"}
                  >
                    {remind ? <Bell size={15} /> : <BellOff size={15} />}
                  </button>
                </div>
                <textarea className="input min-h-[60px]" placeholder="Nội dung…" value={note} onChange={(e) => setNote(e.target.value)} />
                <button onClick={addNote} disabled={busy} className="btn-primary w-full">
                  <Plus size={15} /> {busy ? "Đang thêm…" : "Thêm ghi chú"}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-5 text-sm" style={{ color: "var(--text3)" }}>
              Chọn một ngày để xem lịch &amp; thêm ghi chú.
            </div>
          )}

          {/* Reminders */}
          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-medium">
              <Bell size={16} style={{ color: "#6ba3c7" }} /> Nhắc lịch 30 ngày tới
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text3)" }}>Không có nhắc nào.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((e) => (
                  <li key={e.id} className="flex justify-between text-sm">
                    <span>{e.title}</span>
                    <span style={{ color: "var(--text3)" }}>{fmtDate(e.event_date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function WeekView({
  weekDays,
  todayStr,
  eventsOn,
  contractsOn,
  moveWeek,
  onDelEvent,
}: {
  weekDays: string[];
  todayStr: string;
  eventsOn: (d: string) => StudioEvent[];
  contractsOn: (d: string) => ContractMarker[];
  moveWeek: (delta: number) => void;
  onDelEvent: (id: string) => void;
}) {
  const first = weekDays[0];
  const last = weekDays[6];
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-medium">
          {first.slice(8)}/{first.slice(5, 7)} – {last.slice(8)}/{last.slice(5, 7)}/{last.slice(0, 4)}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => moveWeek(-1)} className="btn-ghost p-2"><ChevronLeft size={16} /></button>
          <button onClick={() => moveWeek(1)} className="btn-ghost p-2"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {weekDays.map((dateStr, i) => {
          const evs = eventsOn(dateStr);
          const cons = contractsOn(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div
              key={dateStr}
              className="flex flex-col rounded-xl p-2.5"
              style={{
                background: isToday ? "var(--surface2)" : "transparent",
                border: isToday ? "1px solid var(--brand, var(--accent))" : "1px solid var(--border)",
                minHeight: 120,
              }}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[11px] font-semibold" style={{ color: "var(--text3)" }}>{WD[i]}</span>
                <span className="text-sm font-medium" style={{ color: isToday ? "var(--accent)" : "var(--text)" }}>{dateStr.slice(8)}/{dateStr.slice(5, 7)}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {cons.map((c) => {
                  const mc = c.calendar_color || DEFAULT_MARK;
                  return (
                  <Link
                    key={c.id}
                    href={`/dashboard/studio/contracts/${c.id}`}
                    className="rounded-lg px-2 py-1.5 text-[11px] leading-snug"
                    style={{ background: `color-mix(in srgb,${mc} 16%,transparent)`, borderLeft: `2px solid ${mc}` }}
                  >
                    <p className="flex items-center gap-1 font-medium">
                      <Camera size={11} style={{ color: mc, flex: "none" }} />
                      <span className="truncate">{c.event_time ? `${c.event_time} · ` : ""}{c.title}</span>
                    </p>
                    {c.client_name && <p style={{ color: "var(--text3)" }}>{c.client_name}</p>}
                    <p style={{ color: "var(--text3)" }}>{SHOOT_TYPE_LABEL[c.shoot_type] || c.shoot_type}</p>
                    {c.contract_items.length > 0 && (
                      <p style={{ color: "var(--text2)" }}>📦 {c.contract_items.map((it) => `${it.name}${it.qty > 1 ? ` x${it.qty}` : ""}`).join(", ")}</p>
                    )}
                    {c.location && <p className="truncate" style={{ color: "var(--text3)" }}>📍 {c.location}</p>}
                  </Link>
                  );
                })}
                {evs.map((e) => (
                  <div
                    key={e.id}
                    className="group flex items-start justify-between gap-1 rounded-lg px-2 py-1.5 text-[11px] leading-snug"
                    style={{ background: "color-mix(in srgb,#6ba3c7 16%,transparent)", borderLeft: "2px solid #6ba3c7" }}
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 font-medium">
                        {e.remind ? <Bell size={10} style={{ color: "#6ba3c7", flex: "none" }} /> : <BellOff size={10} style={{ color: "var(--text3)", flex: "none" }} />}
                        <span className="truncate">{e.event_time ? `${e.event_time} · ` : ""}{e.title}</span>
                      </p>
                      {e.note && <p style={{ color: "var(--text3)" }}>{e.note}</p>}
                    </div>
                    <button onClick={() => onDelEvent(e.id)} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--text3)" }}><Trash2 size={12} /></button>
                  </div>
                ))}
                {evs.length + cons.length === 0 && (
                  <span className="text-[11px]" style={{ color: "var(--text3)" }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
