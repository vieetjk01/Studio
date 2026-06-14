"use client";

import { useState } from "react";
import { Save, Inbox } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { SiteSettings, Booking } from "@/lib/types";

const SERVICE_LABEL: Record<string, string> = {
  wedding: "Đám cưới",
  event: "Sự kiện",
  sports: "Thể thao",
  other: "Khác",
};

const EMPTY: Partial<SiteSettings> = {
  profile_name: "Vieetjk",
  profile_role: "Nhiếp ảnh gia cưới & chân dung · Studio",
  profile_location: "Hà Nội · Việt Nam",
  profile_bio: "",
  profile_avatar_url: "",
  profile_cover_url: "",
  stat_years: 8,
  contact_phone: "",
  contact_email: "",
  contact_instagram: "",
  contact_address: "",
  contact_hours: "",
};

export default function SettingsPanel({
  settings,
  bookings,
}: {
  settings: SiteSettings | null;
  bookings: Booking[];
}) {
  const { t } = useLang();
  const [form, setForm] = useState<Partial<SiteSettings>>(settings ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setMsg(res.ok ? t("saved") : t("error"));
    setTimeout(() => setMsg(null), 2500);
  }

  const field = (
    key: keyof SiteSettings,
    label: string,
    opts?: { textarea?: boolean; placeholder?: string }
  ) => (
    <div>
      <label className="label">{label}</label>
      {opts?.textarea ? (
        <textarea
          className="input min-h-[90px] resize-y"
          value={(form[key] as string) ?? ""}
          placeholder={opts.placeholder}
          onChange={(e) => set(key, e.target.value as never)}
        />
      ) : (
        <input
          className="input"
          value={(form[key] as string | number) ?? ""}
          placeholder={opts?.placeholder}
          onChange={(e) => set(key, e.target.value as never)}
        />
      )}
    </div>
  );

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <h1 className="mb-8 font-serif text-3xl font-medium">{t("settings")}</h1>

      {msg && (
        <div className="mb-6 rounded-md px-4 py-2 text-sm" style={{ background: "color-mix(in srgb, var(--gold) 12%, transparent)", color: "var(--gold)" }}>
          {msg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <div className="card space-y-4 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            Hồ sơ trang chủ
          </h2>
          {field("profile_name", "Tên hiển thị")}
          {field("profile_role", "Vai trò / nghề")}
          {field("profile_location", "Địa điểm")}
          {field("profile_bio", "Giới thiệu", { textarea: true })}
          {field("profile_avatar_url", "Link ảnh đại diện", { placeholder: "https://…" })}
          {field("profile_cover_url", "Link ảnh bìa", { placeholder: "https://…" })}
          {field("stat_years", "Số năm kinh nghiệm")}
        </div>

        {/* Contact */}
        <div className="card space-y-4 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            Thông tin liên hệ
          </h2>
          {field("contact_phone", "Điện thoại")}
          {field("contact_email", "Email")}
          {field("contact_instagram", "Instagram")}
          {field("contact_address", "Địa chỉ studio")}
          {field("contact_hours", "Giờ làm việc")}
          <button onClick={save} disabled={saving} className="btn-primary w-full">
            <Save size={15} /> {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>

      {/* Bookings */}
      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-medium">
          <Inbox size={20} /> Yêu cầu đặt lịch ({bookings.length})
        </h2>
        {bookings.length === 0 ? (
          <div className="card py-12 text-center text-sm" style={{ color: "var(--text3)" }}>
            Chưa có yêu cầu đặt lịch nào.
          </div>
        ) : (
          <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
            {bookings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-4 p-4" style={{ borderColor: "var(--border)" }}>
                <span className="rounded px-2 py-0.5 text-[11px] uppercase" style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)" }}>
                  {SERVICE_LABEL[b.service] ?? b.service}
                </span>
                <div className="min-w-0">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>
                    {b.phone}
                    {b.date ? ` · ${b.date}` : ""}
                  </div>
                </div>
                {b.note && (
                  <p className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--text2)" }} title={b.note}>
                    {b.note}
                  </p>
                )}
                <span className="ml-auto text-xs" style={{ color: "var(--text3)" }}>
                  {new Date(b.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
