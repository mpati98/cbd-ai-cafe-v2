"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface QAPair {
  question: string;
  answer: string;
}

interface QuizChatProps {
  /** Tổng số câu hỏi trước khi hoàn tất (5-7 câu là hợp lý) */
  totalQuestions?: number;
  /** Gọi khi đã trả lời đủ số câu, trả về toàn bộ lịch sử hỏi-đáp */
  onComplete: (history: QAPair[]) => void;
}

export default function QuizChat({
  totalQuestions = 6,
  onComplete,
}: QuizChatProps) {
  const [history, setHistory] = useState<QAPair[]>([]);
  const [current, setCurrent] = useState<{ question: string; options: string[] } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedForRef = useRef(-1);

  const fetchNextQuestion = useCallback(async (h: QAPair[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: h }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Có lỗi xảy ra.");
      }
      const data = (await res.json()) as { question: string; options: string[] };
      setCurrent(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Chỉ fetch khi số câu đã trả lời thay đổi và chưa fetch cho mốc này.
    // Trường hợp đã đủ câu hỏi được xử lý trực tiếp trong handleAnswer (có delay xác nhận),
    // không xử lý ở đây nữa để tránh gọi onComplete 2 lần.
    if (fetchedForRef.current === history.length) return;
    fetchedForRef.current = history.length;

    if (history.length >= totalQuestions) return;
    fetchNextQuestion(history);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, totalQuestions]);

  function handleAnswer(option: string) {
    if (!current) return;
    const newHistory = [...history, { question: current.question, answer: option }];
    setCurrent(null);

    if (newHistory.length >= totalQuestions) {
      // Câu cuối: hiện xác nhận ~1s trước khi chuyển bước, để người dùng thấy
      // rõ câu trả lời đã được ghi nhận thay vì chuyển màn hình đột ngột.
      fetchedForRef.current = newHistory.length;
      setHistory(newHistory);
      setConfirming(true);
      setTimeout(() => {
        onComplete(newHistory);
      }, 1000);
    } else {
      setHistory(newHistory);
    }
  }

  const progress = Math.min(history.length, totalQuestions);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < progress ? "bg-amber-400" : "bg-white/15"
            }`}
          />
        ))}
      </div>

      {confirming && (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-5 h-5 text-amber-300"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-amber-300 text-sm">Đã ghi nhận câu trả lời của bạn!</p>
        </div>
      )}

      {!confirming && loading && (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="w-6 h-6 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
          <p className="text-amber-300 text-sm">Đang nghĩ câu hỏi tiếp theo...</p>
        </div>
      )}

      {!confirming && error && (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-red-400 text-sm text-center">{error}</p>
          <button
            onClick={() => fetchNextQuestion(history)}
            className="px-4 py-2 rounded-lg border border-white/20 text-white/80 text-sm"
          >
            Thử lại
          </button>
        </div>
      )}

      {!confirming && !loading && !error && current && (
        <div className="flex flex-col gap-4">
          <p className="text-white text-lg font-medium leading-snug">
            {current.question}
          </p>
          <div className="flex flex-col gap-2.5">
            {current.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className="text-left px-4 py-3 rounded-xl border border-amber-400/30 bg-black/20 text-white/90 text-sm hover:border-amber-300 hover:bg-black/30 transition-colors active:scale-[0.99]"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}