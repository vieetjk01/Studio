"use client";

import FilterTool from "@/components/FilterTool";

/**
 * Trang Lọc ảnh đầy đủ. Toàn bộ chức năng nằm trong <FilterTool/> để popup
 * "Lọc ảnh" ở quản lý album dùng lại y hệt (src/components/FilterDialog.tsx).
 */
export default function FilterPage() {
  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8">
        <p className="eyebrow mb-1.5">Công cụ</p>
        <h1 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Lọc ảnh</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--text2)" }}>
          Đối chiếu thư mục ảnh (Google Drive hoặc ngay trên máy tính) với danh sách ảnh khách chọn / tự nhập. Với máy tính, có thể <b>copy thẳng từ thư mục nguồn sang thư mục đích</b>.
        </p>
      </div>

      <FilterTool readQueryParams />
    </div>
  );
}
