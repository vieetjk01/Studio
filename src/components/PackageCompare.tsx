import Link from "next/link";
import { Check, Star } from "lucide-react";
import { vnd } from "@/lib/types";

export type ComparePkg = { id: string; name: string; price: number; unit: string | null; description: string | null };

const lines = (d: string | null) => (d || "").split("\n").map((s) => s.trim()).filter(Boolean);

/**
 * Side-by-side package comparison (columns + ✓ feature lists). The most
 * expensive package is highlighted as the featured one.
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
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
      {items.map((it) => {
        const featured = it.price === topPrice && items.length > 1;
        const bookHref = bookingToken
          ? `/book/${bookingToken}?pkg=${encodeURIComponent(`${listLabel} · ${it.name}`)}`
          : `/banggia?list=${listKey}`;
        return (
          <div
            key={it.id}
            className="relative flex flex-col rounded-2xl p-6"
            style={{
              background: featured ? "var(--surface2)" : "var(--surface)",
              border: `1px solid ${featured ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            {featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: "var(--accent)", color: "var(--accentInk)" }}>
                <Star size={11} /> Đầy đủ nhất
              </span>
            )}
            <p className="font-serif text-xl font-medium">{it.name}</p>
            <p className="mt-2 font-serif text-3xl font-medium" style={{ color: "var(--accent)" }}>
              {vnd(it.price)}
              {it.unit ? <span className="text-sm" style={{ color: "var(--text3)" }}> {it.unit}</span> : null}
            </p>
            <ul className="mt-4 flex-1 space-y-2">
              {lines(it.description).map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text2)" }}>
                  <Check size={15} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link href={bookHref} className={featured ? "btn-primary mt-5 w-full" : "btn-ghost mt-5 w-full"}>
              Chọn gói &amp; đặt lịch
            </Link>
          </div>
        );
      })}
    </div>
  );
}
