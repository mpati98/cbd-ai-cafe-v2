"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMenuItem, ChatState, handleUserInput, initialChatState } from "@/lib/chatbot";

function renderBoldText(text: string) {
  // Hỗ trợ **in đậm** đơn giản trong tin nhắn bot, không cần thư viện markdown.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
  );
}

export default function ChatPanel({
  items,
  onHighlight,
  onAddToCart,
}: {
  items: ChatMenuItem[];
  onHighlight: (itemId: string | null) => void;
  onAddToCart: (itemId: string) => void;
}) {
  const [state, setState] = useState<ChatState>(() => initialChatState());
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state.messages]);

  useEffect(() => {
    onHighlight(state.highlightedItemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.highlightedItemId]);

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = handleUserInput(state, trimmed, items);
    if (next.pendingEffect?.type === "add_to_cart") {
      onAddToCart(next.pendingEffect.itemId);
    }
    setState({ ...next, pendingEffect: null });
    setInputValue("");
  }

  const inputDisabled = state.step === "closed" && state.quickReplies.some((r) => r.value === "restart");

  return (
    <div className="flex h-full flex-col bg-latte-900">
      <div className="flex items-center gap-2.5 border-b border-latte-800 px-4 py-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-sm shadow-neon-orange-sm">
          🤖
        </span>
        <div className="leading-none">
          <b className="font-display text-sm font-bold text-latte-100">CBD Robot</b>
          <span className="mt-0.5 flex items-center gap-1 text-[0.65rem] text-latte-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Đang tư vấn
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {state.messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.from === "user"
                  ? "rounded-br-sm bg-gradient-to-br from-orange-500 to-orange-600 text-latte-950"
                  : "rounded-bl-sm bg-latte-800 text-latte-100"
              }`}
            >
              {renderBoldText(m.text)}
            </div>
          </div>
        ))}

        {state.quickReplies.length > 0 && (
          <div className="flex flex-wrap justify-start gap-2 pt-1">
            {state.quickReplies.map((r) => (
              <button
                key={r.value}
                onClick={() => submit(r.value)}
                className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3.5 py-1.5 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-500/20"
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(inputValue);
        }}
        className="flex items-center gap-2 border-t border-latte-800 p-3"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={inputDisabled ? "Bấm \"Bắt đầu lại\" ở trên nhé" : "Nhập tin nhắn..."}
          className="flex-1 rounded-full border border-latte-700 bg-latte-800 px-4 py-2 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          aria-label="Gửi"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-latte-950 shadow-neon-orange-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </div>
  );
}
