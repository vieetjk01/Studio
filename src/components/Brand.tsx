"use client";

import Link from "next/link";

export default function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-full.png"
        alt="TJK · Vieetjk"
        className="h-[34px] w-auto object-contain"
      />
      <span
        className="self-center text-[10px] uppercase tracking-[0.26em]"
        style={{ color: "var(--text3)" }}
      >
        Photo · Collection
      </span>
    </Link>
  );
}
