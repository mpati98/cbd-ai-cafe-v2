"use client";

import { useState } from "react";
import PhotoCapture from "@/components/PhotoCapture";

// Đây là ví dụ minh hoạ cách nối PhotoCapture vào flow.
// Đổi tên thành page.tsx và chỉnh sửa theo quiz UI thật của bạn.

const QUIZ_QUESTIONS = [
  { key: "moi_truong", label: "Bạn thích môi trường làm việc nào?" },
  { key: "so_thich", label: "Cuối tuần bạn thích làm gì?" },
];

interface Result {
  vibe: string;
  careerName: string;
  explanation: string;
  imageUrl: string;
}

export default function CareerPredictionPageExample() {
  const [step, setStep] = useState<"quiz" | "photo" | "result">("quiz");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoCaptured(dataUrl: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/career-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoDataUrl: dataUrl, quizAnswers: answers }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Có lỗi xảy ra.");
      }

      const data = (await res.json()) as Result;
      setResult(data);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "quiz") {
    return (
      <div className="max-w-sm mx-auto p-6 flex flex-col gap-4">
        {QUIZ_QUESTIONS.map((q) => (
          <div key={q.key} className="flex flex-col gap-2">
            <label className="text-white/80 text-sm">{q.label}</label>
            <input
              className="bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-white"
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
              }
            />
          </div>
        ))}
        <button
          className="mt-2 py-2.5 rounded-xl bg-amber-400 text-black font-semibold"
          onClick={() => setStep("photo")}
        >
          Tiếp tục
        </button>
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
              Đang đọc vibe và tạo ảnh minh hoạ...
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
          setStep("photo");
          setResult(null);
        }}
        className="py-2.5 rounded-xl border border-white/20 text-white/80 text-sm font-medium hover:bg-white/5 transition-colors"
      >
        Thử lại
      </button>
    </div>
  );
}