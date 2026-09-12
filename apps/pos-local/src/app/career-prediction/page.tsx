"use client";

import { useState } from "react";
import PhotoCapture from "@/components/PhotoCapture";
import QuizChat, { type QAPair } from "@/components/QuizChat";
import CustomerNav from "@/components/CustomerNav";

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
  const [printState, setPrintState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [printError, setPrintError] = useState<string | null>(null);

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

      // API trả về text/plain (không phải JSON thuần) vì bọc trong stream có
      // heartbeat để giữ kết nối "sống" trên mạng di động - xem comment trong
      // route.ts. Nội dung: vài khoảng trắng heartbeat + "\n" + JSON thật.
      const rawText = await res.text();
      const data = JSON.parse(rawText.trim()) as Result & {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || data.ok === false) {
        throw new Error(
          `${data.error || "Có lỗi xảy ra."} [HTTP ${res.status}, ảnh ~${sizeKb}KB, ${elapsedSec}s]`
        );
      }

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

  async function handlePrint() {
    if (!result) return;
    setPrintState("sending");
    setPrintError(null);
    try {
      const res = await fetch("/api/print-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerName: result.careerName, imageDataUrl: result.imageUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Không gửi được ảnh, vui lòng thử lại.");
      }
      setPrintState("sent");
    } catch (e) {
      setPrintState("error");
      setPrintError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    }
  }

  let content: React.ReactNode;

  if (step === "quiz") {
    content = (
      <div className="max-w-sm mx-auto p-6">
        <QuizChat totalQuestions={6} onComplete={handleQuizComplete} />
      </div>
    );
  } else if (step === "photo") {
    content = (
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
  } else {
    content = (
      <div className="max-w-sm mx-auto p-6 flex flex-col gap-5">
        {result?.imageUrl && (
          <div className="w-full aspect-2/3 rounded-2xl overflow-hidden border border-amber-400/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.imageUrl}
              alt={result.careerName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={handlePrint}
            disabled={printState === "sending" || printState === "sent"}
            className="w-full py-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-neutral-900 font-bold text-sm disabled:opacity-60 transition-transform enabled:hover:scale-[1.02]"
          >
            {printState === "sending"
              ? "Đang gửi..."
              : printState === "sent"
                ? "✓ Đã gửi cho nhân viên in"
                : "🖨️ In ảnh lưu niệm"}
          </button>
          {printError && <p className="text-red-400 text-xs">{printError}</p>}
        </div>

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

  return (
    <>
      <CustomerNav />
      {content}
    </>
  );
}