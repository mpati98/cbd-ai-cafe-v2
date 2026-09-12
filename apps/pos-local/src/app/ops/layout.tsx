import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CBD AI Cafe — Quầy",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/ops/orders", label: "📦 Đơn hàng" },
  { href: "/ops/tables", label: "🪑 Bàn & QR" },
  { href: "/ops/print-photos", label: "🖨️ Ảnh in" },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-latte-950">
      <header className="flex items-center gap-4 border-b border-latte-800 bg-latte-900/60 px-6 py-4">
        <b className="font-display text-sm font-black text-latte-100">CBD AI CAFE · Quầy</b>
        <nav className="flex gap-2">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-latte-200/80 hover:bg-latte-800 hover:text-latte-100"
            >
              {n.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="p-6 sm:p-8">{children}</main>
    </div>
  );
}
