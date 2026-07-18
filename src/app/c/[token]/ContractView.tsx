"use client";

import { useEffect, useState } from "react";
import { fmtDate, fmtDateLunar } from "@/lib/date";
import { Lock, FileText, MapPin, Calendar, Send, Check, Printer, PenLine, Images, ImagePlus, Star, ListChecks, Package, Upload, Heart } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import CalendarButtons from "@/components/CalendarButtons";
import VietQRButton, { type BankInfo } from "@/components/VietQR";
import { thiepUrl } from "@/lib/hosts";
import { compressImage, checkImageFile } from "@/lib/image";
import {
  contractTotal,
  vnd,
  sumAmounts,
  SHOOT_TYPE_LABEL,
  CONTRACT_STATUS_LABEL,
  PAYMENT_KIND_LABEL,
  PRODUCT_STATUS_LABEL,
  type ShootType,
  type ContractStatus,
  type PaymentKind,
} from "@/lib/types";

type Contract = {
  code: string | null;
  title: string;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_messenger: string | null;
  shoot_type: ShootType;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  status: ContractStatus;
  note: string | null;
  client_signed_name: string | null;
  client_signature: string | null;
  client_signed_at: string | null;
  studio_signed_name: string | null;
  studio_signature: string | null;
  studio_signed_at: string | null;
  brief_concept: string | null;
  brief_outfit: string | null;
  brief_refs: string | null;
  brief_note: string | null;
  brief_submitted_at: string | null;
  updated_at: string;
};
type Item = { id: string; name: string; qty: number; unit_price: number };
type Payment = { id: string; amount: number; kind: PaymentKind; paid_at: string };
type Milestone = { id: string; title: string; event_date: string; event_time: string | null; note: string | null };
type QuoteOption = { id: string; name: string; price: number; description: string | null };
type PlanRow = { id: string; label: string; amount: number; due_date: string | null; paid: boolean; paid_at: string | null };
type ExpenseRow = { id: string; title: string; amount: number; category: string | null; spent_at: string };
type TaskRow = { id: string; label: string; done: boolean };
type ProductRow = { id: string; name: string; qty: number; cost: number; status: string };
type Gallery = { slug: string; title: string };
type Selection = { slug: string; title: string; phase?: string };

type Lang = "vi" | "en";
const TR = {
  vi: {
    portalTitle: "Hợp đồng của bạn", gatePrompt: "Nhập số điện thoại đã đăng ký để xem hợp đồng.",
    phone: "Số điện thoại", view: "Xem hợp đồng", opening: "Đang mở…", pdf: "Tải PDF / In",
    wrongPhone: "Số điện thoại không khớp. Vui lòng kiểm tra lại.", notFound: "Không tìm thấy hợp đồng.", genericErr: "Có lỗi xảy ra.",
    client: "Khách hàng", schedule: "Lịch trình", pickPhotos: "Chọn ảnh của bạn", pickPhotosSub: "đánh dấu những tấm ưng ý",
    viewPhotos: "Xem ảnh của bạn", viewPhotosSub: "mật khẩu là SĐT của bạn", open: "Mở →",
    items: "Hạng mục dịch vụ", noItems: "Chưa có hạng mục.", totalVal: "Tổng giá trị", paid: "Đã thanh toán", remaining: "Còn lại",
    terms: "Ghi chú / Điều khoản", signTitle: "Xác nhận & ký hợp đồng", signedOn: "Bạn đã ký ngày",
    signAgree: "Ký xác nhận đồng ý với nội dung hợp đồng trên.", signerName: "Họ tên người ký", signature: "Chữ ký",
    sign: "Đồng ý & ký", signing: "Đang ký…", review: "Đánh giá studio", reviewThanks: "Cảm ơn bạn đã đánh giá!",
    reviewPrompt: "Bạn hài lòng với dịch vụ chứ? Để lại cảm nhận giúp studio nhé.", reviewPh: "Cảm nhận của bạn…", sendReview: "Gửi đánh giá",
    messenger: "Liên hệ qua Messenger", messengerPrompt: "Dán link Facebook/Messenger của bạn để studio tiện liên hệ.", saveLink: "Lưu link", saved: "Đã lưu",
    editReq: "Yêu cầu chỉnh sửa", editPrompt: "Nếu có điểm chưa phù hợp, hãy gửi yêu cầu cho studio trước khi ký.",
    editSent: "Đã gửi yêu cầu. Studio sẽ liên hệ với bạn.", editPh: "Nội dung muốn chỉnh sửa…", send: "Gửi yêu cầu", sending: "Đang gửi…",
    updated: "Cập nhật", needName: "Nhập họ tên người ký.",
    briefTitle: "Brief buổi chụp", briefPrompt: "Cho studio biết mong muốn của bạn để buổi chụp đúng ý.",
    briefConcept: "Concept / phong cách", briefOutfit: "Trang phục / số người", briefRefs: "Link ảnh tham khảo", briefNote: "Yêu cầu khác",
    briefSave: "Gửi brief", briefSaved: "Đã gửi brief — cảm ơn bạn!",
    quoteTitle: "Chọn gói dịch vụ", quotePrompt: "Mời bạn chọn gói phù hợp nhất.", choose: "Chọn gói này", chosen: "Đã chọn",
  },
  en: {
    portalTitle: "Your contract", gatePrompt: "Enter your registered phone number to view the contract.",
    phone: "Phone number", view: "View contract", opening: "Opening…", pdf: "Save PDF / Print",
    wrongPhone: "Phone number doesn't match. Please check again.", notFound: "Contract not found.", genericErr: "Something went wrong.",
    client: "Client", schedule: "Schedule", pickPhotos: "Pick your photos", pickPhotosSub: "mark your favourites",
    viewPhotos: "View your photos", viewPhotosSub: "password is your phone number", open: "Open →",
    items: "Service items", noItems: "No items yet.", totalVal: "Total value", paid: "Paid", remaining: "Remaining",
    terms: "Notes / Terms", signTitle: "Confirm & sign contract", signedOn: "You signed on",
    signAgree: "Sign to agree with the contract above.", signerName: "Signer's full name", signature: "Signature",
    sign: "Agree & sign", signing: "Signing…", review: "Rate the studio", reviewThanks: "Thank you for your review!",
    reviewPrompt: "Happy with the service? Leave your feedback for the studio.", reviewPh: "Your feedback…", sendReview: "Send review",
    messenger: "Contact via Messenger", messengerPrompt: "Paste your Facebook/Messenger link so the studio can reach you.", saveLink: "Save link", saved: "Saved",
    editReq: "Request changes", editPrompt: "If something isn't right, send a request to the studio before signing.",
    editSent: "Request sent. The studio will contact you.", editPh: "What you'd like to change…", send: "Send request", sending: "Sending…",
    updated: "Updated", needName: "Enter the signer's name.",
    briefTitle: "Shoot brief", briefPrompt: "Tell the studio your wishes so the shoot turns out right.",
    briefConcept: "Concept / style", briefOutfit: "Outfit / headcount", briefRefs: "Reference photo links", briefNote: "Other requests",
    briefSave: "Send brief", briefSaved: "Brief sent — thank you!",
    quoteTitle: "Choose a package", quotePrompt: "Please pick the option that suits you best.", choose: "Choose this", chosen: "Chosen",
  },
} as const;

export default function ContractView({ token }: { token: string }) {
  const [phone, setPhone] = useState("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [studioName, setStudioName] = useState("Studio");
  const [studioLogo, setStudioLogo] = useState<string | null>(null);
  const [studioPhone, setStudioPhone] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [wedding, setWedding] = useState<{ slug: string; edit_token: string; published: boolean } | null>(null);
  const [story, setStory] = useState<{ slug: string; edit_token: string; published: boolean } | null>(null);
  const [quoteOptions, setQuoteOptions] = useState<QuoteOption[]>([]);
  const [chosenQuote, setChosenQuote] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [bank, setBank] = useState<BankInfo>({ bin: null, account: null, holder: null, name: null });
  const [paidReported, setPaidReported] = useState(false);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUrls, setProofUrls] = useState<string[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [qr, setQr] = useState("");
  const [lang, setLang] = useState<Lang>("vi");
  const t = (k: keyof typeof TR.vi) => TR[lang][k];
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [editMsg, setEditMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // signing
  const [signName, setSignName] = useState("");
  const [signature, setSignature] = useState("");
  const [signing, setSigning] = useState(false);

  // messenger link
  const [messenger, setMessenger] = useState("");
  const [msgrSaved, setMsgrSaved] = useState(false);

  // review
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  // brief
  const [brief, setBrief] = useState({ concept: "", outfit: "", refs: "", note: "" });
  const [briefSent, setBriefSent] = useState(false);

  // QR of this portal page (printed on the PDF)
  useEffect(() => {
    if (!contract) return;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        setQr(await QRCode.toDataURL(window.location.href, { margin: 1, width: 240, color: { dark: "#111", light: "#ffffff" } }));
      } catch {
        /* QR is optional */
      }
    })();
  }, [contract]);

  async function fetchContract(pw: string) {
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: pw }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: j.error as string };
    }
    const j = await res.json();
    setContract(j.contract);
    setStudioName(j.studio_name || "Studio");
    setStudioLogo(j.studio_logo || null);
    setStudioPhone(j.studio_phone ?? null);
    setItems(j.items ?? []);
    setPayments(j.payments ?? []);
    setMilestones(j.milestones ?? []);
    setGallery(j.gallery ?? null);
    setSelection(j.selection ?? null);
    setWedding(j.wedding ?? null);
    setStory(j.story ?? null);
    setQuoteOptions(j.quote_options ?? []);
    setChosenQuote(j.contract?.chosen_quote_option_id ?? null);
    setPlan(j.plan ?? []);
    setExpenses(j.expenses ?? []);
    setTasks(j.tasks ?? []);
    setProducts(j.products ?? []);
    if (j.bank) setBank(j.bank as BankInfo);
    setMessenger(j.contract?.client_messenger ?? "");
    setBrief({
      concept: j.contract?.brief_concept ?? "",
      outfit: j.contract?.brief_outfit ?? "",
      refs: j.contract?.brief_refs ?? "",
      note: j.contract?.brief_note ?? "",
    });
    return { ok: true };
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const r = await fetchContract(phone);
    setLoading(false);
    if (!r.ok) {
      setErr(r.error === "wrong_phone" ? t("wrongPhone") : r.error === "not_found" ? t("notFound") : t("genericErr"));
    }
  }

  async function sendEdit() {
    if (!editMsg.trim()) return;
    setSending(true);
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit_request", phone, message: editMsg.trim() }),
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
      setEditMsg("");
      setTimeout(() => setSent(false), 4000);
    } else {
      alert(t("genericErr"));
    }
  }

  async function reportPaid() {
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "paid", phone }),
    });
    if (res.ok) setPaidReported(true);
    else alert(t("genericErr"));
  }

  async function uploadProof(file: File, planId?: string) {
    const check = checkImageFile(file);
    if (!check.ok) { alert(check.error); return; }
    setProofUploading(true);
    // Compress before upload (keep numbers legible) so stored proofs stay light.
    let upload: File = file;
    try {
      const dataUrl = await compressImage(file, { maxDim: 1600, quality: 0.85, mime: "image/webp" });
      const blob = await (await fetch(dataUrl)).blob();
      if (blob.size > 0) upload = new File([blob], "proof.webp", { type: blob.type || "image/webp" });
    } catch { /* fall back to the original file */ }
    const form = new FormData();
    form.append("file", upload);
    form.append("phone", phone);
    if (planId) form.append("plan_id", planId);
    const res = await fetch(`/api/c/${token}/proof`, { method: "POST", body: form });
    if (res.ok) {
      const { url } = await res.json();
      setProofUrls((p) => [...p, url]);
      setPaidReported(true);
    } else {
      alert(t("genericErr"));
    }
    setProofUploading(false);
  }

  async function chooseQuote(optionId: string) {
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "choose_quote", phone, option_id: optionId }),
    });
    if (res.ok) setChosenQuote(optionId);
    else alert(t("genericErr"));
  }

  async function submitBrief() {
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "brief", phone, brief }),
    });
    if (res.ok) {
      setBriefSent(true);
      setTimeout(() => setBriefSent(false), 3000);
    }
  }

  async function saveMessenger() {
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_messenger", phone, link: messenger.trim() }),
    });
    if (res.ok) {
      setMsgrSaved(true);
      setTimeout(() => setMsgrSaved(false), 3000);
    }
  }

  async function sendReview() {
    if (!rating && !reviewText.trim()) return;
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "review", phone, rating, message: reviewText.trim() }),
    });
    if (res.ok) {
      setReviewSent(true);
      setReviewText("");
    }
  }

  async function sign() {
    if (!signName.trim()) {
      setErr(t("needName"));
      return;
    }
    setSigning(true);
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sign", phone, name: signName.trim(), signature }),
    });
    setSigning(false);
    if (res.ok) await fetchContract(phone);
    else setErr(t("genericErr"));
  }

  if (!contract) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <form onSubmit={unlock} className="card w-full max-w-sm p-8 text-center">
          <div className="mb-2 flex justify-end">
            <button type="button" onClick={() => setLang(lang === "vi" ? "en" : "vi")} className="text-xs" style={{ color: "var(--text3)" }}>
              {lang === "vi" ? "EN" : "VI"}
            </button>
          </div>
          <Lock size={22} className="mx-auto" style={{ color: "var(--text3)" }} />
          <h1 className="mt-4 font-serif text-2xl font-medium">{t("portalTitle")}</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>{t("gatePrompt")}</p>
          <input className="input mt-5 text-center" placeholder={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
          {err && (
            <p className="mt-3 rounded-lg px-3 py-2 text-sm font-medium" style={{ background: "var(--s-redS)", color: "var(--s-red)" }}>{err}</p>
          )}
          <button type="submit" disabled={loading} className="btn-primary mt-4 w-full">
            {loading ? t("opening") : t("view")}
          </button>
        </form>
      </div>
    );
  }

  const itemsTotal = contractTotal(items);
  const surcharge = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const printing = products.reduce((s, p) => s + (Number(p.cost) || 0) * (Number(p.qty) || 1), 0);
  const total = itemsTotal + surcharge + printing;
  const collected = sumAmounts(payments);
  const balance = total - collected;
  const signed = !!contract.client_signed_at;

  return (
    <>
      {/* On-screen view (hidden when printing) */}
      <div className="no-print mx-auto max-w-2xl px-6 py-10">
        {studioLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={studioLogo} alt={studioName} className="mb-4 h-11 w-auto object-contain" />
        )}
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow">{contract.code || (lang === "vi" ? "Hợp đồng dịch vụ" : "Service contract")}</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setLang(lang === "vi" ? "en" : "vi")} className="text-xs" style={{ color: "var(--text3)" }}>
              {lang === "vi" ? "EN" : "VI"}
            </button>
            <button onClick={() => window.print()} className="btn-ghost px-3 py-1.5 text-xs">
              <Printer size={14} /> {t("pdf")}
            </button>
          </div>
        </div>
        <h1 className="font-serif text-3xl font-medium">{contract.title}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          {SHOOT_TYPE_LABEL[contract.shoot_type]} · {CONTRACT_STATUS_LABEL[contract.status]}
        </p>

        <div className="card mt-6 p-6 text-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="eyebrow mb-1.5">{lang === "vi" ? "Bên A · Studio" : "Party A · Studio"}</p>
              <p className="font-medium">{studioName}</p>
              {studioPhone && <p style={{ color: "var(--text2)" }}>{lang === "vi" ? "SĐT" : "Phone"}: {studioPhone}</p>}
            </div>
            <div>
              <p className="eyebrow mb-1.5">{lang === "vi" ? "Bên B · Khách hàng" : "Party B · Client"}</p>
              <p className="font-medium">{contract.client_name || "—"}</p>
              {contract.client_phone && <p style={{ color: "var(--text2)" }}>{lang === "vi" ? "SĐT" : "Phone"}: {contract.client_phone}</p>}
              {contract.client_email && <p style={{ color: "var(--text2)" }}>Email: {contract.client_email}</p>}
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2"><FileText size={15} style={{ color: "var(--text3)" }} /> {lang === "vi" ? "Gói dịch vụ" : "Service"}: <b>{SHOOT_TYPE_LABEL[contract.shoot_type]}</b></div>
            {(contract.event_date || contract.event_time) && (
              <div className="flex items-center gap-2"><Calendar size={15} style={{ color: "var(--text3)" }} /> {lang === "vi" ? "Ngày chính" : "Main date"}: {fmtDateLunar(contract.event_date)}{contract.event_time ? ` · ${contract.event_time}` : ""}</div>
            )}
            {contract.location && (
              <div className="flex items-center gap-2"><MapPin size={15} style={{ color: "var(--text3)" }} /> {contract.location}</div>
            )}
            {contract.event_date && (
              <div className="pt-1">
                <CalendarButtons compact event={{ date: contract.event_date, time: contract.event_time, title: contract.title, location: contract.location }} />
              </div>
            )}
          </div>
        </div>

        {quoteOptions.length > 0 && (
          <div className="card mt-6 p-6">
            <h2 className="mb-1 font-serif text-lg font-medium">{t("quoteTitle")}</h2>
            <p className="mb-4 text-sm" style={{ color: "var(--text2)" }}>{t("quotePrompt")}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quoteOptions.map((o) => {
                const isChosen = chosenQuote === o.id;
                return (
                  <div key={o.id} className="rounded-xl p-4" style={{ background: "var(--surface2)", border: `1px solid ${isChosen ? "var(--accent)" : "var(--border)"}` }}>
                    <p className="font-serif text-lg font-medium">{o.name}</p>
                    <p className="mt-1 font-serif text-xl font-medium" style={{ color: "var(--accent)" }}>{vnd(o.price)}</p>
                    {o.description && <p className="mt-2 whitespace-pre-wrap text-xs" style={{ color: "var(--text2)" }}>{o.description}</p>}
                    <button
                      onClick={() => chooseQuote(o.id)}
                      disabled={isChosen}
                      className={isChosen ? "btn-ghost mt-3 w-full text-xs" : "btn-primary mt-3 w-full text-xs"}
                    >
                      {isChosen ? `✓ ${t("chosen")}` : t("choose")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(contract.event_date || milestones.length > 0) && (
          <div className="card mt-6 p-6">
            <h2 className="mb-4 font-serif text-lg font-medium">{lang === "vi" ? "Lịch trình chi tiết" : "Schedule"}</h2>
            <ul className="space-y-3">
              {contract.event_date && (
                <li className="flex flex-wrap items-start gap-3 text-sm">
                  <Calendar size={15} className="mt-0.5" style={{ color: "var(--accent)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{lang === "vi" ? "Buổi chính" : "Main session"}{contract.title ? ` — ${contract.title}` : ""}</p>
                    {contract.location && <p className="text-xs" style={{ color: "var(--text3)" }}>📍 {contract.location}</p>}
                  </div>
                  <span style={{ color: "var(--text2)" }}>{fmtDateLunar(contract.event_date)}{contract.event_time ? ` · ${contract.event_time}` : ""}</span>
                  <CalendarButtons compact event={{ date: contract.event_date, time: contract.event_time, title: contract.title, location: contract.location }} />
                </li>
              )}
              {milestones.map((m) => (
                <li key={m.id} className="flex flex-wrap items-start gap-3 text-sm">
                  <Calendar size={15} className="mt-0.5" style={{ color: "var(--text3)" }} />
                  <div className="min-w-0 flex-1">
                    <p>{m.title}</p>
                    {m.note && <p className="text-xs" style={{ color: "var(--text3)" }}>{m.note}</p>}
                  </div>
                  <span style={{ color: "var(--text2)" }}>{fmtDateLunar(m.event_date)}{m.event_time ? ` · ${m.event_time}` : ""}</span>
                  <CalendarButtons compact event={{ date: m.event_date, time: m.event_time, title: m.title, location: contract.location }} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {selection && (
          <a
            href={`/a/${selection.slug}`}
            target="_blank"
            rel="noreferrer"
            className="card mt-6 flex items-center gap-3 p-5 transition-colors hover:bg-[var(--surface2)]"
          >
            {selection.phase === "delivery" ? <Images size={20} style={{ color: "var(--accent)" }} /> : <ImagePlus size={20} style={{ color: "var(--accent)" }} />}
            <div className="flex-1">
              <p className="font-serif text-lg font-medium">{selection.phase === "delivery" ? t("viewPhotos") : t("pickPhotos")}</p>
              <p className="text-xs" style={{ color: "var(--text3)" }}>{selection.title} · {selection.phase === "delivery" ? t("viewPhotosSub") : t("pickPhotosSub")}</p>
            </div>
            <span className="text-sm" style={{ color: "var(--accent)" }}>{t("open")}</span>
          </a>
        )}

        {gallery && (
          <a
            href={`/album/${gallery.slug}`}
            target="_blank"
            rel="noreferrer"
            className="card mt-6 flex items-center gap-3 p-5 transition-colors hover:bg-[var(--surface2)]"
          >
            <Images size={20} style={{ color: "var(--accent)" }} />
            <div className="flex-1">
              <p className="font-serif text-lg font-medium">{t("viewPhotos")}</p>
              <p className="text-xs" style={{ color: "var(--text3)" }}>{gallery.title} · {t("viewPhotosSub")}</p>
            </div>
            <span className="text-sm" style={{ color: "var(--accent)" }}>{t("open")}</span>
          </a>
        )}

        {wedding && (
          <div className="card mt-6 p-5">
            <div className="flex items-center gap-3">
              <Heart size={20} style={{ color: "#d96e8f" }} />
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg font-medium">🎁 Thiệp cưới online tặng bạn</p>
                <p className="text-xs" style={{ color: "var(--text3)" }}>
                  Studio tặng bạn một thiệp cưới online — bạn tự điền thông tin, chọn ảnh & chia sẻ cho khách mời.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={thiepUrl(`/sua/${wedding.edit_token}`)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
              >
                <PenLine size={15} /> Chỉnh sửa thiệp của tôi
              </a>
              {wedding.published && (
                <a
                  href={thiepUrl(`/${wedding.slug}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-sm"
                >
                  <Images size={15} /> Xem thiệp
                </a>
              )}
            </div>
          </div>
        )}

        {story && (
          <div className="card mt-6 p-5">
            <div className="flex items-center gap-3">
              <Heart size={20} style={{ color: "#d0687a" }} />
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg font-medium">💞 Trang Love Story tặng bạn</p>
                <p className="text-xs" style={{ color: "var(--text3)" }}>
                  Trang chia sẻ khoảnh khắc — bạn điền nội dung & dán link folder ảnh/video Google Drive của mình.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`/story/sua/${story.edit_token}`} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm">
                <PenLine size={15} /> Chỉnh sửa trang của tôi
              </a>
              {story.published && (
                <a href={`/story/${story.slug}`} target="_blank" rel="noreferrer" className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-sm">
                  <Images size={15} /> Xem trang
                </a>
              )}
            </div>
          </div>
        )}

        <div className="card mt-6 p-6">
          <h2 className="mb-4 font-serif text-lg font-medium">{t("items")}</h2>
          {items.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text3)" }}>{t("noItems")}</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2.5">{it.name}</td>
                    <td className="py-2.5 text-center" style={{ color: "var(--text3)" }}>×{it.qty}</td>
                    <td className="py-2.5 text-right">{vnd(it.qty * it.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <dl className="mt-4 space-y-2 border-t pt-4 text-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>{lang === "vi" ? "Giá trị dịch vụ" : "Service value"}</dt><dd>{vnd(itemsTotal)}</dd></div>
            {surcharge > 0 && (
              <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>{lang === "vi" ? "Chi phí phát sinh" : "Surcharges"}</dt><dd>{vnd(surcharge)}</dd></div>
            )}
            {printing > 0 && (
              <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>{lang === "vi" ? "Chi phí in ấn" : "Printing"}</dt><dd>{vnd(printing)}</dd></div>
            )}
            <div className="flex justify-between border-t pt-2" style={{ borderColor: "var(--border)" }}><dt style={{ color: "var(--text2)" }}>{lang === "vi" ? "Tổng giá trị hợp đồng" : "Total"}</dt><dd className="font-serif text-lg font-medium">{vnd(total)}</dd></div>
            <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>{lang === "vi" ? "Đã thanh toán / cọc" : "Paid / deposit"}</dt><dd style={{ color: "var(--success)" }}>− {vnd(collected)}</dd></div>
            <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>{t("remaining")}</dt><dd className="font-serif text-lg font-medium" style={{ color: balance > 0 ? "var(--gold)" : "var(--success)" }}>{vnd(balance)}</dd></div>
          </dl>
          {/* Payment plan — all instalments */}
          {plan.length > 0 && (
            <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              <p className="mb-3 text-sm font-medium">{lang === "vi" ? "Kế hoạch thanh toán" : "Payment schedule"}</p>
              <ul className="space-y-2">
                {plan.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm" style={{ background: "var(--surface2)" }}>
                    <div>
                      <p className="font-medium">{p.label} · {vnd(p.amount)}</p>
                      <p className="text-[11px]" style={{ color: p.paid ? "var(--success)" : "var(--text3)" }}>
                        {p.paid
                          ? `✓ ${lang === "vi" ? "Đã thanh toán" : "Paid"}${p.paid_at ? ` · ${p.paid_at.slice(0, 10)}` : ""}`
                          : p.due_date
                            ? `${lang === "vi" ? "Hạn" : "Due"}: ${fmtDate(p.due_date)}`
                            : lang === "vi" ? "Chưa thanh toán" : "Pending"}
                      </p>
                    </div>
                    {!p.paid && bank.bin && (
                      <VietQRButton bank={bank} amount={p.amount} addInfo={(contract.code || contract.title || "").slice(0, 25)} label="QR" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bank info + upload proof */}
          <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--border)" }}>
            <p className="mb-3 text-sm font-medium">{lang === "vi" ? "Thông tin chuyển khoản" : "Bank transfer"}</p>
            {bank.account ? (
              <div className="mb-3 rounded-lg p-3 text-xs space-y-1" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                {bank.name && <div className="flex gap-2"><span style={{ color: "var(--text3)" }}>{lang === "vi" ? "Ngân hàng" : "Bank"}:</span><span className="font-medium">{bank.name}</span></div>}
                <div className="flex gap-2"><span style={{ color: "var(--text3)" }}>{lang === "vi" ? "Số tài khoản" : "Account"}:</span><span className="font-medium tracking-wider">{bank.account}</span></div>
                {bank.holder && <div className="flex gap-2"><span style={{ color: "var(--text3)" }}>{lang === "vi" ? "Chủ tài khoản" : "Holder"}:</span><span className="font-medium uppercase">{bank.holder}</span></div>}
              </div>
            ) : (
              <p className="mb-3 text-xs" style={{ color: "var(--text3)" }}>{lang === "vi" ? "Liên hệ studio để nhận thông tin chuyển khoản." : "Contact the studio for transfer details."}</p>
            )}

            {/* Uploaded proofs */}
            {proofUrls.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs" style={{ color: "var(--text3)" }}>{lang === "vi" ? "Ảnh chuyển khoản đã gửi:" : "Transfer proofs sent:"}</p>
                <div className="flex flex-wrap gap-2">
                  {proofUrls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="proof" className="h-16 w-16 rounded-lg object-cover" style={{ border: "1px solid var(--border)" }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Select which instalment the proof belongs to */}
            {plan.filter((p) => !p.paid).length > 0 && (
              <select
                className="input mb-2 text-sm"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                <option value="">{lang === "vi" ? "— Chọn đợt thanh toán —" : "— Select instalment —"}</option>
                {plan.filter((p) => !p.paid).map((p) => (
                  <option key={p.id} value={p.id}>{p.label} · {vnd(p.amount)}</option>
                ))}
              </select>
            )}

            {/* Drag-drop upload zone */}
            <label
              className="relative block w-full cursor-pointer rounded-2xl border-2 border-dashed py-8 text-center transition-colors"
              style={{
                borderColor: proofUploading ? "var(--brand)" : "var(--border2)",
                background: proofUploading ? "var(--brandSoft)" : "transparent",
                opacity: proofUploading ? 0.8 : 1,
              }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "var(--brandSoft)"; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.background = ""; }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "";
                e.currentTarget.style.background = "";
                const f = e.dataTransfer.files?.[0];
                if (f && f.type.startsWith("image/")) uploadProof(f, selectedPlanId || undefined);
              }}
            >
              <input type="file" accept="image/*" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" disabled={proofUploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProof(f, selectedPlanId || undefined); e.target.value = ""; }} />
              <Upload size={22} className="mx-auto mb-2" style={{ color: proofUploading ? "var(--brand)" : "var(--text3)" }} />
              <p className="text-sm font-medium" style={{ color: proofUploading ? "var(--brand)" : "var(--text2)" }}>
                {proofUploading
                  ? (lang === "vi" ? "Đang tải lên…" : "Uploading…")
                  : (lang === "vi" ? "Kéo ảnh vào đây hoặc bấm để chọn" : "Drag photo here or tap to select")}
              </p>
              {!proofUploading && (
                <p className="mt-0.5 text-xs" style={{ color: "var(--text3)" }}>
                  {lang === "vi" ? "Ảnh chuyển khoản ngân hàng • Tối đa 10MB" : "Bank transfer screenshot • Max 10MB"}
                </p>
              )}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {!paidReported && (
                <button onClick={reportPaid} className="btn-ghost px-4 py-2 text-sm">
                  {lang === "vi" ? "Tôi đã chuyển khoản (không có ảnh)" : "I have transferred (no screenshot)"}
                </button>
              )}
              {paidReported && (
                <p className="py-2 text-sm" style={{ color: "var(--s-green)" }}>✓ {lang === "vi" ? "Đã thông báo, studio sẽ đối soát." : "Notified — studio will reconcile."}</p>
              )}
            </div>
          </div>
        </div>

        {/* Surcharges / extra costs */}
        {expenses.length > 0 && (
          <div className="card mt-6 p-6">
            <h2 className="mb-4 font-serif text-lg font-medium">{lang === "vi" ? "Chi phí phát sinh" : "Extra costs"}</h2>
            <ul className="space-y-2 text-sm">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between">
                  <span>{e.title}<span style={{ color: "var(--text3)" }}>{e.spent_at ? ` · ${e.spent_at}` : ""}</span></span>
                  <span className="font-medium">{vnd(e.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Attached products */}
        {products.length > 0 && (
          <div className="card mt-6 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-medium"><Package size={17} /> {lang === "vi" ? "Sản phẩm đính kèm" : "Products"}</h2>
            <ul className="space-y-2 text-sm">
              {products.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1">{p.name}{p.qty > 1 ? ` ×${p.qty}` : ""}
                    <span className="ml-2 text-[11px]" style={{ color: "var(--text3)" }}>{PRODUCT_STATUS_LABEL[p.status as keyof typeof PRODUCT_STATUS_LABEL] || p.status}</span>
                  </span>
                  {p.cost > 0 && <span className="font-medium">{vnd(p.cost * (p.qty || 1))}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Progress checklist (read-only) */}
        {tasks.length > 0 && (
          <div className="card mt-6 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-medium">
              <ListChecks size={17} /> {lang === "vi" ? "Tiến độ công việc" : "Progress"}
              <span className="ml-auto text-xs font-normal" style={{ color: "var(--text3)" }}>{tasks.filter((x) => x.done).length}/{tasks.length}</span>
            </h2>
            <ul className="space-y-2">
              {tasks.map((tk) => (
                <li key={tk.id} className="flex items-center gap-2.5 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={{ border: "1px solid var(--border2)", background: tk.done ? "var(--success)" : "transparent" }}>
                    {tk.done && <Check size={13} color="#0c0c0c" />}
                  </span>
                  <span style={{ color: tk.done ? "var(--text3)" : "var(--text)", textDecoration: tk.done ? "line-through" : "none" }}>{tk.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {contract.note && (
          <div className="card mt-6 p-6">
            <h2 className="mb-2 font-serif text-lg font-medium">{t("terms")}</h2>
            <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--text2)" }}>{contract.note}</p>
          </div>
        )}

        {/* Signing */}
        <div className="card mt-6 p-6">
          <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-medium">
            <PenLine size={17} /> {t("signTitle")}
          </h2>
          {/* Bên A — studio (read-only) */}
          <div className="mb-4 rounded-xl p-3" style={{ background: "var(--surface2)" }}>
            <p className="eyebrow mb-1">{lang === "vi" ? "Bên A · Studio" : "Party A · Studio"}</p>
            {contract.studio_signature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={contract.studio_signature} alt="" className="h-14 rounded bg-white p-1" />
            ) : (
              <p className="text-xs" style={{ color: "var(--text3)" }}>{lang === "vi" ? "Studio chưa ký" : "Not signed"}</p>
            )}
            <p className="mt-1 text-sm">{contract.studio_signed_name || studioName}</p>
          </div>
          <p className="eyebrow mb-2">{lang === "vi" ? "Bên B · Khách hàng" : "Party B · Client"}</p>
          {signed ? (
            <div>
              <p className="flex items-center gap-2 text-sm" style={{ color: "var(--success)" }}>
                <Check size={15} /> {t("signedOn")} {new Date(contract.client_signed_at!).toLocaleString("vi-VN")}.
              </p>
              {contract.client_signature && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={contract.client_signature} alt="Chữ ký" className="mt-3 h-20 rounded bg-white p-1" />
              )}
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm" style={{ color: "var(--text2)" }}>{t("signAgree")}</p>
              <input className="input" placeholder={t("signerName")} value={signName} onChange={(e) => setSignName(e.target.value)} />
              <div className="mt-3">
                <label className="label">{t("signature")}</label>
                <SignaturePad onChange={setSignature} />
              </div>
              {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
              <button onClick={sign} disabled={signing} className="btn-primary mt-3">
                <PenLine size={15} /> {signing ? t("signing") : t("sign")}
              </button>
            </>
          )}
        </div>

        {/* Brief */}
        <div className="card mt-6 p-6">
          <h2 className="mb-2 font-serif text-lg font-medium">{t("briefTitle")}</h2>
          <p className="mb-3 text-sm" style={{ color: "var(--text2)" }}>{t("briefPrompt")}</p>
          <div className="space-y-3">
            <input className="input" placeholder={t("briefConcept")} value={brief.concept} onChange={(e) => setBrief((p) => ({ ...p, concept: e.target.value }))} />
            <input className="input" placeholder={t("briefOutfit")} value={brief.outfit} onChange={(e) => setBrief((p) => ({ ...p, outfit: e.target.value }))} />
            <input className="input" placeholder={t("briefRefs")} value={brief.refs} onChange={(e) => setBrief((p) => ({ ...p, refs: e.target.value }))} />
            <textarea className="input min-h-[70px]" placeholder={t("briefNote")} value={brief.note} onChange={(e) => setBrief((p) => ({ ...p, note: e.target.value }))} />
            <button onClick={submitBrief} className="btn-primary">
              {briefSent ? <Check size={15} /> : null} {briefSent ? t("briefSaved") : t("briefSave")}
            </button>
          </div>
        </div>

        {/* Review */}
        <div className="card mt-6 p-6">
          <h2 className="mb-2 font-serif text-lg font-medium">{t("review")}</h2>
          {reviewSent ? (
            <p className="flex items-center gap-2 text-sm" style={{ color: "var(--success)" }}>
              <Check size={15} /> {t("reviewThanks")}
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm" style={{ color: "var(--text2)" }}>{t("reviewPrompt")}</p>
              <div className="mb-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} aria-label={`${n} sao`}>
                    <Star size={26} style={{ color: n <= rating ? "#e0b85c" : "var(--text3)" }} fill={n <= rating ? "#e0b85c" : "none"} />
                  </button>
                ))}
              </div>
              <textarea className="input min-h-[80px]" placeholder={t("reviewPh")} value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
              <button onClick={sendReview} disabled={!rating && !reviewText.trim()} className="btn-primary mt-3">
                <Star size={15} /> {t("sendReview")}
              </button>
            </>
          )}
        </div>

        {/* Messenger link */}
        <div className="card mt-6 p-6">
          <h2 className="mb-2 font-serif text-lg font-medium">{t("messenger")}</h2>
          <p className="mb-3 text-sm" style={{ color: "var(--text2)" }}>{t("messengerPrompt")}</p>
          <div className="flex flex-wrap gap-2">
            <input
              className="input flex-1"
              placeholder="m.me/… hoặc facebook.com/…"
              value={messenger}
              onChange={(e) => setMessenger(e.target.value)}
            />
            <button onClick={saveMessenger} className="btn-ghost shrink-0">
              {msgrSaved ? <Check size={15} /> : null} {msgrSaved ? t("saved") : t("saveLink")}
            </button>
          </div>
        </div>

        {/* Edit request */}
        <div className="card mt-6 p-6">
          <h2 className="mb-2 font-serif text-lg font-medium">{t("editReq")}</h2>
          <p className="mb-3 text-sm" style={{ color: "var(--text2)" }}>{t("editPrompt")}</p>
          {sent ? (
            <p className="flex items-center gap-2 text-sm" style={{ color: "var(--success)" }}>
              <Check size={15} /> {t("editSent")}
            </p>
          ) : (
            <>
              <textarea className="input min-h-[90px]" placeholder={t("editPh")} value={editMsg} onChange={(e) => setEditMsg(e.target.value)} />
              <button onClick={sendEdit} disabled={sending || !editMsg.trim()} className="btn-primary mt-3">
                <Send size={15} /> {sending ? t("sending") : t("send")}
              </button>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-xs" style={{ color: "var(--text3)" }}>
          {t("updated")}: {new Date(contract.updated_at).toLocaleString("vi-VN")}
        </p>
      </div>

      {/* Print-only formal document (black on white) */}
      <PrintDoc
        contract={contract}
        studioName={studioName}
        studioPhone={studioPhone}
        items={items}
        milestones={milestones}
        itemsTotal={itemsTotal}
        surcharge={surcharge}
        printing={printing}
        total={total}
        collected={collected}
        balance={balance}
        qr={qr}
      />
    </>
  );
}

function PrintDoc({
  contract,
  studioName,
  studioPhone,
  items,
  milestones,
  itemsTotal,
  surcharge,
  printing,
  total,
  collected,
  balance,
  qr,
}: {
  contract: Contract;
  studioName: string;
  studioPhone: string | null;
  items: Item[];
  milestones: Milestone[];
  itemsTotal: number;
  surcharge: number;
  printing: number;
  total: number;
  collected: number;
  balance: number;
  qr: string;
}) {
  return (
    <div className="print-doc" style={{ display: "none", padding: "32px", maxWidth: 720, margin: "0 auto", fontFamily: '"Times New Roman", Times, serif', color: "#111" }}>
      <h1 style={{ textAlign: "center", fontSize: 22, fontWeight: 700, margin: 0 }}>HỢP ĐỒNG DỊCH VỤ</h1>
      <p style={{ textAlign: "center", fontSize: 13, margin: "4px 0 24px" }}>
        {contract.title}{contract.code ? ` · ${contract.code}` : ""}
      </p>
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="QR" style={{ position: "absolute", top: 24, right: 24, width: 92, height: 92 }} />
      )}

      <table style={{ width: "100%", fontSize: 13, marginBottom: 16, borderCollapse: "collapse" }}>
        <tbody>
          <tr><td style={{ padding: "3px 0", width: 130 }}>Bên A (Studio):</td><td><b>{studioName}</b>{studioPhone ? ` · ĐT: ${studioPhone}` : ""}</td></tr>
          <tr><td style={{ padding: "3px 0" }}>Bên B (Khách hàng):</td><td><b>{contract.client_name || "—"}</b>{contract.client_phone ? ` · ĐT: ${contract.client_phone}` : ""}{contract.client_email ? ` · ${contract.client_email}` : ""}</td></tr>
          <tr><td style={{ padding: "3px 0" }}>Gói dịch vụ:</td><td>{SHOOT_TYPE_LABEL[contract.shoot_type]}</td></tr>
          <tr><td style={{ padding: "3px 0" }}>Ngày chính:</td><td>{fmtDateLunar(contract.event_date) || "—"}{contract.event_time ? ` · ${contract.event_time}` : ""}</td></tr>
          <tr><td style={{ padding: "3px 0" }}>Địa điểm:</td><td>{contract.location || "—"}</td></tr>
        </tbody>
      </table>

      {milestones.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, margin: "16px 0 8px" }}>Lịch trình (các buổi phụ)</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: 8 }}>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "4px 0" }}>{m.title}</td>
                  <td style={{ padding: "4px 0", textAlign: "right", width: 180 }}>{fmtDateLunar(m.event_date)}{m.event_time ? ` · ${m.event_time}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 style={{ fontSize: 15, margin: "16px 0 8px" }}>1. Hạng mục dịch vụ</h2>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            <th style={{ textAlign: "left", padding: "5px 0" }}>Hạng mục</th>
            <th style={{ textAlign: "center", padding: "5px 0", width: 50 }}>SL</th>
            <th style={{ textAlign: "right", padding: "5px 0", width: 110 }}>Đơn giá</th>
            <th style={{ textAlign: "right", padding: "5px 0", width: 120 }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "5px 0" }}>{it.name}</td>
              <td style={{ textAlign: "center" }}>{it.qty}</td>
              <td style={{ textAlign: "right" }}>{vnd(it.unit_price)}</td>
              <td style={{ textAlign: "right" }}>{vnd(it.qty * it.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ width: "100%", fontSize: 13, marginTop: 12 }}>
        <tbody>
          <tr><td style={{ textAlign: "right", padding: "2px 0" }}>Giá trị dịch vụ:</td><td style={{ textAlign: "right", width: 140 }}>{vnd(itemsTotal)}</td></tr>
          {surcharge > 0 && <tr><td style={{ textAlign: "right", padding: "2px 0" }}>Chi phí phát sinh:</td><td style={{ textAlign: "right" }}>{vnd(surcharge)}</td></tr>}
          {printing > 0 && <tr><td style={{ textAlign: "right", padding: "2px 0" }}>Chi phí in ấn:</td><td style={{ textAlign: "right" }}>{vnd(printing)}</td></tr>}
          <tr><td style={{ textAlign: "right", padding: "4px 0", borderTop: "1px solid #333" }}>Tổng giá trị hợp đồng:</td><td style={{ textAlign: "right", fontWeight: 700, borderTop: "1px solid #333" }}>{vnd(total)}</td></tr>
          <tr><td style={{ textAlign: "right", padding: "2px 0" }}>Đã thanh toán / cọc:</td><td style={{ textAlign: "right" }}>− {vnd(collected)}</td></tr>
          <tr><td style={{ textAlign: "right", padding: "2px 0" }}>Còn lại:</td><td style={{ textAlign: "right", fontWeight: 700 }}>{vnd(balance)}</td></tr>
        </tbody>
      </table>

      {contract.note && (
        <>
          <h2 style={{ fontSize: 15, margin: "16px 0 8px" }}>2. Điều khoản / Ghi chú</h2>
          <p style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: 0 }}>{contract.note}</p>
        </>
      )}

      <table style={{ width: "100%", marginTop: 48, fontSize: 13, textAlign: "center" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%" }}>
              <b>BÊN A (STUDIO)</b>
              <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {contract.studio_signature && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={contract.studio_signature} alt="" style={{ height: 64 }} />
                )}
              </div>
              <div>{contract.studio_signed_name || studioName}</div>
              {contract.studio_signed_at && (
                <div style={{ fontSize: 11, color: "#555" }}>Ký ngày {fmtDate(contract.studio_signed_at)}</div>
              )}
            </td>
            <td style={{ width: "50%" }}>
              <b>BÊN B (KHÁCH HÀNG)</b>
              <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {contract.client_signature && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={contract.client_signature} alt="" style={{ height: 64 }} />
                )}
              </div>
              <div>{contract.client_signed_name || contract.client_name || ""}</div>
              {contract.client_signed_at && (
                <div style={{ fontSize: 11, color: "#555" }}>Ký ngày {fmtDate(contract.client_signed_at)}</div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
