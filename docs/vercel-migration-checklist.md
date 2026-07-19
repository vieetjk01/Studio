# Checklist chuyển dự án sang tài khoản Vercel khác

> Áp dụng cho dự án **mstudo** (Next.js 14 + Supabase, deploy trên Vercel).
> Làm **tuần tự từ trên xuống**. Phần code không cần sửa — chỉ import lại repo;
> việc mất công là **biến môi trường + domain + cập nhật dịch vụ bên thứ 3**.
> Ước lượng: ~1–2 giờ làm, downtime khi cắt domain chỉ vài phút nếu làm đúng thứ tự.

Ký hiệu:
- 🔴 **BẮT BUỘC** — thiếu là hỏng site.
- 🟡 **Tuỳ tính năng** — chỉ cần nếu đang dùng tính năng đó.
- 🔁 **Phải tạo/đổi mới** — không bê nguyên từ tài khoản cũ được.

---

## ⚡ Chọn cách chuyển (ít thao tác nhất trước)

### Cách A — Vercel "Transfer Project" (KHUYẾN NGHỊ nếu cả 2 tài khoản là của bạn)
Ít thao tác tay nhất. Vercel chuyển **nguyên project** sang tài khoản/team khác,
**mang theo tự động**: toàn bộ env vars + domain + lịch sử deploy + cron.
- Vào **Project cũ → Settings → General → Transfer Project** → chọn tài khoản/team đích.
- Việc còn phải làm bằng tay: **(1)** kết nối lại Git repo cho project; **(2)** đặt
  lại `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` / `VERCEL_TOKEN` (mục 2L, vì project ID đổi);
  **(3)** redeploy. **Không phải đụng DNS** (domain đi theo project).
- Hạn chế: cần quyền ở cả 2 bên; chuyển dính gói Hobby có vài giới hạn.
- → Nếu chọn cách này: **bỏ qua mục 1–3 và 5** bên dưới, chỉ làm 2L + mục 6, 7.

### Cách B — Tạo project mới + copy env bằng script (khi không transfer được)
Vẫn ít tay nhờ script `scripts/migrate-vercel-env.sh` tự copy toàn bộ env giữa 2
tài khoản. Bạn chỉ cần 2 API token:
```bash
npm i -g vercel
# Tạo token ở mỗi tài khoản: https://vercel.com/account/tokens
SRC_TOKEN=<token_tài_khoản_cũ>  SRC_PROJECT=<tên_project_cũ>  [SRC_SCOPE=<team_cũ>] \
DST_TOKEN=<token_tài_khoản_mới> DST_PROJECT=<tên_project_mới> [DST_SCOPE=<team_mới>] \
./scripts/migrate-vercel-env.sh
```
Script tự động: kéo env production từ project cũ → đẩy sang project mới; **tự bỏ
qua** bộ `VERCEL_*` (bạn đặt tay theo mục 2L). Sau đó theo tiếp mục 1, 3–8.

> Với Cách B, vẫn nên tạo project mới (mục 1) và **liên kết Git** trước, rồi mới
> chạy script để đẩy env vào đúng project đó.

---

## 0. Chuẩn bị trước khi bắt đầu (làm trên tài khoản CŨ)

- [ ] 🔴 **Xuất toàn bộ biến môi trường của project cũ**. Cách nhanh nhất bằng Vercel CLI:
  ```bash
  npm i -g vercel
  vercel login                      # đăng nhập tài khoản CŨ
  vercel link                       # chọn đúng project cũ
  vercel env pull .env.production.backup --environment=production
  vercel env pull .env.preview.backup  --environment=preview
  ```
  File `.env.*.backup` này là "nguồn chân lý" để copy sang tài khoản mới.
  **KHÔNG commit file này lên git** (đã có secret).
- [ ] 🔴 Chụp màn hình / ghi lại **danh sách Domains** trong project cũ
  (Project → Settings → Domains) — cần biết chính xác các domain đang trỏ vào đây.
- [ ] 🔴 Ghi lại **nhà cung cấp DNS** (Cloudflare / nhà đăng ký tên miền) và có
  quyền truy cập để sửa bản ghi DNS.
- [ ] 🟡 Ghi lại **cấu hình Cron** đang chạy (đã nằm sẵn trong `vercel.json`, sẽ
  tự theo repo — xem mục 6).
- [ ] 🟡 Nếu có **Deployment Protection / Password / Firewall rules / Analytics**
  đang bật ở project cũ → ghi lại để bật lại bên mới.
- [ ] Xác nhận tài khoản Vercel MỚI dùng **gói nào**: Cron jobs, nhiều domain và
  một số tính năng chỉ chạy trên **Pro** (Hobby giới hạn cron + không dùng cho
  mục đích thương mại). → Nếu là site kinh doanh, tài khoản mới nên là **Pro**.

---

## 1. Tạo project trên tài khoản Vercel MỚI

- [ ] 🔴 Đăng nhập tài khoản/Team Vercel đích.
- [ ] 🔴 **New Project → Import Git Repository** → chọn đúng repo GitHub này
  (`vieetjk01/studio`).
  - Nếu chưa thấy repo: cài **Vercel GitHub App** cho tài khoản mới và cấp quyền
    truy cập repo (GitHub → Settings → Applications → Vercel → cấp repo).
- [ ] 🔴 Framework preset để **Next.js** (Vercel tự nhận). Build command / Output
  để **mặc định** — dự án dùng cấu hình chuẩn (`next build`), **không** cần chỉnh.
- [ ] ⚠️ **KHOAN bấm Deploy** ở bước cuối cho tới khi đã nhập xong env ở mục 2
  (deploy thiếu env sẽ lỗi build hoặc chạy sai). Nếu lỡ deploy — không sao, nhập
  env xong rồi **Redeploy** lại.

---

## 2. Nhập biến môi trường (mục quan trọng nhất)

Vào **Project → Settings → Environment Variables** của project MỚI, thêm từng biến
dưới đây. Đặt scope **Production** (và **Preview** nếu muốn preview branch chạy).

> Mẹo: dùng ô "paste .env" của Vercel để dán nhanh nhiều dòng từ file
> `.env.production.backup` ở mục 0, rồi đối chiếu với bảng dưới cho khỏi sót.

### 2A. Supabase — 🔴 BẮT BUỘC (bê nguyên từ backup, KHÔNG đổi)
| Biến | Ghi chú |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔴 SECRET — chỉ server, quyền admin |

> Supabase KHÔNG đổi khi chuyển Vercel. Chỉ cần nhớ **cập nhật CORS/URL cho phép**
> trong Supabase nếu domain thay đổi (mục 4).

### 2B. Email (Resend) — 🔴 BẮT BUỘC nếu dùng nhắc lịch / gửi mail
| Biến | Ghi chú |
|---|---|
| `RESEND_API_KEY` | 🔴 SECRET — API key Resend |
| `EMAIL_FROM` | Địa chỉ gửi, vd `MStudo <no-reply@mstudo.com>` |

### 2C. Cron — 🔴 BẮT BUỘC (nếu không, cron trả 401)
| Biến | Ghi chú |
|---|---|
| `CRON_SECRET` | 🔴🔁 SECRET. Cron route **fail-closed**: thiếu biến này thì endpoint bị khoá. Vercel tự gắn header `Authorization: Bearer $CRON_SECRET` khi gọi cron, nên **đặt giá trị y hệt** ở đây. Có thể giữ nguyên giá trị cũ hoặc sinh chuỗi ngẫu nhiên mới. |

### 2D. Google (OAuth + Drive + Picker) — 🟡 tuỳ tính năng đang bật
| Biến | Ghi chú |
|---|---|
| `GOOGLE_API_KEY` | 🔴 SECRET — server, đọc thư mục Drive |
| `GOOGLE_API_REFERER` | 🟡 Referer khớp với ràng buộc của API key (nếu key có giới hạn referer) |
| `GOOGLE_CLIENT_SECRET` | 🔴 SECRET — OAuth web client secret |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth web client ID (public) |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | Browser API key cho Google Picker (public) |
| `NEXT_PUBLIC_GOOGLE_APP_ID` | Số project GCP (public) |
| `GOOGLE_STORY_REDIRECT_URI` | 🟡🔁 vd `https://mstudo.com/api/story/drive/callback` — **phải khớp domain mới** |
| `GOOGLE_ADMIN_DRIVE_REDIRECT_URI` | 🟡🔁 vd `https://mstudo.com/api/admin/drive/callback` |
| `GOOGLE_STUDIO_DRIVE_REDIRECT_URI` | 🟡🔁 vd `https://mstudo.com/api/studio/drive/callback` |
| `GOOGLE_CALENDAR_REDIRECT_URI` | 🟡🔁 redirect cho đồng bộ Google Calendar |

> ⚠️ Các `*_REDIRECT_URI` phải **giống hệt** giá trị khai báo trong Google Cloud
> Console (mục 4). Nếu domain không đổi thì giữ nguyên; nếu đổi domain phải sửa cả 2 nơi.

### 2E. Domain split — 🔴 BẮT BUỘC nếu chạy đa subdomain (bê nguyên nếu giữ domain cũ)
| Biến | Giá trị hiện tại |
|---|---|
| `NEXT_PUBLIC_MAIN_HOST` | `mstudo.com` |
| `NEXT_PUBLIC_APP_HOST` | `album.mstudo.com` |
| `NEXT_PUBLIC_IMG_HOST` | `img.mstudo.com` |
| `NEXT_PUBLIC_ADMIN_HOST` | `admin.mstudo.com` |
| `NEXT_PUBLIC_THIEP_HOST` | `thiep.mstudo.com` |
| `NEXT_PUBLIC_STUDIO_HOST` | host khách của studio (dùng trong link báo giá/hợp đồng) |

> Nếu **đổi tên miền mới**, phải sửa đủ 6 biến này + thêm domain tương ứng ở mục 5.
> Nếu chỉ deploy tạm trên `*.vercel.app`: **bỏ trống** hết nhóm này để app chạy
> gộp trên 1 host (đúng thiết kế trong `lib/hosts.ts`).

### 2F. Cloudflare Turnstile (CAPTCHA) — 🟡
| Biến | Ghi chú |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public site key |
| `TURNSTILE_SECRET_KEY` | 🔴 SECRET |

> Nếu đổi domain: thêm domain mới vào widget Turnstile (mục 4).

### 2G. Web Push (thông báo đẩy) — 🟡
| Biến | Ghi chú |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public VAPID key |
| `VAPID_PRIVATE_KEY` | 🔴 SECRET |
| `VAPID_SUBJECT` | vd `mailto:admin@mstudo.com` |

> Giữ **nguyên cặp VAPID** cũ, đừng sinh mới — nếu sinh mới, mọi thiết bị đã
> đăng ký nhận push sẽ mất hiệu lực và phải đăng ký lại.

### 2H. Rate limit (Upstash Redis) — 🟡
| Biến | Ghi chú |
|---|---|
| `UPSTASH_REDIS_REST_URL` | REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | 🔴 SECRET |

### 2I. Bảo mật OAuth state — 🔴 nếu dùng bất kỳ luồng OAuth Google nào
| Biến | Ghi chú |
|---|---|
| `OAUTH_STATE_SECRET` | 🔴 SECRET — ký/xác thực tham số `state` chống CSRF khi OAuth |

### 2J. Ảnh / tối ưu chi phí Vercel — 🟡 (tuỳ chọn)
| Biến | Ghi chú |
|---|---|
| `DRIVE_IMG_CACHE_BUCKET` | Tên bucket Supabase public để cache ảnh proxy |
| `IMG_CDN_REDIRECT` | `=1` để redirect ảnh hiển thị thẳng sang CDN Google |

### 2K. App Desktop (Tauri updater) — 🟡 chỉ nếu phát hành bản desktop
| Biến | Ghi chú |
|---|---|
| `DESKTOP_LATEST_VERSION` | Phiên bản mới nhất để updater so sánh |
| `DESKTOP_UPDATE_NOTE` | Ghi chú bản cập nhật |
| `NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL` | Link tải bản desktop |

### 2L. Tự đăng ký custom domain cho studio — 🔴🔁 PHẢI TẠO MỚI
| Biến | Ghi chú |
|---|---|
| `VERCEL_TOKEN` | 🔴🔁 SECRET. **Sinh token MỚI** tại `vercel.com/account/tokens` bằng tài khoản MỚI. Token cũ vô hiệu với project mới. |
| `VERCEL_PROJECT_ID` | 🔴🔁 Lấy ID **project mới** (Project → Settings → General). |
| `VERCEL_TEAM_ID` | 🔴🔁 Chỉ cần nếu project nằm trong Team → lấy Team ID mới (Team → Settings). Bỏ trống nếu là tài khoản cá nhân. |

> ⚠️ Bộ `VERCEL_*` này là thứ **hay quên nhất** khi chuyển tài khoản, vì nó trỏ
> ngược về chính project. Tính năng white-label (studio nối domain riêng từ site
> builder — `/api/site/domain`) sẽ **im lặng hỏng** nếu 3 biến này còn giá trị cũ.

---

## 3. Deploy thử trên URL tạm (chưa động vào domain)

- [ ] 🔴 Sau khi nhập xong env → **Deploy** (hoặc Redeploy).
- [ ] 🔴 Mở URL tạm `xxxxx.vercel.app` mà Vercel cấp, kiểm tra build **xanh** và
  trang chủ lên được.
- [ ] Ở giai đoạn này **chưa cần đúng domain** — dùng URL tạm để chắc chắn build
  + env cơ bản (Supabase, DB) hoạt động trước khi cắt traffic.

---

## 4. Cập nhật dịch vụ bên thứ 3 (làm nếu domain thay đổi; nếu giữ domain cũ thì phần lớn bỏ qua)

- [ ] 🔴 **Google Cloud Console → APIs & Services → Credentials → OAuth client**:
  - Thêm domain mới vào **Authorized JavaScript origins**
    (vd `https://mstudo.com`, `https://album.mstudo.com`, `https://img.mstudo.com`).
  - Thêm đủ **Authorized redirect URIs** khớp các biến ở 2D:
    `/api/story/drive/callback`, `/api/admin/drive/callback`,
    `/api/studio/drive/callback`, và callback Calendar.
- [ ] 🟡 **Google API key** (Drive/Picker): cập nhật **HTTP referrer** cho phép
  domain mới (khớp `GOOGLE_API_REFERER` nếu có dùng).
- [ ] 🟡 **Cloudflare Turnstile**: thêm domain mới vào danh sách hostname của widget.
- [ ] 🟡 **Supabase → Authentication → URL Configuration**: nếu có dùng redirect
  auth, thêm domain mới vào **Redirect URLs / Site URL**.
- [ ] 🟡 **Resend**: đảm bảo domain gửi mail (`EMAIL_FROM`) đã verify (SPF/DKIM)
  — cái này không phụ thuộc Vercel nên thường không cần đổi.

> Nếu **giữ nguyên toàn bộ domain cũ** (chỉ đổi tài khoản Vercel host), thì mục 4
> gần như bỏ qua — vì mọi cấu hình bên thứ 3 vẫn trỏ đúng domain. Chỉ cần làm mục 5.

---

## 5. Chuyển domain sang project mới (bước cắt traffic — làm khi đã test OK)

Đây là bước gây downtime, nên làm nhanh, gọn:

- [ ] 🔴 Trong **project MỚI → Settings → Domains**, **Add** lần lượt tất cả domain:
  `mstudo.com`, `album.mstudo.com`, `img.mstudo.com`, `admin.mstudo.com`,
  `thiep.mstudo.com` (và mọi custom domain của studio nếu có).
  - Vercel sẽ báo **"Domain already in use"** vì đang gắn ở project cũ → đúng dự kiến.
- [ ] 🔴 Vào **project CŨ → Settings → Domains → Remove** từng domain đó.
- [ ] 🔴 Quay lại **project MỚI**, bấm **Refresh/Add** lại domain → giờ Vercel nhận.
- [ ] 🔴 **Cập nhật DNS** theo hướng dẫn Vercel hiển thị cho từng domain (xem mục
  5B nếu dùng Cloudflare):
  - Apex `mstudo.com`: bản ghi **A → `76.76.21.21`** (hoặc giá trị Vercel chỉ định),
    hoặc dùng **Vercel nameservers** nếu quản lý DNS bằng Vercel.
  - Subdomain: bản ghi **CNAME → `cname.vercel-dns.com`**.
- [ ] 🔴 Chờ Vercel cấp lại **SSL** cho từng domain (thường vài phút). Domain phải
  hiện **Valid Configuration** + khoá SSL xanh.

### 5B. Dùng Cloudflare đứng trước Vercel (khuyến nghị — an toàn hơn: DDoS/WAF/ẩn origin)
Hoàn toàn được và nên dùng. Cấu hình đúng để không lỗi SSL / vòng lặp redirect:

- [ ] 🔴 **SSL/TLS mode = Full (Strict)** (Cloudflare → SSL/TLS → Overview).
  KHÔNG để "Flexible" — sẽ gây vòng lặp redirect vì Vercel luôn ép HTTPS.
- [ ] 🔴 **DNS records** (Cloudflare → DNS):
  - Apex `mstudo.com`: **CNAME → `cname.vercel-dns.com`** (Cloudflare tự flatten
    apex về A), hoặc **A → `76.76.21.21`**.
  - Mỗi subdomain (`album`, `img`, `admin`, `thiep`): **CNAME → `cname.vercel-dns.com`**.
- [ ] 🔴 **Thứ tự để tránh kẹt cấp SSL**:
  1. Tạm để tất cả bản ghi ở **DNS only (mây xám)**.
  2. Chờ Vercel báo **Valid Configuration** + cấp cert xong cho mọi domain.
  3. Rồi mới bật **Proxied (mây cam)** cho từng bản ghi (nếu muốn WAF/CDN Cloudflare).
- [ ] 🟡 **Bật**: Always Use HTTPS, Automatic HTTPS Rewrites, Brotli.
- [ ] 🟡 **KHÔNG** tạo Page Rule cache HTML kiểu "Cache Everything" cho toàn site —
  Next.js phục vụ nội dung động (dashboard, `/api/*`) sẽ hỏng nếu bị cache. Mặc
  định Cloudflare không cache HTML → cứ để mặc định là an toàn.
- [ ] 🟡 Nếu bật WAF/Bot Fight Mode: **whitelist đường dẫn `/api/cron/*`** (Vercel
  gọi từ IP của Vercel) và các callback OAuth Google, tránh bị chặn nhầm.
- [ ] 🟡 Cookie session dùng domain `.mstudo.com` cho mọi subdomain → Cloudflare
  proxy tất cả subdomain không ảnh hưởng; chỉ cần các subdomain đều trỏ đúng.

---

## 6. Cron jobs

- [ ] 🔴 Không cần cấu hình tay: 2 cron đã khai báo trong `vercel.json` và **tự
  theo repo** khi deploy:
  - `/api/cron/reminders` — `0 0 * * *` (07:00 giờ VN: digest nhắc việc)
  - `/api/cron/cleanup-proofs` — `30 1 * * *`
- [ ] 🔴 Xác nhận `CRON_SECRET` đã nhập (mục 2C) — nếu thiếu, cron chạy nhưng trả **401**.
- [ ] 🟡 Vào **Project → Settings → Cron Jobs** kiểm tra 2 job hiện đúng lịch.
  ⚠️ Cron chỉ chạy trên **gói Pro** (Hobby giới hạn 1 cron/ngày). Đảm bảo tài
  khoản mới đủ gói.

---

## 7. Kiểm thử sau khi chuyển (smoke test)

Chạy trên **domain thật** đã trỏ về project mới:

- [ ] 🔴 Trang chủ + đăng nhập / đăng xuất chạy, **cookie session giữ được** khi
  chuyển giữa `mstudo.com` ↔ `album.mstudo.com` (cookie domain `.mstudo.com`).
- [ ] 🔴 Tạo/đọc album, chọn ảnh (`/a`), cổng khách (`/c`, `/q`, `/crew`).
- [ ] 🟡 Đăng nhập Google + nối Google Drive (admin/studio/story) → xác nhận
  OAuth callback không lỗi `redirect_uri_mismatch`.
- [ ] 🟡 Nén ảnh (`img.mstudo.com`) + Google Picker mở được.
- [ ] 🟡 Turnstile (CAPTCHA) hiển thị và verify được ở các form public.
- [ ] 🟡 Gửi thử 1 email (nhắc việc/thông báo) → tới hộp thư.
- [ ] 🟡 Thiệp cưới online `thiep.mstudo.com/<slug>` mở đúng.
- [ ] 🟡 Studio nối **custom domain riêng** từ site builder → domain được tự thêm
  vào project (kiểm chứng `VERCEL_TOKEN/PROJECT_ID/TEAM_ID` mới đúng).
- [ ] 🟡 Đợi tới mốc cron (hoặc gọi thủ công có `Authorization: Bearer <CRON_SECRET>`)
  để xác nhận trả **200**, không phải 401.
- [ ] 🔴 Kiểm tra **Deployment Logs** không có lỗi thiếu env (`... is not defined`).

---

## 8. Dọn dẹp & rollback

- [ ] 🔁 **Sinh lại các secret nhạy cảm nếu tài khoản cũ do người khác nắm**:
  `SUPABASE_SERVICE_ROLE_KEY` không xoay được dễ, nhưng nên **rotate**
  `GOOGLE_CLIENT_SECRET`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `CRON_SECRET`,
  `OAUTH_STATE_SECRET`, `VERCEL_TOKEN` cũ để người sở hữu tài khoản cũ không còn
  quyền. (Rotate xong nhớ cập nhật lại env project mới.)
- [ ] Giữ project cũ **~1 tuần** (đã gỡ domain) để có đường lùi, rồi mới xoá.
- [ ] **Rollback nhanh** nếu có sự cố: gỡ domain khỏi project mới → add lại vào
  project cũ → trỏ DNS về cũ. Vì code + DB (Supabase) không đổi, lùi lại an toàn.

---

## Tóm tắt "nhớ nhất kẻo quên"

1. 🔁 **`VERCEL_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID`** — phải tạo mới cho
   tài khoản/project mới, nếu không tính năng nối domain của studio hỏng âm thầm.
2. 🔴 **`CRON_SECRET`** — thiếu là cron bị khoá (401).
3. 🔴 **Cặp VAPID** và **các REDIRECT_URI** — giữ nguyên / khớp domain, đừng sinh
   bừa (mất đăng ký push, hoặc `redirect_uri_mismatch`).
4. 🔴 **Thứ tự cắt domain**: test URL tạm OK trước → mới remove domain project cũ →
   add project mới → sửa DNS. Đừng cắt DNS trước khi build mới xanh.
5. 🔴 **Đối chiếu env dùng-trong-code với `.env.example`**: một số biến (Resend,
   Upstash, VAPID, `OAUTH_STATE_SECRET`, `CRON_SECRET`) **có trong code nhưng
   không có trong `.env.example`** — bảng ở mục 2 đã gộp đủ.
