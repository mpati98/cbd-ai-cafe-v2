"use client";

import { useEffect, useRef, useState } from "react";
import { markLocationVisited, isLocationVisited } from "@/lib/travel-passport";
import type { TravelPeriod, TravelQuizResponseBody, TravelQuizTurn, TravelRecommendation } from "@/types/travel-quiz";

type ChatMessage = { id: string; from: "bot" | "user"; text: string };

const OPENING = "Chào bạn! Bạn muốn khám phá Đà Lạt theo hướng nào: thiên nhiên, check-in, ẩm thực, hay yên tĩnh?";
const PERIOD_LABEL: Record<TravelPeriod, string> = { "sáng": "Buổi sáng", "chiều": "Buổi chiều", "tối": "Buổi tối" };
const PERIOD_ORDER: TravelPeriod[] = ["sáng", "chiều", "tối"];

let msgCounter = 0;
function nextId(): string {
  msgCounter += 1;
  return `travel_${Date.now()}_${msgCounter}`;
}

/** "Vi vu Đà Lạt" — hội thoại 3-5 câu rồi chốt lịch trình gợi ý theo buổi
 * (xem lib/travel-quiz.ts). Không lưu DB — đóng trang/tải lại là mất lịch sử. */
export default function TravelQuiz({ onItineraryReady }: { onItineraryReady?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "opening", from: "bot", text: OPENING }]);
  const [chips, setChips] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [itinerary, setItinerary] = useState<TravelRecommendation[]>([]);
  const [visitedVersion, setVisitedVersion] = useState(0); // bump để re-render nút "Đã ghé"
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, itinerary]);

  function toHistory(msgs: ChatMessage[]): TravelQuizTurn[] {
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
      const res = await fetch("/api/travel-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, message: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as (TravelQuizResponseBody & { error?: string }) | null;

      if (!res.ok || !data) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), from: "bot", text: data?.error ?? "Mình đang gặp chút trục trặc, bạn thử lại sau ít giây nhé." },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { id: nextId(), from: "bot", text: data.message }]);
      if (data.isComplete) {
        setItinerary(data.itinerary);
        setChips([]);
        onItineraryReady?.();
      } else {
        setChips(data.suggestedChips);
      }
    } catch {
      setMessages((prev) => [...prev, { id: nextId(), from: "bot", text: "Mình không kết nối được, bạn kiểm tra mạng rồi thử lại nhé." }]);
    } finally {
      setSending(false);
    }
  }

  function handleMarkVisited(locationId: string) {
    markLocationVisited(locationId);
    setVisitedVersion((v) => v + 1);
  }

  function restart() {
    setMessages([{ id: "opening", from: "bot", text: OPENING }]);
    setChips([]);
    setInputValue("");
    setItinerary([]);
  }

  const groupedItinerary = PERIOD_ORDER.map((period) => ({
    period,
    items: itinerary.filter((r) => r.period === period),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div ref={scrollRef} className="max-h-[60vh] min-h-[200px] space-y-3 overflow-y-auto rounded-2xl border border-latte-700 bg-latte-900/60 p-4">
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
                <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-latte-400" style={{ animationDelay: `${i * 0.12}s` }} />
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
      </div>

      {itinerary.length === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(inputValue);
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={sending}
            placeholder="Nhập câu trả lời..."
            className="flex-1 rounded-full border border-latte-700 bg-latte-800 px-4 py-2.5 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sending}
            aria-label="Gửi"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-latte-950 shadow-neon-orange-sm transition-transform enabled:hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      )}

      {groupedItinerary.length > 0 && (
        <div className="space-y-5">
          {groupedItinerary.map((group) => (
            <div key={group.period}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-300">{PERIOD_LABEL[group.period]}</h3>
              <div className="space-y-2.5">
                {group.items.map((rec) => {
                  const visited = isLocationVisited(rec.locationId);
                  void visitedVersion; // đọc để component re-render khi đổi
                  return (
                    <div key={rec.locationId} className="rounded-xl border border-latte-700 bg-latte-800/50 p-3.5">
                      <b className="text-sm font-bold text-latte-100">{rec.name}</b>
                      <p className="mt-1 text-xs text-latte-200/75">{rec.reason}</p>
                      <button
                        onClick={() => handleMarkVisited(rec.locationId)}
                        disabled={visited}
                        className="mt-2.5 rounded-lg border border-orange-500/40 px-3 py-1.5 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:border-emerald-500/40 disabled:text-emerald-300"
                      >
                        {visited ? "✓ Đã ghé" : "Đánh dấu đã ghé"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            onClick={restart}
            className="w-full rounded-xl border border-white/20 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
          >
            Hỏi lại từ đầu
          </button>
        </div>
      )}
    </div>
  );
}
