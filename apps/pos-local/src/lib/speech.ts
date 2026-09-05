"use client";

/**
 * Đọc to 1 đoạn văn bản (text-to-speech) — dùng cho bot đọc lại câu trả lời.
 * Chạy qua Gemini (xem src/lib/gemini.ts synthesizeSpeech + src/app/api/tts/route.ts),
 * tự nhiên hơn hẳn SpeechSynthesis có sẵn trong trình duyệt — trình duyệt
 * thường thiếu giọng tiếng Việt chất lượng và fallback sang giọng đánh vần
 * nghe như người nước ngoài đọc. Không cần server riêng nào, chạy được cả
 * trên Vercel (trước đây dùng VieNeu-TTS chạy local qua tts-server/, đã xoá
 * khỏi repo vì chỉ hoạt động khi Next.js server và tts-server chung 1 máy).
 * Nhận diện giọng nói (voice-to-text) cũng dùng Gemini — xem
 * src/hooks/useVoiceInput.ts + src/components/VoiceMicButton.tsx +
 * src/app/api/voice/route.ts + src/lib/gemini.ts (transcribeAudio).
 */

let currentAudio: HTMLAudioElement | null = null;
let currentController: AbortController | null = null;

export function stopSpeaking() {
  currentController?.abort();
  currentController = null;
  if (currentAudio) {
    currentAudio.pause();
    URL.revokeObjectURL(currentAudio.src);
    currentAudio = null;
  }
}

export async function speak(text: string, tableCode?: string | null) {
  if (typeof window === "undefined" || !text.trim()) return;
  stopSpeaking(); // ngắt câu đang đọc trước đó, tránh đọc chồng

  const controller = new AbortController();
  currentController = controller;

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, tableCode: tableCode ?? null }),
      signal: controller.signal,
    });
    if (!res.ok || controller.signal.aborted) return;

    const blob = await res.blob();
    if (controller.signal.aborted) return;

    const audio = new Audio(URL.createObjectURL(blob));
    currentAudio = audio;
    audio.addEventListener("ended", () => URL.revokeObjectURL(audio.src));
    await audio.play();
  } catch (err) {
    if ((err as Error)?.name !== "AbortError") {
      console.error("[speech] Không đọc được câu trả lời:", err);
    }
  }
}

export function isVoiceOutputSupported(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}
