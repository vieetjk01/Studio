"use client";

import { useEffect, useState } from "react";
import { Check, Crown, Sparkles, Send, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlanUsage from "@/components/PlanUsage";
import { PLAN_FEATURES, PLAN_PRICING, PLAN_LABEL, formatVnd, type Plan } from "@/lib/plans";

type Cycle = "month" | "year";

export default function UpgradePage() {
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [discount, setDiscount] = useState(0);
  const [cycle, setCycle] = useState<Cycle>("month");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState<Plan | null>(null);
  const [sentPlan, setSentPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const { data: s } = await supabase.from("site_settings").select("basic_discount_percent").eq("id", 1).maybeSingle();
      if (s?.basic_discount_percent) setDiscount(s.basic_discount_percent);
    })();
  }, []);

  async function request(plan: Plan) {
    setSending(plan);
    setError(null);
    const res = await fetch("/api/upgrade-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, cycle, note }),
    });
    setSending(null);
    if (res.ok) {
      setSentPlan(plan);
      setNote("");
    } else {
      setError("Gửi yêu cầu thất bại, thử lại sau.");
    }
  }

  // Basic price with the admin discount applied.
  const basic = PLAN_PRICING.basic;
  const basicNow = Math.round(basic[cycle] * (1 - discount / 100));
  // Studio: 50% off yearly forever if subscribed now.
  const studio = PLAN_PRICING.studio;
  const studioNow = cycle === "year" ? Math.round(studio.year * 0.5) : studio.month;

  const cards: {
    plan: Plan;
    icon: typeof Sparkles;
    accent: boolean;
    price?: React.ReactNode;
    promo?: string;
  }[] = [
    { plan: "free", icon: Sparkles, accent: false },
    {
      plan: "basic",
      icon: Zap,
      accent: true,
      price: (
        <div className="flex items-baseline gap-2">
          {discount > 0 && (
            <span className="text-[15px] line-through" style={{ color: "var(--text3)" }}>{formatVnd(basic[cycle])}</span>
          )}
          <span className="font-serif text-3xl font-medium">{formatVnd(basicNow)}</span>
          <span className="text-[13px]" style={{ color: "var(--text2)" }}>/{cycle === "month" ? "tháng" : "năm"}</span>
          {discount > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--gold)", color: "#1a1205" }}>-{discount}%</span>
          )}
        </div>
      ),
    },
    {
      plan: "studio",
      icon: Crown,
      accent: true,
      price: (
        <div className="flex items-baseline gap-2">
          {cycle === "year" && (
            <span className="text-[15px] line-through" style={{ color: "var(--text3)" }}>{formatVnd(studio.year)}</span>
          )}
          <span className="font-serif text-3xl font-medium">{formatVnd(studioNow)}</span>
          <span className="text-[13px]" style={{ color: "var(--text2)" }}>/{cycle === "month" ? "tháng" : "năm"}</span>
        </div>
      ),
      promo: "Đăng ký trong thời gian này: ưu đãi 50%/năm vĩnh viễn + nhận mọi tính năng nâng cấp sau này.",
    },
  ];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8">
        <p className="eyebrow mb-1.5">Gói dịch vụ</p>
        <h1 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Nâng cấp gói</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--text2)" }}>
          Mở khoá thêm album, cho khách tải ảnh & ghi chú, watermark logo, và nén/lọc ảnh không giới hạn.
        </p>
      </div>

      <PlanUsage showUpgrade={false} />

      {/* Billing cycle toggle */}
      <div className="mb-5 inline-flex overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
        {(["month", "year"] as Cycle[]).map((c) => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className="px-4 py-2 text-[13px] font-medium"
            style={cycle === c ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface2)", color: "var(--text2)" }}
          >
            {c === "month" ? "Theo tháng" : "Theo năm"}
          </button>
        ))}
      </div>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(290px,1fr))]">
        {cards.map(({ plan, icon: Icon, accent, price, promo }) => (
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

            {price ? <div className="mb-4">{price}</div> : <div className="mb-4 font-serif text-3xl font-medium">Miễn phí</div>}

            <ul className="mb-5 space-y-2.5">
              {PLAN_FEATURES[plan].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: "var(--text2)" }}>
                  <Check size={16} className="mt-0.5 flex-shrink-0" style={{ color: accent ? "var(--gold)" : "var(--text3)" }} />
                  {f}
                </li>
              ))}
            </ul>

            {promo && (
              <p className="mb-4 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--gold) 14%, transparent)", color: "var(--gold)" }}>
                {promo}
              </p>
            )}

            <div className="mt-auto">
              {plan === "free" ? (
                <p className="text-center text-[13px]" style={{ color: "var(--text3)" }}>
                  {currentPlan === "free" ? "Bạn đang dùng gói này" : "Gói cơ bản"}
                </p>
              ) : sentPlan === plan ? (
                <div className="flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ background: "color-mix(in srgb,#3fbf7f 14%,transparent)", border: "1px solid color-mix(in srgb,#3fbf7f 40%,transparent)" }}>
                  <Check size={17} style={{ color: "#5fd29a" }} />
                  <span className="text-[13px]">Đã gửi yêu cầu! Quản trị viên sẽ liên hệ sớm.</span>
                </div>
              ) : (
                <button
                  onClick={() => request(plan)}
                  disabled={sending === plan}
                  className="btn-primary w-full rounded-xl py-3 text-[14px]"
                >
                  <Send size={15} /> {sending === plan ? "Đang gửi…" : `Đăng ký ${PLAN_LABEL[plan]}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 card p-5">
        <label className="mb-2 block text-[13px]" style={{ color: "var(--text2)" }}>Lời nhắn khi gửi yêu cầu (tuỳ chọn)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nhu cầu của bạn, số lượng album dự kiến, đề xuất giảm giá…"
          className="input min-h-[70px] resize-y"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <p className="mt-2 text-[12px]" style={{ color: "var(--text3)" }}>
          Thanh toán & kích hoạt gói hiện được xử lý thủ công — gửi yêu cầu rồi quản trị viên sẽ liên hệ.
        </p>
      </div>
    </div>
  );
}
