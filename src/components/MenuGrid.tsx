"use client";

import { useState } from "react";
import Image from "next/image";
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

// 1 hàng / trang (2 món ngang) — đảm bảo luôn vừa chiều cao cố định của section,
// không phụ thuộc vào việc co giãn nội dung theo chiều dọc.
const PAGE_SIZE = 2;

export default function MenuGrid({ items }: { items: MenuItem[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function goTo(i: number) {
    setPage(((i % pageCount) + pageCount) % pageCount);
  }

  return (
    <div className="flex h-full flex-col justify-center">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {current.map((item, idx) => (
          <div
            key={item.id}
            className="group flex flex-col overflow-hidden rounded-[20px] border border-latte-700 bg-latte-800/60 transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-500/40 hover:shadow-neon-orange-sm"
          >
            <div className="relative h-36 w-full shrink-0 overflow-hidden sm:h-40">
              {item.imageId ? (
                <Image
                  src={imageUrl(item.imageId)!}
                  alt={item.name}
                  fill
                  sizes="(min-width: 640px) 22vw, 90vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
                  <DrinkArt variant={getDrinkArtVariant(item.code, page * PAGE_SIZE + idx + 1)} />
                </div>
              )}
            </div>
            <div className="flex flex-col p-5 sm:p-6">
              <h4 className="font-display text-base font-bold text-latte-100">{item.name}</h4>
              <p className="mt-1.5 mb-4 line-clamp-2 text-sm leading-relaxed text-latte-200/75">{item.description}</p>
              <span className="font-mono text-sm font-bold text-orange-400">{formatVnd(item.priceVnd)}</span>
            </div>
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="mt-5 flex shrink-0 items-center justify-between">
          <div className="flex gap-2">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                aria-label={`Trang ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === page ? "w-6 bg-orange-500" : "w-1.5 bg-latte-600 hover:bg-latte-500"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.65rem] text-latte-400">
              {page + 1}/{pageCount}
            </span>
            <button
              aria-label="Trang trước"
              onClick={() => goTo(page - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-latte-700 text-latte-200 transition-colors hover:border-orange-400/60 hover:text-orange-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              aria-label="Trang sau"
              onClick={() => goTo(page + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-latte-700 text-latte-200 transition-colors hover:border-orange-400/60 hover:text-orange-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
