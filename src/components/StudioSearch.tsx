"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Hit = { id: string; title: string; client_name: string | null; code: string | null };

/** Quick search over contracts (by title / client / phone / code). RLS-scoped. */
export default function StudioSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const safe = term.replace(/[%,()]/g, " ");
    const handle = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("studio_contracts")
        .select("id, title, client_name, code")
        .or(`title.ilike.%${safe}%,client_name.ilike.%${safe}%,client_phone.ilike.%${safe}%,code.ilike.%${safe}%`)
        .order("created_at", { ascending: false })
        .limit(8);
      setHits((data ?? []) as Hit[]);
      setOpen(true);
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
        <Search size={14} style={{ color: "var(--text3)" }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          placeholder="Tìm HĐ, khách…"
          className="w-24 bg-transparent text-sm outline-none sm:w-40"
          style={{ color: "var(--text)" }}
        />
        {q && (
          <button onClick={() => { setQ(""); setHits([]); }} style={{ color: "var(--text3)" }} aria-label="Xoá">
            <X size={13} />
          </button>
        )}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl p-1.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {hits.length === 0 ? (
            <p className="px-3 py-2 text-sm" style={{ color: "var(--text3)" }}>Không tìm thấy.</p>
          ) : (
            hits.map((h) => (
              <Link
                key={h.id}
                href={`/dashboard/studio/contracts/${h.id}`}
                onClick={() => { setOpen(false); setQ(""); }}
                className="block rounded-lg px-3 py-2 hover:bg-[var(--surface2)]"
              >
                <p className="text-sm font-medium">{h.title}</p>
                <p className="text-[11px]" style={{ color: "var(--text3)" }}>{h.client_name || "—"}{h.code ? ` · ${h.code}` : ""}</p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
