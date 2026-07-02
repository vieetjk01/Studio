"use client";

import { useEffect, useState } from "react";

type Lang = "vi" | "en";
const TR = {
  vi: {
    errToggle: "Lỗi",
    errSend: "Lỗi gửi",
    errAccept: "Lỗi",
    confirmTitle: "Xác nhận đồng ý báo giá này?",
    confirmTotal: "Tổng tiền:",
    confirmDeposit: "Cọc đề xuất:",
    confirmAutoContract: "✅ Studio sẽ TỰ ĐỘNG tạo hợp đồng cho bạn ngay sau khi xác nhận.\n",
    confirmManual: "Studio sẽ liên hệ riêng để gửi hợp đồng.\n",
    lockedCancelled: "bị huỷ",
    lockedExpired: "hết hạn",
    lockedMsg: "và không thể thay đổi.",
    quotePrefix: "Báo giá này đã",
    codeLabel: "Mã:",
    eventTitle: "Sự kiện",
    dateLabel: "Ngày:",
    locationLabel: "Địa điểm:",
    itemsTitle: "Hạng mục báo giá",
    itemsHint: "Bấm vào hạng mục có ô vuông để chọn/bỏ. Hạng mục khoá",
    itemsHint2: "là bắt buộc.",
    choosePackage: "Chọn 1 gói dịch vụ",
    discount: "Giảm",
    standaloneTitle: "Hạng mục riêng lẻ",
    packageOffer: "Ưu đãi gói",
    selectPackageHint: "Chọn gói",
    selectPackageHint2: "để được giảm",
    depositLabel: "Cọc đề xuất (~",
    depositLabel2: "%, làm tròn 500K):",
    adjustTitle: "Yêu cầu chỉnh sửa",
    adjustHint: "Nếu cần thay đổi giá / thêm bớt hạng mục / điều khác, ghi rõ ở đây.",
    adjustPh: "Vd: Em muốn bớt khoản makeup, thêm 1 photographer phụ…",
    sending: "Đang gửi…",
    sendBtn: "Gửi yêu cầu",
    chatTitle: "Trao đổi với studio",
    you: "Bạn",
    yourInfoTitle: "Thông tin của bạn",
    yourInfoHint: "Vui lòng điền để studio liên hệ và (nếu chọn) tự tạo hợp đồng.",
    namePh: "Nguyễn Văn A",
    nameLabel: "Họ và tên *",
    phoneLabel: "Số điện thoại *",
    emailLabel: "Email",
    fbLabel: "Link Facebook",
    phoneErr: "SĐT phải có 9–11 chữ số.",
    autoContract: "Tự động tạo hợp đồng cho mình",
    autoContractHint: "Khi xác nhận, hệ thống sẽ tự tạo hợp đồng dựa trên báo giá này (kèm hạng mục đã chọn và mức cọc đề xuất). Studio có thể chỉnh thêm điều khoản trước khi gửi cho bạn ký.",
    processing: "Đang xử lý…",
    acceptBtn: "Tôi đồng ý với báo giá này",
    acceptedMsg: "Bạn đã đồng ý với báo giá này",
    contractCreated: "Hợp đồng đã được tạo tự động. Bấm nút dưới để xem chi tiết và ký xác nhận khi sẵn sàng.",
    viewContract: "Xem hợp đồng",
    copied: "Đã copy ✓",
    copyLink: "Copy link hợp đồng để lưu lại",
    keepLink: "Giữ link này — bạn có thể quay lại xem hợp đồng bất cứ lúc nào.",
    studioContact: "sẽ liên hệ để gửi hợp đồng cho bạn. Cảm ơn bạn!",
    contractNotice: "Lưu ý về hợp đồng",
    contractRef: "Hợp đồng tạo tự động từ báo giá này là",
    contractRefLabel: "hợp đồng tham khảo",
    contractRefHint: "Studio sẽ chỉnh sửa đầy đủ các điều khoản, thông tin chi tiết và gửi lại để bạn xem xét và ký chính thức.",
    cantModify: "Báo giá này không thể thao tác.",
    footer: "Báo giá tạo bởi",
    dateLocale: "vi-VN",
  },
  en: {
    errToggle: "Error",
    errSend: "Error sending",
    errAccept: "Error",
    confirmTitle: "Confirm acceptance of this quote?",
    confirmTotal: "Total:",
    confirmDeposit: "Proposed deposit:",
    confirmAutoContract: "✅ Studio will AUTOMATICALLY create a contract for you right after confirmation.\n",
    confirmManual: "Studio will contact separately to send the contract.\n",
    lockedCancelled: "cancelled",
    lockedExpired: "expired",
    lockedMsg: "and cannot be changed.",
    quotePrefix: "This quote has been",
    codeLabel: "Code:",
    eventTitle: "Event",
    dateLabel: "Date:",
    locationLabel: "Location:",
    itemsTitle: "Quote items",
    itemsHint: "Click items with checkboxes to select/deselect. Locked items",
    itemsHint2: "are required.",
    choosePackage: "Choose 1 service package",
    discount: "Discount",
    standaloneTitle: "Standalone items",
    packageOffer: "Package offer",
    selectPackageHint: "Choose package",
    selectPackageHint2: "to get discount",
    depositLabel: "Proposed deposit (~",
    depositLabel2: "%, rounded to 500K):",
    adjustTitle: "Request adjustment",
    adjustHint: "If you need to change price / add/remove items / anything else, specify clearly here.",
    adjustPh: "E.g.: I want to reduce makeup, add 1 additional photographer…",
    sending: "Sending…",
    sendBtn: "Send request",
    chatTitle: "Exchange with studio",
    you: "You",
    yourInfoTitle: "Your information",
    yourInfoHint: "Please fill in so the studio can contact and (if chosen) auto-create a contract.",
    namePh: "Jane Smith",
    nameLabel: "Full name *",
    phoneLabel: "Phone number *",
    emailLabel: "Email",
    fbLabel: "Facebook link",
    phoneErr: "Phone must have 9–11 digits.",
    autoContract: "Auto-create contract for me",
    autoContractHint: "When confirmed, the system will auto-create a contract based on this quote (with selected items and proposed deposit). Studio can adjust terms before sending for your signature.",
    processing: "Processing…",
    acceptBtn: "I agree with this quote",
    acceptedMsg: "You have agreed with this quote",
    contractCreated: "Contract has been auto-created. Click the button below to view details and sign when ready.",
    viewContract: "View contract",
    copied: "Copied ✓",
    copyLink: "Copy contract link to save",
    keepLink: "Keep this link — you can return to view the contract anytime.",
    studioContact: "will contact to send the contract to you. Thank you!",
    contractNotice: "Contract notice",
    contractRef: "The contract auto-created from this quote is",
    contractRefLabel: "a reference contract",
    contractRefHint: "Studio will fully edit the terms, details and send back for you to review and sign officially.",
    cantModify: "This quote cannot be modified.",
    footer: "Quote created by",
    dateLocale: "en-GB",
  },
} as const;
import {
  Check, MessageSquare, ShieldCheck, Lock, Facebook, Phone, Mail, User as UserIcon,
  Sparkles, FileSignature, ExternalLink, Copy, Tag, ChevronDown, ChevronUp, Package,
} from "lucide-react";
import {
  vnd,
  QUOTE_STATUS_LABEL,
  quoteSelectedTotal,
  type StudioQuote,
  type QuoteItem,
  type QuoteAdjustment,
} from "@/lib/types";
import { computeRoundedDeposit, depositRatio } from "@/lib/quote-deposit";
import { fmtDateLunar } from "@/lib/date";
import { mainUrl } from "@/lib/hosts";

export default function QuoteClientView({
  quote,
  initialItems,
  initialAdjustments,
  studioName,
  studioLogo = null,
  studioCanContract,
  initialContractToken,
}: {
  quote: StudioQuote;
  initialItems: QuoteItem[];
  initialAdjustments: QuoteAdjustment[];
  studioName: string;
  studioLogo?: string | null;
  studioCanContract: boolean;
  initialContractToken: string | null;
}) {
  const [lang, setLangState] = useState<Lang>("vi");
  useEffect(() => {
    const stored = localStorage.getItem("vk_lang") as Lang | null;
    if (stored === "en") setLangState("en");
  }, []);
  const tr = TR[lang];

  const [items, setItems] = useState(initialItems);
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(quote.status === "accepted" || quote.status === "converted");
  const [contractToken, setContractToken] = useState<string | null>(initialContractToken);
  const [copied, setCopied] = useState(false);

  const [clientName, setClientName] = useState(quote.client_name || "");
  const [clientPhone, setClientPhone] = useState(quote.client_phone || "");
  const [clientEmail, setClientEmail] = useState(quote.client_email || "");
  const [clientFacebook, setClientFacebook] = useState(quote.client_facebook || "");
  const [autoCreate, setAutoCreate] = useState(studioCanContract);

  const locked = accepted || quote.status === "cancelled" || quote.status === "expired";

  // Separate items into package groups and standalone items.
  const packageGroups = new Map<string, QuoteItem[]>();
  const standaloneItems: QuoteItem[] = [];
  for (const it of items) {
    if (it.package_group) {
      if (!packageGroups.has(it.package_group)) packageGroups.set(it.package_group, []);
      packageGroups.get(it.package_group)!.push(it);
    } else {
      standaloneItems.push(it);
    }
  }

  const total = quoteSelectedTotal(items);

  // Which package is currently selected (packages are mutually exclusive).
  const selectedPackageGroup = items.find((i) => i.package_group && i.selected)?.package_group ?? null;

  // Package-tied discount: applies only when the client picks the studio's
  // designated package (discount_package_group).
  const bulkDiscountActive =
    !!quote.discount_package_group &&
    selectedPackageGroup === quote.discount_package_group &&
    quote.bulk_discount_amount > 0;
  const effectiveTotal = bulkDiscountActive ? total - quote.bulk_discount_amount : total;
  const deposit = computeRoundedDeposit(effectiveTotal);
  const depositPct = depositRatio(effectiveTotal, deposit);

  const phoneDigits = clientPhone.replace(/\s+/g, "");
  const phoneValid = /^[0-9]{9,11}$/.test(phoneDigits);
  const formValid = clientName.trim().length > 0 && phoneValid;

  async function toggleItem(it: QuoteItem) {
    if ((!it.is_optional && !it.package_group) || locked) return;
    const next = !it.selected;
    const prevItems = items;
    // Packages are mutually exclusive: selecting one deselects every other
    // package. Standalone optional items toggle on their own.
    if (it.package_group) {
      setItems((arr) =>
        arr.map((i) => {
          if (!i.package_group) return i;
          if (next) return { ...i, selected: i.package_group === it.package_group };
          return i.package_group === it.package_group ? { ...i, selected: false } : i;
        }),
      );
    } else {
      setItems((arr) => arr.map((i) => i.id === it.id ? { ...i, selected: next } : i));
    }
    setError(null);
    try {
      const r = await fetch(`/api/quote/${quote.client_token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", item_id: it.id, selected: next }),
      });
      if (!r.ok) throw new Error((await r.json()).error || tr.errToggle);
    } catch (e) {
      setItems(prevItems);
      setError(e instanceof Error ? e.message : tr.errToggle);
    }
  }

  async function sendAdjustment() {
    if (!message.trim() || locked) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch(`/api/quote/${quote.client_token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "adjust", message: message.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || tr.errSend);
      setAdjustments((arr) => [...arr, data.adjustment as QuoteAdjustment]);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.errSend);
    } finally {
      setSending(false);
    }
  }

  async function accept() {
    if (locked || !formValid) return;
    const confirmMsg =
      `${tr.confirmTitle}\n\n` +
      `${tr.confirmTotal} ${vnd(effectiveTotal)}\n` +
      `${tr.confirmDeposit} ${vnd(deposit)}\n` +
      (autoCreate && studioCanContract ? tr.confirmAutoContract : tr.confirmManual);
    if (!confirm(confirmMsg)) return;
    setAccepting(true);
    setError(null);
    try {
      const r = await fetch(`/api/quote/${quote.client_token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          client_name: clientName.trim(),
          client_phone: phoneDigits,
          client_email: clientEmail.trim(),
          client_facebook: clientFacebook.trim(),
          auto_create_contract: autoCreate && studioCanContract,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || tr.errAccept);
      setAccepted(true);
      if (data.contract_token) setContractToken(data.contract_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.errAccept);
    } finally {
      setAccepting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-6 md:py-12" data-testid="quote-client-page">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Locked banner */}
        {locked && !accepted && (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(107,163,199,0.1)", border: "1px solid rgba(107,163,199,0.3)", color: "var(--text2)" }}>
            {tr.quotePrefix} {quote.status === "cancelled" ? tr.lockedCancelled : tr.lockedExpired} {tr.lockedMsg}
          </div>
        )}

        <header className="text-center">
          {studioLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={studioLogo} alt={studioName} className="mx-auto mb-3 h-12 w-auto object-contain" />
          )}
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text3)" }}>{studioName}</p>
          <h1 className="mt-2 font-serif text-3xl font-medium md:text-4xl">{quote.title}</h1>
          {quote.code && <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>{tr.codeLabel} {quote.code}</p>}
          <span
            className="mt-3 inline-block rounded-full px-3 py-1 text-xs"
            style={{ background: "var(--surface2)", color: accepted ? "#34d399" : "var(--text2)" }}
            data-testid="quote-status-badge"
          >
            {QUOTE_STATUS_LABEL[accepted ? "accepted" : quote.status]}
          </span>
        </header>

        {quote.intro && (
          <section className="card p-5">
            <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--text2)" }}>{quote.intro}</p>
          </section>
        )}

        {(quote.event_date || quote.location) && (
          <section className="card p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>{tr.eventTitle}</h2>
            <dl className="mt-2 grid gap-2 text-sm md:grid-cols-2">
              {quote.event_date && (
                <div><dt className="opacity-60">{tr.dateLabel}</dt><dd>{fmtDateLunar(quote.event_date)}</dd></div>
              )}
              {quote.location && (
                <div><dt className="opacity-60">{tr.locationLabel}</dt><dd>{quote.location}</dd></div>
              )}
            </dl>
          </section>
        )}

        {/* Items section */}
        <section className="card p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>{tr.itemsTitle}</h2>
          {!locked && (
            <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
              {tr.itemsHint} <Lock size={10} className="inline" /> {tr.itemsHint2}
            </p>
          )}

          {/* Package groups */}
          {packageGroups.size > 0 && (
            <div className="mt-3 space-y-3">
              <p className="text-xs font-medium" style={{ color: "var(--text3)" }}>
                <Package size={11} className="inline mr-1" /> {tr.choosePackage}
              </p>
              {Array.from(packageGroups.entries()).map(([groupName, groupItems]) => {
                const groupSelected = groupItems.some((i) => i.selected);
                const groupTotal = groupItems.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0);
                return (
                  <button
                    key={groupName}
                    onClick={() => toggleItem(groupItems[0])}
                    disabled={locked}
                    className="w-full rounded-xl border-2 p-4 text-left transition"
                    style={{
                      borderColor: groupSelected ? "var(--accent)" : "var(--border)",
                      background: groupSelected ? "rgba(199,167,107,0.06)" : "transparent",
                      cursor: locked ? "default" : "pointer",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2"
                          style={{
                            borderColor: groupSelected ? "var(--accent)" : "var(--border)",
                            background: groupSelected ? "var(--accent)" : "transparent",
                          }}
                        >
                          {groupSelected && <Check size={11} color="#000" />}
                        </div>
                        <span className="font-medium">{groupName}</span>
                        {quote.discount_package_group === groupName && quote.bulk_discount_amount > 0 && (
                          <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "#fb923c22", color: "#fb923c" }}>
                            <Tag size={9} className="inline mr-0.5" /> {tr.discount} {vnd(quote.bulk_discount_amount)}
                          </span>
                        )}
                      </div>
                      <span className="font-medium" style={{ color: "var(--accent)" }}>{vnd(groupTotal)}</span>
                    </div>
                    <ul className="mt-2 space-y-0.5 pl-7 text-xs" style={{ color: "var(--text3)" }}>
                      {groupItems.map((gi) => (
                        <li key={gi.id}>• {gi.name}{gi.description ? ` — ${gi.description}` : ""} ({gi.qty} × {vnd(gi.unit_price)})</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          )}

          {/* Standalone items */}
          {standaloneItems.length > 0 && (
            <div className="mt-3 space-y-2">
              {packageGroups.size > 0 && (
                <p className="text-xs font-medium" style={{ color: "var(--text3)" }}>{tr.standaloneTitle}</p>
              )}
              {standaloneItems.map((it) => {
                const isOn = !it.is_optional || it.selected;
                const lineTotal = (it.qty || 0) * (it.unit_price || 0);
                return (
                  <button
                    key={it.id}
                    onClick={() => toggleItem(it)}
                    disabled={!it.is_optional || locked}
                    className="w-full rounded-lg border p-3 text-left transition"
                    style={{
                      borderColor: it.is_discount ? "#fb923c66" : isOn ? "var(--accent)" : "var(--border)",
                      background: it.is_discount
                        ? "rgba(251,146,60,0.06)"
                        : isOn
                        ? "rgba(199,167,107,0.06)"
                        : "transparent",
                      cursor: it.is_optional && !locked ? "pointer" : "default",
                      opacity: isOn ? 1 : 0.55,
                    }}
                    data-testid={`quote-item-${it.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded border"
                        style={{
                          borderColor: it.is_discount ? "#fb923c" : isOn ? "var(--accent)" : "var(--text3)",
                          background: it.is_discount ? "#fb923c" : isOn ? "var(--accent)" : "transparent",
                        }}
                      >
                        {it.is_discount ? (
                          <Tag size={11} color="#000" />
                        ) : !it.is_optional ? (
                          <Lock size={11} color="#000" />
                        ) : isOn ? (
                          <Check size={12} color="#000" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium" style={{ color: it.is_discount ? "#fb923c" : undefined }}>
                          {it.is_discount && "🏷️ "}
                          {it.name}
                        </p>
                        {it.description && <p className="mt-0.5 text-xs" style={{ color: "var(--text3)" }}>{it.description}</p>}
                        <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>{it.qty} × {vnd(it.unit_price)}</p>
                      </div>
                      <p className="text-sm font-medium" style={{ color: it.is_discount ? "#fb923c" : "var(--accent)" }}>
                        {it.is_discount ? "−" : ""}{vnd(lineTotal)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Total */}
          <div className="mt-4 space-y-1 border-t pt-4 text-right" style={{ borderColor: "var(--border)" }}>
            {bulkDiscountActive && (
              <p className="text-sm" style={{ color: "#fb923c" }}>
                🏷️ {tr.packageOffer} {quote.discount_package_group}: −{vnd(quote.bulk_discount_amount)}
              </p>
            )}
            {quote.discount_package_group && quote.bulk_discount_amount > 0 && !bulkDiscountActive && !locked && (
              <p className="text-xs" style={{ color: "var(--text3)" }}>
                {tr.selectPackageHint} <b style={{ color: "var(--text2)" }}>{quote.discount_package_group}</b> {tr.selectPackageHint2} {vnd(quote.bulk_discount_amount)}
              </p>
            )}
            <p className="text-2xl font-medium text-accent" data-testid="quote-client-total">{vnd(effectiveTotal)}</p>
            <p className="text-xs" style={{ color: "var(--text3)" }}>
              {tr.depositLabel}{depositPct.toFixed(0)}{tr.depositLabel2} <b style={{ color: "var(--text2)" }}>{vnd(deposit)}</b>
            </p>
          </div>
        </section>

        {/* Adjustment request (only when not locked) */}
        {!locked && (
          <section className="card p-5" data-testid="quote-adjust-section">
            <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>
              <MessageSquare size={12} className="inline" /> {tr.adjustTitle}
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
              {tr.adjustHint}
            </p>
            <textarea
              className="input mt-2"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={tr.adjustPh}
              data-testid="quote-adjust-input"
            />
            <button onClick={sendAdjustment} disabled={sending || !message.trim()} className="btn-ghost mt-2 text-xs" data-testid="quote-adjust-send">
              {sending ? tr.sending : tr.sendBtn}
            </button>
          </section>
        )}

        {/* Adjustment history */}
        {adjustments.length > 0 && (
          <section className="card p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>{tr.chatTitle}</h2>
            <div className="mt-3 space-y-2">
              {adjustments.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md p-3 text-sm"
                  style={{ background: a.author === "client" ? "var(--surface2)" : "rgba(199,167,107,0.08)" }}
                >
                  <p className="text-xs" style={{ color: "var(--text3)" }}>
                    {a.author === "client" ? tr.you : studioName} · {new Date(a.created_at).toLocaleString(tr.dateLocale)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{a.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Client info form (only when not locked) */}
        {!locked && (
          <section className="card p-5" data-testid="quote-accept-form">
            <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>
              <ShieldCheck size={12} className="inline" /> {tr.yourInfoTitle}
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
              {tr.yourInfoHint}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <ClientField icon={<UserIcon size={14} />} label={tr.nameLabel}>
                <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder={tr.namePh} data-testid="accept-name" />
              </ClientField>
              <ClientField icon={<Phone size={14} />} label={tr.phoneLabel}>
                <input className="input" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="0901234567" inputMode="numeric" data-testid="accept-phone" />
                {clientPhone && !phoneValid && (
                  <p className="mt-1 text-[11px] text-red-400">{tr.phoneErr}</p>
                )}
              </ClientField>
              <ClientField icon={<Mail size={14} />} label={tr.emailLabel}>
                <input className="input" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="abc@gmail.com" data-testid="accept-email" />
              </ClientField>
              <ClientField icon={<Facebook size={14} />} label={tr.fbLabel}>
                <input className="input" value={clientFacebook} onChange={(e) => setClientFacebook(e.target.value)} placeholder="https://facebook.com/..." data-testid="accept-facebook" />
              </ClientField>
            </div>

            {studioCanContract && (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border p-3" style={{ borderColor: autoCreate ? "var(--accent)" : "var(--border)", background: autoCreate ? "rgba(199,167,107,0.06)" : "transparent" }}>
                <input
                  type="checkbox"
                  checked={autoCreate}
                  onChange={(e) => setAutoCreate(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                  style={{ accentColor: "var(--accent)" }}
                  data-testid="accept-auto-create"
                />
                <div className="text-sm">
                  <p className="font-medium">
                    <Sparkles size={12} className="mr-1 inline text-accent" />
                    {tr.autoContract}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text3)" }}>
                    {tr.autoContractHint}
                  </p>
                </div>
              </label>
            )}
          </section>
        )}

        {error && <p className="text-sm text-red-400" data-testid="quote-error">{error}</p>}

        {!locked ? (
          <button
            onClick={accept}
            disabled={accepting || items.length === 0 || !formValid}
            className="btn-primary w-full py-4 text-base"
            data-testid="quote-accept-btn"
          >
            <ShieldCheck size={18} /> {accepting ? tr.processing : tr.acceptBtn}
          </button>
        ) : accepted ? (
          <div className="space-y-3">
            <div className="rounded-lg p-6 text-center" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }} data-testid="quote-accepted-banner">
              <Check size={36} className="mx-auto text-green-400" />
              <p className="mt-3 text-lg font-medium text-green-400">{tr.acceptedMsg}</p>
              {contractToken ? (
                <>
                  <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
                    {tr.contractCreated}
                  </p>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <a
                      href={mainUrl(`/c/${contractToken}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary inline-flex items-center gap-2 px-5 py-2.5"
                      data-testid="contract-view-link"
                    >
                      <FileSignature size={16} /> {tr.viewContract}
                      <ExternalLink size={12} />
                    </a>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(mainUrl(`/c/${contractToken}`));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1800);
                      }}
                      className="btn-ghost inline-flex items-center gap-1.5 text-xs"
                      data-testid="contract-copy-link"
                    >
                      <Copy size={12} /> {copied ? tr.copied : tr.copyLink}
                    </button>
                    <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>
                      {tr.keepLink}
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
                  {studioName} {tr.studioContact}
                </p>
              )}
            </div>
            {/* Reference contract notice */}
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(199,167,107,0.08)", border: "1px solid rgba(199,167,107,0.25)" }}>
              <p className="font-medium" style={{ color: "var(--accent)" }}>
                <FileSignature size={14} className="inline mr-1.5" />
                {tr.contractNotice}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
                {tr.contractRef} <b>{tr.contractRefLabel}</b>.
                {tr.contractRefHint}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm" style={{ color: "var(--text3)" }}>{tr.cantModify}</p>
        )}

        <footer className="pt-6 text-center text-xs" style={{ color: "var(--text3)" }}>
          {tr.footer} <b>{studioName}</b>
        </footer>
      </div>
    </main>
  );
}

function ClientField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label flex items-center gap-1.5">{icon}{label}</span>
      {children}
    </label>
  );
}
