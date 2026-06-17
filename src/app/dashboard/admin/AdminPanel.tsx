"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { Profile } from "@/lib/types";

export default function AdminPanel({ profiles }: { profiles: Profile[] }) {
  const { t } = useLang();
  const [rows, setRows] = useState<Profile[]>(profiles);
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  }

  async function update(p: Profile, patch: Partial<Profile>) {
    const next = { ...p, ...patch };
    setRows((r) => r.map((x) => (x.id === p.id ? next : x)));
    const res = await fetch("/api/admin/photographers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, ...patch }),
    });
    if (!res.ok) flash(t("error"));
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/photographers/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) return flash(data.error ?? t("error"));
    setRows((r) => [
      ...r,
      {
        id: data.id,
        email: form.email,
        full_name: form.full_name || form.email,
        role: "photographer",
        max_albums: null,
        monthly_album_limit: 5,
        can_zip: false,
        can_notes: false,
        can_galleries: false,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ]);
    setForm({ email: "", password: "", full_name: "" });
    flash(t("saved"));
  }

  return (
    <div className="animate-fade-in">
      <h1 className="mb-8 text-2xl font-light text-accent">{t("photographers")}</h1>

      {msg && (
        <div className="mb-6 rounded-md border border-accent-gold/30 bg-accent-gold/10 px-4 py-2 text-sm text-accent-gold">
          {msg}
        </div>
      )}

      {/* Create */}
      <form
        onSubmit={createUser}
        className="card mb-8 grid grid-cols-1 gap-3 p-5 sm:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <input
          required
          type="email"
          className="input"
          placeholder={t("email")}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          required
          type="text"
          className="input"
          placeholder={t("fullName")}
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />
        <input
          required
          type="password"
          minLength={6}
          className="input"
          placeholder={t("password")}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button disabled={creating} className="btn-primary whitespace-nowrap">
          <UserPlus size={15} /> {t("createUser")}
        </button>
      </form>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wide text-accent-muted">
              <th className="px-4 py-3">{t("email")}</th>
              <th className="px-4 py-3">{t("role")}</th>
              <th className="px-4 py-3">{t("active")}</th>
              <th className="px-4 py-3">{t("monthlyLimit")}</th>
              <th className="px-4 py-3">{t("canZip")}</th>
              <th className="px-4 py-3">{t("canNotes")}</th>
              <th className="px-4 py-3">Gallery</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-ink-850/60">
                <td className="px-4 py-3">
                  <div className="text-accent">{p.full_name}</div>
                  <div className="text-xs text-accent-muted">{p.email}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="input px-2 py-1 text-xs"
                    value={p.role}
                    onChange={(e) =>
                      update(p, { role: e.target.value as Profile["role"] })
                    }
                  >
                    <option value="photographer">photographer</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={p.is_active}
                    onChange={(e) => update(p, { is_active: e.target.checked })}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    className="input w-20 px-2 py-1 text-xs"
                    placeholder="∞"
                    value={p.monthly_album_limit ?? ""}
                    onChange={(e) =>
                      update(p, {
                        monthly_album_limit:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={p.can_zip}
                    onChange={(e) => update(p, { can_zip: e.target.checked })}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={p.can_notes}
                    onChange={(e) => update(p, { can_notes: e.target.checked })}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={p.can_galleries}
                    onChange={(e) => update(p, { can_galleries: e.target.checked })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
