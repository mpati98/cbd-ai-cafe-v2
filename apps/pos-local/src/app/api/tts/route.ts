import { NextRequest, NextResponse } from "next/server";
import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { synthesizeSpeech } from "@/lib/gemini";
import { getOrCreateTableSession, QuotaExceededError, reserveVoiceTurn } from "@/lib/table-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TTS qua Gemini (xem lib/gemini.ts synthesizeSpeech) — trước đó forward sang
// VieNeu-TTS chạy local trên máy dev (tts-server/), nhưng production chạy
// trên Vercel nên 127.0.0.1 không trỏ tới đâu cả (đọc to im lặng, không hoạt
// động thật cho khách). Gemini không cần máy dev bật — hoạt động giống nhau
// ở mọi môi trường, giống cách STT đã đổi trước đó.
const MAX_TEXT_LENGTH = 2000;

const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 20;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (isRateLimited("tts", ip, WINDOW_MS, MAX_REQ_PER_WINDOW)) {
    return NextResponse.json(
      { error: "Bạn thao tác hơi nhanh, vui lòng thử lại sau ít giây." },
      { status: 429 }
    );
  }

  let body: { text?: string; tableCode?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ (cần JSON)." },
      { status: 400 }
    );
  }

  const text = (body.text ?? "").trim().slice(0, MAX_TEXT_LENGTH);
  if (!text) {
    return NextResponse.json({ error: "Không có nội dung để đọc." }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("[/api/tts] Thiếu GEMINI_API_KEY trong biến môi trường.");
    return NextResponse.json(
      { error: "Tính năng đọc to chưa được cấu hình." },
      { status: 503 }
    );
  }

  try {
    // Giới hạn theo bàn (nếu có) — đọc to 1 câu trả lời cũng tốn 1 "lượt
    // giọng nói", dùng chung quota với ghi âm (xem lib/table-session.ts).
    if (body.tableCode) {
      const session = await getOrCreateTableSession(body.tableCode);
      if (session) await reserveVoiceTurn(session);
    }

    const wav = await synthesizeSpeech(text);
    return new NextResponse(new Uint8Array(wav), {
      headers: { "Content-Type": "audio/wav" },
    });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[/api/tts] Unexpected error", err);
    return NextResponse.json(
      { error: "Lỗi kết nối tới dịch vụ đọc giọng nói." },
      { status: 502 }
    );
  }
}
