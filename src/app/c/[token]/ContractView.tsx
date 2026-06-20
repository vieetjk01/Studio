"use client";

import { useEffect, useState } from "react";
import { Lock, FileText, MapPin, Calendar, Send, Check, Printer, PenLine, Images, ImagePlus, Star } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import CalendarButtons from "@/components/CalendarButtons";
import { mainUrl } from "@/lib/hosts";
import {
  contractTotal,
  vnd,
  sumAmounts,
  SHOOT_TYPE_LABEL,
  CONTRACT_STATUS_LABEL,
  PAYMENT_KIND_LABEL,
  type ShootType,
  type ContractStatus,
  type PaymentKind,
} from "@/lib/types";

type Contract = {
  code: string | null;
  title: string;
  client_name: string | null;
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
type Milestone = { id: string; title: string; event_date: string; event_time: string | null };
type QuoteOption = { id: string; name: string; price: number; description: string | null };
type Gallery = { slug: string; title: string };

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
  const [items, setItems] = useState<Item[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [selection, setSelection] = useState<Gallery | null>(null);
  const [quoteOptions, setQuoteOptions] = useState<QuoteOption[]>([]);
  const [chosenQuote, setChosenQuote] = useState<string | null>(null);
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
    setItems(j.items ?? []);
    setPayments(j.payments ?? []);
    setMilestones(j.milestones ?? []);
    setGallery(j.gallery ?? null);
    setSelection(j.selection ?? null);
    setQuoteOptions(j.quote_options ?? []);
    setChosenQuote(j.contract?.chosen_quote_option_id ?? null);
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
    }
  }

  async function chooseQuote(optionId: string) {
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "choose_quote", phone, option_id: optionId }),
    });
    if (res.ok) setChosenQuote(optionId);
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
          {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-4 w-full">
            {loading ? t("opening") : t("view")}
          </button>
        </form>
      </div>
    );
  }

  const total = contractTotal(items);
  const collected = sumAmounts(payments);
  const balance = total - collected;
  const signed = !!contract.client_signed_at;

  return (
    <>
      {/* On-screen view (hidden when printing) */}
      <div className="no-print mx-auto max-w-2xl px-6 py-10">
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

        <div className="card mt-6 space-y-3 p-6 text-sm">
          {contract.client_name && (
            <div className="flex items-center gap-2"><FileText size={15} style={{ color: "var(--text3)" }} /> {t("client")}: <b>{contract.client_name}</b></div>
          )}
          {(contract.event_date || contract.event_time) && (
            <div className="flex items-center gap-2"><Calendar size={15} style={{ color: "var(--text3)" }} />{contract.event_date}{contract.event_time ? ` · ${contract.event_time}` : ""}</div>
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

        {milestones.length > 0 && (
          <div className="card mt-6 p-6">
            <h2 className="mb-4 font-serif text-lg font-medium">{t("schedule")}</h2>
            <ul className="space-y-2">
              {milestones.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <Calendar size={15} style={{ color: "var(--text3)" }} />
                  <span className="flex-1">{m.title}</span>
                  <span style={{ color: "var(--text2)" }}>{m.event_date}{m.event_time ? ` · ${m.event_time}` : ""}</span>
                  <CalendarButtons compact event={{ date: m.event_date, time: m.event_time, title: m.title, location: contract.location }} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {selection && (
          <a
            href={mainUrl(`/a/${selection.slug}`)}
            target="_blank"
            rel="noreferrer"
            className="card mt-6 flex items-center gap-3 p-5 transition-colors hover:bg-[var(--surface2)]"
          >
            <ImagePlus size={20} style={{ color: "var(--accent)" }} />
            <div className="flex-1">
              <p className="font-serif text-lg font-medium">{t("pickPhotos")}</p>
              <p className="text-xs" style={{ color: "var(--text3)" }}>{selection.title} · {t("pickPhotosSub")}</p>
            </div>
            <span className="text-sm" style={{ color: "var(--accent)" }}>{t("open")}</span>
          </a>
        )}

        {gallery && (
          <a
            href={mainUrl(`/album/${gallery.slug}`)}
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
            <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>{t("totalVal")}</dt><dd className="font-serif text-lg font-medium">{vnd(total)}</dd></div>
            <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>{t("paid")}</dt><dd style={{ color: "#7bb38a" }}>{vnd(collected)}</dd></div>
            <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>{t("remaining")}</dt><dd className="font-medium">{vnd(balance)}</dd></div>
          </dl>
          {payments.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs" style={{ color: "var(--text3)" }}>
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{PAYMENT_KIND_LABEL[p.kind]} · {p.paid_at}</span>
                  <span>{vnd(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {contract.note && (
          <div className="card mt-6 p-6">
            <h2 className="mb-2 font-serif text-lg font-medium">{t("terms")}</h2>
            <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--text2)" }}>{contract.note}</p>
          </div>
        )}

        {/* Signing */}
        <div className="card mt-6 p-6">
          <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-medium">
            <PenLine size={17} /> {t("signTitle")}
          </h2>
          {signed ? (
            <div>
              <p className="flex items-center gap-2 text-sm" style={{ color: "#7bb38a" }}>
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
            <p className="flex items-center gap-2 text-sm" style={{ color: "#7bb38a" }}>
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
            <p className="flex items-center gap-2 text-sm" style={{ color: "#7bb38a" }}>
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
        items={items}
        milestones={milestones}
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
  items,
  milestones,
  total,
  collected,
  balance,
  qr,
}: {
  contract: Contract;
  studioName: string;
  items: Item[];
  milestones: Milestone[];
  total: number;
  collected: number;
  balance: number;
  qr: string;
}) {
  return (
    <div className="print-doc" style={{ display: "none", padding: "32px", maxWidth: 720, margin: "0 auto", fontFamily: "Georgia, serif", color: "#111" }}>
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
          <tr><td style={{ padding: "3px 0", width: 130 }}>Bên A (Studio):</td><td><b>{studioName}</b></td></tr>
          <tr><td style={{ padding: "3px 0" }}>Bên B (Khách hàng):</td><td><b>{contract.client_name || "—"}</b>{contract.client_email ? ` · ${contract.client_email}` : ""}</td></tr>
          <tr><td style={{ padding: "3px 0" }}>Loại dịch vụ:</td><td>{SHOOT_TYPE_LABEL[contract.shoot_type]}</td></tr>
          <tr><td style={{ padding: "3px 0" }}>Thời gian:</td><td>{contract.event_date || "—"}{contract.event_time ? ` · ${contract.event_time}` : ""}</td></tr>
          <tr><td style={{ padding: "3px 0" }}>Địa điểm:</td><td>{contract.location || "—"}</td></tr>
        </tbody>
      </table>

      {milestones.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, margin: "16px 0 8px" }}>Lịch trình</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: 8 }}>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "4px 0" }}>{m.title}</td>
                  <td style={{ padding: "4px 0", textAlign: "right", width: 180 }}>{m.event_date}{m.event_time ? ` · ${m.event_time}` : ""}</td>
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
          <tr><td style={{ textAlign: "right", padding: "2px 0" }}>Tổng giá trị hợp đồng:</td><td style={{ textAlign: "right", width: 140, fontWeight: 700 }}>{vnd(total)}</td></tr>
          <tr><td style={{ textAlign: "right", padding: "2px 0" }}>Đã thanh toán:</td><td style={{ textAlign: "right" }}>{vnd(collected)}</td></tr>
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
                <div style={{ fontSize: 11, color: "#555" }}>Ký ngày {new Date(contract.studio_signed_at).toLocaleDateString("vi-VN")}</div>
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
                <div style={{ fontSize: 11, color: "#555" }}>Ký ngày {new Date(contract.client_signed_at).toLocaleDateString("vi-VN")}</div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
