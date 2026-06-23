/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Tree-shake per-icon imports so navigating studio pages ships less JS.
    optimizePackageImports: ["lucide-react"],
    // Next 14.2 defaults dynamic route Router-Cache reuse to 0s, so going back
    // to a page just visited refetches the whole thing from the server. Reuse
    // dynamic segments for 30s (instant back/forward) and prefetched static
    // shells for 3 min, while still revalidating reasonably often.
    staleTimes: { dynamic: 30, static: 180 },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        // Allow the Google Identity Services / Picker popup to work: a stricter
        // COOP severs the opener↔popup link and breaks window.closed polling
        // (Google then reports "popup_closed"). This value keeps popup access.
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
