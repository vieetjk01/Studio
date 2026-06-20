import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vieetjk Studio",
    short_name: "Vieetjk",
    description: "Quản lý studio: hợp đồng, lịch chụp, thanh toán.",
    start_url: "/dashboard/studio",
    display: "standalone",
    background_color: "#0b0b0d",
    theme_color: "#0b0b0d",
    icons: [
      { src: "/logo-mark.png", sizes: "any", type: "image/png", purpose: "any" },
      { src: "/logo-mark.png", sizes: "any", type: "image/png", purpose: "maskable" },
    ],
  };
}
