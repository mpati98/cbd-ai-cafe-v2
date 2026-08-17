import { NextRequest, NextResponse } from "next/server";
import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { orderChatRequestSchema } from "@/lib/schemas";
import { runOrderChat } from "@/lib/order-chat";

export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 20; // 1 khách trò chuyện bình thường không vượt mức này

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (isRateLimited("order-chat", ip, WINDOW_MS, MAX_REQ_PER_WINDOW)) {
    return NextResponse.json({ error: "Bạn nhắn hơi nhanh, đợi mình chút nhé 🙏" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ (cần JSON)." }, { status: 400 });
  }

  const parsed = orderChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  try {
    const { reply, effects } = await runOrderChat(parsed.data);
    return NextResponse.json({ reply, effects });
  } catch (err) {
    console.error("[/api/order-chat] Unexpected error", err);
    return NextResponse.json(
      { error: "Mình đang gặp chút trục trặc, bạn thử lại sau ít giây nhé." },
      { status: 502 }
    );
  }
}
