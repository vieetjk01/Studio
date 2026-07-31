"use client";

import { useEffect } from "react";

/**
 * Đếm một lượt xem cho website studio — gọi MỘT lần mỗi phiên trình duyệt
 * (sessionStorage), nên chuyển trang/tải lại trong cùng phiên không cộng thêm.
 * Dùng sendBeacon để không giữ trang lại khi khách rời đi.
 */
export default function SiteViewPing({ siteId }: { siteId: string }) {
  useEffect(() => {
    if (!siteId) return;
    const key = `mstudo-view-${siteId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Chặn cookie/storage → vẫn đếm, chỉ có thể trùng lượt. Không sao.
    }
    const body = JSON.stringify({ site: siteId });
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon?.("/api/site/view", blob)) return;
    } catch {
      /* rơi xuống fetch bên dưới */
    }
    fetch("/api/site/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => { /* im lặng — không ảnh hưởng khách xem trang */ });
  }, [siteId]);

  return null;
}
