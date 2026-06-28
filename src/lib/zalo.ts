// One-tap Zalo reminders. Fully automatic sending needs a Zalo Official Account
// + API token + a scheduled job; until then we open the person's Zalo chat and
// copy a ready-made message so the studio can paste & send in one tap.

/** Build a friendly reminder message for an upcoming shoot. */
export function shootReminderMessage(opts: {
  name?: string | null;
  title?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  role?: string | null;
  studio?: string | null;
}): string {
  const lines: string[] = [];
  lines.push(`Chào ${opts.name || "bạn"},`);
  const what = opts.title ? `"${opts.title}"` : "buổi chụp/quay";
  const when = [opts.date, opts.time].filter(Boolean).join(" ");
  lines.push(
    `Nhắc lịch ${what}${when ? ` vào ${when}` : ""}${opts.location ? ` tại ${opts.location}` : ""}.`
  );
  if (opts.role) lines.push(`Vai trò: ${opts.role}.`);
  lines.push("Vui lòng có mặt đúng giờ nhé. Cảm ơn bạn!");
  if (opts.studio) lines.push(`— ${opts.studio}`);
  return lines.join("\n");
}
