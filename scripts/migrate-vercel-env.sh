#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# migrate-vercel-env.sh
# Sao chép TOÀN BỘ biến môi trường (mặc định: production) từ một project Vercel
# này sang một project Vercel khác — kể cả khi hai project ở HAI TÀI KHOẢN/TEAM
# khác nhau. Mọi giá trị env của dự án mstudo đều là 1 dòng nên copy an toàn.
#
# Yêu cầu:
#   npm i -g vercel
#   Tạo API token trên MỖI tài khoản tại: https://vercel.com/account/tokens
#
# Cách dùng (điền token + tên project; SCOPE chỉ cần nếu project nằm trong Team):
#   SRC_TOKEN=xxx SRC_PROJECT=old-project [SRC_SCOPE=old-team-slug] \
#   DST_TOKEN=yyy DST_PROJECT=new-project [DST_SCOPE=new-team-slug] \
#   ./scripts/migrate-vercel-env.sh
#
# Tùy chọn: ENVIRONMENT=preview ./scripts/migrate-vercel-env.sh  (mặc định production)
#
# LƯU Ý: 3 biến tự tham chiếu VERCEL_TOKEN / VERCEL_PROJECT_ID / VERCEL_TEAM_ID
# sẽ được BỎ QUA — bạn phải tự đặt lại chúng cho project mới (xem docs).
# ---------------------------------------------------------------------------
set -euo pipefail

: "${SRC_TOKEN:?Thiếu SRC_TOKEN (token tài khoản CŨ)}"
: "${SRC_PROJECT:?Thiếu SRC_PROJECT (tên project CŨ)}"
: "${DST_TOKEN:?Thiếu DST_TOKEN (token tài khoản MỚI)}"
: "${DST_PROJECT:?Thiếu DST_PROJECT (tên project MỚI)}"
ENVIRONMENT="${ENVIRONMENT:-production}"

SRC_SCOPE_ARG=(); [ -n "${SRC_SCOPE:-}" ] && SRC_SCOPE_ARG=(--scope "$SRC_SCOPE")
DST_SCOPE_ARG=(); [ -n "${DST_SCOPE:-}" ] && DST_SCOPE_ARG=(--scope "$DST_SCOPE")

command -v vercel >/dev/null || { echo "❌ Chưa cài Vercel CLI: npm i -g vercel"; exit 1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
ENVFILE="$TMP/pulled.env"

echo "==> [1/3] Kéo env '$ENVIRONMENT' từ project nguồn '$SRC_PROJECT'..."
mkdir -p "$TMP/src"
( cd "$TMP/src" \
  && vercel link --yes --project "$SRC_PROJECT" "${SRC_SCOPE_ARG[@]}" --token "$SRC_TOKEN" >/dev/null \
  && vercel env pull "$ENVFILE" --environment "$ENVIRONMENT" --yes --token "$SRC_TOKEN" >/dev/null )
COUNT="$(grep -cvE '^\s*(#|$)' "$ENVFILE" || true)"
echo "    Lấy được $COUNT biến."

echo "==> [2/3] Liên kết project đích '$DST_PROJECT'..."
mkdir -p "$TMP/dst"
( cd "$TMP/dst" \
  && vercel link --yes --project "$DST_PROJECT" "${DST_SCOPE_ARG[@]}" --token "$DST_TOKEN" >/dev/null )

echo "==> [3/3] Đẩy env sang '$DST_PROJECT' ($ENVIRONMENT)..."
pushed=0; skipped=0; failed=0
while IFS= read -r line; do
  case "$line" in ''|\#*) continue;; esac
  name="${line%%=*}"
  val="${line#*=}"
  # bỏ một lớp dấu nháy bao ngoài nếu có
  val="${val%\"}"; val="${val#\"}"
  case "$name" in
    VERCEL_PROJECT_ID|VERCEL_TEAM_ID|VERCEL_TOKEN)
      echo "    -- bỏ qua $name (tự đặt cho project mới)"; skipped=$((skipped+1)); continue;;
  esac
  # xóa biến cũ (nếu có) rồi thêm lại để ghi đè sạch
  ( cd "$TMP/dst" && vercel env rm "$name" "$ENVIRONMENT" --yes "${DST_SCOPE_ARG[@]}" --token "$DST_TOKEN" >/dev/null 2>&1 || true )
  if printf '%s' "$val" | ( cd "$TMP/dst" && vercel env add "$name" "$ENVIRONMENT" "${DST_SCOPE_ARG[@]}" --token "$DST_TOKEN" >/dev/null 2>&1 ); then
    echo "    ++ $name"; pushed=$((pushed+1))
  else
    echo "    !! LỖI khi thêm $name"; failed=$((failed+1))
  fi
done < "$ENVFILE"

echo
echo "==> Xong: đẩy $pushed | bỏ qua $skipped | lỗi $failed"
echo "    Bước tiếp theo (làm tay):"
echo "      1) Đặt VERCEL_TOKEN / VERCEL_PROJECT_ID / VERCEL_TEAM_ID cho project mới."
echo "      2) Redeploy project mới để áp env."
echo "      3) Đối chiếu Settings → Environment Variables trên Vercel cho chắc."
