import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
// import { buildVibeReadingPrompt, buildCareerPredictionPrompt } from "@/lib/career-prediction-prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface QuizAnswers {
  [question: string]: string;
}

interface RequestBody {
  /** data URL dạng "data:image/jpeg;base64,...." lấy từ PhotoCapture, chỉ dùng trong request này rồi bỏ */
  photoDataUrl: string;
  quizAnswers: QuizAnswers;
}

function parseDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], base64: match[2] };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const { photoDataUrl, quizAnswers } = body;

    if (!photoDataUrl || !quizAnswers) {
      return NextResponse.json(
        { error: "Thiếu ảnh hoặc câu trả lời quiz." },
        { status: 400 }
      );
    }

    const parsed = parseDataUrl(photoDataUrl);
    if (!parsed) {
      return NextResponse.json({ error: "Ảnh không hợp lệ." }, { status: 400 });
    }
    const { mediaType, base64 } = parsed;

    // Giới hạn kích thước base64 (~10MB gốc -> tránh payload quá lớn)
    if (base64.length > 14_000_000) {
      return NextResponse.json({ error: "Ảnh quá lớn." }, { status: 400 });
    }

    // ---- Bước 1: Claude Haiku vision đọc "vibe" từ ảnh ----
    // Ảnh chỉ được gửi trong request này, không ghi ra disk/DB ở đâu cả.
    const vibeResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp"
                  | "image/gif",
                data: base64,
              },
            },
            {
              type: "text",
              text: buildVibeReadingPrompt(quizAnswers),
            },
          ],
        },
      ],
    });

    const vibeText = vibeResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    // ---- Bước 2: Dự đoán nghề nghiệp dựa trên vibe + quiz ----
    const predictionResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: buildCareerPredictionPrompt(vibeText, quizAnswers),
        },
      ],
    });

    const predictionText = predictionResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    // Ảnh (base64, mediaType) không được tham chiếu gì thêm sau điểm này -> để GC dọn tự nhiên.

    return NextResponse.json({
      vibe: vibeText,
      prediction: predictionText,
    });
  } catch (err) {
    console.error("career-prediction error:", err);
    return NextResponse.json(
      { error: "Có lỗi xảy ra, vui lòng thử lại." },
      { status: 500 }
    );
  }
}

// --- Prompt helpers (thay bằng import từ lib/career-prediction-prompts.ts nếu đã có) ---

function buildVibeReadingPrompt(quizAnswers: QuizAnswers): string {
  const answersText = Object.entries(quizAnswers)
    .map(([q, a]) => `- ${q}: ${a}`)
    .join("\n");

  return `Bạn là một AI "đọc vibe" vui nhộn tại CBD AI Cafe, Đà Lạt. Nhìn vào ảnh và mô tả năng lượng/phong cách/vibe tổng thể của người trong ảnh một cách tích cực, sáng tạo (2-3 câu, tiếng Việt). Không mô tả chi tiết đặc điểm khuôn mặt, chỉ tập trung vào "vibe" (năng lượng, phong cách, cảm giác toát ra).

Kết hợp với câu trả lời quiz tính cách sau để vibe reading thêm chính xác:
${answersText}`;
}

function buildCareerPredictionPrompt(
  vibeText: string,
  quizAnswers: QuizAnswers
): string {
  const answersText = Object.entries(quizAnswers)
    .map(([q, a]) => `- ${q}: ${a}`)
    .join("\n");

  return `Dựa trên vibe reading và câu trả lời quiz dưới đây, hãy đưa ra một dự đoán nghề nghiệp vui, sáng tạo và mang tính giải trí cho khách tại CBD AI Cafe.

Vibe reading:
${vibeText}

Câu trả lời quiz:
${answersText}

Trả lời gồm:
1. Tên nghề nghiệp dự đoán (ngắn gọn, sáng tạo)
2. 2-3 câu giải thích vì sao hợp với vibe/tính cách này
3. Một câu mô tả hình ảnh minh hoạ mang tính biểu tượng (symbolic) cho nghề này, dùng để tạo ảnh AI - không mô tả khuôn mặt người, chỉ mô tả biểu tượng/bối cảnh/màu sắc (theo tông màu thương hiệu: amber/gold và cyan trên nền tối).`;
}