// Calendar helpers — "Add to Google Calendar" links + downloadable .ics files.
// No OAuth needed: these just build a URL / file the user opens in their own
// calendar app. Times are treated as floating local time.

export type CalEvent = {
  date: string; // YYYY-MM-DD
  time?: string | null; // "HH:MM" (optional → all-day)
  title: string;
  location?: string | null;
  details?: string | null;
  durationMins?: number; // default 120
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const stamp = (d: Date) => `${ymd(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

function parseStart(date: string, time?: string | null): { start: Date; timed: boolean } {
  const [y, m, dd] = date.split("-").map(Number);
  const mt = (time || "").match(/(\d{1,2}):(\d{2})/);
  if (mt) return { start: new Date(y, (m || 1) - 1, dd || 1, +mt[1], +mt[2]), timed: true };
  return { start: new Date(y, (m || 1) - 1, dd || 1), timed: false };
}

/** Google Calendar "create event" URL (opens prefilled). */
export function googleCalendarUrl(ev: CalEvent): string {
  const { start, timed } = parseStart(ev.date, ev.time);
  let dates: string;
  if (timed) {
    const end = new Date(start.getTime() + (ev.durationMins ?? 120) * 60000);
    dates = `${stamp(start)}/${stamp(end)}`;
  } else {
    const next = new Date(start.getTime() + 86400000);
    dates = `${ymd(start)}/${ymd(next)}`;
  }
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates,
  });
  if (ev.details) p.set("details", ev.details);
  if (ev.location) p.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Build .ics file content for an event. */
export function icsContent(ev: CalEvent, dtstamp: Date): string {
  const { start, timed } = parseStart(ev.date, ev.time);
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Vieetjk//Studio//VI", "BEGIN:VEVENT"];
  lines.push(`UID:${ymd(start)}-${Math.abs(hashCode(ev.title))}@vieetjk`);
  lines.push(`DTSTAMP:${stamp(dtstamp)}`);
  if (timed) {
    const end = new Date(start.getTime() + (ev.durationMins ?? 120) * 60000);
    lines.push(`DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`);
  } else {
    const next = new Date(start.getTime() + 86400000);
    lines.push(`DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(next)}`);
  }
  lines.push(`SUMMARY:${esc(ev.title)}`);
  if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`);
  if (ev.details) lines.push(`DESCRIPTION:${esc(ev.details)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return h;
}

/** Trigger a download of an .ics file in the browser. */
export function downloadIcs(filename: string, ev: CalEvent) {
  const content = icsContent(ev, new Date());
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
