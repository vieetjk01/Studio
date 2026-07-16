import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Hanken_Grotesk, Cormorant_Garamond, Manrope, Dancing_Script, Great_Vibes } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { ThemeProvider, THEME_BOOT_SCRIPT } from "@/lib/theme";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBrandForHost } from "@/lib/host-brand";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

// Font UI chính (mọi trang) → preload để tránh nháy chữ.
const hanken = Hanken_Grotesk({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

// Các font dưới đây CHỈ dùng ở một số trang (landing / thiệp cưới / love story)
// → preload:false để KHÔNG tải phông trên mọi trang (nhanh hơn); vẫn tự nạp khi
// trang tương ứng dùng tới biến CSS của font.
const manrope = Manrope({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
});

// Script font for wedding-invitation templates (cinematic/story couple names).
const dancing = Dancing_Script({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  variable: "--font-script",
  display: "swap",
  preload: false,
});

// Handwriting font riêng cho TÊN KHÁCH MỜI (bì thư, phần lời mời, love story).
const greatVibes = Great_Vibes({
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  variable: "--font-hand",
  display: "swap",
  preload: false,
});

const DEFAULT_TITLE = "mstudo — Phần mềm quản lý studio ảnh";
const DEFAULT_DESCRIPTION =
  "mstudo · Phần mềm quản lý studio ảnh: hợp đồng, báo giá, đặt lịch, lịch chụp, đội ngũ & tài chính trong một nơi.";

// Browser-tab title / description / favicon are admin-editable (Cài đặt → Trình
// duyệt). Falls back to the defaults if Supabase isn't reachable or unset.
export async function generateMetadata(): Promise<Metadata> {
  // On a studio's own domain/subdomain, white-label the tab: the studio's logo
  // becomes the favicon and its brand name the title — never the mstudo mark.
  const brand = await getBrandForHost(headers().get("host"));
  if (brand) {
    const icon = brand.logoUrl || "/favicon.svg";
    return {
      title: brand.name,
      description: brand.name,
      appleWebApp: { capable: true, title: brand.name, statusBarStyle: "black-translucent" },
      icons: { icon, shortcut: icon, apple: icon },
    };
  }

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let favicon: string | null = null;
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("site_settings")
      .select("site_title, site_description, favicon_url")
      .eq("id", 1)
      .maybeSingle();
    if (data?.site_title) title = data.site_title;
    if (data?.site_description) description = data.site_description;
    if (data?.favicon_url) favicon = data.favicon_url;
  } catch {
    /* keep defaults */
  }
  return {
    title,
    description,
    appleWebApp: { capable: true, title: "mstudo", statusBarStyle: "black-translucent" },
    icons: favicon
      ? { icon: favicon, shortcut: favicon, apple: favicon }
      : { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/logo-mark.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#f7f6f3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" data-theme="light" className={`${hanken.variable} ${cormorant.variable} ${manrope.variable} ${dancing.variable} ${greatVibes.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <LangProvider>{children}</LangProvider>
        </ThemeProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
