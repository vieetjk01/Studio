import type { StoryConfig, StoryPage } from "@/lib/types";
import StoryFeed, { type FeedPhoto, type FeedWish, type FeedEvent } from "./StoryFeed";

export type StoryPhoto = { id: string; url: string; thumb: string; isVideo?: boolean; guestName?: string };
export type StoryWish = { guest_name: string; wish: string; created_at: string };

const DEFAULT_ACCENT = "#d0687a";

function eventParts(iso?: string): Pick<FeedEvent, "weekday" | "day" | "month" | "year" | "time"> {
  if (!iso) return {};
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return {};
  const weekday = d.toLocaleDateString("vi-VN", { weekday: "long" });
  const hasTime = /\d{2}:\d{2}/.test(iso);
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    day: String(d.getDate()).padStart(2, "0"),
    month: `Tháng ${d.getMonth() + 1}`,
    year: String(d.getFullYear()),
    time: hasTime ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : undefined,
  };
}

/** Instagram-style Love Story page. Media comes from the couple's Drive folder + guest uploads. */
export default function StoryRenderer({
  story,
  photos,
  guestPhotos = [],
  wishes,
  guestUploadEnabled = false,
}: {
  story: StoryPage;
  photos: StoryPhoto[];
  guestPhotos?: StoryPhoto[];
  wishes: StoryWish[];
  guestUploadEnabled?: boolean;
}) {
  const c = story.config as StoryConfig;
  const accent = c.accent || DEFAULT_ACCENT;
  const groom = c.groom_name || "Chú rể";
  const bride = c.bride_name || "Cô dâu";
  const parts = eventParts(c.event_date);
  const dateShort = c.event_date
    ? new Date(c.event_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : "";

  const event: FeedEvent = { label: c.event_label, ...parts, venue: c.event_venue };
  const toFeed = (p: StoryPhoto): FeedPhoto => ({ id: p.id, url: p.url, thumb: p.thumb, isVideo: p.isVideo, guestName: p.guestName });

  return (
    <StoryFeed
      slug={story.slug}
      groom={groom}
      bride={bride}
      dateShort={dateShort}
      accent={accent}
      cover={c.cover_url}
      story={c.story}
      tagline={c.tagline}
      photos={photos.map(toFeed)}
      guestPhotos={guestPhotos.map(toFeed)}
      wishes={(wishes ?? []).map((w) => ({ name: w.guest_name, text: w.wish } as FeedWish))}
      event={event}
      guestUploadEnabled={guestUploadEnabled}
      thankYou="Cảm ơn vì đã ở đây cùng chúng mình"
    />
  );
}
