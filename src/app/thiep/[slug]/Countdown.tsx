"use client";

import { useEffect, useState } from "react";

const UNITS: [keyof Parts, string][] = [
  ["days", "Ngày"],
  ["hours", "Giờ"],
  ["mins", "Phút"],
  ["secs", "Giây"],
];

type Parts = { days: number; hours: number; mins: number; secs: number };

function diff(target: number): Parts {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

/** Ticking countdown to the wedding date. */
export default function Countdown({ date }: { date: string }) {
  const target = new Date(date).getTime();
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    if (Number.isNaN(target)) return;
    setParts(diff(target));
    const id = setInterval(() => setParts(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (Number.isNaN(target) || !parts) return null;

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      {UNITS.map(([key, label]) => (
        <div key={key} className="flex flex-col items-center">
          <span className="font-serif text-3xl font-medium sm:text-4xl" style={{ color: "var(--wed-accent)" }}>
            {String(parts[key]).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-widest opacity-60">{label}</span>
        </div>
      ))}
    </div>
  );
}
