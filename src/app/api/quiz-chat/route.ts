import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface QAPair {
  question: string;
  answer: string;
}

interface RequestBody {
  history: QAPair[];
}

interface NextQuestion {
  question: string;
  options: string[];
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

const SYSTEM_PROMPT = `Bạn là một AI dẫn chuyện thân thiện tại CBD AI Cafe, Đà Lạt. Nhiệm vụ: đặt câu hỏi trắc nghiệm ngắn để khám phá tính cách khách, phục vụ cho việc dự đoán nghề nghiệp mang tính giải trí.

Quy tắc bắt buộc:
- Câu hỏi phải phù hợp với MỌI lứa tuổi (từ trẻ em đến người lớn tuổi), không dùng từ ngữ chuyên môn, không nhạy cảm, không liên quan chính trị/tôn giáo/tài chính cá nhân.
- Mỗi câu hỏi khai thác MỘT khía cạnh tính cách khác với các câu hỏi trước đó (ví dụ: cách xử lý vấn đề, sở thích hoạt động, cách giao tiếp, môi trường yêu thích, giá trị sống, cách ra quyết định, năng lượng xã hội...). Không lặp lại chủ đề đã hỏi.
- Câu hỏi ngắn gọn, tự nhiên, giọng văn vui vẻ như đang trò chuyện tại quán cà phê, không máy móc.
- Đưa ra đúng 4 lựa chọn trả lời, mỗi lựa chọn ngắn (dưới 8 từ), khác biệt rõ ràng nhau, dễ hiểu.
- CHỈ trả lời JSON hợp lệ, không thêm chữ nào khác, không markdown, không dấu \`\`\`, đúng format:
{
  "question": "Nội dung câu hỏi",
  "options": ["Lựa chọn 1", "Lựa chọn 2", "Lựa chọn 3", "Lựa chọn 4"]
}`;

export async function POST(req: NextRequest) {
  try {
    const { history } = (await req.json()) as RequestBody;

    const historyText =
      history && history.length > 0
        ? history
            .map((qa, i) => `Câu ${i + 1}: ${qa.question}\nTrả lời: ${qa.answer}`)
            .join("\n\n")
        : "(Chưa có câu hỏi nào, đây là câu đầu tiên - mở đầu nhẹ nhàng, dễ trả lời.)";

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Lịch sử hỏi đáp cho tới giờ:\n\n${historyText}\n\nHãy đặt câu hỏi tiếp theo (khác chủ đề với các câu trên).`,
        },
      ],
    });

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    let next: NextQuestion;
    try {
      next = extractJson(raw) as NextQuestion;
    } catch {
      console.error("quiz-chat: không parse được JSON:", raw);
      return NextResponse.json(
        { error: "Không tạo được câu hỏi, vui lòng thử lại." },
        { status: 502 }
      );
    }

    return NextResponse.json(next);
  } catch (err) {
    console.error("quiz-chat error:", err);
    return NextResponse.json(
      { error: "Có lỗi xảy ra, vui lòng thử lại." },
      { status: 500 }
    );
  }
}