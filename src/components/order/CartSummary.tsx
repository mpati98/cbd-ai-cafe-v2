"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/format";
import { CartLine } from "@/components/order/OrderExperience";

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function CartSummary({
  cart,
  tableCode,
  onChangeQty,
  onRemove,
  onOrderPlaced,
}: {
  cart: CartLine[];
  tableCode?: string;
  onChangeQty: (itemId: string, qty: number) => void;
  onRemove: (itemId: string) => void;
  onOrderPlaced: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const totalQty = cart.reduce((acc, l) => acc + l.qty, 0);
  const totalPrice = cart.reduce((acc, l) => acc + l.qty * l.priceVnd, 0);

  async function handleSubmit() {
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim() || undefined,
          customerNote: note.trim() || undefined,
          tableCode: tableCode || undefined,
          items: cart.map((l) => ({ menuItemId: l.itemId, quantity: l.qty })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error ?? `Lỗi HTTP ${res.status}`);
      }
      setPlacedOrderId(json.data.id as string);
      setState("success");
      onOrderPlaced();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đặt món thất bại, thử lại nhé.");
      setState("error");
    }
  }

  function startNewOrder() {
    setState("idle");
    setPlacedOrderId(null);
    setName("");
    setNote("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Giỏ hàng"
        className="fixed right-5 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 px-3.5 py-3.5 font-bold text-latte-950 shadow-neon-orange transition-transform hover:scale-105"
      >
        <span className="relative text-xl leading-none">
          🛒
          {totalQty > 0 && (
            <span className="absolute -right-2.5 -top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-latte-950 px-1 text-[0.65rem] text-orange-300">
              {totalQty}
            </span>
          )}
        </span>
        <span className="text-[0.6rem] leading-none">Giỏ hàng</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/60 sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-latte-700 bg-latte-900 p-6 shadow-card sm:max-w-sm sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-latte-100">Giỏ hàng của bạn</h3>
              <button onClick={() => setOpen(false)} className="text-latte-400 hover:text-latte-100">
                ✕
              </button>
            </div>

            {state === "success" ? (
              <div className="py-6 text-center">
                <div className="mb-3 text-4xl">🎉</div>
                <p className="font-display text-lg font-bold text-latte-100">Đã gửi đơn thành công!</p>
                <p className="mt-1 text-sm text-latte-200/75">
                  Mã đơn: <span className="font-mono text-orange-400">{placedOrderId?.slice(-8)}</span>
                </p>
                <p className="mt-2 text-xs text-latte-400">CBD Robot đã nhận đơn và sẽ pha chế ngay cho bạn.</p>
                <button
                  onClick={startNewOrder}
                  className="mt-5 rounded-lg border border-latte-700 px-4 py-2 text-sm font-semibold text-latte-200 hover:bg-latte-800"
                >
                  Đặt đơn mới
                </button>
              </div>
            ) : cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-latte-400">Giỏ hàng đang trống — hãy chọn vài món nhé!</p>
            ) : (
              <div className="space-y-3">
                {cart.map((line) => (
                  <div key={line.itemId} className="flex items-center gap-3 rounded-xl border border-latte-700 bg-latte-800/50 p-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-latte-100">{line.name}</p>
                      <p className="font-mono text-xs text-orange-400">{formatVnd(line.priceVnd)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onChangeQty(line.itemId, line.qty - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-latte-600 text-latte-200 hover:bg-latte-700"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm text-latte-100">{line.qty}</span>
                      <button
                        onClick={() => onChangeQty(line.itemId, line.qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-latte-600 text-latte-200 hover:bg-latte-700"
                      >
                        +
                      </button>
                    </div>
                    <button onClick={() => onRemove(line.itemId)} className="text-latte-400 hover:text-orange-300" aria-label="Xoá">
                      ✕
                    </button>
                  </div>
                ))}

                <div className="mt-4 flex items-center justify-between border-t border-latte-700 pt-4">
                  <span className="text-sm font-semibold text-latte-200">Tổng cộng</span>
                  <span className="font-display text-lg font-bold text-orange-400">{formatVnd(totalPrice)}</span>
                </div>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tên của bạn (không bắt buộc)"
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60"
                />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú (vd: ít đá, mang đi...)"
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60"
                />

                {error && <p className="text-sm text-orange-300">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={state === "submitting"}
                  className="mt-1 w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 py-2.5 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {state === "submitting" ? "Đang gửi đơn..." : "Tiến hành đặt món"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
