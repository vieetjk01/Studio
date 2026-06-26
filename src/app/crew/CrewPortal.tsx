"use client";

import { useEffect, useState } from "react";
import { Phone, MapPin, Calendar, Check, X, Camera, CalendarOff, Plus, Trash2 } from "lucide-react";
import Turnstile from "@/components/Turnstile";
import {
  vnd,
  SHOOT_TYPE_LABEL,
  CREW_ROLE_LABEL,
  CREW_STATUS_LABEL,
  type ShootType,
  type CrewRole,
  type CrewStatus,
} from "@/lib/types";

type Lang = "vi" | "en";
const TR = {
  vi: {
    eyebrow: "Cổng cộng tác viên",
    title: "Công việc của tôi",
    subtitle: "Nhập số điện thoại của bạn để xem các buổi chụp / quay được studio giao & mức lương.",
    phonePh: "Số điện thoại của bạn",
    search: "Xem việc",
    searching: "Đang tìm…",
    noJobs: "Chưa có công việc nào cho số này.",
    contract: "Hợp đồng",
    studioNote: "Yêu cầu của studio:",
    salary: "Lương:",
    decline: "Từ chối",
    accept: "Nhận việc",
    switchTo: "Đổi sang",
    busyTitle: "Ngày bận của tôi",
    busySubtitle: "Báo ngày bạn bận để studio không xếp lịch trùng.",
    notePh: "Ghi chú (tuỳ chọn)",
    add: "Thêm",
  },
  en: {
    eyebrow: "Crew portal",
    title: "My assignments",
    subtitle: "Enter your phone number to see shoots assigned by studios & your pay.",
    phonePh: "Your phone number",
    search: "View jobs",
    searching: "Searching…",
    noJobs: "No assignments found for this number.",
    contract: "Contract",
    studioNote: "Studio note:",
    salary: "Pay:",
    decline: "Decline",
    accept: "Accept",
    switchTo: "Switch to",
    busyTitle: "My unavailable days",
    busySubtitle: "Mark days you're busy so studios won't schedule conflicts.",
    notePh: "Note (optional)",
    add: "Add",
  },
} as const;

type Assignment = {
  id: string;
  name: string;
  role: CrewRole;
  salary: number;
  status: CrewStatus;
  note: string | null;
  contract: {
    title: string;
    client_name: string | null;
    shoot_type: ShootType;
    event_date: string | null;
    event_time: string | null;
    location: string | null;
    status: string;
  } | null;
};

type BusyDay = { id: string; date: string; note: string | null };

const STATUS_TONE: Record<string, string> = {
  pending: "var(--text3)",
  accepted: "#7bb38a",
  declined: "#c77b7b",
};

export default function CrewPortal() {
  const [lang, setLang] = useState<Lang>("vi");
  useEffect(() => {
    const stored = localStorage.getItem("vk_lang") as Lang | null;
    if (stored === "en") setLang("en");
  }, []);
  const tr = TR[lang];

  const [phone, setPhone] = useState("");
  const [list, setList] = useState<Assignment[] | null>(null);
  const [busyDays, setBusyDays] = useState<BusyDay[]>([]);
  const [newBusy, setNewBusy] = useState({ date: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function load(e?: React.FormEvent) {
    e?.preventDefault();
    if (!phone.trim() || !captchaToken) return;
    setLoading(true);
    const res = await fetch("/api/crew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, captcha: captchaToken }),
    });
    setLoading(false);
    const j = await res.json().catch(() => ({ assignments: [], busy: [] }));
    setList(j.assignments ?? []);
    setBusyDays(j.busy ?? []);
  }

  async function addBusy() {
    if (!newBusy.date) return;
    setBusy("busy");
    const res = await fetch("/api/crew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "busy_add", phone, date: newBusy.date, note: newBusy.note }),
    });
    setBusy(null);
    if (res.ok) { await load(); setNewBusy({ date: "", note: "" }); }
  }

  async function removeBusy(id: string) {
    await fetch("/api/crew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "busy_remove", phone, id }),
    });
    setBusyDays((p) => p.filter((b) => b.id !== id));
  }

  async function respond(id: string, status: "accepted" | "declined") {
    setBusy(id);
    const res = await fetch("/api/crew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond", id, phone, status }),
    });
    setBusy(null);
    if (res.ok) setList((p) => (p ? p.map((a) => (a.id === id ? { ...a, status } : a)) : p));
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="eyebrow mb-1.5">{tr.eyebrow}</p>
      <h1 className="font-serif text-3xl font-medium">{tr.title}</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>{tr.subtitle}</p>

      <form onSubmit={load} className="card mt-6 p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            className="input"
            placeholder={tr.phonePh}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="submit" disabled={loading || !captchaToken} className="btn-primary shrink-0">
            {loading ? tr.searching : tr.search}
          </button>
        </div>
        <Turnstile
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
          onError={() => setCaptchaToken(null)}
        />
      </form>

      {list !== null && (
        <div className="mt-6 space-y-3">
          {list.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-14 text-center">
              <Phone size={20} style={{ color: "var(--text3)" }} />
              <p className="mt-3 text-sm" style={{ color: "var(--text2)" }}>{tr.noJobs}</p>
            </div>
          ) : (
            list.map((a) => (
              <div key={a.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-serif text-lg font-medium">
                      <Camera size={16} style={{ color: "#c7a76b" }} />
                      {a.contract?.title || tr.contract}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text3)" }}>
                      {CREW_ROLE_LABEL[a.role] ?? a.role}
                      {a.contract ? ` · ${SHOOT_TYPE_LABEL[a.contract.shoot_type]}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs" style={{ color: STATUS_TONE[a.status] }}>
                    {CREW_STATUS_LABEL[a.status]}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--text2)" }}>
                  {a.contract?.event_date && (
                    <p className="flex items-center gap-2">
                      <Calendar size={14} style={{ color: "var(--text3)" }} />
                      {a.contract.event_date}{a.contract.event_time ? ` · ${a.contract.event_time}` : ""}
                    </p>
                  )}
                  {a.contract?.location && (
                    <p className="flex items-center gap-2">
                      <MapPin size={14} style={{ color: "var(--text3)" }} /> {a.contract.location}
                    </p>
                  )}
                </div>

                {a.note && (
                  <p className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
                    <b>{tr.studioNote}</b> {a.note}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  <span className="text-sm" style={{ color: "var(--text2)" }}>
                    {tr.salary} <b style={{ color: "var(--text)" }}>{vnd(a.salary)}</b>
                  </span>
                  {a.status === "pending" ? (
                    <div className="flex gap-2">
                      <button onClick={() => respond(a.id, "declined")} disabled={busy === a.id} className="btn-ghost px-3 py-1.5 text-xs">
                        <X size={14} /> {tr.decline}
                      </button>
                      <button onClick={() => respond(a.id, "accepted")} disabled={busy === a.id} className="btn-primary px-3 py-1.5 text-xs">
                        <Check size={14} /> {tr.accept}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => respond(a.id, a.status === "accepted" ? "declined" : "accepted")}
                      disabled={busy === a.id}
                      className="btn-ghost px-3 py-1.5 text-xs"
                    >
                      {tr.switchTo} &ldquo;{a.status === "accepted" ? tr.decline : tr.accept}&rdquo;
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Busy days */}
          <div className="card p-5">
            <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium">
              <CalendarOff size={16} style={{ color: "#c7a76b" }} /> {tr.busyTitle}
            </h2>
            <p className="mb-3 text-xs" style={{ color: "var(--text3)" }}>{tr.busySubtitle}</p>
            {busyDays.length > 0 && (
              <ul className="mb-3 space-y-2">
                {busyDays.map((b) => (
                  <li key={b.id} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: "var(--surface2)" }}>
                    <span>{b.date}{b.note ? ` · ${b.note}` : ""}</span>
                    <button onClick={() => removeBusy(b.id)} style={{ color: "var(--text3)" }}><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <input type="date" className="input w-auto" value={newBusy.date} onChange={(e) => setNewBusy((p) => ({ ...p, date: e.target.value }))} />
              <input className="input flex-1" placeholder={tr.notePh} value={newBusy.note} onChange={(e) => setNewBusy((p) => ({ ...p, note: e.target.value }))} />
              <button onClick={addBusy} disabled={busy === "busy" || !newBusy.date} className="btn-ghost shrink-0">
                <Plus size={15} /> {tr.add}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
