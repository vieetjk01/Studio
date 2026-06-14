"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function Brand({ href = "/" }: { href?: string }) {
  const { t } = useLang();
  return (
    <Link href={href} className="group flex flex-col leading-none">
      <span className="text-lg font-semibold tracking-[0.2em] text-accent">
        {t("brand").toUpperCase()}
      </span>
      <span className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-accent-muted">
        {t("tagline")}
      </span>
    </Link>
  );
}
