"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapPin, Crosshair, Loader2, Link as LinkIcon } from "lucide-react";
import type { IntakeLocation } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type LatLng = { lat: number; lng: number } | null;

/** Link Google Maps từ toạ độ (gửi về studio để mở chỉ đường). */
export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Trích toạ độ từ link Google Maps (nhiều định dạng) hoặc chuỗi "lat,lng". */
export function parseLatLng(input: string): { lat: number; lng: number } | null {
  const s = (input || "").trim();
  if (!s) return null;
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, // .../@10.77,106.70,15z
    /[?&](?:q|ll|query|destination|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i, // ?q=10.77,106.70
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // ...!3d10.77!4d106.70
    /^\s*(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)\s*$/, // dán thẳng "10.762, 106.660"
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

/**
 * Chọn vị trí cho form điền thông tin. 3 cách:
 *  1) Bấm lên bản đồ (Leaflet + OpenStreetMap — miễn phí, không cần API key).
 *  2) "Vị trí hiện tại" (GPS).
 *  3) Dán link Google Maps (hoặc toạ độ "lat,lng"). Link rút gọn không đọc được
 *     toạ độ vẫn được lưu để studio bấm mở.
 * Trả về IntakeLocation | null.
 */
export default function LocationPicker({
  value,
  onChange,
}: {
  value: IntakeLocation | null;
  onChange: (v: IntakeLocation | null) => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const placeRef = useRef<(lat: number, lng: number) => void>(() => {});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [link, setLink] = useState(
    value && (value.lat == null || value.lng == null) ? value.mapUrl : ""
  );
  const [linkNote, setLinkNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod: any = await import("leaflet");
      const L = mod.default ?? mod;
      if (cancelled || !mapEl.current || mapRef.current) return;
      const hasCoords = value && typeof value.lat === "number" && typeof value.lng === "number";
      const start = hasCoords ? { lat: value!.lat as number, lng: value!.lng as number } : { lat: 10.7769, lng: 106.7009 }; // mặc định: TP.HCM
      const map = L.map(mapEl.current).setView([start.lat, start.lng], hasCoords ? 16 : 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      let marker: any = null;
      const place = (lat: number, lng: number) => {
        if (marker) marker.setLatLng([lat, lng]);
        else
          marker = L.circleMarker([lat, lng], {
            radius: 9,
            color: "#fff",
            weight: 2,
            fillColor: "#0068FF",
            fillOpacity: 1,
          }).addTo(map);
        onChangeRef.current({ lat, lng, mapUrl: mapsLink(lat, lng) });
      };
      placeRef.current = place;
      if (hasCoords) place(value!.lat as number, value!.lng as number);
      map.on("click", (e: any) => {
        setLink("");
        setLinkNote("");
        place(e.latlng.lat, e.latlng.lng);
      });
      // Bản đồ nằm trong khối có thể ẩn/hiện → tính lại kích thước sau khi mount.
      setTimeout(() => map.invalidateSize(), 200);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // Khởi tạo một lần.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useCurrent() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLink("");
        setLinkNote("");
        mapRef.current?.setView([latitude, longitude], 16);
        placeRef.current(latitude, longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function applyLink(raw: string) {
    const url = raw.trim();
    if (!url) {
      setLinkNote("");
      // Xoá link nhưng giữ ghim toạ độ nếu đang có.
      if (value && (value.lat == null || value.lng == null)) onChangeRef.current(null);
      return;
    }
    const coords = parseLatLng(url);
    if (coords) {
      mapRef.current?.setView([coords.lat, coords.lng], 16);
      placeRef.current(coords.lat, coords.lng);
      setLinkNote("Đã lấy được vị trí từ link ✓");
      return;
    }
    if (/^https?:\/\//i.test(url)) {
      // Link rút gọn (maps.app.goo.gl…) không đọc được toạ độ ở trình duyệt —
      // vẫn lưu để studio bấm mở.
      onChangeRef.current({ lat: null, lng: null, mapUrl: url });
      setLinkNote("Đã lưu link (link rút gọn không hiện ghim, studio vẫn mở được).");
      return;
    }
    setLinkNote("Link chưa hợp lệ — dán link Google Maps hoặc toạ độ dạng 10.762, 106.660.");
  }

  const hasCoords = value && typeof value.lat === "number" && typeof value.lng === "number";

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs opacity-70">
          <MapPin size={13} /> Bấm lên bản đồ để đặt vị trí
        </span>
        <button type="button" onClick={useCurrent} className="btn-ghost px-2 py-1 text-xs">
          {locating ? <Loader2 size={12} className="inline animate-spin" /> : <Crosshair size={12} className="inline" />} Vị trí hiện tại
        </button>
      </div>
      <div
        ref={mapEl}
        className="mt-1.5 w-full overflow-hidden rounded-lg border border-white/10"
        style={{ height: 240 }}
      />
      {!ready && <p className="mt-1 text-[11px] opacity-50">Đang tải bản đồ…</p>}

      {/* Nhập link Google Maps */}
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <LinkIcon size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              className="input w-full pl-7 text-sm"
              inputMode="url"
              placeholder="Hoặc dán link Google Maps vào đây"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onBlur={(e) => applyLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink((e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>
          <button type="button" onClick={() => applyLink(link)} className="btn-ghost px-2.5 py-1.5 text-xs">
            Áp dụng
          </button>
        </div>
        {linkNote && <p className="mt-1 text-[11px] opacity-70">{linkNote}</p>}
      </div>

      {hasCoords && (
        <p className="mt-1 text-[11px] opacity-70">
          Đã chọn: {(value!.lat as number).toFixed(5)}, {(value!.lng as number).toFixed(5)} ·{" "}
          <a href={value!.mapUrl} target="_blank" rel="noreferrer" style={{ color: "#0068FF" }}>
            mở Google Maps
          </a>
        </p>
      )}
      {value && !hasCoords && (
        <p className="mt-1 text-[11px] opacity-70">
          Đã lưu link ·{" "}
          <a href={value.mapUrl} target="_blank" rel="noreferrer" style={{ color: "#0068FF" }}>
            mở Google Maps
          </a>
        </p>
      )}
    </div>
  );
}
