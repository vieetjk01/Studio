import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Vieetjk — Photo collection for customers",
  description: "Vieetjk photo collection for customers — minimalist photo selection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
