"use client";

import { useState } from "react";
import { Phone, MapPin, Calendar, Check, X, Camera } from "lucide-react";
import {
  vnd,
  SHOOT_TYPE_LABEL,
  CREW_ROLE_LABEL,
  CREW_STATUS_LABEL,
  type ShootType,
  type CrewRole,
  type CrewStatus,
} from "@/lib/types";

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

const STATUS_TONE: Record<string, string> = {
  pending: "var(--text3)",
  accepted: "#7bb38a",
  declined: "#c77b7b",
};

export default function CrewPortal() {
  const [phone, setPhone] = useState("");
  const [list, setList] = useState<Assignment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load(e?: React.FormEvent) {
    e?.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    const res = await fetch("/api/crew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    const j = await res.json().catch(() => ({ assignments: [] }));
    setList(j.assignments ?? []);
  }

  async function respond(id: string, status: "accepted" | "declined") {
    setBusy(id);
    const res = await fetch("/api/crew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond", id, phone, status }),
    });
    setBusy(null);
    if (res.ok) {
      setList((p) => (p ? p.map((a) => (a.id === id ? { ...a, status } : a)) : p));
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="eyebrow mb-1.5">Cổng cộng tác viên</p>
      <h1 className="font-serif text-3xl font-medium">Công việc của tôi</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
        Nhập số điện thoại của bạn để xem các buổi chụp / quay được studio giao &amp; mức lương.
      </p>

      <form onSubmit={load} className="card mt-6 flex gap-2 p-4">
        <input
          className="input"
          placeholder="Số điện thoại của bạn"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="submit" disabled={loading} className="btn-primary shrink-0">
          {loading ? "Đang tìm…" : "Xem việc"}
        </button>
      </form>

      {list !== null && (
        <div className="mt-6 space-y-3">
          {list.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-14 text-center">
              <Phone size={20} style={{ color: "var(--text3)" }} />
              <p className="mt-3 text-sm" style={{ color: "var(--text2)" }}>
                Chưa có công việc nào cho số này.
              </p>
            </div>
          ) : (
            list.map((a) => (
              <div key={a.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-serif text-lg font-medium">
                      <Camera size={16} style={{ color: "#c7a76b" }} />
                      {a.contract?.title || "Hợp đồng"}
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
                    <b>Yêu cầu của studio:</b> {a.note}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  <span className="text-sm" style={{ color: "var(--text2)" }}>
                    Lương: <b style={{ color: "var(--text)" }}>{vnd(a.salary)}</b>
                  </span>
                  {a.status === "pending" ? (
                    <div className="flex gap-2">
                      <button onClick={() => respond(a.id, "declined")} disabled={busy === a.id} className="btn-ghost px-3 py-1.5 text-xs">
                        <X size={14} /> Từ chối
                      </button>
                      <button onClick={() => respond(a.id, "accepted")} disabled={busy === a.id} className="btn-primary px-3 py-1.5 text-xs">
                        <Check size={14} /> Nhận việc
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => respond(a.id, a.status === "accepted" ? "declined" : "accepted")}
                      disabled={busy === a.id}
                      className="btn-ghost px-3 py-1.5 text-xs"
                    >
                      Đổi sang “{a.status === "accepted" ? "Từ chối" : "Nhận việc"}”
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
