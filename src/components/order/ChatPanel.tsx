"use client";

import { useEffect, useRef, useState } from "react";
import { isVoiceOutputSupported, speak, stopSpeaking } from "@/lib/speech";
import VoiceMicButton from "@/components/VoiceMicButton";
import type { OrderChatEffect, OrderChatResponseBody, OrderChatTurn } from "@/types/order-chat";

type ChatMessage = { id: string; from: "bot" | "user"; text: string };

let msgCounter = 0;
function nextId(): string {
  msgCounter += 1;
  return `msg_${Date.now()}_${msgCounter}`;
}
function botMessage(text: string): ChatMessage {
  return { id: nextId(), from: "bot", text };
}
function userMessage(text: string): ChatMessage {
  return { id: nextId(), from: "user", text };
}

const GREETING = "Chào bạn! Mình là CBD Robot 🤖☕ Bạn muốn uống gì hôm nay, hay để mình gợi ý nhé?";

const QUICK_ACTIONS: { label: string; message: string }[] = [
  { label: "Gợi ý giúp mình", message: "Gợi ý giúp mình vài món đi" },
  { label: "Món nào bán chạy?", message: "Món nào đang bán chạy nhất vậy?" },
];

function renderBoldText(text: string) {
  // Hỗ trợ **in đậm** đơn giản trong tin nhắn bot, không cần thư viện markdown.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
  );
}

/** Lịch sử gửi kèm request — chỉ cần role + text, giới hạn để tránh phình payload. */
function toHistory(messages: ChatMessage[]): OrderChatTurn[] {
  return messages.slice(-16).map((m) => ({ role: m.from === "bot" ? "assistant" : "user", text: m.text }));
}

export default function ChatPanel({
  items,
  tableLabel,
  onHighlight,
  onAddToCart,
}: {
  items: { id: string; name: string }[];
  tableLabel?: string | null;
  onHighlight: (itemId: string | null) => void;
  onAddToCart: (itemId: string, quantity?: number) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [botMessage(GREETING)]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  // Món vừa được bot highlight ở lượt gần nhất mà CHƯA thêm vào giỏ — hiện nút
  // xác nhận nhanh 1-chạm thay vì bắt khách gõ lại "ừ, lấy món đó" (vd flow
  // trong ảnh chụp màn hình người dùng gửi: hỏi/gợi ý xong không có cách nào
  // thêm ngay, phải gõ tay thêm 1 câu xác nhận).
  const [suggestedItem, setSuggestedItem] = useState<{ id: string; name: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [ttsSupported, setTtsSupported] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const lastSpokenId = useRef<string | null>(null);

  useEffect(() => {
    setTtsSupported(isVoiceOutputSupported());
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Đọc to câu trả lời mới nhất của bot khi bật "đọc to" — chỉ đọc tin nhắn
  // CHƯA đọc (tránh đọc lại khi re-render) và chỉ khi đó là tin nhắn cuối.
  useEffect(() => {
    if (!voiceOutputEnabled) return;
    const last = messages[messages.length - 1];
    if (last && last.from === "bot" && last.id !== lastSpokenId.current) {
      lastSpokenId.current = last.id;
      speak(last.text.replace(/\*\*/g, ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, voiceOutputEnabled]);

  function applyEffects(effects: OrderChatEffect[]) {
    let highlightedId: string | null = null;
    const addedIds = new Set<string>();
    for (const effect of effects) {
      if (effect.type === "highlight") {
        onHighlight(effect.itemId);
        highlightedId = effect.itemId;
      } else if (effect.type === "add_to_cart") {
        onAddToCart(effect.itemId, effect.quantity);
        addedIds.add(effect.itemId);
      }
    }
    // Chỉ đề xuất xác nhận nhanh cho món VỪA highlight mà chưa được thêm luôn
    // trong cùng lượt này (nếu bot đã tự thêm rồi thì không cần hỏi lại).
    const item = highlightedId && !addedIds.has(highlightedId) ? items.find((i) => i.id === highlightedId) : undefined;
    setSuggestedItem(item ? { id: item.id, name: item.name } : null);
  }

  async function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || sending) return;

    const history = toHistory(messages);
    setMessages((prev) => [...prev, userMessage(trimmed)]);
    setInputValue("");
    setSending(true);

    try {
      const res = await fetch("/api/order-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, message: trimmed, tableLabel: tableLabel ?? null }),
      });
      const data = (await res.json().catch(() => null)) as (OrderChatResponseBody & { error?: string }) | null;

      if (!res.ok || !data) {
        setMessages((prev) => [...prev, botMessage(data?.error ?? "Mình đang gặp chút trục trặc, bạn thử lại sau ít giây nhé 🙏")]);
        return;
      }

      setMessages((prev) => [...prev, botMessage(data.reply)]);
      applyEffects(data.effects ?? []);
    } catch {
      setMessages((prev) => [...prev, botMessage("Mình không kết nối được, bạn kiểm tra mạng rồi thử lại nhé 🙏")]);
    } finally {
      setSending(false);
    }
  }

  // Cố tình KHÔNG tự gửi ngay — chỉ điền vào ô nhập để khách xem lại/sửa
  // trước khi gửi. Nhận diện giọng nói dễ sai trong quán ồn, nên luôn cho
  // 1 bước xác nhận thay vì gửi thẳng nội dung có thể nghe nhầm.
  function handleTranscript(text: string) {
    setInputValue(text);
    inputRef.current?.focus();
  }

  function toggleVoiceOutput() {
    setVoiceOutputEnabled((v) => {
      if (v) stopSpeaking();
      return !v;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-latte-900">
      <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-latte-800 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-sm shadow-neon-orange-sm">
            🤖
          </span>
          <div className="leading-none">
            <b className="font-display text-sm font-bold text-latte-100">CBD Robot</b>
            <span className="mt-0.5 flex items-center gap-1 text-[0.65rem] text-latte-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {sending ? "Đang trả lời..." : "Đang tư vấn"}
            </span>
          </div>
        </div>
        {ttsSupported && (
          <button
            onClick={toggleVoiceOutput}
            title={voiceOutputEnabled ? "Tắt đọc to câu trả lời" : "Bật đọc to câu trả lời"}
            aria-label="Đọc to câu trả lời"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition-colors ${
              voiceOutputEnabled
                ? "border-orange-500 bg-orange-500/15 text-orange-300"
                : "border-latte-700 text-latte-400 hover:border-latte-500"
            }`}
          >
            {voiceOutputEnabled ? "🔊" : "🔈"}
          </button>
        )}
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
              {renderBoldText(m.text)}
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

        {!sending && suggestedItem && (
          <div className="flex flex-wrap justify-start gap-2 pt-1">
            <button
              onClick={() => submit(`Ừ, cho mình đặt ${suggestedItem.name} nhé`)}
              className="rounded-full border border-orange-500/60 bg-orange-500/20 px-3.5 py-1.5 text-xs font-semibold text-orange-200 transition-colors hover:bg-orange-500/30"
            >
              ✅ Có, đặt món này
            </button>
            <button
              onClick={() => submit("Không, gợi ý món khác giúp mình")}
              className="rounded-full border border-latte-700 px-3.5 py-1.5 text-xs font-semibold text-latte-300 transition-colors hover:bg-latte-800"
            >
              Xem món khác
            </button>
          </div>
        )}

        {!sending && !suggestedItem && (
          <div className="flex flex-wrap justify-start gap-2 pt-1">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.label}
                onClick={() => submit(qa.message)}
                className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3.5 py-1.5 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-500/20"
              >
                {qa.label}
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
        className="flex shrink-0 items-center gap-2 border-t border-latte-800 p-3"
      >
        <VoiceMicButton
          onTranscript={handleTranscript}
          hintPhrases={items.map((i) => i.name)}
          debugSilence // TODO: bỏ dòng này sau khi xác nhận tự-dừng hoạt động đúng — xem log ở console trình duyệt (F12)
          onStartRecording={() => {
            // Đang đọc dở câu trả lời thì ngắt để ghi âm cho rõ
            if (voiceOutputEnabled) stopSpeaking();
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={sending}
          placeholder="Nhập tin nhắn..."
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
    </div>
  );
}
