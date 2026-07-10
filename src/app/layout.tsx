import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Hanken_Grotesk, Cormorant_Garamond, Manrope, Dancing_Script, Great_Vibes } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { ThemeProvider, THEME_BOOT_SCRIPT } from "@/lib/theme";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBrandForHost } from "@/lib/host-brand";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

const hanken = Hanken_Grotesk({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hanken",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

// Marketing landing page font (mstudo.com homepage).
const manrope = Manrope({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

// Script font for wedding-invitation templates (cinematic/story couple names).
const dancing = Dancing_Script({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  variable: "--font-script",
});

// Handwriting font riêng cho TÊN KHÁCH MỜI (bì thư, phần lời mời, love story).
const greatVibes = Great_Vibes({
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  variable: "--font-hand",
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
