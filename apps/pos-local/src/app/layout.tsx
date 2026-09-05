import type { Metadata } from "next";
import { Be_Vietnam_Pro, Manrope, Space_Mono } from "next/font/google";
import "./globals.css";

const display = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "700", "800", "900"],
  variable: "--ff-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--ff-body",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--ff-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CBD AI Cafe — Đặt món",
  description: "Đặt món cùng CBD Robot tại CBD AI Cafe.",
  icons: { icon: "/logo.webp" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body suppressHydrationWarning className="font-body bg-latte-900 text-latte-100 bg-latte-radial bg-grain antialiased">
        {children}
      </body>
    </html>
  );
}
