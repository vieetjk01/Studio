import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mstudo",
    short_name: "mstudo",
    description: "Quản lý studio: hợp đồng, lịch chụp, thanh toán.",
    start_url: "/dashboard/studio",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#1f9d63",
    icons: [
      { src: "/logo-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/logo-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
