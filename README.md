# Vieetjk — Photo collection for customers

> Minimalist, dark-themed photo selection platform. Photographers create albums
> from Google Drive links; customers browse (watermarked), pick photos within a
> limit, export/copy the list, and download a ZIP.
>
> Nền tảng chọn ảnh tối giản, tone tối. Photographer tạo album từ link Google
> Drive; khách hàng xem (có watermark), chọn ảnh theo giới hạn, xuất/copy danh
> sách và tải ZIP.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase**.

The UI follows the **Vieetjk Gallery “Obsidian”** design: deep-ink palette
(`#0a0a0c`), champagne-gold accent (`#E8C57C`), the TJK wordmark logo, and an
editorial type pairing — **Cormorant Garamond** (headings) + **Hanken Grotesk**
(UI). The customer selection page mirrors that design: editorial album title,
guest banner, a sticky toolbar (filter selected / export / copy / ZIP / send),
a masonry gallery with selection rings, and a lightbox with a per-photo note
panel.

> Already have a database from an earlier version? Re-run `supabase/schema.sql`
> (it is idempotent) — it adds `selections.client_note`, the album showcase
> flags (`is_showcase`, `is_pinned`, `kind`), and the `site_settings` and
> `bookings` tables used by the homepage and settings.

---

## ✨ Features / Tính năng

- **Albums from Google Drive** — add multiple sources per album (individual file
  links *or* folder links). Folders are auto-listed via the Drive API and can be
  re-synced to update the photo count. *(Tạo album từ nhiều link Drive — file lẻ
  hoặc folder; đồng bộ lại số lượng ảnh.)*
- **Group or merge** — each source is a named group; customers can view all
  photos together or filter by group.
- **Selection limit** — cap how many photos a customer may select.
- **Album password** — optional bcrypt-hashed password gate per album.
- **Watermark** — tiled diagonal watermark on previews *and* on ZIP downloads.
- **Export / copy** — export the selection as a `.txt`, or copy the list with
  file extensions stripped.
- **Download ZIP** — client-side zip of selected images (watermarked if enabled).
- **Customer notes** — clients can leave a note on each photo (in the lightbox);
  notes are sent to the studio with the selection.
- **Photographer tools** — edit album, change cover, re-sync Drive, view customer
  selections (with the client's notes) and add their own notes per chosen photo.
- **Admin** — manage photographers: roles, activation, album limit, ZIP
  permission, and create new accounts.
- **Profile homepage** — public studio portfolio: cover, avatar, bio, live
  stats, featured photos, view-only **reference albums**, a **booking form**
  (4 service types → stored as leads) and a contact block.
- **Reference (showcase) albums** — flag any published album as "show on
  homepage"; it renders view-only (no selection/download) at `/showcase/[slug]`.
- **2-step create flow** — `/dashboard/create`: paste Drive links + options,
  then get a shareable client link **with a real QR code**.
- **Studio settings & bookings** — admins edit the homepage profile/contact and
  review booking leads at `/dashboard/settings`.
- **Bilingual UI** — Vietnamese / English toggle.

---

## 🚀 Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. From **Project Settings → API**, copy the *Project URL*, *anon key* and
   *service_role key*.

### 2. Google Drive API key

1. In [Google Cloud Console](https://console.cloud.google.com), enable the
   **Google Drive API**.
2. Create an **API key**. Restrict it to the Drive API (and ideally to your
   site's referrer / IP).
3. Drive sources must be shared as **“Anyone with the link”** for the key to
   read them. *(Folder/ảnh phải được chia sẻ ở chế độ “Anyone with the link”.)*

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # server only — keep secret
GOOGLE_API_KEY=...                # server only — keep secret
```

### 4. Run locally

```bash
npm install
npm run dev
```

### 5. Create the first admin

1. Sign up once is disabled by default; instead, create a user in the Supabase
   dashboard (**Authentication → Users → Add user**, with a password).
2. In **SQL Editor**, promote that user:
   ```sql
   update public.profiles set role = 'admin', is_active = true
   where email = 'you@example.com';
   ```
3. Sign in at `/login`. From **Admin**, create photographer accounts.

### 6. Deploy to Vercel

Push to GitHub, import the repo in Vercel, and add the four environment
variables above in **Project Settings → Environment Variables**. Deploy.

---

## 🗺 Routes

| Route | Who | Purpose |
|---|---|---|
| `/` | public | Studio profile homepage (portfolio + booking + contact) |
| `/showcase/[slug]` | public | Reference album — view-only gallery + lightbox |
| `/login` | public | Photographer / admin sign-in |
| `/dashboard` | auth | Album list |
| `/dashboard/create` | auth | 2-step create flow (Drive links → share link + QR) |
| `/dashboard/albums/[id]` | owner/admin | Edit album, sources, photos, settings |
| `/dashboard/albums/[id]/selections` | owner/admin | Customer selections + notes |
| `/dashboard/admin` | admin | Manage photographers |
| `/dashboard/settings` | admin | Studio profile/contact + booking leads |
| `/a/[slug]` | public | Customer album (password → select → export/zip) |

---

## 🔐 Security notes

- The Google API key and Supabase service-role key are **server-only**; Drive
  listing and customer-selection writes go through API routes, never the browser.
- Album passwords are stored as **bcrypt hashes** and verified server-side.
- Row Level Security restricts photographers to their own albums; admins see all.
- **Rotate any key that was ever shared in plain text.**
- This project pins **Next.js 14.2.x** (latest patched 14 line). `npm audit`
  flags advisories whose only fix is the Next 16 major release; deploying on
  Vercel (managed, not self-hosted) mitigates the self-hosted image-optimizer
  and middleware advisories. Upgrade to Next 16 when you're ready to adapt to
  its async `params`/`cookies()` API.

---

© Vieetjk — photo collection for customers.
