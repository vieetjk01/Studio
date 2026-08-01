import { cookies } from "next/headers";
import { getSessionUser, getProfileById } from "@/lib/auth-guards";
import { getFeatureFlags } from "@/lib/feature-flags";
import WebappV2Banner from "@/components/WebappV2Banner";
import {
  WEBAPP_UI_COOKIE,
  canSwitchWebappV2,
  resolveWebappUi,
  webappV2Stage,
} from "@/lib/webapp-version";

/**
 * Chỗ cắm bảng thông báo giao diện 2.0 vào các trang server (Tổng quan).
 * Tự đọc cờ + hồ sơ + cookie; mọi truy vấn ở đây đều đã được React `cache()`
 * dùng chung với layout nên KHÔNG phát sinh thêm truy vấn DB nào.
 */
export default async function WebappV2BannerSlot() {
  const user = await getSessionUser();
  if (!user) return null;

  const [profile, flags] = await Promise.all([getProfileById(user.id), getFeatureFlags()]);
  const stage = webappV2Stage(flags);
  const role = profile?.role as string | undefined;

  return (
    <WebappV2Banner
      stage={stage}
      ui={resolveWebappUi(cookies().get(WEBAPP_UI_COOKIE)?.value, stage, role)}
      canSwitch={canSwitchWebappV2(stage, role)}
    />
  );
}
