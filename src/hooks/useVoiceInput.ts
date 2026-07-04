"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus =
  | "idle"
  | "recording"
  | "transcribing"
  | "error"
  | "unsupported";

export interface UseVoiceInputOptions {
  /** Nhận transcript sau khi xử lý xong — đẩy thẳng vào pipeline chatbot */
  onTranscript: (text: string) => void;
  /** Tên món trong menu để tăng độ chính xác nhận dạng (vd: ["Cold Brew", "Cà Phê Sữa Đá"]) */
  hintPhrases?: string[];
  /** Tự động dừng ghi âm sau N ms (mặc định 12s — đủ cho 1 câu order) */
  maxDurationMs?: number;
  /** Tự động dừng khi im lặng liên tục N ms (mặc định 3s) — 0 để tắt tính năng này */
  silenceTimeoutMs?: number;
  /** In log chẩn đoán (mức nhiễu nền đo được, ngưỡng đang dùng...) ra console — hữu ích khi tự dừng không hoạt động đúng như mong đợi */
  debugSilence?: boolean;
}

export interface UseVoiceInputResult {
  status: VoiceStatus;
  /** Thông báo lỗi thân thiện (tiếng Việt) khi status === "error" */
  errorMessage: string | null;
  /** true sau khi hydrate xong và trình duyệt hỗ trợ ghi âm */
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  /** Hủy ghi âm, không gửi đi đâu cả */
  cancelRecording: () => void;
}

const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4", // Safari / iOS
  "audio/ogg;codecs=opus",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

/**
 * Theo dõi mức âm lượng của stream qua Web Audio API (AnalyserNode) — nếu im
 * lặng liên tục quá `silenceMs`, gọi `onSilence()`. Trả về hàm dọn dẹp để
 * dừng theo dõi (khi ghi âm kết thúc theo cách khác trước đó).
 *
 * Ngưỡng "im lặng" được ĐO THỰC TẾ trong `calibrationMs` đầu tiên của lượt
 * ghi (thay vì 1 số cố định) — mỗi máy/micro/phòng có mức nhiễu nền khác
 * nhau (mic laptop ồn hơn tai nghe, quán ồn hơn phòng yên tĩnh...); ngưỡng
 * cố định dễ bị "nhiễu nền còn cao hơn ngưỡng" nên không bao giờ tính là im
 * lặng — đây chính là lý do tính năng có thể không tự dừng được.
 */
function watchForSilence(
  stream: MediaStream,
  silenceMs: number,
  onSilence: () => void,
  options?: { calibrationMs?: number; minThreshold?: number; thresholdMultiplier?: number; debug?: boolean }
): () => void {
  const { calibrationMs = 500, minThreshold = 0.01, thresholdMultiplier = 2.5, debug = false } = options ?? {};

  const AudioContextCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return () => {};

  let audioContext: AudioContext;
  let source: MediaStreamAudioSourceNode;
  let analyser: AnalyserNode;
  try {
    audioContext = new AudioContextCtor();
    // 1 số trình duyệt tạo AudioContext ở trạng thái "suspended" nếu nghi
    // ngờ không còn trong user gesture (do có `await getUserMedia` phía
    // trước) — ép resume() để chắc chắn analyser nhận được dữ liệu thật.
    void audioContext.resume();
    source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
  } catch (err) {
    if (debug) console.debug("[voice] không tạo được AudioContext để theo dõi im lặng:", err);
    return () => {};
  }

  const data = new Uint8Array(analyser.fftSize);
  const startedAt = Date.now();
  const calibrationSamples: number[] = [];
  let threshold = minThreshold;
  let calibrated = false;
  let silenceStartedAt: number | null = null;
  // Tiếng động phải kéo dài liên tục tối thiểu ngần này mới tính là "có
  // người nói lại" — lọc các tiếng động chớp nhoáng (tiếng cốc chạm bàn,
  // tiếng gõ, click...) để không làm gián đoạn bộ đếm im lặng 1 cách oan.
  const REQUIRED_LOUD_MS = 150;
  let loudStartedAt: number | null = null;
  let rafId = 0;
  let stopped = false;

  function computeRms(): number {
    analyser.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sumSquares += v * v;
    }
    return Math.sqrt(sumSquares / data.length);
  }

  function tick() {
    if (stopped) return;
    const rms = computeRms();
    const elapsed = Date.now() - startedAt;

    if (!calibrated) {
      calibrationSamples.push(rms);
      if (elapsed >= calibrationMs) {
        const avgNoise = calibrationSamples.reduce((a, b) => a + b, 0) / calibrationSamples.length;
        threshold = Math.max(minThreshold, avgNoise * thresholdMultiplier);
        calibrated = true;
        if (debug) console.debug(`[voice] đã đo nhiễu nền ~${avgNoise.toFixed(4)}, ngưỡng im lặng = ${threshold.toFixed(4)}`);
      }
      rafId = requestAnimationFrame(tick);
      return;
    }

    if (debug && Math.random() < 0.05) console.debug(`[voice] rms=${rms.toFixed(4)} threshold=${threshold.toFixed(4)}`);

    if (rms < threshold) {
      loudStartedAt = null;
      if (silenceStartedAt === null) silenceStartedAt = Date.now();
      else if (Date.now() - silenceStartedAt >= silenceMs) {
        if (debug) console.debug("[voice] im lặng đủ lâu -> tự dừng ghi âm");
        cleanup();
        onSilence();
        return;
      }
    } else {
      // Có tiếng động — nhưng chỉ coi là "nói lại" (reset bộ đếm im lặng)
      // nếu tiếng động này kéo dài đủ lâu, tránh 1 tiếng động ngắn (dưới
      // REQUIRED_LOUD_MS) làm mất công đếm lại từ đầu một cách oan uổng.
      if (loudStartedAt === null) loudStartedAt = Date.now();
      else if (Date.now() - loudStartedAt >= REQUIRED_LOUD_MS) {
        silenceStartedAt = null;
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function cleanup() {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    try {
      source.disconnect();
      analyser.disconnect();
    } catch {
      // đã disconnect rồi, bỏ qua
    }
    audioContext.close().catch(() => {});
  }

  rafId = requestAnimationFrame(tick);
  return cleanup;
}

export function useVoiceInput({
  onTranscript,
  hintPhrases,
  maxDurationMs = 12_000,
  silenceTimeoutMs = 3_000,
  debugSilence = false,
}: UseVoiceInputOptions): UseVoiceInputResult {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pattern hydration-safe: mặc định false, chỉ detect sau khi mount
  // (tránh SSR mismatch vì navigator/MediaRecorder không tồn tại trên server)
  const [isSupported, setIsSupported] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopSilenceWatchRef = useRef<(() => void) | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const supported =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined";
    setIsSupported(supported);
    if (!supported) setStatus("unsupported");
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    stopSilenceWatchRef.current?.();
    stopSilenceWatchRef.current = null;
  }, []);

  // Dọn dẹp khi unmount
  useEffect(() => cleanupStream, [cleanupStream]);

  const transcribe = useCallback(
    async (blob: Blob) => {
      setStatus("transcribing");
      try {
        const form = new FormData();
        form.append("audio", blob);
        if (hintPhrases?.length) {
          form.append("hint", hintPhrases.join(", "));
        }

        const res = await fetch("/api/voice", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as {
          text?: string;
          error?: string;
        };

        if (!res.ok || !data.text) {
          setErrorMessage(
            data.error ?? "Không xử lý được giọng nói, bạn thử lại nhé."
          );
          setStatus("error");
          return;
        }

        setStatus("idle");
        onTranscript(data.text);
      } catch {
        setErrorMessage("Mất kết nối, bạn kiểm tra mạng và thử lại nhé.");
        setStatus("error");
      }
    },
    [hintPhrases, onTranscript]
  );

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop(); // onstop sẽ lo phần còn lại
    }
  }, []);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    stopRecording();
    setStatus("idle");
    setErrorMessage(null);
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    if (!isSupported || status === "recording" || status === "transcribing") {
      return;
    }
    setErrorMessage(null);
    cancelledRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch {
      setErrorMessage(
        "Cần quyền truy cập micro để đặt món bằng giọng nói — bạn kiểm tra cài đặt trình duyệt nhé."
      );
      setStatus("error");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const type = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      cleanupStream();

      if (cancelledRef.current) return;

      // Đoạn ghi quá ngắn (bấm nhầm) — bỏ qua trong im lặng
      if (blob.size < 1_000) {
        setStatus("idle");
        return;
      }
      void transcribe(blob);
    };

    recorder.onerror = () => {
      cleanupStream();
      setErrorMessage("Có lỗi khi ghi âm, bạn thử lại nhé.");
      setStatus("error");
    };

    recorder.start();
    setStatus("recording");

    autoStopTimerRef.current = setTimeout(() => {
      stopRecording();
    }, maxDurationMs);

    // Tự động dừng khi im lặng liên tục quá `silenceTimeoutMs` — tiện cho
    // khách nói xong là ghi tự dừng ngay, không cần nhớ bấm dừng.
    if (silenceTimeoutMs > 0) {
      stopSilenceWatchRef.current = watchForSilence(stream, silenceTimeoutMs, stopRecording, { debug: debugSilence });
    }
  }, [isSupported, status, maxDurationMs, silenceTimeoutMs, debugSilence, cleanupStream, stopRecording, transcribe]);

  return {
    status,
    errorMessage,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
