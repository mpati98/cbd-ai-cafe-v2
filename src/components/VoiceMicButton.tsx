"use client";

import { useVoiceInput, VoiceStatus } from "@/hooks/useVoiceInput";

export interface VoiceMicButtonProps {
  /** Transcript được trả về đây — đẩy vào cùng pipeline với tin nhắn gõ tay */
  onTranscript: (text: string) => void;
  /** Tên các món trong menu để Whisper nhận đúng "Cold Brew", "Bạc Xỉu"... */
  hintPhrases?: string[];
  /** Gọi ngay trước khi bắt đầu ghi âm — vd để ngắt TTS đang đọc cho rõ tiếng */
  onStartRecording?: () => void;
  /** In log chẩn đoán ra console (nhiễu nền đo được, ngưỡng đang dùng...) — bật tạm khi tính năng tự dừng chưa hoạt động đúng, tắt lại khi đã ổn */
  debugSilence?: boolean;
  className?: string;
}

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: "Đặt món bằng giọng nói",
  recording: "Đang nghe... bấm để dừng",
  transcribing: "Đang xử lý...",
  error: "Thử lại",
  unsupported: "Trình duyệt không hỗ trợ ghi âm",
};

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function VoiceMicButton({
  onTranscript,
  hintPhrases,
  onStartRecording,
  debugSilence = false,
  className = "",
}: VoiceMicButtonProps) {
  const {
    status,
    errorMessage,
    isSupported,
    startRecording,
    stopRecording,
  } = useVoiceInput({ onTranscript, hintPhrases, debugSilence });

  // Trước khi hydrate xong / trình duyệt không hỗ trợ: không render gì,
  // người dùng vẫn gõ tay bình thường — không làm vỡ layout chatbot panel.
  if (!isSupported) return null;

  const isRecording = status === "recording";
  const isBusy = status === "transcribing";

  const handleClick = () => {
    if (isBusy) return;
    if (isRecording) {
      stopRecording();
    } else {
      onStartRecording?.();
      void startRecording();
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy}
        aria-label={STATUS_LABEL[status]}
        title={STATUS_LABEL[status]}
        className={[
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          "transition-colors duration-200 focus-visible:outline-2",
          "focus-visible:outline-offset-2 focus-visible:outline-[#FF9A44]",
          isRecording
            ? "bg-[#EE7211] text-[#1B130B]"
            : "bg-[#22336F] text-[#FF9A44] hover:bg-[#2b4088]",
          isBusy ? "cursor-wait opacity-80" : "",
        ].join(" ")}
      >
        {/* Vòng sóng lan tỏa khi đang nghe — tắt nếu người dùng giảm chuyển động */}
        {isRecording && (
          <span
            className="absolute inset-0 rounded-full bg-[#EE7211]/40 motion-safe:animate-ping motion-reduce:hidden"
            aria-hidden="true"
          />
        )}
        <span className="relative">
          {isBusy ? (
            <Spinner className="h-5 w-5 motion-safe:animate-spin" />
          ) : isRecording ? (
            <StopIcon className="h-5 w-5" />
          ) : (
            <MicIcon className="h-5 w-5" />
          )}
        </span>
      </button>

      {/* Trạng thái dạng chữ nhỏ bên cạnh nút */}
      {(isRecording || isBusy) && (
        <span className="ml-2 text-xs font-medium text-[#FF9A44]">
          {isRecording ? "Đang nghe..." : "Đang xử lý..."}
        </span>
      )}

      {/* Lỗi thân thiện, tự biến mất khi bấm ghi lại */}
      {status === "error" && errorMessage && (
        <span
          role="status"
          className="absolute -top-9 left-0 max-w-64 truncate rounded-md bg-[#0F1936] px-2 py-1 text-xs text-[#FF9A44] shadow-lg"
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
}
