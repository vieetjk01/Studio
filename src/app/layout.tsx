import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";

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

const DEFAULT_TITLE = "mstudo — Phần mềm quản lý studio ảnh";
const DEFAULT_DESCRIPTION =
  "mstudo · Phần mềm quản lý studio ảnh: hợp đồng, báo giá, đặt lịch, lịch chụp, đội ngũ & tài chính trong một nơi.";

// Browser-tab title / description / favicon are admin-editable (Cài đặt → Trình
// duyệt). Falls back to the defaults if Supabase isn't reachable or unset.
export async function generateMetadata(): Promise<Metadata> {
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
      : { apple: "/logo-mark.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0b0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${hanken.variable} ${cormorant.variable} ${manrope.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
