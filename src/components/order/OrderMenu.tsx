"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { formatVnd } from "@/lib/format";
import { imageUrl } from "@/lib/media";
import DrinkArt from "@/components/DrinkArt";
import { getDrinkArtVariant } from "@/lib/drink-art";

export type OrderMenuItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceVnd: number;
  isBestSeller: boolean;
  imageId?: string | null;
};

export default function OrderMenu({
  items,
  highlightedItemId,
  cartQtyByItemId,
  onAddToCart,
}: {
  items: OrderMenuItem[];
  highlightedItemId: string | null;
  cartQtyByItemId: Record<string, number>;
  onAddToCart: (itemId: string) => void;
}) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (highlightedItemId && refs.current[highlightedItemId]) {
      refs.current[highlightedItemId]?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  }, [highlightedItemId]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, idx) => {
        const isHighlighted = item.id === highlightedItemId;
        const qty = cartQtyByItemId[item.id] ?? 0;
        return (
          <div
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el;
            }}
            className={`group relative flex flex-col overflow-hidden rounded-[20px] border bg-latte-800/50 transition-all duration-500 ${
              isHighlighted
                ? "scale-[1.04] border-orange-500 shadow-neon-orange ring-1 ring-orange-500/40 sm:col-span-2 sm:row-span-1 xl:col-span-2"
                : "border-latte-700 hover:border-latte-500"
            } ${highlightedItemId && !isHighlighted ? "opacity-60" : "opacity-100"}`}
          >
            {isHighlighted && (
              <span className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 px-3 py-1.5 font-mono text-[0.63rem] font-bold uppercase tracking-wide text-latte-950 shadow-neon-orange-sm animate-pulse-glow">
                ✨ CBD Robot gợi ý
              </span>
            )}
            {item.isBestSeller && !isHighlighted && (
              <span className="absolute left-4 top-4 z-10 rounded-full bg-latte-700/90 px-2.5 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-wide text-orange-300">
                ★ Best seller
              </span>
            )}

            <div className={`relative w-full overflow-hidden ${isHighlighted ? "h-56 sm:h-64" : "h-40"}`}>
              {item.imageId ? (
                <Image
                  src={imageUrl(item.imageId)!}
                  alt={item.name}
                  fill
                  sizes={isHighlighted ? "60vw" : "33vw"}
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full transition-transform duration-700 group-hover:scale-105">
                  <DrinkArt variant={getDrinkArtVariant(item.code, idx)} />
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h3 className={`font-display font-bold text-latte-100 ${isHighlighted ? "text-xl" : "text-base"}`}>
                {item.name}
              </h3>
              <p className={`mt-1.5 flex-1 text-latte-200/75 ${isHighlighted ? "text-sm" : "text-xs"}`}>
                {item.description}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono font-bold text-orange-400">{formatVnd(item.priceVnd)}</span>
                <button
                  onClick={() => onAddToCart(item.id)}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 px-3.5 py-1.5 text-xs font-bold text-latte-950 shadow-neon-orange-sm transition-transform hover:scale-105"
                >
                  {qty > 0 ? `Đã thêm ×${qty}` : "Thêm vào giỏ"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
