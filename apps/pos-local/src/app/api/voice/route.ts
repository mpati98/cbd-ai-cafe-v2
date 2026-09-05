import { NextRequest, NextResponse } from "next/server";
import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { transcribeAudio } from "@/lib/gemini";
import { getOrCreateTableSession, QuotaExceededError, reserveVoiceTurn } from "@/lib/table-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// STT qua Gemini (xem lib/gemini.ts transcribeAudio) — trước đó dùng Groq
// (whisper-large-v3), nhưng Whisper hay "bịa" (hallucinate) câu hoàn toàn
// không liên quan khi audio không có lời nói rõ ràng (im lặng/tiếng ồn quán),
// do bị train nhiều trên phụ đề YouTube tự động. Chặn bằng blocklist từ khoá
// + ngưỡng no_speech_prob là chữa cháy, không triệt để (khách vẫn gặp lại lỗi
// với các biến thể câu bịa khác). Gemini test thực tế không lặp lại lỗi này
// trên cùng audio (silence/noise) — tự báo "[NO_SPEECH]" thay vì bịa câu.
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5MB ~ dư sức cho 1 câu order

const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 12;

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

  // Gợi ý ngữ cảnh: tên món trong menu giúp nhận đúng "Cold Brew", "Latte"...
  const hint = typeof form.get("hint") === "string" ? (form.get("hint") as string) : "";
  const tableCode = typeof form.get("tableCode") === "string" ? (form.get("tableCode") as string) : "";

  if (!process.env.GEMINI_API_KEY) {
    console.error("[/api/voice] Thiếu GEMINI_API_KEY trong biến môi trường.");
    return NextResponse.json(
      { error: "Tính năng giọng nói chưa được cấu hình, bạn gõ tin nhắn giúp mình nhé." },
      { status: 503 }
    );
  }

  try {
    // Giới hạn theo bàn (nếu có) — mỗi lượt ghi âm tốn 1 "lượt giọng nói",
    // giữ chỗ NGAY trước khi gọi Gemini (kể cả kết quả là "chưa nghe rõ" vẫn
    // tốn 1 lượt gọi API thật, không hoàn lại).
    if (tableCode) {
      const session = await getOrCreateTableSession(tableCode);
      if (session) await reserveVoiceTurn(session);
    }

    const base64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
    const text = await transcribeAudio(
      { base64, mimeType: audio.type || "audio/webm" },
      hint ? hint.slice(0, 800) : undefined
    );

    if (!text) {
      return NextResponse.json(
        { error: "Mình chưa nghe rõ, bạn nói lại giúp mình nhé." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[/api/voice] Unexpected error", err);
    return NextResponse.json(
      { error: "Lỗi kết nối tới dịch vụ nhận giọng nói." },
      { status: 502 }
    );
  }
}
