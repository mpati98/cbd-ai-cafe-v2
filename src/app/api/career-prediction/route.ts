import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { generateCheckinPhoto } from "@/lib/huggingface";
import type { QAPair } from "@/app/api/quiz-chat/route";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RequestBody {
  /** data URL dạng "data:image/jpeg;base64,...." lấy từ PhotoCapture, chỉ dùng trong request này rồi bỏ */
  photoDataUrl: string;
  /** Lịch sử hỏi-đáp tính cách từ QuizChat (5-7 câu) */
  quizHistory: QAPair[];
}

interface CareerPrediction {
  careerName: string;
  explanation: string;
  /** Mô tả cảnh chỉnh sửa ảnh: giữ người trong ảnh gốc + thêm bối cảnh nghề nghiệp + vibe Đà Lạt */
  checkinPrompt: string;
}

function parseDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], base64: match[2] };
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const { photoDataUrl, quizHistory } = body;

    if (!photoDataUrl || !quizHistory || quizHistory.length === 0) {
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

    if (base64.length > 14_000_000) {
      return NextResponse.json({ error: "Ảnh quá lớn." }, { status: 400 });
    }

    // ---- Bước 1: Claude Haiku vision đọc "vibe" từ ảnh ----
    console.log("[career-prediction] bước 1: gọi Claude vibe reading...");
    const vibeResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
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
            { type: "text", text: buildVibeReadingPrompt(quizHistory) },
          ],
        },
      ],
    });

    const vibeText = vibeResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    console.log("[career-prediction] bước 1 xong, vibe:", vibeText.slice(0, 80));

    // ---- Bước 2: Dự đoán nghề nghiệp + mô tả cảnh check-in (career + Đà Lạt) ----
    console.log("[career-prediction] bước 2: gọi Claude career prediction...");
    const predictionResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      messages: [
        { role: "user", content: buildCareerPredictionPrompt(vibeText, quizHistory) },
      ],
    });

    const predictionRaw = predictionResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    let prediction: CareerPrediction;
    try {
      prediction = extractJson(predictionRaw) as CareerPrediction;
    } catch {
      console.error("Không parse được JSON từ career prediction:", predictionRaw);
      return NextResponse.json(
        { error: "Không tạo được dự đoán, vui lòng thử lại." },
        { status: 502 }
      );
    }
    console.log("[career-prediction] bước 2 xong, career:", prediction.careerName);

    // ---- Bước 3: Tạo ảnh check-in (image-to-image, giữ nét ảnh gốc) ----
    console.log("[career-prediction] bước 3: gọi Hugging Face tạo ảnh check-in...");
    const imageUrl = await withTimeout(
      generateCheckinPhoto({ mediaType, base64 }, prediction.checkinPrompt),
      45_000,
      "Hugging Face tạo ảnh quá lâu (>45s)"
    );
    console.log("[career-prediction] bước 3 xong, ảnh dài (base64 chars):", imageUrl.length);

    return NextResponse.json({
      vibe: vibeText,
      careerName: prediction.careerName,
      explanation: prediction.explanation,
      imageUrl,
    });
  } catch (err) {
    console.error("career-prediction error:", err);
    return NextResponse.json(
      { error: "Có lỗi xảy ra, vui lòng thử lại." },
      { status: 500 }
    );
  }
}

// --- Prompt helpers ---

function formatHistory(quizHistory: QAPair[]): string {
  return quizHistory
    .map((qa, i) => `${i + 1}. ${qa.question} → ${qa.answer}`)
    .join("\n");
}

function buildVibeReadingPrompt(quizHistory: QAPair[]): string {
  return `Bạn là một AI "đọc vibe" vui nhộn tại CBD AI Cafe, Đà Lạt. Nhìn vào ảnh và mô tả năng lượng/phong cách/vibe tổng thể của người trong ảnh một cách tích cực, sáng tạo (2-3 câu, tiếng Việt, không dùng markdown). Không mô tả chi tiết đặc điểm khuôn mặt, chỉ tập trung vào "vibe".

Kết hợp với câu trả lời quiz tính cách sau:
${formatHistory(quizHistory)}`;
}

function buildCareerPredictionPrompt(vibeText: string, quizHistory: QAPair[]): string {
  return `Dựa trên vibe reading và câu trả lời quiz dưới đây, đưa ra MỘT dự đoán nghề nghiệp vui, sáng tạo, mang tính giải trí cho khách tại CBD AI Cafe, Đà Lạt.

Vibe reading:
${vibeText}

Câu trả lời quiz tính cách:
${formatHistory(quizHistory)}

CHỈ trả lời bằng JSON hợp lệ, không thêm chữ nào khác, không markdown, không dấu \`\`\`, đúng format sau:
{
  "careerName": "Tên nghề nghiệp dự đoán, ngắn gọn sáng tạo, tiếng Việt",
  "explanation": "2-3 câu giải thích vì sao hợp với vibe/tính cách này, tiếng Việt, văn xuôi thường không markdown",
  "checkinPrompt": "Mô tả bằng tiếng Anh cho việc CHỈNH SỬA ảnh gốc thành một tấm ảnh check-in nghệ thuật. YÊU CẦU BẮT BUỘC: giữ nguyên gương mặt và đặc điểm nhận diện của người trong ảnh gốc, chỉ thay đổi/thêm bối cảnh xung quanh. Bối cảnh phải kết hợp: (1) yếu tố tượng trưng cho nghề nghiệp vừa dự đoán, và (2) không khí đặc trưng Đà Lạt (thông reo, sương mù nhẹ, ánh nắng vàng ấm buổi sáng, hoa dã quỳ vàng, đồi núi mờ sương, mái ngói đỏ). Phong cách ảnh: chân thực nhưng có chút mơ mộng (dreamy), tông màu ấm."
}`;
}