import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CBD AI Cafe — Đà Lạt",
  description: "Đặt món, dự đoán nghề nghiệp và khám phá Đà Lạt cùng CBD Robot.",
};

const CARDS = [
  {
    href: "/order",
    icon: "☕",
    title: "Đặt món",
    description: "Trò chuyện cùng CBD Robot để gọi món, nhận gợi ý phù hợp với bạn.",
  },
  {
    href: "/career-prediction",
    icon: "🔮",
    title: "Dự đoán nghề nghiệp",
    description: "Trả lời vài câu hỏi vui, nhận ảnh check-in cùng nghề nghiệp AI dự đoán cho bạn.",
  },
  {
    href: null,
    icon: "🏔️",
    title: "Vi vu Đà Lạt",
    description: "Gợi ý lịch trình khám phá Đà Lạt quanh quán — sắp ra mắt.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="CBD AI Cafe" width={72} height={72} className="rounded-2xl" />
        <div>
          <h1 className="font-display text-2xl font-black text-latte-100">CBD AI Cafe</h1>
          <p className="mt-1 text-sm text-latte-200/70">Chọn một trải nghiệm bên dưới để bắt đầu.</p>
        </div>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {CARDS.map((card) =>
          card.href ? (
            <Link
              key={card.title}
              href={card.href}
              className="group flex flex-col gap-3 rounded-2xl border border-latte-700 bg-latte-800/40 p-6 shadow-card transition-all hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-neon-orange"
            >
              <span className="text-4xl">{card.icon}</span>
              <h2 className="font-display text-lg font-bold text-latte-100 group-hover:text-orange-300">
                {card.title}
              </h2>
              <p className="text-sm leading-relaxed text-latte-200/70">{card.description}</p>
            </Link>
          ) : (
            <div
              key={card.title}
              className="relative flex flex-col gap-3 rounded-2xl border border-latte-700/60 bg-latte-800/20 p-6 opacity-60"
            >
              <span className="absolute right-4 top-4 rounded-full bg-latte-700/80 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-latte-200/80">
                Sắp ra mắt
              </span>
              <span className="text-4xl grayscale">{card.icon}</span>
              <h2 className="font-display text-lg font-bold text-latte-100">{card.title}</h2>
              <p className="text-sm leading-relaxed text-latte-200/70">{card.description}</p>
            </div>
          )
        )}
      </div>

      <Link href="/ops" className="text-xs text-latte-400/70 hover:text-latte-200">
        Dành cho nhân viên quán →
      </Link>
    </div>
  );
}
