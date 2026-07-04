import { Video } from "lucide-react";
import { requireStudio } from "@/lib/auth-guards";
import { getFeatureFlags, slideComingSoon } from "@/lib/feature-flags";
import SlideStudio from "./SlideStudio";

export default async function SlidePage() {
  const profile = await requireStudio();
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Slide cưới chỉ dành cho tài khoản gói Studio.</p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }

  // "Sắp ra mắt": khoá với studio; admin vẫn vào để hoàn thiện.
  if (slideComingSoon(await getFeatureFlags()) && profile.actingRole !== "admin") {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <Video size={28} className="mx-auto mb-3" style={{ color: "var(--brand)" }} />
          <h1 className="font-serif text-2xl font-medium">Slide cưới · Sắp ra mắt</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Công cụ tự tạo video slideshow ảnh cưới — chọn ảnh, chủ đề, nhạc, hiệu ứng chuyển cảnh rồi xuất video. Bọn mình đang hoàn thiện và sẽ báo khi sẵn sàng.
          </p>
        </div>
      </div>
    );
  }

  return <SlideStudio />;
}
