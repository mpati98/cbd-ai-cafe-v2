/**
 * lib/order-quiz.ts
 * -----------------------------------------------------------------------
 * "Chưa biết uống gì? Để CBD Robot gợi ý" — 1 luồng hội thoại RIÊNG với
 * order-chat.ts (đặt món tự do), tách biệt vì:
 *   - Khách bấm vào MỚI tham gia (không ép mọi đơn phải qua quiz)
 *   - Trả lời có CẤU TRÚC (JSON: message/suggestedChips/isComplete/
 *     recommendations) thay vì text tự do + tool add_to_cart/highlight
 *   - KHÔNG lưu xuống DB — lịch sử chỉ tồn tại trong state phía client,
 *     mất khi đóng quiz/tải lại trang (tránh giữ dữ liệu cá nhân không cần)
 *
 * Cấu trúc trả lời ép buộc bằng cách bắt Claude LUÔN gọi 1 tool duy nhất
 * ("respond") với input_schema đúng hình dạng mong muốn (tool_choice ép
 * gọi tool này) — đáng tin cậy hơn nhiều so với yêu cầu Claude tự in ra
 * JSON dạng text rồi JSON.parse (dễ lỗi format/markdown code fence).
 *
 * Menu context gửi kèm là danh sách RÚT GỌN (không mô tả dài) cho toàn bộ
 * thực đơn — 28 món hiện tại vẫn nhỏ nên không cần lọc theo category như
 * đề xuất ban đầu (tối ưu hoá sớm cho quy mô chưa gặp phải); nếu menu lớn
 * hơn nhiều trong tương lai, đây là chỗ nên thêm lọc.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getMenuItems } from "@/lib/menu-cache";
import { tagLabel, formatVnd } from "@cbd/shared-types";
import { assertTokenQuota, deductTokens, getOrCreateTableSession } from "@/lib/table-session";
import type { QuizRecommendation, QuizResponseBody, QuizTurn } from "@/types/order-quiz";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const MAX_HISTORY_TURNS = 12;
const MAX_MESSAGE_CHARS = 500;

type MenuItemForQuiz = {
  id: string;
  name: string;
  priceVnd: number;
  isBestSeller: boolean;
  tags: string[];
};

function buildMenuBlock(items: MenuItemForQuiz[]): string {
  if (!items.length) return "### THỰC ĐƠN HIỆN CÓ:\n(Thực đơn hiện đang trống.)";
  const lines = items.map((item) => {
    const traits = item.tags.map(tagLabel).join(", ");
    return `- id="${item.id}" | **${item.name}** | ${formatVnd(item.priceVnd)}${item.isBestSeller ? " | Best-seller" : ""}${traits ? ` | ${traits}` : ""}`;
  });
  return ["### THỰC ĐƠN HIỆN CÓ (chỉ được gợi ý đúng các món trong danh sách này):", ...lines].join("\n");
}

function buildSystemPrompt(menuBlock: string): string {
  return `
Bạn là "CBD Robot" — đang dẫn 1 mini-quiz giúp khách ở CBD AI Cafe (Đà Lạt) tìm ra đồ uống hợp gu, khi khách chưa biết chọn gì.

PHONG CÁCH:
- Xưng "mình", gọi khách là "bạn", trả lời bằng tiếng Việt.
- Mỗi câu hỏi/lời dẫn NGẮN GỌN (1-2 câu) — vừa 1 bong bóng chat trên điện thoại, không ẩn dụ dài dòng.
- Có thể điểm chút chất Đà Lạt (sương mù, se lạnh, thông, nhịp sống chậm) nhưng súc tích, không lan man.
- TUYỆT ĐỐI KHÔNG dùng emoji/icon — câu trả lời có thể được đọc to qua TTS, emoji đọc lên nghe không tự nhiên.

QUY TẮC QUIZ:
- Hỏi TỐI THIỂU 3, TỐI ĐA 5 câu (đếm số lượt "assistant" đã có trong lịch sử hội thoại) trước khi chốt gợi ý — đừng hỏi ít hơn 3 câu, và bắt buộc chốt (isComplete=true) ở câu hỏi thứ 5 nếu chưa chốt trước đó.
- Mỗi lượt hỏi, luôn kèm 0-4 "suggestedChips" là gợi ý trả lời ngắn cho câu hỏi VỪA đặt ra — khách có thể bấm hoặc gõ tự do, đừng coi đây là lựa chọn bắt buộc.
- Câu hỏi nên xoay quanh: đậm/nhẹ, nóng/lạnh, ngọt/thanh, trái cây/truyền thống, tâm trạng hiện tại... để chọn đúng món.
- Khi isComplete=true: "message" là 1 câu dẫn ngắn (vd tóm tắt gu khách vừa chia sẻ), và "recommendations" liệt kê 2-4 món PHÙ HỢP NHẤT (chỉ lấy id có trong thực đơn bên dưới), sắp xếp match_score giảm dần, mỗi món kèm 1 câu "reason" ngắn giải thích vì sao hợp — không emoji.
- CHỈ được gợi ý các món có trong THỰC ĐƠN bên dưới — tuyệt đối không bịa món hoặc giá không có trong danh sách.
- Khi isComplete=false, để "recommendations" là mảng rỗng.

${menuBlock}
`.trim();
}

const RESPOND_TOOL: Anthropic.Tool = {
  name: "respond",
  description: "Trả lời khách trong quiz gợi ý đồ uống. LUÔN gọi tool này cho mọi lượt — không trả lời bằng text tự do.",
  input_schema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Câu hỏi tiếp theo (nếu isComplete=false) hoặc lời dẫn ngắn khi chốt gợi ý (nếu isComplete=true). Không emoji.",
      },
      suggestedChips: {
        type: "array",
        items: { type: "string" },
        description: "0-4 gợi ý trả lời ngắn cho câu hỏi vừa đặt ra. Không emoji.",
      },
      isComplete: {
        type: "boolean",
        description: "true khi đã hỏi đủ (tối thiểu 3, tối đa 5 câu) và sẵn sàng đưa recommendations.",
      },
      recommendations: {
        type: "array",
        description: "CHỈ điền khi isComplete=true — 2-4 món phù hợp nhất, match_score giảm dần.",
        items: {
          type: "object",
          properties: {
            item_id: { type: "string", description: "id món, lấy đúng từ danh sách thực đơn được cung cấp" },
            match_score: { type: "number", description: "0-1, điểm phù hợp với sở thích khách vừa mô tả" },
            reason: { type: "string", description: "1 câu ngắn giải thích vì sao hợp. Không emoji." },
          },
          required: ["item_id", "match_score", "reason"],
        },
      },
    },
    required: ["message", "suggestedChips", "isComplete"],
  },
};

function clampHistory(history: QuizTurn[]): QuizTurn[] {
  const trimmed = history
    .filter((t) => t.text.trim().length > 0)
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_MESSAGE_CHARS) }));
  const firstUserIndex = trimmed.findIndex((t) => t.role === "user");
  return firstUserIndex === -1 ? [] : trimmed.slice(firstUserIndex);
}

export async function runOrderQuiz(input: { history: QuizTurn[]; message: string; tableCode?: string | null }): Promise<QuizResponseBody> {
  const message = input.message.trim().slice(0, MAX_MESSAGE_CHARS);
  if (!message) {
    return { message: "Bạn chia sẻ chút gu uống của mình để mình gợi ý nhé?", suggestedChips: [], isComplete: false, recommendations: [] };
  }

  const session = input.tableCode ? await getOrCreateTableSession(input.tableCode) : null;
  if (session) assertTokenQuota(session);

  const rawItems = await getMenuItems();
  const items: MenuItemForQuiz[] = rawItems.map((i) => ({
    id: i.id,
    name: i.name,
    priceVnd: i.priceVnd,
    isBestSeller: i.isBestSeller,
    tags: i.tags,
  }));
  const itemsById = new Map(items.map((i) => [i.id, i]));

  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: buildSystemPrompt(buildMenuBlock(items)), cache_control: { type: "ephemeral" } },
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

  if (session) {
    const totalTokens = response.usage.input_tokens + response.usage.output_tokens;
    void deductTokens(session.id, totalTokens).catch((err) => {
      console.warn("[order-quiz] Không trừ được quota token:", err instanceof Error ? err.message : err);
    });
  }

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "respond");
  const raw = (toolUse?.input ?? {}) as {
    message?: unknown;
    suggestedChips?: unknown;
    isComplete?: unknown;
    recommendations?: unknown;
  };

  const reply = typeof raw.message === "string" && raw.message.trim() ? raw.message.trim() : "Bạn chia sẻ thêm chút nữa giúp mình nhé?";
  const suggestedChips = Array.isArray(raw.suggestedChips) ? raw.suggestedChips.filter((c): c is string => typeof c === "string").slice(0, 4) : [];
  const isComplete = raw.isComplete === true;

  const rawRecs = Array.isArray(raw.recommendations) ? raw.recommendations : [];
  const recommendations: QuizRecommendation[] = rawRecs
    .map((r) => (typeof r === "object" && r !== null ? (r as Record<string, unknown>) : null))
    .filter((r): r is Record<string, unknown> => r !== null)
    .map((r) => {
      const itemId = typeof r.item_id === "string" ? r.item_id : "";
      const item = itemsById.get(itemId);
      if (!item) return null;
      const scoreRaw = typeof r.match_score === "number" ? r.match_score : 0;
      return {
        itemId: item.id,
        name: item.name,
        matchScore: Math.max(0, Math.min(1, scoreRaw)),
        reason: typeof r.reason === "string" ? r.reason.trim() : "",
      } satisfies QuizRecommendation;
    })
    .filter((r): r is QuizRecommendation => r !== null)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 4);

  return { message: reply, suggestedChips, isComplete, recommendations };
}
