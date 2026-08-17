import { NextRequest, NextResponse } from "next/server";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// faster-whisper chạy local (xem whisper-server/) — model load 1 lần, giữ warm.
const WHISPER_SERVER_URL =
  process.env.WHISPER_SERVER_URL ?? "http://127.0.0.1:8008/transcribe";
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

  const whisperForm = new FormData();
  const mime = audio.type || "audio/webm";
  whisperForm.append(
    "audio",
    new File([audio], `order.${extFromMime(mime)}`, { type: mime })
  );
  if (hint) {
    // faster-whisper dùng prompt như "từ điển" ngữ cảnh — cắt bớt cho an toàn
    whisperForm.append("hint", hint.slice(0, 800));
  }

  try {
    const res = await fetch(WHISPER_SERVER_URL, {
      method: "POST",
      body: whisperForm,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[/api/voice] whisper-server error", res.status, detail);
      return NextResponse.json(
        { error: "Không xử lý được giọng nói lúc này, bạn có thể gõ tin nhắn nhé." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? "").trim();

    if (!text) {
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
