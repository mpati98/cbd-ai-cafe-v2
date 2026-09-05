"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import OrderMenu, { OrderMenuItem } from "@/components/order/OrderMenu";
import ChatPanel from "@/components/order/ChatPanel";
import MobileChatDock from "@/components/order/MobileChatDock";
import CartSummary from "@/components/order/CartSummary";
import DrinkQuiz from "@/components/order/DrinkQuiz";

export type CartLine = { itemId: string; name: string; priceVnd: number; qty: number };
export type TableContext = { code: string; label: string };

const CART_STORAGE_KEY = "cbd_cart_v1";

export default function OrderExperience({
  items,
  table = null,
}: {
  items: (OrderMenuItem & { tags: string[] })[];
  table?: TableContext | null;
}) {
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);

  // Đọc giỏ hàng đã lưu (nếu có) sau khi mount, tránh lệch hydration với SSR.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart, hydrated]);

  function addToCart(itemId: string, quantity = 1) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === itemId);
      if (existing) {
        return prev.map((l) => (l.itemId === itemId ? { ...l, qty: l.qty + quantity } : l));
      }
      return [...prev, { itemId, name: item.name, priceVnd: item.priceVnd, qty: quantity }];
    });
  }

  function changeQty(itemId: string, qty: number) {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((l) => l.itemId !== itemId);
      return prev.map((l) => (l.itemId === itemId ? { ...l, qty } : l));
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  const cartQtyByItemId: Record<string, number> = Object.fromEntries(cart.map((l) => [l.itemId, l.qty]));

  return (
    <div className="flex min-h-screen flex-col bg-latte-950 lg:h-screen lg:overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-latte-800 px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.webp" alt="CBD AI Cafe" width={32} height={32} className="rounded-[8px]" />
          <span className="font-display text-sm font-black text-latte-100">CBD AI CAFE</span>
        </Link>
        {table ? (
          <span className="flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1.5 font-mono text-[0.65rem] font-bold uppercase tracking-wide text-orange-300">
            🪑 Đang đặt cho: {table.label}
          </span>
        ) : (
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-orange-400">Đặt món cùng CBD Robot</span>
        )}
      </header>

      <div className="flex flex-1 flex-col overflow-hidden lg:min-h-0 lg:flex-row">
        <main className="flex-1 overflow-y-auto p-5 pb-28 sm:p-8 sm:pb-28 lg:w-2/3 lg:pb-8">
          <button
            onClick={() => setQuizOpen(true)}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300 transition-colors hover:bg-orange-500/20"
          >
            Chưa biết uống gì? Để CBD Robot gợi ý
          </button>
          <OrderMenu
            items={items}
            highlightedItemId={highlightedItemId}
            cartQtyByItemId={cartQtyByItemId}
            onAddToCart={addToCart}
          />
        </main>

        {/* Desktop/tablet: chat cố định bên cạnh. Mobile: ẩn hẳn, thay bằng MobileChatDock (nút nổi + bottom sheet) bên dưới. */}
        <aside className="hidden lg:flex lg:h-full lg:w-1/3 lg:shrink-0 lg:flex-col lg:overflow-hidden lg:border-l lg:border-latte-800">
          <ChatPanel
            items={items}
            tableLabel={table?.label ?? null}
            tableCode={table?.code ?? null}
            onHighlight={setHighlightedItemId}
            onAddToCart={addToCart}
          />
        </aside>
      </div>

      <MobileChatDock
        items={items}
        tableLabel={table?.label ?? null}
        tableCode={table?.code ?? null}
        highlightedItemId={highlightedItemId}
        onHighlight={setHighlightedItemId}
        onAddToCart={addToCart}
      />

      <DrinkQuiz
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        onAddToCart={addToCart}
        items={items}
        tableCode={table?.code ?? null}
      />

      <CartSummary
        cart={cart}
        tableCode={table?.code}
        onChangeQty={changeQty}
        onRemove={removeFromCart}
        onOrderPlaced={() => setCart([])}
      />
    </div>
  );
}
