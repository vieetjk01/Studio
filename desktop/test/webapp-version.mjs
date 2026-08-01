/* Kiểm thử cơ chế chuyển giao diện 2.0 (src/lib/webapp-version.ts).
 * Nạp thẳng file .ts thật bằng type-stripping của Node — không phải bản chép
 * lại — nên test đúng code đang chạy. Các bẫy được nhắm tới:
 *  - MẶC ĐỊNH (chưa có cờ) không ai vào được 2.0, kể cả admin → chỉ có thông báo
 *  - "beta" chỉ admin dùng được, studio thường vẫn ở 1.0
 *  - cookie "v2" KHÔNG được tôn trọng khi cờ đã hạ về coming_soon (tự về 1.0)
 *  - giá trị cờ lạ/rỗng phải hiểu là coming_soon (không mở nhầm cho khách)
 *  - "live" thì mọi vai trò đều chuyển được, và vẫn quay lại 1.0 được
 */
import {
  webappV2Stage,
  canSwitchWebappV2,
  resolveWebappUi,
  webappV2StageLabel,
} from "../../src/lib/webapp-version.ts";

let fail = 0;
const check = (name, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n    nhận: ${got}\n    cần : ${want}`}`);
};

// ── Đọc cờ ──────────────────────────────────────────────────────────────────
check("không có cờ → coming_soon", webappV2Stage(undefined), "coming_soon");
check("cờ rỗng → coming_soon", webappV2Stage({}), "coming_soon");
check("cờ lạ → coming_soon", webappV2Stage({ webapp_v2: "yes" }), "coming_soon");
check("cờ beta", webappV2Stage({ webapp_v2: "beta" }), "beta");
check("cờ live", webappV2Stage({ webapp_v2: "live" }), "live");

// ── Quyền bật 2.0 ───────────────────────────────────────────────────────────
check("coming_soon: admin cũng KHÔNG bật được", canSwitchWebappV2("coming_soon", "admin"), false);
check("coming_soon: chủ studio không bật được", canSwitchWebappV2("coming_soon", "owner"), false);
check("beta: admin bật được", canSwitchWebappV2("beta", "admin"), true);
check("beta: chủ studio chưa bật được", canSwitchWebappV2("beta", "owner"), false);
check("beta: không có vai trò", canSwitchWebappV2("beta", null), false);
check("live: mọi vai trò bật được", canSwitchWebappV2("live", "staff"), true);

// ── Giao diện thực sự dựng ra ───────────────────────────────────────────────
check("mặc định (không cookie) → v1", resolveWebappUi(undefined, "coming_soon", "admin"), "v1");
check("cookie v2 + coming_soon → tự về v1", resolveWebappUi("v2", "coming_soon", "admin"), "v1");
check("cookie v2 + beta + admin → v2", resolveWebappUi("v2", "beta", "admin"), "v2");
check("cookie v2 + beta + studio → v1", resolveWebappUi("v2", "beta", "owner"), "v1");
check("cookie v2 + live + studio → v2", resolveWebappUi("v2", "live", "owner"), "v2");
check("cookie v1 + live → giữ v1 (đã chọn quay về)", resolveWebappUi("v1", "live", "owner"), "v1");
check("cookie rác + live → v1", resolveWebappUi("2", "live", "owner"), "v1");

// ── Nhãn hiển thị ───────────────────────────────────────────────────────────
check("nhãn coming_soon", webappV2StageLabel("coming_soon"), "Sắp ra mắt");
check("nhãn beta", webappV2StageLabel("beta"), "Bản thử nghiệm");
check("nhãn live", webappV2StageLabel("live"), "Đã phát hành");

console.log(fail === 0 ? "\nTất cả kiểm thử ĐẠT" : `\n${fail} kiểm thử KHÔNG đạt`);
process.exit(fail === 0 ? 0 : 1);
