"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Lock, ChevronLeft, ChevronRight, X, Download, Calendar, Star, Send, Check, Play,
} from "lucide-react";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { thumbnailUrl, fullImageUrl } from "@/lib/drive";
import { buildZip, triggerDownload } from "@/lib/download";
import type { Feedback } from "@/lib/types";

interface P { id: string; drive_file_id: string; name: string; source_id: string | null; position: number; is_video?: boolean; }
interface S { id: string; name: string; position: number; }
interface G { id: string; slug: string; title: string; event_date: string | null; cover_url: string | null; hasPassword: boolean; }

export default function GalleryView({
  gallery, initialPhotos, initialSources, feedback,
}: {
  gallery: G;
  initialPhotos: P[] | null;
  initialSources: S[] | null;
  feedback: Feedback[];
}) {
  const [unlocked, setUnlocked] = useState(!gallery.hasPassword);
  const [photos, setPhotos] = useState<P[]>(initialPhotos ?? []);
  const [sources, setSources] = useState<S[]>(initialSources ?? []);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("all");
  const [lbIdx, setLbIdx] = useState<number | null>(null);
  const [zipProgress, setZipProgress] = useState<number | null>(null);

  // feedback form
  const [fbName, setFbName] = useState("");
  const [fbRating, setFbRating] = useState(5);
  const [fbContent, setFbContent] = useState("");
  const [fbList, setFbList] = useState<Feedback[]>(feedback);
  const [fbSent, setFbSent] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true); setPwError(false);
    const res = await fetch(`/api/album/${gallery.slug}/access`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPwLoading(false);
    if (!res.ok) return setPwError(true);
    const data = await res.json();
    setPhotos(data.photos ?? []); setSources(data.sources ?? []); setUnlocked(true);
  }

  const tabSources = useMemo(() => sources.filter((s) => photos.some((p) => p.source_id === s.id)), [sources, photos]);
  const visible = useMemo(() => (activeTab === "all" ? photos : photos.filter((p) => p.source_id === activeTab)), [photos, activeTab]);
  const sections = useMemo(() => {
    const idx = visible.map((p, i) => ({ p, i }));
    if (activeTab !== "all" || tabSources.length <= 1) return [{ id: "all", name: "", items: idx }];
    const m = new Map<string, { p: P; i: number }[]>();
    idx.forEach((it) => { const k = it.p.source_id ?? "none"; if (!m.has(k)) m.set(k, []); m.get(k)!.push(it); });
    const out: { id: string; name: string; items: { p: P; i: number }[] }[] = [];
    for (const s of sources) if (m.has(s.id)) { out.push({ id: s.id, name: s.name, items: m.get(s.id)! }); m.delete(s.id); }
    for (const [k, items] of m) out.push({ id: k, name: "", items });
    return out;
  }, [visible, sources, tabSources.length, activeTab]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lbIdx === null) return;
      if (e.key === "ArrowRight") setLbIdx((i) => (i === null ? i : Math.min(visible.length - 1, i + 1)));
      else if (e.key === "ArrowLeft") setLbIdx((i) => (i === null ? i : Math.max(0, i - 1)));
      else if (e.key === "Escape") setLbIdx(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lbIdx, visible.length]);

  async function downloadAll() {
    if (visible.length === 0) return;
    setZipProgress(0);
    const blob = await buildZip(
      visible.map((p) => ({ fileId: p.drive_file_id, name: p.name })),
      { watermark: null, onProgress: (d, t) => setZipProgress(Math.round((d / t) * 100)) }
    );
    triggerDownload(blob, `${gallery.slug}.zip`);
    setZipProgress(null);
  }

  async function sendFeedback() {
    if (!fbContent.trim()) return;
    const res = await fetch("/api/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: gallery.id, clientName: fbName, rating: fbRating, content: fbContent }),
    });
    if (res.ok) {
      setFbSent(true);
      setFbList([{ id: Math.random().toString(), album_id: gallery.id, client_name: fbName || null, rating: fbRating, content: fbContent, approved: true, created_at: new Date().toISOString() }, ...fbList]);
      setFbContent(""); setFbName("");
    }
  }

  // ── Password gate ──
  if (!unlocked) {
    return (
      <main className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10"><Brand /><LanguageSwitcher /></header>
        <div className="flex flex-1 items-center justify-center px-6">
          <form onSubmit={unlock} className="card w-full max-w-sm p-8 text-center">
            <Lock className="mx-auto mb-4" size={26} style={{ color: "var(--gold)" }} />
            <h1 className="font-serif text-2xl font-medium">{gallery.title}</h1>
            <p className="mb-1 mt-2 text-sm" style={{ color: "var(--text2)" }}>Nhập mật khẩu để xem album</p>
            <p className="mb-6 text-[12.5px]" style={{ color: "var(--gold)" }}>Mật khẩu là <b>số điện thoại</b> của bạn.</p>
            <input type="text" inputMode="numeric" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className="input mb-4 text-center" placeholder="09xx xxx xxx" />
            {pwError && <p className="mb-4 text-sm text-red-400">Mật khẩu không đúng</p>}
            <button disabled={pwLoading} className="btn-primary w-full">{pwLoading ? "Đang mở…" : "Vào xem"}</button>
          </form>
        </div>
      </main>
    );
  }

  const lb = lbIdx !== null ? visible[lbIdx] : null;

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3.5 md:px-10" style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}>
        <Brand />
        <div className="flex items-center gap-3">
          <button onClick={downloadAll} disabled={zipProgress !== null} className="btn-ghost px-3 py-1.5 text-[13px]">
            <Download size={14} /> {zipProgress !== null ? `${zipProgress}%` : "Tải cả album"}
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Cover hero */}
      {gallery.cover_url && (
        <div className="relative h-[clamp(180px,30vw,360px)] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gallery.cover_url} alt={gallery.title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--bg), rgba(10,10,12,.2) 60%, rgba(10,10,12,.4))" }} />
        </div>
      )}

      <div className="mx-auto max-w-[1500px] px-6 md:px-10" style={{ marginTop: gallery.cover_url ? "-60px" : "28px", position: "relative" }}>
        <h1 className="font-serif text-[clamp(30px,5vw,52px)] font-medium leading-none">{gallery.title}</h1>
        <p className="mt-2 flex items-center gap-3 text-[13.5px]" style={{ color: "var(--text2)" }}>
          {gallery.event_date && (<span className="flex items-center gap-1"><Calendar size={13} /> {new Date(gallery.event_date).toLocaleDateString("vi-VN")}</span>)}
          <span>{photos.length} ảnh</span>
        </p>

        {/* tabs */}
        {tabSources.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Tab active={activeTab === "all"} onClick={() => setActiveTab("all")}>Tất cả</Tab>
            {tabSources.map((s) => (<Tab key={s.id} active={activeTab === s.id} onClick={() => setActiveTab(s.id)}>{s.name} <span className="opacity-60">{photos.filter((p) => p.source_id === s.id).length}</span></Tab>))}
          </div>
        )}

        {/* sections */}
        <div className="mt-7 space-y-9">
          {sections.map((sec) => (
            <section key={sec.id}>
              {sec.name && <h2 className="mb-3 font-serif text-xl font-medium">{sec.name}</h2>}
              <div className="grid items-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]">
                {sec.items.map(({ p, i }) => (
                  <div key={p.id} onClick={() => setLbIdx(i)} className="relative aspect-square cursor-pointer overflow-hidden rounded-xl" style={{ background: "var(--surface)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnailUrl(p.drive_file_id, 500)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.04]" />
                    {p.is_video && (
                      <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full" style={{ background: "rgba(10,10,12,.55)", color: "#fff", backdropFilter: "blur(6px)" }}>
                        <Play size={20} fill="currentColor" strokeWidth={0} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Feedback */}
        <section className="mt-16 border-t pt-10" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-serif text-2xl font-medium">Cảm nhận của bạn</h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="card p-5">
              {fbSent ? (
                <div className="flex items-center gap-2.5 text-sm" style={{ color: "#5fd29a" }}><Check size={18} /> Cảm ơn bạn đã gửi cảm nhận!</div>
              ) : (
                <>
                  <input value={fbName} onChange={(e) => setFbName(e.target.value)} placeholder="Tên của bạn" className="input mb-3" />
                  <div className="mb-3 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setFbRating(n)} style={{ color: n <= fbRating ? "var(--gold)" : "var(--text3)" }}>
                        <Star size={22} fill={n <= fbRating ? "currentColor" : "none"} strokeWidth={n <= fbRating ? 0 : 2} />
                      </button>
                    ))}
                  </div>
                  <textarea value={fbContent} onChange={(e) => setFbContent(e.target.value)} placeholder="Chia sẻ cảm nhận của bạn về bộ ảnh…" className="input min-h-[90px] resize-y" />
                  <button onClick={sendFeedback} className="btn-primary mt-3 w-full"><Send size={15} /> Gửi cảm nhận</button>
                </>
              )}
            </div>
            <div className="space-y-3">
              {fbList.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có cảm nhận nào.</p>
              ) : fbList.map((f) => (
                <div key={f.id} className="card p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{f.client_name || "Khách"}</span>
                    {f.rating ? <span className="flex items-center gap-0.5" style={{ color: "var(--gold)" }}>{Array.from({ length: f.rating }).map((_, i) => <Star key={i} size={12} fill="currentColor" strokeWidth={0} />)}</span> : null}
                  </div>
                  <p className="mt-1 text-[13.5px]" style={{ color: "var(--text2)" }}>{f.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Lightbox */}
      {lb && lbIdx !== null && (
        <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: "rgba(6,6,8,.94)", backdropFilter: "blur(8px)" }}>
          <div className="flex flex-shrink-0 items-center gap-3 px-4 py-3.5 md:px-7" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-[13px]" style={{ color: "var(--text2)" }}>{lbIdx + 1} / {visible.length}</span>
            <div className="flex-1" />
            <a href={lb.is_video ? `https://drive.google.com/file/d/${lb.drive_file_id}/view` : `/api/img?id=${lb.drive_file_id}&w=2400`} target={lb.is_video ? "_blank" : undefined} download={lb.is_video ? undefined : lb.name} className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}><Download size={17} /></a>
            <button onClick={() => setLbIdx(null)} className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}><X size={17} /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 md:p-10">
            <button onClick={() => setLbIdx(Math.max(0, lbIdx - 1))} disabled={lbIdx === 0} className="absolute left-3.5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full transition-opacity disabled:opacity-25" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}><ChevronLeft size={22} /></button>
            {lb.is_video ? (
              <iframe
                src={`https://drive.google.com/file/d/${lb.drive_file_id}/preview`}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="aspect-video w-full max-w-4xl rounded"
                style={{ border: "none", boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fullImageUrl(lb.drive_file_id, 1600)} alt={lb.name} className="max-h-[82vh] max-w-full rounded object-contain" style={{ boxShadow: "0 30px 80px rgba(0,0,0,.6)" }} />
            )}
            <button onClick={() => setLbIdx(Math.min(visible.length - 1, lbIdx + 1))} disabled={lbIdx >= visible.length - 1} className="absolute right-3.5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full transition-opacity disabled:opacity-25" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}><ChevronRight size={22} /></button>
          </div>
        </div>
      )}
    </main>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="rounded-full px-4 py-1.5 text-[13px] transition-colors" style={active ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}>
      {children}
    </button>
  );
}
