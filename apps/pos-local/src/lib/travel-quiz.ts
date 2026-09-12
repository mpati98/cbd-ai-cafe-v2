/**
 * lib/travel-quiz.ts
 * -----------------------------------------------------------------------
 * "Vi vu Đà Lạt" — hội thoại 3-5 câu gợi ý lịch trình khám phá Đà Lạt, nhân
 * bản CHÍNH XÁC kiến trúc order-quiz.ts (xem file đó cho lý do thiết kế):
 *   - Structured output ép bằng tool_choice (KHÔNG JSON-text) — đáng tin cậy hơn.
 *   - KHÔNG lưu DB — lịch sử chỉ tồn tại trong state phía client.
 *
 * KHÁC order-quiz.ts ở 1 điểm quan trọng: order-quiz cố tình KHÔNG lọc menu
 * theo category (menu nhỏ). Ở đây danh sách Location CÓ THỂ dài hơn, nên lọc
 * ngay theo category dựa trên CÂU TRẢ LỜI ĐẦU TIÊN của khách — câu hỏi mở màn
 * (OPENING, hardcode phía client như DrinkQuiz) hỏi thẳng về sở thích, nên
 * câu trả lời đầu tiên trong `history` (hoặc `message` nếu đây là lượt đầu)
 * chính là tín hiệu category — xem selectLocationsByCategory().
 */

import Anthropic from "@anthropic-ai/sdk";
import { selectLocationsByCategory, type CachedLocation, buildLocationContextBlock } from "@/lib/location-cache";
import type { TravelQuizResponseBody, TravelQuizTurn, TravelRecommendation, TravelPeriod } from "@/types/travel-quiz";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const MAX_HISTORY_TURNS = 12;
const MAX_MESSAGE_CHARS = 500;
const PERIODS: TravelPeriod[] = ["sáng", "chiều", "tối"];

function buildSystemPrompt(locationBlock: string): string {
  return `
Bạn là "CBD Robot" — đang trò chuyện với khách tại CBD AI Cafe (Đà Lạt) để gợi ý lịch trình khám phá Đà Lạt phù hợp.

PHONG CÁCH:
- Xưng "mình", gọi khách là "bạn", trả lời bằng tiếng Việt.
- Mỗi câu hỏi/lời dẫn NGẮN GỌN (1-2 câu) — vừa 1 bong bóng chat trên điện thoại, không ẩn dụ dài dòng.
- Có thể điểm chút chất Đà Lạt (sương mù, se lạnh, thông, nhịp sống chậm) nhưng súc tích, không lan man.
- TUYỆT ĐỐI KHÔNG dùng emoji/icon — câu trả lời có thể được đọc to qua TTS, emoji đọc lên nghe không tự nhiên.

QUY TẮC HỎI:
- Khách vừa trả lời câu hỏi mở màn về SỞ THÍCH (thiên nhiên/check-in/ẩm thực/yên tĩnh) — không hỏi lại câu này.
- Hỏi thêm TỐI THIỂU 2, TỐI ĐA 4 câu nữa (đếm số lượt "assistant" đã có trong lịch sử hội thoại) trước khi chốt lịch trình — bắt buộc chốt (isComplete=true) khi đã đủ 5 câu hỏi tính cả câu mở màn nếu chưa chốt trước đó.
- Các câu hỏi tiếp theo nên xoay quanh: đi mấy ngày, đi cùng ai (một mình/cặp đôi/gia đình/nhóm bạn), khung giờ rảnh trong ngày, tốc độ di chuyển mong muốn (thong thả hay tham quan nhiều nơi).
- Mỗi lượt hỏi, luôn kèm 0-4 "suggestedChips" là gợi ý trả lời ngắn cho câu hỏi VỪA đặt ra. Không emoji.
- Khi isComplete=true: "message" là 1 câu dẫn ngắn tóm tắt lịch trình vừa gợi ý, và "itinerary" liệt kê các địa điểm PHÙ HỢP NHẤT (chỉ lấy id có trong DANH SÁCH bên dưới) — mỗi địa điểm gán đúng 1 "period" (sáng/chiều/tối) hợp lý (ưu tiên theo "Nên ghé" nếu địa điểm có ghi), kèm 1 câu "reason" ngắn giải thích vì sao hợp. Có thể xen 1 gợi ý ghé lại CBD AI Cafe như 1 điểm dừng chân tự nhiên (vd nghỉ trưa, cà phê buổi chiều) nếu hợp lý với lịch trình — KHÔNG bắt buộc, chỉ khi thấy tự nhiên.
- CHỈ được gợi ý các địa điểm có trong DANH SÁCH bên dưới — tuyệt đối không bịa địa điểm không có trong danh sách.
- Khi isComplete=false, để "itinerary" là mảng rỗng.

${locationBlock}
`.trim();
}

const RESPOND_TOOL: Anthropic.Tool = {
  name: "respond",
  description: "Trả lời khách trong hội thoại gợi ý lịch trình Đà Lạt. LUÔN gọi tool này cho mọi lượt — không trả lời bằng text tự do.",
  input_schema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Câu hỏi tiếp theo (nếu isComplete=false) hoặc lời dẫn ngắn tóm tắt lịch trình (nếu isComplete=true). Không emoji.",
      },
      suggestedChips: {
        type: "array",
        items: { type: "string" },
        description: "0-4 gợi ý trả lời ngắn cho câu hỏi vừa đặt ra. Không emoji.",
      },
      isComplete: {
        type: "boolean",
        description: "true khi đã hỏi đủ và sẵn sàng đưa itinerary.",
      },
      itinerary: {
        type: "array",
        description: "CHỈ điền khi isComplete=true — các địa điểm phù hợp nhất, mỗi cái gán đúng 1 buổi trong ngày.",
        items: {
          type: "object",
          properties: {
            location_id: { type: "string", description: "id địa điểm, lấy đúng từ danh sách được cung cấp" },
            period: { type: "string", enum: PERIODS, description: "Buổi nên ghé: sáng, chiều, hoặc tối." },
            reason: { type: "string", description: "1 câu ngắn giải thích vì sao hợp. Không emoji." },
          },
          required: ["location_id", "period", "reason"],
        },
      },
    },
    required: ["message", "suggestedChips", "isComplete"],
  },
};

function clampHistory(history: TravelQuizTurn[]): TravelQuizTurn[] {
  const trimmed = history
    .filter((t) => t.text.trim().length > 0)
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_MESSAGE_CHARS) }));
  const firstUserIndex = trimmed.findIndex((t) => t.role === "user");
  return firstUserIndex === -1 ? [] : trimmed.slice(firstUserIndex);
}

export async function runTravelQuiz(input: { history: TravelQuizTurn[]; message: string }): Promise<TravelQuizResponseBody> {
  const message = input.message.trim().slice(0, MAX_MESSAGE_CHARS);
  if (!message) {
    return { message: "Bạn chia sẻ bạn thích khám phá Đà Lạt theo hướng nào để mình gợi ý nhé?", suggestedChips: [], isComplete: false, itinerary: [] };
  }

  // Câu trả lời ĐẦU TIÊN (opening hỏi về sở thích) quyết định category để lọc
  // — nếu đây là lượt đầu (history rỗng) thì `message` chính là câu đó.
  const firstAnswer = input.history.find((t) => t.role === "user")?.text ?? message;

  const locations = await selectLocationsByCategory(firstAnswer, 12);
  const locationsById = new Map(locations.map((l): [string, CachedLocation] => [l.id, l]));

  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: buildSystemPrompt(buildLocationContextBlock(locations)), cache_control: { type: "ephemeral" } },
  ];

  const messages: Anthropic.MessageParam[] = [
    ...clampHistory(input.history).map((t) => ({ role: t.role, content: t.text }) as Anthropic.MessageParam),
    { role: "user", content: message },
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    tools: [RESPOND_TOOL],
    tool_choice: { type: "tool", name: "respond" },
    output_config: { effort: "low" },
    messages,
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "respond");
  const raw = (toolUse?.input ?? {}) as {
    message?: unknown;
    suggestedChips?: unknown;
    isComplete?: unknown;
    itinerary?: unknown;
  };

  const reply = typeof raw.message === "string" && raw.message.trim() ? raw.message.trim() : "Bạn chia sẻ thêm chút nữa giúp mình nhé?";
  const suggestedChips = Array.isArray(raw.suggestedChips) ? raw.suggestedChips.filter((c): c is string => typeof c === "string").slice(0, 4) : [];
  const isComplete = raw.isComplete === true;

  const rawItinerary = Array.isArray(raw.itinerary) ? raw.itinerary : [];
  const itinerary: TravelRecommendation[] = rawItinerary
    .map((r) => (typeof r === "object" && r !== null ? (r as Record<string, unknown>) : null))
    .filter((r): r is Record<string, unknown> => r !== null)
    .map((r) => {
      const locationId = typeof r.location_id === "string" ? r.location_id : "";
      const location = locationsById.get(locationId);
      if (!location) return null;
      const period = PERIODS.includes(r.period as TravelPeriod) ? (r.period as TravelPeriod) : "sáng";
      return {
        locationId: location.id,
        name: location.name,
        period,
        reason: typeof r.reason === "string" ? r.reason.trim() : "",
      } satisfies TravelRecommendation;
    })
    .filter((r): r is TravelRecommendation => r !== null)
    .slice(0, 8);

  return { message: reply, suggestedChips, isComplete, itinerary };
}
