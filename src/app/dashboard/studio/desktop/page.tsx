import { notFound } from "next/navigation";
import { requireStudio } from "@/lib/auth-guards";
import { getFeatureFlags, desktopHidden } from "@/lib/feature-flags";
import DesktopPanel from "./DesktopPanel";

export default async function DesktopPage() {
  // MStudo Desktop mở cho 2 gói lớn nhất: Photographer Plus (plus) & Studio (full).
  const profile = await requireStudio("plus");
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Photographer Plus trở lên</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>MStudo Desktop dành cho gói Photographer Plus &amp; Studio.</p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem các gói</a>
        </div>
      </div>
    );
  }

  // Chưa xuất bản: ẩn hoàn toàn với non-admin (không hiện cả trang "Sắp ra mắt").
  if (desktopHidden(await getFeatureFlags()) && profile.actingRole !== "admin") notFound();

  // Chỉ CHỦ studio (không phải nhân viên) được dùng client + xuất dữ liệu.
  if (profile.isStaff || (profile.actingRole !== "owner" && profile.actingRole !== "admin")) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Chỉ dành cho chủ studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            MStudo Desktop và sao lưu dữ liệu chỉ chủ tài khoản studio mới sử dụng được.
          </p>
        </div>
      </div>
    );
  }

  return <DesktopPanel />;
}
