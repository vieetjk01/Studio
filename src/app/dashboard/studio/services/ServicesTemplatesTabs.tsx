"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, FileText, Lock } from "lucide-react";
import type { StudioService } from "@/lib/types";
import ServicesManager from "./ServicesManager";
import TemplatesManager, { type TemplateWithItems } from "../templates/TemplatesManager";

type Tab = "services" | "templates";

/**
 * Gộp "Dịch vụ & điều khoản" và "Mẫu hợp đồng" vào chung 1 trang, chuyển bằng tab.
 * Tab mẫu hợp đồng chỉ mở với gói Studio (plus trở lên).
 */
export default function ServicesTemplatesTabs({
  ownerId,
  services,
  templates,
  canUseTemplates,
  initialTab = "services",
}: {
  ownerId: string;
  services: StudioService[];
  templates: TemplateWithItems[];
  canUseTemplates: boolean;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab === "templates" && canUseTemplates ? "templates" : "services");

  const tabs: { key: Tab; label: string; icon: typeof FileText; locked?: boolean }[] = [
    { key: "services", label: "Điều khoản dịch vụ", icon: ClipboardList },
    { key: "templates", label: "Mẫu hợp đồng", icon: FileText, locked: !canUseTemplates },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { if (!t.locked) setTab(t.key); }}
              disabled={t.locked}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                background: active ? "var(--brand)" : "var(--surface2)",
                color: active ? "var(--brandFg)" : t.locked ? "var(--text3)" : "var(--text)",
                border: "1px solid var(--border)",
                cursor: t.locked ? "not-allowed" : "pointer",
                opacity: t.locked ? 0.6 : 1,
              }}
              title={t.locked ? "Cần gói Studio" : undefined}
            >
              <t.icon size={15} /> {t.label}
              {t.locked && <Lock size={12} />}
            </button>
          );
        })}
      </div>

      {tab === "templates" && canUseTemplates ? (
        <TemplatesManager ownerId={ownerId} initial={templates} />
      ) : tab === "templates" ? (
        <div className="card p-8 text-center">
          <Lock size={26} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm" style={{ color: "var(--text2)" }}>Mẫu hợp đồng chỉ dành cho tài khoản gói Studio.</p>
          <Link href="/dashboard/upgrade" className="btn-primary mt-4">Xem gói Studio</Link>
        </div>
      ) : (
        <ServicesManager ownerId={ownerId} initial={services} />
      )}
    </div>
  );
}
