import Image from "next/image";

export default function Footer() {
  return (
    <footer id="footer" className="bg-latte-950 pb-7 pt-16 text-latte-200">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-wrap justify-between gap-12 border-b border-latte-100/10 pb-12">
          <div className="max-w-xs">
            <a href="#top" className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[10px] shadow-neon-orange-sm">
                <Image src="/logo.webp" alt="CBD AI Cafe" width={44} height={44} className="rounded-[10px]" />
              </span>
              <span className="flex flex-col leading-none">
                <b className="font-display text-base font-black text-latte-100">CBD AI CAFE</b>
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-orange-400">AI Cafe</span>
              </span>
            </a>
            <p className="text-sm leading-relaxed text-latte-400">
              AI Cafe — kết nối công nghệ, chạm cảm xúc. Cà phê Đà Lạt, kể bằng câu chuyện, pha bằng CBD
              Robot.
            </p>
          </div>

          <div className="flex flex-wrap gap-14">
            <div>
              <h5 className="mb-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-orange-400">
                Khám phá
              </h5>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#story" className="transition-colors hover:text-orange-400">Câu chuyện</a></li>
                <li><a href="#menu" className="transition-colors hover:text-orange-400">Thực đơn</a></li>
                <li><a href="#roadmap" className="transition-colors hover:text-orange-400">Hướng phát triển</a></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-orange-400">
                Liên hệ
              </h5>
              <ul className="space-y-2.5 text-sm">
                <li>12 Đường Trần Phú, P. 3, Đà Lạt</li>
                <li>hello@cbdaicafe.vn</li>
                <li>07:00 – 22:00 mỗi ngày</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 text-xs text-latte-400/70">
          <span>© 2026 CBD AI Cafe. Mọi quyền được bảo lưu.</span>
          <div className="flex gap-2.5">
            {[
              <path key="fb" d="M13.5 22v-8h2.7l.4-3.1h-3.1V9c0-.9.25-1.5 1.6-1.5H17V4.7c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V11H8v3.1h2.5V22h3z" />,
            ].map((p, i) => (
              <a
                key={i}
                href="#"
                aria-label="Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-latte-100/15 text-latte-200 transition-colors hover:border-orange-500 hover:bg-orange-500 hover:text-latte-950"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  {p}
                </svg>
              </a>
            ))}
            <a
              href="#"
              aria-label="Instagram"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-latte-100/15 text-latte-200 transition-colors hover:border-orange-500 hover:bg-orange-500 hover:text-latte-950"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" />
              </svg>
            </a>
            <a
              href="#"
              aria-label="TikTok"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-latte-100/15 text-latte-200 transition-colors hover:border-orange-500 hover:bg-orange-500 hover:text-latte-950"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M14 3c.3 2 1.8 3.5 4 3.7v2.6c-1.4 0-2.8-.4-4-1.2v6.4a5 5 0 11-4-4.9v2.7a2.3 2.3 0 102 2.3V3h2z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
