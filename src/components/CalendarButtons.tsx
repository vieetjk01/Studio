"use client";

import { CalendarPlus, Download } from "lucide-react";
import { googleCalendarUrl, downloadIcs, type CalEvent } from "@/lib/calendar";

/** "Add to Google Calendar" link + .ics download for one event. */
export default function CalendarButtons({ event, compact = false }: { event: CalEvent; compact?: boolean }) {
  if (!event.date) return null;
  const cls = compact
    ? "inline-flex items-center gap-1 text-[11px]"
    : "btn-ghost px-2.5 py-1.5 text-xs";
  return (
    <span className="inline-flex items-center gap-3">
      <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" className={cls} style={{ color: "var(--text2)" }}>
        <CalendarPlus size={13} /> Google Calendar
      </a>
      <button type="button" onClick={() => downloadIcs(event.title || "su-kien", event)} className={cls} style={{ color: "var(--text2)" }}>
        <Download size={13} /> .ics
      </button>
    </span>
  );
}
