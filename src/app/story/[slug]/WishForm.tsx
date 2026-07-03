"use client";

import { useState } from "react";
import { Send, Check, Heart } from "lucide-react";

/** Public guest wish form for a Love Story page. */
export default function WishForm({ slug, accent }: { slug: string; accent: string }) {
  const [name, setName] = useState("");
  const [wish, setWish] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !wish.trim()) return;
    setState("saving");
    try {
      const res = await fetch("/api/story/wish", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, guest_name: name, wish }),
      });
      setState(res.ok ? "done" : "error");
    } catch { setState("error"); }
  }

  if (state === "done") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border p-6 text-center" style={{ borderColor: accent }}>
        <Heart className="mx-auto mb-2" style={{ color: accent }} />
        <p>Cảm ơn bạn đã gửi lời chúc!</p>
      </div>
    );
  }
  const inp = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 text-left">
      <input className={inp} style={{ borderColor: accent }} placeholder="Tên của bạn *" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
      <textarea className={inp} style={{ borderColor: accent }} rows={3} placeholder="Gửi lời chúc đến cô dâu chú rể…" value={wish} onChange={(e) => setWish(e.target.value)} maxLength={1000} required />
      {state === "error" && <p className="text-center text-sm text-red-600">Gửi không thành công, thử lại nhé.</p>}
      <button type="submit" disabled={state === "saving" || !name.trim() || !wish.trim()} className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-medium text-white disabled:opacity-50" style={{ background: accent }}>
        {state === "saving" ? <Check size={16} /> : <Send size={16} />} Gửi lời chúc
      </button>
    </form>
  );
}
