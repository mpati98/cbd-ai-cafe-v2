import Image from "next/image";
import Reveal from "@/components/Reveal";
import MenuGrid from "@/components/MenuGrid";
import { formatVnd } from "@/lib/format";
import { imageUrl } from "@/lib/media";
import DrinkArt from "@/components/DrinkArt";
import { getDrinkArtVariant } from "@/lib/drink-art";

type MenuItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceVnd: number;
  isBestSeller: boolean;
  imageId?: string | null;
};

export default function Menu({ items }: { items: MenuItem[] }) {
  const best = items.find((i) => i.isBestSeller) ?? items[0];
  const rest = items.filter((i) => i.id !== best.id);

  return (
    <section
      id="menu"
      className="snap-section relative bg-latte-900 px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100vh-80px)] lg:min-h-[640px] lg:flex-col lg:py-10"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:min-h-0">
        <Reveal className="mb-8 max-w-xl shrink-0 lg:mb-6">
          <span className="eyebrow mb-3 text-orange-400">Thực đơn</span>
          <h2 className="font-display text-3xl font-extrabold leading-tight text-latte-100 sm:text-4xl">
            Đồ uống được CBD Robot pha chế mỗi ngày
          </h2>
          <p className="mt-3 text-latte-200/90">
            Mỗi món trong thực đơn đều bắt đầu từ một câu chuyện — về cao nguyên, về sương sớm, hoặc về
            vài dòng dữ liệu mà CBD Robot học được từ chính bạn.
          </p>
        </Reveal>

        <div className="grid flex-1 gap-6 lg:min-h-0 lg:grid-cols-[1.05fr_1.4fr] lg:grid-rows-[1fr]">
          <Reveal className="relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[26px] border border-orange-500/20 bg-gradient-to-br from-navy-800 via-latte-950 to-latte-950 p-7 shadow-card lg:h-full lg:min-h-0">
            <span className="absolute left-6 top-6 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 px-3.5 py-2 font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-latte-950 shadow-neon-orange animate-pulse-glow">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M12 2l2.9 6.26L21 9.27l-4.5 4.39L17.8 21 12 17.77 6.2 21l1.3-7.34L3 9.27l6.1-1.01z" />
              </svg>
              Best seller
            </span>

            {best.imageId ? (
              <>
                <Image
                  src={imageUrl(best.imageId)!}
                  alt={best.name}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover opacity-80"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(0deg, #0F1936 0%, rgba(15,25,54,0.85) 38%, rgba(15,25,54,0.25) 70%, rgba(15,25,54,0.1) 100%)",
                  }}
                />
              </>
            ) : (
              <>
                <div className="absolute inset-0">
                  <DrinkArt variant={getDrinkArtVariant(best.code, 0)} />
                </div>
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(0deg, #0F1936 0%, rgba(15,25,54,0.9) 35%, rgba(15,25,54,0.35) 70%, rgba(15,25,54,0.15) 100%)",
                  }}
                />
              </>
            )}

            <div className="relative z-10">
              <h3 className="font-display text-2xl font-extrabold text-latte-100 sm:text-3xl">{best.name}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-latte-200/80 line-clamp-2 lg:line-clamp-3">
                {best.description}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-latte-100/10 pt-4 lg:mt-6 lg:pt-5">
                <b className="font-display text-2xl text-orange-400 text-shadow-neon">{formatVnd(best.priceVnd)}</b>
                <span className="font-mono text-[0.65rem] tracking-[0.1em] text-latte-400">MÃ MÓN: {best.code}</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80} className="lg:h-full lg:min-h-0">
            <MenuGrid items={rest} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
