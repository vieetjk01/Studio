"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import LocationPicker, { type LatLng, mapsLink } from "@/components/LocationPicker";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Loc = { lat: number; lng: number; mapUrl: string } | null;

function locFrom(v: LatLng): Loc {
  return v ? { lat: v.lat, lng: v.lng, mapUrl: mapsLink(v.lat, v.lng) } : null;
}

export default function IntakeForm({
  token,
  shootType,
  clientName,
  title,
  studio,
  submitted,
}: {
  token: string;
  shootType: string;
  clientName: string | null;
  title: string | null;
  studio: string | null;
  submitted: boolean;
}) {
  const isPsc = shootType === "psc" || shootType === "wedding";
  const [done, setDone] = useState(submitted);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Nhà gái
  const [bridePhone, setBridePhone] = useState("");
  const [brideMakeup, setBrideMakeup] = useState("");
  const [brideCeremony, setBrideCeremony] = useState("");
  const [brideLoc, setBrideLoc] = useState<LatLng>(null);
  // Nhà trai
  const [groomPhone, setGroomPhone] = useState("");
  const [groomDepart, setGroomDepart] = useState("");
  const [groomCeremony, setGroomCeremony] = useState("");
  const [groomLoc, setGroomLoc] = useState<LatLng>(null);
  // Chung
  const [contactPhone, setContactPhone] = useState("");
  const [genLoc, setGenLoc] = useState<LatLng>(null);
  const [note, setNote] = useState("");

  async function submit() {
    setBusy(true);
    setErr("");
    const payload: any = isPsc
      ? {
          type: "psc",
          bride: { phone: bridePhone, makeup_time: brideMakeup, ceremony_time: brideCeremony, location: locFrom(brideLoc) },
          groom: { phone: groomPhone, depart_time: groomDepart, ceremony_time: groomCeremony, location: locFrom(groomLoc) },
          note,
        }
      : { type: "generic", contact_phone: contactPhone, location: locFrom(genLoc), note };

    try {
      const res = await fetch(`/api/form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((x) => x.json());
      if (res.ok) setDone(true);
      else setErr(res.error || "Gửi thất bại, thử lại.");
    } catch {
      setErr("Lỗi mạng, thử lại.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <Check size={28} />
        </div>
        <h1 className="mt-4 font-serif text-2xl font-medium">Đã gửi thông tin</h1>
        <p className="mt-2 text-sm opacity-70">
          Cảm ơn {clientName || "anh/chị"} đã cung cấp thông tin. Studio đã nhận và sẽ chuẩn bị chu đáo cho buổi chụp ạ!
        </p>
      </div>
    );
  }

  const field = "input w-full";
  const lbl = "mb-1 block text-xs font-medium opacity-80";

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-serif text-2xl font-medium">Thông tin buổi chụp</h1>
      <p className="mt-1 text-sm opacity-70">
        {title ? `${title} — ` : ""}Kính gửi {clientName || "anh/chị"}, vui lòng điền giúp studio một số thông tin để chuẩn bị chu đáo.
      </p>

      {isPsc ? (
        <>
          <section className="card mt-6 p-5">
            <h2 className="font-serif text-lg font-medium">Phần 1 · Nhà gái (cô dâu)</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <label className={lbl}>SĐT cô dâu</label>
                <input className={field} inputMode="tel" value={bridePhone} onChange={(e) => setBridePhone(e.target.value)} placeholder="09xxxxxxxx" />
              </div>
              <div>
                <label className={lbl}>Giờ makeup</label>
                <input className={field} type="time" value={brideMakeup} onChange={(e) => setBrideMakeup(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Giờ làm lễ nhà gái</label>
                <input className={field} type="time" value={brideCeremony} onChange={(e) => setBrideCeremony(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <label className={lbl}>Vị trí nhà gái</label>
              <LocationPicker value={brideLoc} onChange={setBrideLoc} />
            </div>
          </section>

          <section className="card mt-4 p-5">
            <h2 className="font-serif text-lg font-medium">Phần 2 · Nhà trai (chú rể)</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <label className={lbl}>SĐT chú rể</label>
                <input className={field} inputMode="tel" value={groomPhone} onChange={(e) => setGroomPhone(e.target.value)} placeholder="09xxxxxxxx" />
              </div>
              <div>
                <label className={lbl}>Giờ nhà trai xuất phát</label>
                <input className={field} type="time" value={groomDepart} onChange={(e) => setGroomDepart(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Giờ làm lễ nhà trai</label>
                <input className={field} type="time" value={groomCeremony} onChange={(e) => setGroomCeremony(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <label className={lbl}>Vị trí nhà trai</label>
              <LocationPicker value={groomLoc} onChange={setGroomLoc} />
            </div>
          </section>
        </>
      ) : (
        <section className="card mt-6 p-5">
          <div>
            <label className={lbl}>Số điện thoại liên hệ</label>
            <input className={field} inputMode="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="09xxxxxxxx" />
          </div>
          <div className="mt-3">
            <label className={lbl}>Vị trí</label>
            <LocationPicker value={genLoc} onChange={setGenLoc} />
          </div>
        </section>
      )}

      <div className="card mt-4 p-5">
        <label className={lbl}>Ghi chú thêm cho studio (nếu có)</label>
        <textarea className={field} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Yêu cầu riêng, lưu ý về địa điểm, giờ giấc…" />
      </div>

      {err && <p className="mt-3 text-sm" style={{ color: "var(--s-red)" }}>{err}</p>}

      <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full py-3">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gửi thông tin cho studio
      </button>
      <p className="mt-2 text-center text-[11px] opacity-50">— {studio || "MStudo"} —</p>
    </div>
  );
}
