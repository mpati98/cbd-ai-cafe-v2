import { NextRequest, NextResponse } from "next/server";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// VieNeu-TTS chạy local (xem tts-server/) — model load 1 lần, giữ warm, CPU/ONNX.
const TTS_SERVER_URL = process.env.TTS_SERVER_URL ?? "http://127.0.0.1:8009/synthesize";
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

  let body: { text?: string };
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

  const form = new FormData();
  form.append("text", text);

  try {
    const res = await fetch(TTS_SERVER_URL, { method: "POST", body: form });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[/api/tts] tts-server error", res.status, detail);
      return NextResponse.json(
        { error: "Không đọc được câu trả lời lúc này." },
        { status: 502 }
      );
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: { "Content-Type": "audio/wav" },
    });
  } catch (err) {
    console.error("[/api/tts] Unexpected error", err);
    return NextResponse.json(
      { error: "Lỗi kết nối tới dịch vụ đọc giọng nói." },
      { status: 502 }
    );
  }
}
