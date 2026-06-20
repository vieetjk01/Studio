import Link from "next/link";
import { Check, Star } from "lucide-react";
import { vnd } from "@/lib/types";

export type ComparePkg = { id: string; name: string; price: number; unit: string | null; category: string | null; description: string | null };

const lines = (d: string | null) => (d || "").split("\n").map((s) => s.trim()).filter(Boolean);

/**
 * Compact side-by-side package comparison. All packages of a list become narrow
 * columns (horizontally scrollable on small screens); priciest is highlighted.
 */
export default function PackageCompare({
  items,
  bookingToken,
  listKey,
  listLabel,
}: {
  items: ComparePkg[];
  bookingToken?: string;
  listKey: string;
  listLabel: string;
}) {
  if (items.length === 0) return null;
  const topPrice = Math.max(...items.map((i) => i.price));

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3" style={{ minWidth: items.length > 4 ? `${items.length * 188}px` : undefined }}>
        {items.map((it) => {
          const featured = it.price === topPrice && items.length > 1;
          const bookHref = bookingToken
            ? `/book/${bookingToken}?pkg=${encodeURIComponent(`${listLabel} · ${it.name}`)}`
            : `/banggia?list=${listKey}`;
          return (
            <div
              key={it.id}
              className="relative flex w-[185px] shrink-0 flex-col rounded-2xl p-4"
              style={{
                background: featured ? "var(--surface2)" : "var(--surface)",
                border: `1px solid ${featured ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {featured && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: "var(--accent)", color: "var(--accentInk)" }}>
                  <Star size={10} /> Đầy đủ nhất
                </span>
              )}
              {it.category && <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>{it.category}</span>}
              <p className="mt-0.5 font-serif text-base font-medium leading-tight">{it.name}</p>
              <p className="mt-1 font-serif text-xl font-medium" style={{ color: "var(--accent)" }}>{vnd(it.price)}</p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {lines(it.description).map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug" style={{ color: "var(--text2)" }}>
                    <Check size={12} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link href={bookHref} className={`mt-4 rounded-full px-3 py-2 text-center text-xs font-medium ${featured ? "btn-primary" : ""}`} style={featured ? undefined : { border: "1px solid var(--border2)", color: "var(--text)" }}>
                Đặt lịch
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
