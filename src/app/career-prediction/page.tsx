"use client";

import { useState } from "react";
import PhotoCapture from "@/components/PhotoCapture";
import QuizChat, { type QAPair } from "@/components/QuizChat";

// Đây là ví dụ minh hoạ cách nối QuizChat + PhotoCapture vào flow.
// Đổi tên thành page.tsx và chỉnh sửa theo UI thật của bạn.

interface Result {
  vibe: string;
  careerName: string;
  explanation: string;
  imageUrl: string;
}

export default function CareerPredictionPageExample() {
  const [step, setStep] = useState<"quiz" | "photo" | "result">("quiz");
  const [quizHistory, setQuizHistory] = useState<QAPair[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleQuizComplete(history: QAPair[]) {
    setQuizHistory(history);
    setStep("photo");
  }

  async function handlePhotoCaptured(dataUrl: string) {
    setLoading(true);
    setError(null);

    const sizeKb = Math.round((dataUrl.length * 0.75) / 1024); // ước lượng KB thật từ base64
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55_000);

    try {
      const res = await fetch("/api/career-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoDataUrl: dataUrl, quizHistory }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          `${data.error || "Có lỗi xảy ra."} [HTTP ${res.status}, ảnh ~${sizeKb}KB, ${elapsedSec}s]`
        );
      }

      const data = (await res.json()) as Result;
      setResult(data);
      setStep("result");
    } catch (e) {
      clearTimeout(timeoutId);
      const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

      if (e instanceof DOMException && e.name === "AbortError") {
        setError(
          `Quá thời gian chờ (>55s) - có thể do mạng yếu hoặc ảnh quá nặng. [ảnh ~${sizeKb}KB, ${elapsedSec}s]`
        );
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          msg.includes("[HTTP")
            ? msg
            : `${msg} [ảnh ~${sizeKb}KB, ${elapsedSec}s, ${e instanceof Error ? e.name : "?"}]`
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === "quiz") {
    return (
      <div className="max-w-sm mx-auto p-6">
        <QuizChat totalQuestions={6} onComplete={handleQuizComplete} />
      </div>
    );
  }

  if (step === "photo") {
    return (
      <div className="max-w-sm mx-auto p-6">
        <PhotoCapture onCapture={handlePhotoCaptured} />
        {loading && (
          <div className="flex flex-col items-center gap-2 mt-6">
            <div className="w-6 h-6 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
            <p className="text-amber-300 text-sm">
              Đang tạo ảnh check-in của bạn...
            </p>
          </div>
        )}
        {error && (
          <p className="text-center text-red-400 mt-4 text-sm">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto p-6 flex flex-col gap-5">
      {result?.imageUrl && (
        <div className="w-full aspect-square rounded-2xl overflow-hidden border border-amber-400/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.imageUrl}
            alt={result.careerName}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div>
        <h3 className="text-amber-300 font-semibold mb-1 text-sm uppercase tracking-wide">
          Vibe của bạn
        </h3>
        <p className="text-white/80 text-sm leading-relaxed">{result?.vibe}</p>
      </div>

      <div>
        <h3 className="text-amber-300 font-semibold mb-1 text-sm uppercase tracking-wide">
          Nghề nghiệp dự đoán
        </h3>
        <p className="text-white text-xl font-bold mb-2">{result?.careerName}</p>
        <p className="text-white/80 text-sm leading-relaxed">
          {result?.explanation}
        </p>
      </div>

      <button
        onClick={() => {
          setStep("quiz");
          setQuizHistory([]);
          setResult(null);
        }}
        className="py-2.5 rounded-xl border border-white/20 text-white/80 text-sm font-medium hover:bg-white/5 transition-colors"
      >
        Thử lại
      </button>
    </div>
  );
}