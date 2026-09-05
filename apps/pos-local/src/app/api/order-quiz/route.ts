import { NextRequest, NextResponse } from "next/server";
import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { quizRequestSchema } from "@/lib/schemas";
import { runOrderQuiz } from "@/lib/order-quiz";
import { QuotaExceededError } from "@/lib/table-session";

export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 20; // 1 khách làm quiz bình thường không vượt mức này

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (isRateLimited("order-quiz", ip, WINDOW_MS, MAX_REQ_PER_WINDOW)) {
    return NextResponse.json({ error: "Bạn thao tác hơi nhanh, đợi mình chút nhé." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ (cần JSON)." }, { status: 400 });
  }

  const parsed = quizRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  try {
    const result = await runOrderQuiz(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[/api/order-quiz] Unexpected error", err);
    return NextResponse.json(
      { error: "Mình đang gặp chút trục trặc, bạn thử lại sau ít giây nhé." },
      { status: 502 }
    );
  }
}
