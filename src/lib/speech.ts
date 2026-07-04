"use client";

/**
 * Đọc to 1 đoạn văn bản (text-to-speech) — dùng cho bot đọc lại câu trả lời.
 * Nhận diện giọng nói (voice-to-text) đã chuyển sang dùng Groq Whisper API —
 * xem src/hooks/useVoiceInput.ts + src/components/VoiceMicButton.tsx +
 * src/app/api/voice/route.ts — chính xác hơn hẳn so với SpeechRecognition
 * có sẵn trong trình duyệt, đặc biệt với tiếng Việt trong môi trường ồn.
 */
export function speak(text: string, lang = "vi-VN") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // ngắt câu đang đọc trước đó, tránh đọc chồng
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
