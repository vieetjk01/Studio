/**
 * Google Calendar helper — server-side only.
 * Uses stored OAuth2 refresh token per user to create/update/delete events.
 */
import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";

const CLIENT_ID     = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI  = process.env.GOOGLE_CALENDAR_REDIRECT_URI!;

export function makeOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl(state?: string): string {
  const oauth2 = makeOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state: state ?? "",
  });
}

/** Exchange code for tokens, persist refresh_token in profiles. */
export async function connectGoogleCalendar(userId: string, code: string) {
  const oauth2 = makeOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) throw new Error("No refresh_token returned — try disconnecting and reconnecting.");
  const db = createAdminClient();
  await db
    .from("profiles")
    .update({ google_refresh_token: tokens.refresh_token, google_calendar_id: "primary" })
    .eq("id", userId);
}

/** Remove the stored token. */
export async function disconnectGoogleCalendar(userId: string) {
  const db = createAdminClient();
  await db.from("profiles").update({ google_refresh_token: null, google_calendar_id: null }).eq("id", userId);
}

/** Return an authenticated calendar client for a user, or null if not connected. */
async function calendarFor(userId: string) {
  const db = createAdminClient();
  const { data } = await db.from("profiles").select("google_refresh_token, google_calendar_id").eq("id", userId).maybeSingle();
  if (!data?.google_refresh_token) return null;

  const oauth2 = makeOAuth2Client();
  oauth2.setCredentials({ refresh_token: data.google_refresh_token });
  return {
    cal: google.calendar({ version: "v3", auth: oauth2 }),
    calendarId: data.google_calendar_id || "primary",
  };
}

export interface GCalEventInput {
  summary: string;
  description?: string;
  location?: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24h) — if omitted, created as all-day */
  time?: string | null;
  /** Duration in minutes (default 60) */
  duration?: number;
}

function buildEvent(input: GCalEventInput) {
  const { summary, description, location, date, time, duration = 120 } = input;
  if (time) {
    const [h, m] = time.split(":").map(Number);
    const start = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}:00`);
    const end = new Date(start.getTime() + duration * 60_000);
    return {
      summary,
      description: description || undefined,
      location: location || undefined,
      start: { dateTime: start.toISOString(), timeZone: "Asia/Ho_Chi_Minh" },
      end:   { dateTime: end.toISOString(),   timeZone: "Asia/Ho_Chi_Minh" },
    };
  }
  // All-day
  return {
    summary,
    description: description || undefined,
    location: location || undefined,
    start: { date },
    end:   { date },
  };
}

/**
 * Create or update a Google Calendar event.
 * Returns the gcal_event_id (use it to update/delete later).
 */
export async function upsertGCalEvent(
  userId: string,
  input: GCalEventInput,
  existingGCalId?: string | null,
): Promise<string | null> {
  const ctx = await calendarFor(userId);
  if (!ctx) return null;
  const { cal, calendarId } = ctx;
  const resource = buildEvent(input);

  if (existingGCalId) {
    try {
      const res = await cal.events.update({ calendarId, eventId: existingGCalId, requestBody: resource });
      return res.data.id ?? existingGCalId;
    } catch {
      // If the remote event was deleted, fall through to insert.
    }
  }

  const res = await cal.events.insert({ calendarId, requestBody: resource });
  return res.data.id ?? null;
}

/** Delete a Google Calendar event. Silently ignores 404. */
export async function deleteGCalEvent(userId: string, gcalEventId: string) {
  const ctx = await calendarFor(userId);
  if (!ctx) return;
  try {
    await ctx.cal.events.delete({ calendarId: ctx.calendarId, eventId: gcalEventId });
  } catch {
    // Ignore if already gone.
  }
}
