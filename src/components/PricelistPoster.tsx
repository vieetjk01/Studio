import { vnd, type PricelistItem } from "@/lib/types";

export type PosterList = { key: string; label: string; title: string };
export type PosterContact = {
  full_name: string | null;
  pl_phone: string | null;
  pl_facebook: string | null;
  pl_bank_holder: string | null;
  pl_bank_account: string | null;
  pl_bank_name: string | null;
};

// Poster palette (independent of the app's dark theme).
const C = {
  bg: "#e7ebdf",
  panel: "#f2f4ea",
  ink: "#23402c",
  green: "#2f6b3e",
  greenDeep: "#1c3a26",
  muted: "#51604f",
  red: "#a82b1e",
  line: "#cdd4c2",
};

const bullets = (d: string | null) => (d || "").split("\n").map((s) => s.trim()).filter(Boolean);

export default function PricelistPoster({
  contact,
  items,
  lists,
  selected,
  tabBase,
  bookHref,
}: {
  contact: PosterContact;
  items: PricelistItem[]; // already filtered to the selected list
  lists: PosterList[]; // lists that have content
  selected: string;
  tabBase: string; // URL without ?list
  bookHref: string; // /book/<token>
}) {
  const o = contact;
  const selectedList = lists.find((l) => l.key === selected) || lists[0];
  const hasBank = o.pl_bank_holder || o.pl_bank_account || o.pl_bank_name;

  const groups: { name: string; items: PricelistItem[] }[] = [];
  for (const it of items) {
    const cat = it.category?.trim() || "Gói dịch vụ";
    let g = groups.find((x) => x.name === cat);
    if (!g) { g = { name: cat, items: [] }; groups.push(g); }
    g.items.push(it);
  }
  const pkgGroups = groups.filter((g) => g.items.some((i) => i.price > 0));
  const noteGroups = groups.filter((g) => g.items.every((i) => i.price === 0));

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }}>
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-12 md:py-14">
        <div className="flex flex-col gap-6 border-b pb-8 md:flex-row md:items-start md:justify-between" style={{ borderColor: C.line }}>
          <div>
            <h1 className="font-serif text-[clamp(28px,5vw,48px)] font-semibold uppercase leading-none tracking-wide" style={{ color: C.greenDeep }}>
              {selectedList?.title || "Bảng giá dịch vụ"}
            </h1>
            <p className="mt-2 font-serif text-2xl italic" style={{ color: C.green }}>{o.full_name || "Studio"}</p>
            {lists.length > 1 && (
              <div className="mt-4 flex gap-2">
                {lists.map((l) => (
                  <a key={l.key} href={`${tabBase}?list=${l.key}`} className="rounded-full px-4 py-1.5 text-sm font-medium"
                    style={l.key === selected ? { background: C.greenDeep, color: C.panel } : { border: `1px solid ${C.line}`, color: C.green }}>
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 text-sm md:text-right">
            {(o.pl_phone || o.pl_facebook) && (
              <>
                <p className="font-serif text-base font-semibold uppercase" style={{ color: C.green }}>Thông tin liên hệ</p>
                {o.full_name && <p style={{ color: C.muted }}>{o.full_name}</p>}
                {o.pl_phone && <p style={{ color: C.muted }}>Điện thoại: <b style={{ color: C.ink }}>{o.pl_phone}</b></p>}
                {o.pl_facebook && <p style={{ color: C.muted }}>Facebook: {o.pl_facebook}</p>}
              </>
            )}
            {hasBank && (
              <div className="mt-3">
                <p className="font-serif text-base font-semibold uppercase" style={{ color: C.green }}>Thông tin chuyển khoản</p>
                {o.pl_bank_holder && <p className="font-semibold" style={{ color: C.red }}>{o.pl_bank_holder}</p>}
                {o.pl_bank_account && <p style={{ color: C.muted }}>STK: {o.pl_bank_account}</p>}
                {o.pl_bank_name && <p style={{ color: C.muted }}>{o.pl_bank_name}</p>}
              </div>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="mt-10 text-center" style={{ color: C.muted }}>Chưa cập nhật bảng giá.</p>
        ) : (
          <>
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              {pkgGroups.map((g) => (
                <div key={g.name}>
                  <h2 className="mb-5 font-serif text-[clamp(20px,3vw,28px)] font-semibold uppercase" style={{ color: C.green }}>{g.name}</h2>
                  <div className="space-y-6">
                    {g.items.map((it) => (
                      <div key={it.id}>
                        <p className="font-serif text-lg font-semibold" style={{ color: C.greenDeep }}>
                          {it.name}: {vnd(it.price)}{it.unit ? ` ${it.unit}` : ""}
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {bullets(it.description).map((b, i) => (
                            <li key={i} className="text-[15px]" style={{ color: C.muted }}>– {b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {noteGroups.length > 0 && (
              <div className="mt-12 grid gap-10 border-t pt-8 md:grid-cols-2" style={{ borderColor: C.line }}>
                {noteGroups.map((g) => (
                  <div key={g.name}>
                    <h3 className="mb-2 font-serif text-xl font-semibold" style={{ color: C.green }}>{g.name}:</h3>
                    <ul className="space-y-1">
                      {g.items.flatMap((it) => bullets(it.description)).map((b, i) => (
                        <li key={i} className="text-sm" style={{ color: C.muted }}>– {b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-10 text-center">
              <a href={bookHref} className="inline-block rounded-full px-7 py-3 font-medium" style={{ background: C.greenDeep, color: "#f2f4ea" }}>
                Chọn gói &amp; đặt lịch
              </a>
            </div>

            <p className="mt-8 text-center font-serif text-sm italic" style={{ color: C.muted }}>
              Để đảm bảo chất lượng dịch vụ &amp; tránh trùng lịch, quý khách vui lòng book lịch và chốt hợp đồng sớm nhất.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
