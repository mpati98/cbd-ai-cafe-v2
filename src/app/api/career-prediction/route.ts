import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { generateIllustration } from "@/lib/huggingface";
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

interface CareerPrediction {
  careerName: string;
  explanation: string;
  imagePrompt: string;
}

function parseDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], base64: match[2] };
}

function extractJson(text: string): unknown {
  // Phòng trường hợp model bọc JSON trong ```json ... ``` dù đã dặn không làm vậy
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
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

    if (base64.length > 14_000_000) {
      return NextResponse.json({ error: "Ảnh quá lớn." }, { status: 400 });
    }

    // ---- Bước 1: Claude Haiku vision đọc "vibe" từ ảnh ----
    // Ảnh chỉ được gửi trong request này, không ghi ra disk/DB ở đâu cả.
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
            { type: "text", text: buildVibeReadingPrompt(quizAnswers) },
          ],
        },
      ],
    });

    const vibeText = vibeResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // ---- Bước 2: Dự đoán nghề nghiệp - bắt model trả JSON để dễ hiển thị + lấy prompt tạo ảnh ----
    const predictionResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [
        { role: "user", content: buildCareerPredictionPrompt(vibeText, quizAnswers) },
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

    // ---- Bước 3: Tạo ảnh minh hoạ biểu tượng bằng Flux Schnell ----
    const imageUrl = await generateIllustration(prediction.imagePrompt);

    // Ảnh gốc (base64, mediaType) không được tham chiếu gì thêm sau điểm này.

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

// --- Prompt helpers (thay bằng import từ lib/career-prediction-prompts.ts nếu đã có) ---

function buildVibeReadingPrompt(quizAnswers: QuizAnswers): string {
  const answersText = Object.entries(quizAnswers)
    .map(([q, a]) => `- ${q}: ${a}`)
    .join("\n");

  return `Bạn là một AI "đọc vibe" vui nhộn tại CBD AI Cafe, Đà Lạt. Nhìn vào ảnh và mô tả năng lượng/phong cách/vibe tổng thể của người trong ảnh một cách tích cực, sáng tạo (2-3 câu, tiếng Việt, không dùng markdown). Không mô tả chi tiết đặc điểm khuôn mặt, chỉ tập trung vào "vibe".

Kết hợp với câu trả lời quiz tính cách sau:
${answersText}`;
}

function buildCareerPredictionPrompt(
  vibeText: string,
  quizAnswers: QuizAnswers
): string {
  const answersText = Object.entries(quizAnswers)
    .map(([q, a]) => `- ${q}: ${a}`)
    .join("\n");

  return `Dựa trên vibe reading và câu trả lời quiz dưới đây, đưa ra MỘT dự đoán nghề nghiệp vui, sáng tạo, mang tính giải trí cho khách tại CBD AI Cafe.

Vibe reading:
${vibeText}

Câu trả lời quiz:
${answersText}

CHỈ trả lời bằng JSON hợp lệ, không thêm chữ nào khác, không markdown, không dấu \`\`\`, đúng format sau:
{
  "careerName": "Tên nghề nghiệp dự đoán, ngắn gọn sáng tạo, tiếng Việt",
  "explanation": "2-3 câu giải thích vì sao hợp với vibe/tính cách này, tiếng Việt, văn xuôi thường không markdown",
  "imagePrompt": "Mô tả bằng tiếng Anh cho một ảnh minh hoạ mang tính biểu tượng (symbolic) cho nghề này - mô tả biểu tượng/bối cảnh/vật thể, KHÔNG mô tả khuôn mặt hay hình dáng người"
}`;
}