"use client";

import { useEffect, useState } from "react";

/**
 * Cache "stale-while-revalidate" phía trình duyệt (chạy trên máy) cho các trang
 * studio: hiển thị NGAY dữ liệu đã lưu ở localStorage (không chờ server), đồng
 * thời tải bản mới ngầm rồi cập nhật. Giảm hẳn độ trễ khi mở/chuyển trang.
 *
 * Dùng chung cho việc "đưa từng tính năng chạy cục bộ" mà vẫn giữ nguyên giao
 * diện web app. Cache theo origin nên chạy cả trong client nhúng lẫn trình duyệt.
 */

const PREFIX = "mstudo_cache:";

export function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* hết dung lượng / chế độ riêng tư — bỏ qua, chỉ mất cache */
  }
}

export type Cached<T> = { data: T; loading: boolean; fromCache: boolean; refresh: () => void };

/**
 * Trả dữ liệu từ cache ngay lập tức (nếu có), rồi revalidate qua `url`.
 * `mutate` cho phép cập nhật lạc quan (optimistic) + ghi lại cache.
 */
export function useCachedJson<T>(key: string, url: string, initial: T): Cached<T> & { setData: (v: T | ((p: T) => T)) => void } {
  const [data, setData] = useState<T>(() => readCache<T>(key) ?? initial);
  const [fromCache] = useState<boolean>(() => readCache<T>(key) != null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(url, { credentials: "same-origin", headers: { "cache-control": "no-cache" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http " + r.status))))
      .then((j: T) => {
        if (!alive) return;
        setData(j);
        writeCache(key, j);
      })
      .catch(() => { /* giữ dữ liệu cache khi mạng lỗi */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [key, url, nonce]);

  const set = (v: T | ((p: T) => T)) => {
    setData((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      writeCache(key, next);
      return next;
    });
  };

  return { data, loading, fromCache, refresh: () => setNonce((n) => n + 1), setData: set };
}
