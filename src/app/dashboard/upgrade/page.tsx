"use client";

import { useEffect, useState } from "react";
import { Check, X, Crown, Sparkles, Send, Zap, Tag, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlanUsage from "@/components/PlanUsage";
import { PLAN_FEATURES, PLAN_PRICING, PLAN_LABEL, formatVnd, type Plan } from "@/lib/plans";

type Cycle = "month" | "year";

interface Prices {
  basicMonth: number;
  basicYear: number;
  photographerMonth: number;
  photographerYear: number;
  studioMonth: number;
  studioYear: number;
  basicDiscount: number;
  photographerDiscount: number;
  studioDiscount: number;
  studioPromo: number;
}

const DEFAULT_PRICES: Prices = {
  basicMonth: PLAN_PRICING.basic.month,
  basicYear: PLAN_PRICING.basic.year,
  photographerMonth: PLAN_PRICING.photographer.month,
  photographerYear: PLAN_PRICING.photographer.year,
  studioMonth: PLAN_PRICING.studio.month,
  studioYear: PLAN_PRICING.studio.year,
  basicDiscount: 0,
  photographerDiscount: 0,
  studioDiscount: 0,
  studioPromo: 50,
};

// Feature comparison rows. boolean -> ✓/✗ ; string -> text.
type Cmp = string | boolean;
const COMPARE: { label: string; free: Cmp; basic: Cmp; photographer: Cmp; studio: Cmp }[] = [
  { label: "Album / tháng", free: "5", basic: "15", photographer: "50", studio: "∞" },
  { label: "Khách tải ảnh (ZIP)", free: false, basic: true, photographer: true, studio: true },
  { label: "Ghi chú trên ảnh", free: false, basic: true, photographer: true, studio: true },
  { label: "Watermark", free: "Chỉ chữ", basic: "Logo + nén", photographer: "Logo + nén", studio: "Logo + nén" },
  { label: "Lọc ảnh", free: "10 / tháng", basic: "∞", photographer: "∞", studio: "∞" },
  { label: "Nén ảnh (máy / link)", free: "5 / tháng", basic: "∞", photographer: "∞", studio: "∞" },
  { label: "Nén qua Drive (Picker)", free: "1 lần", basic: "5 / tháng", photographer: "15 / tháng", studio: "∞" },
  { label: "Gallery giao khách", free: false, basic: false, photographer: true, studio: true },
  { label: "Website / tên miền riêng", free: false, basic: false, photographer: "Đang xây dựng", studio: "Đang xây dựng" },
  { label: "Quản lý lịch chụp / hợp đồng", free: false, basic: false, photographer: false, studio: "Đang xây dựng" },
];

export default function UpgradePage() {
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);
  const [cycle, setCycle] = useState<Cycle>("month");
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [modalPlan, setModalPlan] = useState<Plan | null>(null); // plan whose confirm form is open
  const [sending, setSending] = useState<Plan | null>(null);
  const [sentPlan, setSentPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Discount code
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<{ code: string; percent: number; plan: string | null } | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
        if (profile?.plan) setCurrentPlan(profile.plan as Plan);
      }
      const { data: s } = await supabase
        .from("site_settings")
        .select("price_basic_month, price_basic_year, price_photographer_month, price_photographer_year, price_studio_month, price_studio_year, basic_discount_percent, photographer_discount_percent, studio_discount_percent, studio_promo_percent")
        .eq("id", 1)
        .maybeSingle();
      if (s) {
        setPrices({
          basicMonth: s.price_basic_month ?? DEFAULT_PRICES.basicMonth,
          basicYear: s.price_basic_year ?? DEFAULT_PRICES.basicYear,
          photographerMonth: s.price_photographer_month ?? DEFAULT_PRICES.photographerMonth,
          photographerYear: s.price_photographer_year ?? DEFAULT_PRICES.photographerYear,
          studioMonth: s.price_studio_month ?? DEFAULT_PRICES.studioMonth,
          studioYear: s.price_studio_year ?? DEFAULT_PRICES.studioYear,
          basicDiscount: s.basic_discount_percent ?? 0,
          photographerDiscount: s.photographer_discount_percent ?? 0,
          studioDiscount: s.studio_discount_percent ?? 0,
          studioPromo: s.studio_promo_percent ?? 50,
        });
      }
    })();
  }, []);

  async function applyCode() {
    const c = codeInput.trim().toUpperCase();
    if (!c) return;
    setCodeMsg(null);
    const res = await fetch("/api/discount/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: c }),
    });
    const d = await res.json().catch(() => null);
    if (d?.valid) {
      setAppliedCode({ code: d.code, percent: d.percent, plan: d.plan });
      setCodeMsg(`Đã áp dụng mã ${d.code}: -${d.percent}%${d.plan ? ` (gói ${d.plan})` : ""}.`);
    } else {
      setAppliedCode(null);
      setCodeMsg("Mã không hợp lệ hoặc đã hết hiệu lực.");
    }
  }

  // Effective discount % for a plan, combining the base promo and any code.
  function discountFor(plan: Plan): number {
    let base = 0;
    if (plan === "basic") base = prices.basicDiscount;
    if (plan === "photographer") base = prices.photographerDiscount;
    if (plan === "studio") base = Math.max(prices.studioDiscount, cycle === "year" ? prices.studioPromo : 0);
    const codePct = appliedCode && (!appliedCode.plan || appliedCode.plan === plan) ? appliedCode.percent : 0;
    return Math.max(base, codePct);
  }
  function priceOf(plan: "basic" | "photographer" | "studio"): number {
    if (plan === "basic") return cycle === "month" ? prices.basicMonth : prices.basicYear;
    if (plan === "photographer") return cycle === "month" ? prices.photographerMonth : prices.photographerYear;
    return cycle === "month" ? prices.studioMonth : prices.studioYear;
  }
  function finalPriceOf(plan: "basic" | "photographer" | "studio"): number {
    return Math.round(priceOf(plan) * (1 - discountFor(plan) / 100));
  }

  async function request(plan: Plan) {
    if (!phone.trim()) {
      setError("Vui lòng nhập số điện thoại liên hệ trước khi gửi yêu cầu.");
      return;
    }
    setSending(plan);
    setError(null);
    const usedCode = appliedCode && (!appliedCode.plan || appliedCode.plan === plan) ? appliedCode.code : null;
    const amount = plan === "free" ? null : finalPriceOf(plan);
    const res = await fetch("/api/upgrade-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, cycle, note, discount_code: usedCode, phone, amount }),
    });
    setSending(null);
    if (res.ok) {
      setSentPlan(plan);
      setModalPlan(null);
      setNote("");
    } else {
      setError("Gửi yêu cầu thất bại, thử lại sau.");
    }
  }

  function priceBlock(plan: "basic" | "photographer" | "studio") {
    const full = priceOf(plan);
    const disc = discountFor(plan);
    const now = Math.round(full * (1 - disc / 100));
    return (
      <div className="flex items-baseline gap-2">
        {disc > 0 && <span className="text-[15px] line-through" style={{ color: "var(--text3)" }}>{formatVnd(full)}</span>}
        <span className="font-serif text-3xl font-medium">{formatVnd(now)}</span>
        <span className="text-[13px]" style={{ color: "var(--text2)" }}>/{cycle === "month" ? "tháng" : "năm"}</span>
        {disc > 0 && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--gold)", color: "#1a1205" }}>-{disc}%</span>}
      </div>
    );
  }

  const cards: { plan: Plan; icon: typeof Sparkles; accent: boolean; promo?: string }[] = [
    { plan: "free", icon: Sparkles, accent: false },
    { plan: "basic", icon: Zap, accent: true },
    { plan: "photographer", icon: Camera, accent: true },
    { plan: "studio", icon: Crown, accent: true, promo: "Đăng ký trong thời gian này: ưu đãi 50%/năm vĩnh viễn + nhận mọi tính năng nâng cấp sau này." },
  ];

  const cellOf = (v: string | boolean) =>
    typeof v === "boolean" ? (
      v ? <Check size={16} style={{ color: "var(--gold)" }} /> : <X size={15} style={{ color: "var(--text3)" }} />
    ) : (
      <span style={{ color: "var(--text)" }}>{v}</span>
    );

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8">
        <p className="eyebrow mb-1.5">Gói dịch vụ</p>
        <h1 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Nâng cấp gói</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--text2)" }}>
          Mở khoá thêm album, cho khách tải ảnh & ghi chú, watermark logo, nén/lọc ảnh không giới hạn.
        </p>
      </div>

      <PlanUsage showUpgrade={false} />

      {/* Billing cycle */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
          {(["month", "year"] as Cycle[]).map((c) => (
            <button key={c} onClick={() => setCycle(c)} className="px-4 py-2 text-[13px] font-medium" style={cycle === c ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface2)", color: "var(--text2)" }}>
              {c === "month" ? "Theo tháng" : "Theo năm"}
            </button>
          ))}
        </div>
        {/* Discount code */}
        <div className="flex items-end gap-2">
          <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="Mã giảm giá" className="input w-40" />
          <button onClick={applyCode} className="btn-ghost"><Tag size={14} /> Áp dụng</button>
        </div>
      </div>
      {codeMsg && <p className="mb-4 text-[13px]" style={{ color: appliedCode ? "var(--gold)" : "#f87171" }}>{codeMsg}</p>}

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {cards.map(({ plan, icon: Icon, accent, promo }) => (
          <div key={plan} className="card flex flex-col p-7" style={accent ? { borderColor: "var(--gold)" } : undefined}>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: accent ? "var(--gold)" : "var(--surface2)", color: accent ? "#1a1205" : "var(--text2)" }}>
                <Icon size={18} />
              </span>
              <div>
                <h2 className="font-serif text-2xl font-medium">{PLAN_LABEL[plan]}</h2>
                {currentPlan === plan && <p className="text-[12px]" style={{ color: "var(--gold)" }}>Gói hiện tại</p>}
              </div>
            </div>

            <div className="mb-4">{plan === "free" ? <span className="font-serif text-3xl font-medium">Miễn phí</span> : priceBlock(plan)}</div>

            <ul className="mb-5 space-y-2.5">
              {PLAN_FEATURES[plan].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: "var(--text2)" }}>
                  <Check size={16} className="mt-0.5 flex-shrink-0" style={{ color: accent ? "var(--gold)" : "var(--text3)" }} />
                  {f}
                </li>
              ))}
            </ul>

            {promo && <p className="mb-4 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--gold) 14%, transparent)", color: "var(--gold)" }}>{promo}</p>}

            <div className="mt-auto">
              {plan === "free" ? (
                <p className="text-center text-[13px]" style={{ color: "var(--text3)" }}>{currentPlan === "free" ? "Bạn đang dùng gói này" : "Gói cơ bản"}</p>
              ) : sentPlan === plan ? (
                <div className="flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ background: "color-mix(in srgb,#3fbf7f 14%,transparent)", border: "1px solid color-mix(in srgb,#3fbf7f 40%,transparent)" }}>
                  <Check size={17} style={{ color: "#5fd29a" }} />
                  <span className="text-[13px]">Đã gửi yêu cầu! Quản trị viên sẽ liên hệ sớm.</span>
                </div>
              ) : (
                <button onClick={() => { setError(null); setModalPlan(plan); }} className="btn-primary w-full rounded-xl py-3 text-[14px]">
                  <Send size={15} /> {`Đăng ký ${PLAN_LABEL[plan]}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Feature comparison */}
      <div className="mt-8 card overflow-x-auto p-0">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text2)" }}>So sánh tính năng</th>
              <th className="px-4 py-3 text-center font-medium">Miễn phí</th>
              <th className="px-4 py-3 text-center font-medium">Basic</th>
              <th className="px-4 py-3 text-center font-medium">Photographer</th>
              <th className="px-4 py-3 text-center font-medium" style={{ color: "var(--gold)" }}>Studio</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((row, i) => (
              <tr key={row.label} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <td className="px-4 py-2.5" style={{ color: "var(--text2)" }}>{row.label}</td>
                <td className="px-4 py-2.5"><div className="flex justify-center">{cellOf(row.free)}</div></td>
                <td className="px-4 py-2.5"><div className="flex justify-center">{cellOf(row.basic)}</div></td>
                <td className="px-4 py-2.5"><div className="flex justify-center">{cellOf(row.photographer)}</div></td>
                <td className="px-4 py-2.5"><div className="flex justify-center">{cellOf(row.studio)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-center text-[12.5px]" style={{ color: "var(--text3)" }}>
        Thanh toán & kích hoạt gói hiện được xử lý thủ công — gửi yêu cầu rồi quản trị viên sẽ liên hệ.
      </p>

      {/* Confirm modal — enter phone before sending */}
      {modalPlan && modalPlan !== "free" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,.6)" }}
          onClick={() => sending === null && setModalPlan(null)}
        >
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-2xl font-medium">Đăng ký gói {PLAN_LABEL[modalPlan]}</h3>
            <p className="mt-1 text-[13px]" style={{ color: "var(--text2)" }}>
              {cycle === "month" ? "Theo tháng" : "Theo năm"} ·{" "}
              <b style={{ color: "var(--gold)" }}>
                {formatVnd(finalPriceOf(modalPlan as "basic" | "photographer" | "studio"))}
              </b>
              {discountFor(modalPlan) > 0 && ` (-${discountFor(modalPlan)}%)`}
              {appliedCode && (!appliedCode.plan || appliedCode.plan === modalPlan) && ` · mã ${appliedCode.code}`}
            </p>

            <label className="mt-4 mb-1 block text-[13px]" style={{ color: "var(--text2)" }}>
              Số điện thoại liên hệ <span style={{ color: "var(--gold)" }}>*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0974374744"
              inputMode="tel"
              autoFocus
              className="input"
            />
            <label className="mt-3 mb-1 block text-[13px]" style={{ color: "var(--text2)" }}>Lời nhắn (tuỳ chọn)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nhu cầu của bạn, số lượng album dự kiến…" className="input min-h-[70px] resize-y" />

            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

            <div className="mt-4 flex gap-2.5">
              <button onClick={() => setModalPlan(null)} disabled={sending !== null} className="btn-ghost flex-1 py-2.5">
                Huỷ
              </button>
              <button onClick={() => request(modalPlan)} disabled={sending !== null} className="btn-primary flex-1 py-2.5">
                <Send size={15} /> {sending === modalPlan ? "Đang gửi…" : "Xác nhận gửi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
