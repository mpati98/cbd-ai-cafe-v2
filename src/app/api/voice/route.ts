import { NextRequest, NextResponse } from "next/server";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// STT qua Groq API (whisper-large-v3) — trước đây forward sang whisper-server
// chạy local trên máy dev, nhưng production chạy trên Vercel nên 127.0.0.1
// không trỏ tới đâu cả (voice order lỗi "kết nối" trên mọi máy khi deploy).
// Groq host model, không cần máy dev bật — hoạt động giống nhau ở mọi môi trường.
const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL = "whisper-large-v3";
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5MB ~ dư sức cho 1 câu order

const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 12;

function extFromMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
}

// Whisper (mọi biến thể, kể cả whisper-large-v3 trên Groq) có xu hướng "bịa"
// (hallucinate) 1 câu MẶC ĐỊNH nghe rất tự nhiên khi âm thanh đưa vào không
// có lời nói rõ ràng (im lặng / chỉ có tiếng ồn nền quán cà phê) — hệ quả của
// việc model được train nhiều trên phụ đề YouTube tự động, nên hay "nhớ nhầm"
// ra các câu intro/outro kiểu video. Test trực tiếp với Groq API bằng audio
// im lặng/nhiễu nền thực tế đã tái hiện đúng lỗi khách báo ("ra chữ hoàn toàn
// không liên quan"): ra "Hãy subscribe cho kênh La La School...", "Cảm ơn các
// bạn đã theo dõi và hẹn gặp lại.", và trên chính audio thật của khách (câu
// ngắn "cho 1 cà phê sữa") ra "Chào bạn đến với kênh youtube của mình" — biến
// thể INTRO chứ không chỉ outro, ban đầu chặn thiếu case này. Không phải do
// hint/prompt hay do route parse sai, mà là hallucination kinh điển của
// Whisper. avg_logprob KHÔNG phân biệt được (model "tự tin" vào câu bịa này)
// nên chỉ lọc theo no_speech_prob là chưa đủ — cần danh sách cụm từ phổ biến.
// Chặn rộng theo TỪ KHOÁ gốc (kênh/youtube/video...) thay vì chỉ khớp nguyên
// cụm cố định — khách gọi món ở CBD AI Cafe không có lý do gì nói tới các từ
// này, nên rủi ro chặn nhầm câu gọi món thật gần như không có.
const HALLUCINATION_PATTERN =
  /\bk[êe]nh\b|\byoutube\b|\bsubscribe\b|đăng\s*k[yý]|theo\s*d[õo]i|h[ẹe]n\s*g[ặa]p\s*l[ạa]i|like[\s,]*(và\s*)?share|b[ìi]nh\s*lu[ậa]n|\bcomment\b|ph[ụu]\s*đ[ềe]|amara\.org|ghi[ềe]n\s*m[ìi]\s*g[õo]/i;
// Ngưỡng theo mặc định của chính OpenAI Whisper CLI (no_speech_threshold=0.6,
// logprob_threshold=-1.0, compression_ratio_threshold=2.4) — giữ nguyên vì đó
// là bộ ngưỡng đã được kiểm chứng rộng rãi, không tự đặt số tuỳ tiện.
const NO_SPEECH_THRESHOLD = 0.6;
const LOGPROB_THRESHOLD = -1.0;
const COMPRESSION_RATIO_THRESHOLD = 2.4;

type GroqSegment = { avg_logprob?: number; no_speech_prob?: number; compression_ratio?: number };
type GroqTranscription = { text?: string; segments?: GroqSegment[] };

/** true nếu nhiều khả năng là hallucination (không có lời nói thật trong audio) — nên coi như "chưa nghe rõ". */
function looksLikeHallucination(data: GroqTranscription, text: string): boolean {
  if (HALLUCINATION_PATTERN.test(text)) return true;
  const segments = data.segments ?? [];
  if (!segments.length) return false;
  // Nhiều segment (câu dài) — chỉ cần 1 đoạn rõ ràng "không phải giọng nói"
  // theo NGƯỠNG CỦA CHÍNH GROQ thì coi cả câu là đáng ngờ, tránh lẫn rác vào đơn.
  return segments.some((s) => {
    const noSpeech = s.no_speech_prob ?? 0;
    const logprob = s.avg_logprob ?? 0;
    const compressionRatio = s.compression_ratio ?? 0;
    return (
      noSpeech > NO_SPEECH_THRESHOLD ||
      logprob < LOGPROB_THRESHOLD ||
      compressionRatio > COMPRESSION_RATIO_THRESHOLD
    );
  });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (isRateLimited("voice", ip, WINDOW_MS, MAX_REQ_PER_WINDOW)) {
    return NextResponse.json(
      { error: "Bạn thao tác hơi nhanh, vui lòng thử lại sau ít giây." },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ (cần multipart/form-data)." },
      { status: 400 }
    );
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json(
      { error: "Không nhận được dữ liệu âm thanh." },
      { status: 400 }
    );
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Đoạn ghi âm quá dài, vui lòng nói ngắn gọn hơn." },
      { status: 413 }
    );
  }

  // Gợi ý ngữ cảnh: tên món trong menu giúp Whisper nhận đúng "Cold Brew", "Latte"...
  const hint = typeof form.get("hint") === "string" ? (form.get("hint") as string) : "";

  if (!process.env.GROQ_API_KEY) {
    console.error("[/api/voice] Thiếu GROQ_API_KEY trong biến môi trường.");
    return NextResponse.json(
      { error: "Tính năng giọng nói chưa được cấu hình, bạn gõ tin nhắn giúp mình nhé." },
      { status: 503 }
    );
  }

  const groqForm = new FormData();
  const mime = audio.type || "audio/webm";
  groqForm.append("file", new File([audio], `order.${extFromMime(mime)}`, { type: mime }));
  groqForm.append("model", GROQ_MODEL);
  groqForm.append("language", "vi");
  // verbose_json trả kèm no_speech_prob/avg_logprob/compression_ratio theo
  // từng đoạn — cần để lọc hallucination, xem looksLikeHallucination() ở trên.
  groqForm.append("response_format", "verbose_json");
  if (hint) {
    // Whisper dùng prompt như "từ điển" ngữ cảnh (giới hạn ~224 token) — cắt bớt cho an toàn
    groqForm.append("prompt", hint.slice(0, 800));
  }

  try {
    const res = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: groqForm,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[/api/voice] Groq STT error", res.status, detail);
      return NextResponse.json(
        { error: "Không xử lý được giọng nói lúc này, bạn có thể gõ tin nhắn nhé." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as GroqTranscription;
    const text = (data.text ?? "").trim();

    if (!text || looksLikeHallucination(data, text)) {
      return NextResponse.json(
        { error: "Mình chưa nghe rõ, bạn nói lại giúp mình nhé." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[/api/voice] Unexpected error", err);
    return NextResponse.json(
      { error: "Lỗi kết nối tới dịch vụ nhận giọng nói." },
      { status: 502 }
    );
  }
}
