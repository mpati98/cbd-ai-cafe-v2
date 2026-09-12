"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/order", label: "☕ Đặt món" },
  { href: "/career-prediction", label: "🔮 Dự đoán nghề nghiệp" },
  { href: "/travel", label: "🏔️ Vi vu Đà Lạt" },
] as const;

/** Thanh điều hướng dùng chung cho các trang khách (career-prediction, và có
 * thể tái dùng cho các trang tương lai như "Vi vu Đà Lạt") - KHÔNG dùng ở
 * /order vì OrderExperience đã có header riêng (logo + trạng thái bàn). */
export default function CustomerNav() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between gap-2 border-b border-latte-800 px-4 py-3 sm:px-6">
      <Link href="/" aria-label="Về trang chủ" className="flex shrink-0 items-center gap-1.5 text-latte-300/80 hover:text-latte-100">
        <span aria-hidden>←</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="" width={26} height={26} className="rounded-lg" />
      </Link>

      <nav className="flex flex-1 justify-end gap-1.5 overflow-x-auto">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              pathname === l.href
                ? "bg-orange-500/20 text-orange-300"
                : "text-latte-300/80 hover:bg-latte-800 hover:text-latte-100"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
