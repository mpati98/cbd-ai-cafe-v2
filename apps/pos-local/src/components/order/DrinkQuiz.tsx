"use client";

import { useEffect, useRef, useState } from "react";
import { formatVnd } from "@cbd/shared-types";
import VoiceMicButton from "@/components/VoiceMicButton";
import type { QuizRecommendation, QuizResponseBody, QuizTurn } from "@/types/order-quiz";

type QuizMessage = { id: string; from: "bot" | "user"; text: string };

const OPENING = "Chào bạn! Trả lời vài câu ngắn để mình gợi ý đúng gu bạn nhé.";

let msgCounter = 0;
function nextId(): string {
  msgCounter += 1;
  return `quiz_${Date.now()}_${msgCounter}`;
}

/**
 * "Chưa biết uống gì? Để CBD Robot gợi ý" — mini-quiz hỏi 3-5 câu ngắn rồi
 * chốt 2-4 món phù hợp nhất (xem lib/order-quiz.ts). Tách riêng khỏi
 * ChatPanel vì đây là luồng RIÊNG, khách bấm mới vào, không ép mọi đơn phải
 * qua đây — đóng modal là mất hết lịch sử (không lưu DB, xem type order-quiz.ts).
 */
export default function DrinkQuiz({
  open,
  onClose,
  onAddToCart,
  items,
  tableCode,
}: {
  open: boolean;
  onClose: () => void;
  onAddToCart: (itemId: string, quantity?: number) => void;
  items: { id: string; name: string }[];
  /** Mã QR bàn (nếu có) — dùng để scope quota AI theo bàn, xem lib/table-session.ts. */
  tableCode?: string | null;
}) {
  const [messages, setMessages] = useState<QuizMessage[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [recommendations, setRecommendations] = useState<QuizRecommendation[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mỗi lần mở lại quiz là 1 phiên mới — không giữ lại lịch sử lần trước.
  useEffect(() => {
    if (open) {
      setMessages([{ id: "opening", from: "bot", text: OPENING }]);
      setChips([]);
      setInputValue("");
      setSending(false);
      setRecommendations([]);
      setAddedIds(new Set());
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, recommendations]);

  function toHistory(msgs: QuizMessage[]): QuizTurn[] {
    return msgs
      .filter((m) => m.id !== "opening")
      .slice(-12)
      .map((m) => ({ role: m.from === "bot" ? "assistant" : "user", text: m.text }));
  }

  async function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || sending) return;

    const history = toHistory(messages);
    setMessages((prev) => [...prev, { id: nextId(), from: "user", text: trimmed }]);
    setInputValue("");
    setChips([]);
    setSending(true);

    try {
      const res = await fetch("/api/order-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, message: trimmed, tableCode: tableCode ?? null }),
      });
      const data = (await res.json().catch(() => null)) as (QuizResponseBody & { error?: string }) | null;

      if (!res.ok || !data) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), from: "bot", text: data?.error ?? "Mình đang gặp chút trục trặc, bạn thử lại sau ít giây nhé." },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { id: nextId(), from: "bot", text: data.message }]);
      if (data.isComplete) {
        setRecommendations(data.recommendations);
        setChips([]);
      } else {
        setChips(data.suggestedChips);
      }
    } catch {
      setMessages((prev) => [...prev, { id: nextId(), from: "bot", text: "Mình không kết nối được, bạn kiểm tra mạng rồi thử lại nhé." }]);
    } finally {
      setSending(false);
    }
  }

  function handleAdd(rec: QuizRecommendation) {
    onAddToCart(rec.itemId);
    setAddedIds((prev) => new Set(prev).add(rec.itemId));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 sm:items-center sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-latte-700 bg-latte-900 shadow-card sm:h-[80vh] sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-latte-800 px-4 py-3.5">
          <div className="leading-none">
            <b className="font-display text-sm font-bold text-latte-100">Gợi ý đồ uống</b>
            <p className="mt-0.5 text-[0.65rem] text-latte-400">CBD Robot hỏi vài câu để chọn đúng gu bạn</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-latte-700 text-latte-400 hover:border-latte-500 hover:text-latte-100"
          >
            ✕
          </button>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.from === "user"
                    ? "rounded-br-sm bg-gradient-to-br from-orange-500 to-orange-600 text-latte-950"
                    : "rounded-bl-sm bg-latte-800 text-latte-100"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-latte-800 px-3.5 py-2.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-latte-400"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {!sending && chips.length > 0 && (
            <div className="flex flex-wrap justify-start gap-2 pt-1">
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => submit(c)}
                  className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3.5 py-1.5 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-500/20"
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="space-y-2.5 pt-2">
              {recommendations.map((rec, idx) => (
                <div
                  key={rec.itemId}
                  className={`rounded-xl border p-3.5 ${
                    idx === 0 ? "border-orange-500 bg-orange-500/10 shadow-neon-orange-sm" : "border-latte-700 bg-latte-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {idx === 0 && (
                      <span className="rounded-full bg-gradient-to-br from-orange-500 to-orange-600 px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wide text-latte-950">
                        Hợp nhất
                      </span>
                    )}
                    <b className="truncate text-sm font-bold text-latte-100">{rec.name}</b>
                  </div>
                  <p className="mt-1 text-xs text-latte-200/75">{rec.reason}</p>
                  <button
                    onClick={() => handleAdd(rec)}
                    disabled={addedIds.has(rec.itemId)}
                    className="mt-2.5 w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 py-2 text-xs font-bold text-latte-950 shadow-neon-orange-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addedIds.has(rec.itemId) ? "Đã thêm vào giỏ" : "Thêm vào giỏ"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {recommendations.length === 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(inputValue);
            }}
            className="flex shrink-0 items-center gap-2 border-t border-latte-800 p-3"
          >
            <VoiceMicButton
              onTranscript={(text) => {
                setInputValue(text);
                inputRef.current?.focus();
              }}
              hintPhrases={items.map((i) => i.name)}
              tableCode={tableCode}
            />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={sending}
              placeholder="Nhập câu trả lời..."
              className="flex-1 rounded-full border border-latte-700 bg-latte-800 px-4 py-2 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || sending}
              aria-label="Gửi"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-latte-950 shadow-neon-orange-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
