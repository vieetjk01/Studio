"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Check } from "lucide-react";
import { vnd } from "@/lib/types";
import Turnstile from "@/components/Turnstile";

type Lang = "vi" | "en";
const TR = {
  vi: {
    eyebrow: "Đặt lịch chụp",
    subtitle: "Để lại thông tin, studio sẽ liên hệ xác nhận.",
    fullName: "Họ và tên *",
    phone: "Số điện thoại *",
    package: "Chọn gói",
    packageDefault: "— Chưa chọn / tư vấn thêm —",
    packageCustom: "— Gói khác (tự ghi) —",
    packageCustomPh: "Ghi gói bạn muốn (vd: chụp kỷ yếu nhóm 10 người…)",
    service: "Loại dịch vụ",
    servicePh: "VD: chụp cưới, sự kiện…",
    facebook: "Link Facebook (để studio liên hệ)",
    facebookPh: "facebook.com/… (không bắt buộc)",
    date: "Ngày mong muốn",
    note: "Ghi chú",
    submit: "Gửi yêu cầu đặt lịch",
    submitting: "Đang gửi…",
    errRequired: "Vui lòng nhập tên và số điện thoại.",
    errCaptcha: "Vui lòng xác minh bạn không phải robot.",
    errGeneric: "Có lỗi xảy ra, vui lòng thử lại.",
    sentTitle: "Đã gửi yêu cầu!",
    sentBody: "sẽ liên hệ với bạn sớm để xác nhận lịch.",
  },
  en: {
    eyebrow: "Book a shoot",
    subtitle: "Leave your details and the studio will confirm your booking.",
    fullName: "Full name *",
    phone: "Phone number *",
    package: "Choose a package",
    packageDefault: "— Not selected / need advice —",
    packageCustom: "— Other (write your own) —",
    packageCustomPh: "Describe the package you want…",
    service: "Service type",
    servicePh: "e.g. wedding, event…",
    facebook: "Facebook link (for studio to contact you)",
    facebookPh: "facebook.com/… (optional)",
    date: "Preferred date",
    note: "Notes",
    submit: "Send booking request",
    submitting: "Sending…",
    errRequired: "Please enter your name and phone number.",
    errCaptcha: "Please verify you are not a robot.",
    errGeneric: "Something went wrong, please try again.",
    sentTitle: "Request sent!",
    sentBody: "will contact you soon to confirm your booking.",
  },
} as const;

export type PkgOption = { name: string; price: number };

export default function BookingForm({
  token,
  studioName,
  packages = [],
  presetPackage = "",
}: {
  token: string;
  studioName: string;
  packages?: PkgOption[];
  presetPackage?: string;
}) {
  const [lang, setLang] = useState<Lang>("vi");
  useEffect(() => {
    const stored = localStorage.getItem("vk_lang") as Lang | null;
    if (stored === "en") setLang("en");
  }, []);
  const tr = TR[lang];

  const [f, setF] = useState({ name: "", phone: "", service: "", preferred_date: "", note: "", facebook: "" });
  const [pkg, setPkg] = useState(() => (packages.some((p) => p.name === presetPackage) ? presetPackage : ""));
  const [customPkg, setCustomPkg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!f.name.trim() || !f.phone.trim()) { setErr(tr.errRequired); return; }
    if (!captchaToken) { setErr(tr.errCaptcha); return; }
    const chosen = packages.find((p) => p.name === pkg);
    const packageName = pkg === "__custom__" ? customPkg.trim() || null : chosen?.name || null;
    const packagePrice = pkg === "__custom__" ? null : chosen?.price ?? null;
    setBusy(true);
    const res = await fetch(`/api/book/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, package_name: packageName, package_price: packagePrice, captcha: captchaToken }),
    });
    setBusy(false);
    if (res.ok) setSent(true);
    else setErr(tr.errGeneric);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="card max-w-sm p-8 text-center">
          <Check size={28} className="mx-auto" style={{ color: "#7bb38a" }} />
          <h1 className="mt-3 font-serif text-2xl font-medium">{tr.sentTitle}</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            {studioName} {tr.sentBody}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <p className="eyebrow mb-1.5">{studioName}</p>
      <h1 className="flex items-center gap-2 font-serif text-3xl font-medium">
        <CalendarCheck size={24} /> {tr.eyebrow}
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>{tr.subtitle}</p>

      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label">{tr.fullName}</label>
          <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="label">{tr.phone}</label>
          <input className="input" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label className="label">{tr.package}</label>
          <select className="input" value={pkg} onChange={(e) => setPkg(e.target.value)}>
            <option value="">{tr.packageDefault}</option>
            {packages.map((p) => (
              <option key={p.name} value={p.name}>{p.name} — {vnd(p.price)}</option>
            ))}
            <option value="__custom__">{tr.packageCustom}</option>
          </select>
          {pkg === "__custom__" && (
            <input className="input mt-2" placeholder={tr.packageCustomPh} value={customPkg} onChange={(e) => setCustomPkg(e.target.value)} />
          )}
        </div>
        <div>
          <label className="label">{tr.service}</label>
          <input className="input" placeholder={tr.servicePh} value={f.service} onChange={(e) => set("service", e.target.value)} />
        </div>
        <div>
          <label className="label">{tr.facebook}</label>
          <input className="input" placeholder={tr.facebookPh} value={f.facebook} onChange={(e) => set("facebook", e.target.value)} />
        </div>
        <div>
          <label className="label">{tr.date}</label>
          <input type="date" className="input" value={f.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} />
        </div>
        <div>
          <label className="label">{tr.note}</label>
          <textarea className="input min-h-[80px]" value={f.note} onChange={(e) => set("note", e.target.value)} />
        </div>
        <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={busy || !captchaToken} className="btn-primary w-full">
          {busy ? tr.submitting : tr.submit}
        </button>
      </form>
    </div>
  );
}
