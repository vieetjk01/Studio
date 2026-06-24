"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link as LinkIcon, Copy, Check, Phone, FilePlus, Archive } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mainUrl } from "@/lib/hosts";
import { nextContractCode, DEFAULT_TASKS } from "@/lib/contract-code";
import { fullClauseText } from "@/lib/contract-clauses";
import { messengerUrl } from "@/components/MessengerButton";
import { vnd, type StudioBooking } from "@/lib/types";

export default function BookingsView({
  ownerId,
  token,
  tokenSaved = true,
  initial,
}: {
  ownerId: string;
  token: string;
  tokenSaved?: boolean;
  initial: StudioBooking[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [list, setList] = useState<StudioBooking[]>(initial);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  // Public share link. Default to the canonical host (mainUrl) for SSR, but once
  // mounted prefer the host the owner is actually on (e.g. www.mstudo.com) so the
  // shared link always points to a host that serves the app — avoids a 404 when
  // the apex (mstudo.com) isn't configured as a Vercel domain.
  const [bookingUrl, setBookingUrl] = useState(() => mainUrl(`/book/${token}`));
  useEffect(() => {
    setBookingUrl(`${window.location.origin}/book/${token}`);
  }, [token]);

  async function archive(id: string) {
    await supabase.from("studio_bookings").update({ status: "archived" }).eq("id", id);
    setList((p) => p.filter((b) => b.id !== id));
  }

  async function toContract(b: StudioBooking) {
    setBusy(b.id);
    const ct = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, "");
    const code = await nextContractCode(supabase, ownerId);
    const note = [b.note, fullClauseText()].filter(Boolean).join("\n\n");
    const { data, error } = await supabase
      .from("studio_contracts")
      .insert({
        owner_id: ownerId,
        code,
        title: b.service ? `${b.service} — ${b.name}` : `Hợp đồng — ${b.name}`,
        client_name: b.name,
        client_phone: b.phone,
        client_messenger: b.facebook || null,
        event_date: b.preferred_date,
        note,
        client_token: ct,
      })
      .select("id")
      .single();
    if (error || !data) {
      setBusy(null);
      alert("Không tạo được hợp đồng: " + (error?.message || ""));
      return;
    }
    // Pre-fill the contract with the package the client chose.
    if (b.package_name) {
      await supabase.from("contract_items").insert({
        contract_id: data.id,
        name: b.package_name,
        qty: 1,
        unit_price: b.package_price || 0,
        position: 0,
      });
    }
    // Default post-production checklist.
    await supabase.from("contract_tasks").insert(
      DEFAULT_TASKS.map((label, position) => ({ contract_id: data.id, label, position }))
    );
    await supabase.from("studio_bookings").update({ status: "handled" }).eq("id", b.id);
    router.push(`/dashboard/studio/contracts/${data.id}`);
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-medium">Đặt lịch online</h1>
      </div>

      {/* Warn if the token couldn't be persisted — the public link would 404. */}
      {!tokenSaved && (
        <div className="card mb-4 p-4" style={{ borderColor: "rgba(224,116,111,.5)" }}>
          <p className="text-sm font-medium" style={{ color: "#e0746f" }}>
            Không lưu được mã đặt lịch vào cơ sở dữ liệu.
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            Link bên dưới sẽ báo &quot;không hợp lệ&quot; khi khách mở. Vui lòng kiểm tra biến môi trường
            <code className="mx-1">SUPABASE_SERVICE_ROLE_KEY</code> trên Vercel và cột
            <code className="mx-1">booking_token</code> trong bảng <code>profiles</code>.
          </p>
        </div>
      )}

      {/* Share link */}
      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        <LinkIcon size={16} style={{ color: "var(--text3)" }} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>Link đặt lịch — chia sẻ cho khách / gắn lên Facebook</p>
          <p className="truncate text-sm" style={{ color: "var(--text2)" }}>{bookingUrl}</p>
        </div>
        <button
          onClick={() => { navigator.clipboard?.writeText(bookingUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="btn-ghost px-3 py-2 text-xs"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Đã chép" : "Chép link"}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Chưa có yêu cầu đặt lịch nào.</div>
      ) : (
        <div className="space-y-2">
          {list.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {b.name}
                    {b.status === "handled" && <span className="ml-2 text-[11px]" style={{ color: "#7bb38a" }}>✓ đã xử lý</span>}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text3)" }}>
                    <Phone size={12} /> {b.phone}
                    {b.service ? ` · ${b.service}` : ""}
                    {b.preferred_date ? ` · ${b.preferred_date}` : ""}
                  </p>
                  {b.package_name && (
                    <p className="mt-0.5 text-xs" style={{ color: "var(--accent)" }}>
                      Gói: {b.package_name}{b.package_price ? ` · ${vnd(b.package_price)}` : ""}
                    </p>
                  )}
                  {b.facebook && (
                    <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text3)" }}>
                      FB: <a href={messengerUrl(b.facebook)} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "var(--text2)" }}>{b.facebook}</a>
                    </p>
                  )}
                  {b.note && <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>{b.note}</p>}
                  <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>{new Date(b.created_at).toLocaleString("vi-VN")}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button onClick={() => toContract(b)} disabled={busy === b.id} className="btn-primary px-3 py-1.5 text-xs">
                    <FilePlus size={13} /> {busy === b.id ? "…" : "Tạo HĐ"}
                  </button>
                  <button onClick={() => archive(b.id)} className="btn-ghost px-3 py-1.5 text-xs">
                    <Archive size={13} /> Lưu trữ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
