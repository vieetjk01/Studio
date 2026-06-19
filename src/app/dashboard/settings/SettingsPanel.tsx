"use client";

import { useState } from "react";
import { Save, Inbox, Crown, Tag, Trash2, Plus, Shuffle, Check } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { SiteSettings, Booking, UpgradeRequest, DiscountCode } from "@/lib/types";

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
  contact_facebook: "",
  contact_tiktok: "",
  contact_youtube: "",
  contact_address: "",
  contact_hours: "",
};

export default function SettingsPanel({
  settings,
  bookings,
  upgrades,
  codes: initialCodes,
}: {
  settings: SiteSettings | null;
  bookings: Booking[];
  upgrades: UpgradeRequest[];
  codes: DiscountCode[];
}) {
  const { t } = useLang();
  const [form, setForm] = useState<Partial<SiteSettings>>(settings ?? EMPTY);
  const [featuredText, setFeaturedText] = useState((settings?.featured_images ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Discount codes
  const [codes, setCodes] = useState<DiscountCode[]>(initialCodes);
  const [newCode, setNewCode] = useState<{ code: string; percent: number; plan: string; uses: "1" | "many"; expires: string }>({
    code: "",
    percent: 10,
    plan: "",
    uses: "many",
    expires: "",
  });

  function randomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setNewCode((n) => ({ ...n, code: s }));
  }

  async function addCode() {
    const code = newCode.code.trim().toUpperCase();
    if (!code) return;
    const res = await fetch("/api/admin/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        code,
        percent: newCode.percent,
        plan: newCode.plan || null,
        max_uses: newCode.uses === "1" ? 1 : null,
        expires_at: newCode.expires || null,
      }),
    });
    const data = await res.json();
    if (res.ok && data.code) {
      setCodes((c) => [data.code, ...c]);
      setNewCode({ code: "", percent: 10, plan: "", uses: "many", expires: "" });
    } else {
      setMsg(data.error?.includes("duplicate") ? "Mã đã tồn tại" : t("error"));
      setTimeout(() => setMsg(null), 2500);
    }
  }
  async function deleteCode(id: string) {
    setCodes((c) => c.filter((x) => x.id !== id));
    await fetch("/api/admin/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
  }

  // Manage booking / upgrade requests.
  const [bookingRows, setBookingRows] = useState<Booking[]>(bookings);
  const [upgradeRows, setUpgradeRows] = useState<UpgradeRequest[]>(upgrades);

  async function manageRequest(kind: "booking" | "upgrade", action: "handled" | "delete", id: string, handled?: boolean) {
    if (kind === "booking") {
      setBookingRows((r) => (action === "delete" ? r.filter((x) => x.id !== id) : r.map((x) => (x.id === id ? { ...x, handled: !!handled } : x))));
    } else {
      setUpgradeRows((r) => (action === "delete" ? r.filter((x) => x.id !== id) : r.map((x) => (x.id === id ? { ...x, handled: !!handled } : x))));
    }
    await fetch("/api/admin/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, action, id, handled }),
    });
  }

  function set<K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const featured_images = featuredText.split("\n").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, featured_images }),
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
          <div>
            <label className="label">Hình ảnh nổi bật (mỗi dòng 1 link)</label>
            <textarea
              className="input min-h-[120px] resize-y"
              value={featuredText}
              onChange={(e) => setFeaturedText(e.target.value)}
              placeholder={"Dán link ảnh hoặc link Google Drive, mỗi dòng một ảnh.\nhttps://drive.google.com/file/d/FILE_ID/view"}
            />
            <p className="mt-1 text-[12px]" style={{ color: "var(--text3)" }}>
              Hiển thị ở mục “Hình ảnh nổi bật” trên trang chủ (không lấy từ album).
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="card space-y-4 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            Thông tin liên hệ
          </h2>
          {field("contact_phone", "Điện thoại")}
          {field("contact_email", "Email")}
          {field("contact_instagram", "Instagram")}
          {field("contact_facebook", "Facebook", { placeholder: "facebook.com/vieetjk" })}
          {field("contact_tiktok", "TikTok", { placeholder: "@vieetjk" })}
          {field("contact_youtube", "YouTube", { placeholder: "youtube.com/@vieetjk" })}
          {field("contact_address", "Địa chỉ studio")}
          {field("contact_hours", "Giờ làm việc")}
          <button onClick={save} disabled={saving} className="btn-primary w-full">
            <Save size={15} /> {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>

      {/* Plans & pricing */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            Gói &amp; giá (VND)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {field("price_basic_month", "Basic / tháng")}
            {field("price_basic_year", "Basic / năm")}
            {field("price_photographer_month", "Photographer / tháng")}
            {field("price_photographer_year", "Photographer / năm")}
            {field("price_studio_month", "Studio / tháng")}
            {field("price_studio_year", "Studio / năm")}
            {field("basic_discount_percent", "Giảm giá Basic (%)")}
            {field("photographer_discount_percent", "Giảm giá Photographer (%)")}
            {field("studio_discount_percent", "Giảm giá Studio (%)")}
            {field("studio_promo_percent", "Ưu đãi Studio/năm (%)")}
          </div>
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>
            Giá &amp; giảm giá hiển thị trên trang Nâng cấp. Nhập số tiền theo VND (vd 50000).
          </p>
          <button onClick={save} disabled={saving} className="btn-primary w-full">
            <Save size={15} /> {saving ? t("saving") : "Lưu gói & giá"}
          </button>
        </div>

        {/* Discount codes */}
        <div className="card space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            <Tag size={15} /> Mã giảm giá
          </h2>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[120px] flex-1">
              <label className="label">Mã</label>
              <div className="flex gap-1.5">
                <input className="input" value={newCode.code} placeholder="VD: TET2026" onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} />
                <button onClick={randomCode} type="button" className="btn-ghost whitespace-nowrap px-2.5" title="Tạo mã ngẫu nhiên"><Shuffle size={14} /></button>
              </div>
            </div>
            <div className="w-16">
              <label className="label">%</label>
              <input type="number" min={0} max={100} className="input" value={newCode.percent} onChange={(e) => setNewCode({ ...newCode, percent: Number(e.target.value) })} />
            </div>
            <div className="w-24">
              <label className="label">Áp dụng</label>
              <select className="input" value={newCode.plan} onChange={(e) => setNewCode({ ...newCode, plan: e.target.value })}>
                <option value="">Mọi gói</option>
                <option value="basic">Basic</option>
                <option value="photographer">Photographer</option>
                <option value="studio">Studio</option>
              </select>
            </div>
            <div className="w-28">
              <label className="label">Lượt dùng</label>
              <select className="input" value={newCode.uses} onChange={(e) => setNewCode({ ...newCode, uses: e.target.value as "1" | "many" })}>
                <option value="many">Nhiều lần</option>
                <option value="1">1 lần</option>
              </select>
            </div>
            <div className="w-36">
              <label className="label">Hạn dùng (tuỳ chọn)</label>
              <input type="date" className="input" value={newCode.expires} onChange={(e) => setNewCode({ ...newCode, expires: e.target.value })} />
            </div>
            <button onClick={addCode} className="btn-primary"><Plus size={15} /> Thêm</button>
          </div>
          {codes.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--text3)" }}>Chưa có mã giảm giá.</p>
          ) : (
            <div className="divide-y rounded-lg" style={{ border: "1px solid var(--border)", borderColor: "var(--border)" }}>
              {codes.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                  <span className="font-mono font-medium" style={{ color: "var(--text)" }}>{c.code}</span>
                  <span style={{ color: "var(--gold)" }}>-{c.percent}%</span>
                  <span style={{ color: "var(--text3)" }}>{c.plan ? c.plan : "mọi gói"}</span>
                  <span style={{ color: "var(--text3)" }}>
                    {c.max_uses == null ? `đã dùng ${c.used_count}` : `${c.used_count}/${c.max_uses}`}
                  </span>
                  {c.expires_at && (
                    <span style={{ color: new Date(c.expires_at).getTime() < Date.now() ? "#f87171" : "var(--text3)" }}>
                      HH {new Date(c.expires_at).toLocaleDateString()}
                    </span>
                  )}
                  <button onClick={() => deleteCode(c.id)} className="ml-auto rounded-md p-1.5" style={{ color: "var(--text2)" }} title="Xoá">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bookings */}
      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-medium">
          <Inbox size={20} /> Yêu cầu đặt lịch ({bookingRows.length})
        </h2>
        {bookingRows.length === 0 ? (
          <div className="card py-12 text-center text-sm" style={{ color: "var(--text3)" }}>
            Chưa có yêu cầu đặt lịch nào.
          </div>
        ) : (
          <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
            {bookingRows.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-4 p-4" style={{ opacity: b.handled ? 0.55 : 1 }}>
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
                <button
                  onClick={() => manageRequest("booking", "handled", b.id, !b.handled)}
                  className="rounded-md p-1.5"
                  style={{ color: b.handled ? "var(--gold)" : "var(--text3)" }}
                  title={b.handled ? "Đánh dấu chưa xử lý" : "Đánh dấu đã xử lý"}
                >
                  <Check size={16} />
                </button>
                <button onClick={() => manageRequest("booking", "delete", b.id)} className="rounded-md p-1.5 text-red-400" title="Xoá">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade requests */}
      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-medium">
          <Crown size={20} /> Yêu cầu nâng cấp ({upgradeRows.length})
        </h2>
        {upgradeRows.length === 0 ? (
          <div className="card py-12 text-center text-sm" style={{ color: "var(--text3)" }}>
            Chưa có yêu cầu nâng cấp nào.
          </div>
        ) : (
          <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
            {upgradeRows.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-4 p-4" style={{ opacity: u.handled ? 0.55 : 1 }}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {u.email ?? u.user_id}
                    {u.phone && (
                      <span className="text-[12px] font-normal" style={{ color: "var(--text2)" }}>📞 {u.phone}</span>
                    )}
                    {u.plan && (
                      <span className="rounded px-2 py-0.5 text-[11px] uppercase" style={{ background: "color-mix(in srgb, var(--gold) 18%, transparent)", color: "var(--gold)" }}>
                        {u.plan}{u.cycle ? ` · ${u.cycle === "year" ? "năm" : "tháng"}` : ""}
                      </span>
                    )}
                    {u.amount != null && (
                      <span className="text-[12px] font-semibold" style={{ color: "var(--gold)" }}>
                        {u.amount.toLocaleString("vi-VN")}đ
                      </span>
                    )}
                    {u.discount_code && (
                      <span className="rounded px-2 py-0.5 font-mono text-[11px]" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
                        {u.discount_code}
                      </span>
                    )}
                  </div>
                  {u.note && (
                    <p className="text-xs" style={{ color: "var(--text2)" }} title={u.note}>
                      {u.note}
                    </p>
                  )}
                </div>
                <span className="ml-auto text-xs" style={{ color: "var(--text3)" }}>
                  {new Date(u.created_at).toLocaleString()}
                </span>
                <button
                  onClick={() => manageRequest("upgrade", "handled", u.id, !u.handled)}
                  className="rounded-md p-1.5"
                  style={{ color: u.handled ? "var(--gold)" : "var(--text3)" }}
                  title={u.handled ? "Đánh dấu chưa xử lý" : "Đánh dấu đã xử lý"}
                >
                  <Check size={16} />
                </button>
                <button onClick={() => manageRequest("upgrade", "delete", u.id)} className="rounded-md p-1.5 text-red-400" title="Xoá">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
