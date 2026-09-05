"use client";

import { useState } from "react";
import Image from "next/image";
import { formatVnd } from "@cbd/shared-types";
import { imageUrl } from "@/lib/media";
import ChatPanel from "@/components/order/ChatPanel";
import type { OrderMenuItem } from "@/components/order/OrderMenu";

/**
 * Chat trên mobile/tablet — thay vì chiếm cố định 60dvh phía trên menu (khiến
 * menu chỉ còn rất ít chỗ để cuộn), giờ thu về 1 nút tròn nổi góc dưới phải,
 * bung thành bottom sheet khi bấm. Khi CBD Robot gợi ý 1 món (qua state
 * `highlightedItemId` đã có sẵn ở OrderExperience — dùng để highlight món
 * trên lưới menu) mà sheet đang đóng, hiện 1 bong bóng gợi ý cạnh nút để
 * khách vẫn thấy/thêm được món ngay mà không cần mở lại chat. Chỉ hiển thị
 * dưới breakpoint `lg` — desktop giữ nguyên layout chat cố định bên cạnh.
 */
export default function MobileChatDock({
  items,
  tableLabel,
  tableCode,
  highlightedItemId,
  onHighlight,
  onAddToCart,
}: {
  items: (OrderMenuItem & { tags: string[] })[];
  tableLabel?: string | null;
  /** Mã QR bàn (nếu có) — dùng để scope quota AI theo bàn, xem lib/table-session.ts. */
  tableCode?: string | null;
  highlightedItemId: string | null;
  onHighlight: (itemId: string | null) => void;
  onAddToCart: (itemId: string, quantity?: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const suggested = !open ? items.find((i) => i.id === highlightedItemId) : undefined;

  return (
    <div className="lg:hidden">
      {suggested && (
        <div className="fixed bottom-24 right-5 z-40 w-64 rounded-2xl border border-orange-500/40 bg-latte-900 p-3 shadow-neon-orange-sm">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-mono text-[0.6rem] font-bold uppercase tracking-wide text-orange-400">
              ✨ CBD Robot gợi ý
            </span>
            <button
              onClick={() => onHighlight(null)}
              aria-label="Đóng gợi ý"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-latte-400 hover:text-latte-100"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-latte-800">
              {suggested.imageId ? (
                <Image src={imageUrl(suggested.imageId)!} alt={suggested.name} fill sizes="48px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg">☕</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-latte-100">{suggested.name}</p>
              <p className="font-mono text-xs text-orange-400">{formatVnd(suggested.priceVnd)}</p>
            </div>
          </div>
          <button
            onClick={() => {
              onAddToCart(suggested.id);
              onHighlight(null);
            }}
            className="mt-2.5 w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 py-2 text-xs font-bold text-latte-950 shadow-neon-orange-sm"
          >
            + Thêm vào giỏ
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        aria-label="Chat với CBD Robot"
        className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-2xl shadow-neon-orange transition-transform hover:scale-105"
      >
        💬
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-latte-700 bg-latte-900 shadow-card"
          >
            <ChatPanel
              items={items}
              tableLabel={tableLabel}
              tableCode={tableCode}
              onHighlight={onHighlight}
              onAddToCart={onAddToCart}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
