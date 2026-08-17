"use client";

import { useState } from "react";
import PhotoCapture from "@/components/PhotoCapture";

// Đây là ví dụ minh hoạ cách nối PhotoCapture vào flow.
// Đổi tên thành page.tsx và chỉnh sửa theo quiz UI thật của bạn.

const QUIZ_QUESTIONS = [
  { key: "moi_truong", label: "Bạn thích môi trường làm việc nào?" },
  { key: "so_thich", label: "Cuối tuần bạn thích làm gì?" },
];

export default function CareerPrediction() {
  const [step, setStep] = useState<"quiz" | "photo" | "result">("quiz");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ vibe: string; prediction: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoCaptured(dataUrl: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/career-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoDataUrl: dataUrl,
          quizAnswers: answers,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Có lỗi xảy ra.");
      }

      const data = await res.json();
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
          <p className="text-center text-amber-300 mt-4 text-sm">
            Đang đọc vibe của bạn...
          </p>
        )}
        {error && (
          <p className="text-center text-red-400 mt-4 text-sm">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-amber-300 font-semibold mb-1">Vibe của bạn</h3>
        <p className="text-white/80 text-sm">{result?.vibe}</p>
      </div>
      <div>
        <h3 className="text-amber-300 font-semibold mb-1">Dự đoán nghề nghiệp</h3>
        <p className="text-white/80 text-sm whitespace-pre-line">
          {result?.prediction}
        </p>
      </div>
    </div>
  );
}