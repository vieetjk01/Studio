/**
 * Thẻ "Không có quyền" dùng chung cho các trang studio khi chặn theo vai trò
 * nhân viên (server component — chỉ hiển thị, không cần client JS).
 */
export default function StudioDenied({
  title = "Không có quyền",
  message = "Mục này không dành cho vai trò của bạn. Liên hệ chủ studio nếu cần.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="card p-8">
        <h1 className="font-serif text-2xl font-medium">{title}</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>{message}</p>
        <a href="/dashboard/studio" className="btn-ghost mt-5">Về Tổng quan</a>
      </div>
    </div>
  );
}
