"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapPin, Crosshair, Loader2 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type LatLng = { lat: number; lng: number } | null;

/** Link Google Maps từ toạ độ (gửi về studio để mở chỉ đường). */
export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * Chọn vị trí trên bản đồ (Leaflet + OpenStreetMap — miễn phí, không cần API key).
 * Bấm vào bản đồ để đặt ghim, hoặc "Vị trí hiện tại" (GPS). Trả về {lat,lng}.
 */
export default function LocationPicker({
  value,
  onChange,
}: {
  value: LatLng;
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const placeRef = useRef<(lat: number, lng: number) => void>(() => {});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod: any = await import("leaflet");
      const L = mod.default ?? mod;
      if (cancelled || !mapEl.current || mapRef.current) return;
      const start = value ?? { lat: 10.7769, lng: 106.7009 }; // mặc định: TP.HCM
      const map = L.map(mapEl.current).setView([start.lat, start.lng], value ? 16 : 12);
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
        onChangeRef.current({ lat, lng });
      };
      placeRef.current = place;
      if (value) place(value.lat, value.lng);
      map.on("click", (e: any) => place(e.latlng.lat, e.latlng.lng));
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
        mapRef.current?.setView([latitude, longitude], 16);
        placeRef.current(latitude, longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

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
      {value && (
        <p className="mt-1 text-[11px] opacity-70">
          Đã chọn: {value.lat.toFixed(5)}, {value.lng.toFixed(5)} ·{" "}
          <a href={mapsLink(value.lat, value.lng)} target="_blank" rel="noreferrer" style={{ color: "#0068FF" }}>
            mở Google Maps
          </a>
        </p>
      )}
    </div>
  );
}
