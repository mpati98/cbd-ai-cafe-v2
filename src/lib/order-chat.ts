/**
 * lib/order-chat.ts
 * -----------------------------------------------------------------------
 * "Bộ não" mới của order-chatbot — thay cho cây quyết định cứng nhắc cũ
 * (src/lib/chatbot.ts), giờ để Claude dẫn dắt hội thoại tự nhiên bằng tiếng
 * Việt. Claude được cấp toàn bộ thực đơn hiện có trong system prompt (chỉ
 * được nhắc/gợi ý đúng các món này) và 2 tool để tương tác với UI:
 *   - highlight_item: làm nổi bật 1 món trên thực đơn hiển thị
 *   - add_to_cart: thêm món vào giỏ hàng của khách
 * Vì giỏ hàng/hiển thị là state phía client (xem OrderExperience.tsx), tool
 * ở đây không thực sự "chạy" gì server-side — chỉ ghi nhận thành 1 "effect"
 * trả về cho client áp dụng, tương tự pendingEffect của cơ chế cũ.
 *
 * Câu hỏi chung về quán (giờ mở cửa, văn hoá, CBD Robotics...) được trả lời
 * bằng cách nhét thêm ngữ cảnh từ KnowledgeTopic (đã trích xuất từ PDF admin
 * upload, xem lib/knowledge-scoring.ts) vào system prompt theo câu hỏi hiện
 * tại của khách.
 * -----------------------------------------------------------------------
 */

import Anthropic from "@anthropic-ai/sdk";
import { getMenuItems } from "@/lib/content";
import { tagLabel } from "@/lib/tags";
import { formatVnd } from "@/lib/format";
import { buildKnowledgeContextBlock, recordTopicUsage, selectTopicsForQuery } from "@/lib/knowledge-scoring";
import type { OrderChatEffect, OrderChatTurn } from "@/types/order-chat";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Sonnet 5 — cân bằng giữa hội thoại tự nhiên/gọi tool chính xác và chi phí,
// vì đây là hot-path gọi ở MỖI tin nhắn của khách. Effort "low" để phản hồi
// nhanh cho 1 chat widget thời gian thực (bài toán khá đơn giản: chọn món
// trong 1 thực đơn nhỏ, không cần suy luận sâu).
const MODEL = "claude-sonnet-5";
const MAX_TOOL_ITERATIONS = 4;
const MAX_HISTORY_TURNS = 16;
const MAX_MESSAGE_CHARS = 1000;

type MenuItemForChat = {
  id: string;
  name: string;
  description: string;
  priceVnd: number;
  isBestSeller: boolean;
  tags: string[];
};

function buildMenuBlock(items: MenuItemForChat[]): string {
  if (!items.length) {
    return "### THỰC ĐƠN HIỆN CÓ:\n(Thực đơn hiện đang trống, báo khách quay lại sau.)";
  }
  const lines = items.map((item) => {
    const traits = item.tags.map(tagLabel).join(", ");
    return (
      `- id="${item.id}" | **${item.name}** | ${formatVnd(item.priceVnd)}` +
      `${item.isBestSeller ? " | Best-seller" : ""}` +
      `${traits ? ` | Đặc điểm: ${traits}` : ""}` +
      ` | Mô tả: ${item.description}`
    );
  });
  return ["### THỰC ĐƠN HIỆN CÓ (chỉ được nhắc/gợi ý đúng các món trong danh sách này):", ...lines].join("\n");
}

function buildSystemPrompt(menuBlock: string, tableLabel: string | null | undefined): string {
  return `
Bạn là "CBD Robot" — trợ lý AI tư vấn đặt món tại quầy order của CBD AI Cafe, một quán cà phê ở Đà Lạt.

PHONG CÁCH:
- Trò chuyện tự nhiên, thân thiện, xưng "mình", gọi khách là "bạn", luôn trả lời bằng tiếng Việt.
- Ngắn gọn (1-3 câu mỗi lượt), không lặp lại nguyên văn câu hỏi của khách.
- Khi nhắc tên món, in đậm bằng **Tên món**.
- Dùng emoji vừa phải, không lạm dụng.
${tableLabel ? `- Khách đang ngồi tại bàn "${tableLabel}".` : ""}

QUY TẮC QUAN TRỌNG:
- CHỈ được nhắc tới, gợi ý hoặc báo giá các món có trong THỰC ĐƠN bên dưới — tuyệt đối không bịa món hoặc giá không có trong danh sách.
- Nếu khách mô tả mơ hồ (vd "cho mình món gì đó ngọt ngọt"), có thể hỏi lại 1 câu ngắn để làm rõ, hoặc gợi ý luôn nếu đã đủ thông tin — đừng hỏi quá nhiều câu liên tiếp.
- Khi gợi ý/giới thiệu cụ thể 1 món cho khách xem, LUÔN gọi tool "highlight_item" với đúng id của món đó.
- CHỈ gọi tool "add_to_cart" khi khách đã xác nhận rõ ràng muốn đặt món (vd "ok lấy món đó", "thêm vào giỏ giúp mình", "cho mình 2 ly đi"). Không tự ý thêm khi khách chỉ đang hỏi hoặc còn phân vân.
- Nếu khách hỏi về quán (giờ mở cửa, địa điểm, wifi, câu chuyện thương hiệu, CBD Robotics...), dùng phần "THÔNG TIN VỀ QUÁN" bên dưới nếu có; nếu không có thông tin phù hợp, thành thật nói chưa rõ và đề nghị hỏi nhân viên tại quầy — đừng đoán bừa.
- Không bàn về chủ đề ngoài việc đặt món/tư vấn thực đơn/thông tin quán.

${menuBlock}
`.trim();
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "highlight_item",
    description:
      "Làm nổi bật 1 món trong thực đơn đang hiển thị cho khách xem trên màn hình. Gọi tool này bất cứ khi nào bạn gợi ý hoặc giới thiệu cụ thể 1 món trong câu trả lời.",
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "id của món, lấy đúng từ danh sách thực đơn được cung cấp" },
      },
      required: ["item_id"],
    },
  },
  {
    name: "add_to_cart",
    description:
      'Thêm 1 món vào giỏ hàng của khách. CHỈ gọi khi khách đã xác nhận rõ ràng muốn đặt món này (không gọi khi khách mới chỉ hỏi thông tin).',
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "id của món, lấy đúng từ danh sách thực đơn được cung cấp" },
        quantity: { type: "integer", minimum: 1, maximum: 20, description: "số lượng khách muốn đặt, mặc định 1" },
      },
      required: ["item_id"],
    },
  },
];

/** Giới hạn số lượt lịch sử + độ dài mỗi lượt gửi lên Claude, tránh phình chi phí. */
function clampHistory(history: OrderChatTurn[]): OrderChatTurn[] {
  const trimmed = history
    .filter((t) => t.text.trim().length > 0)
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_MESSAGE_CHARS) }));
  // Lượt đầu tiên gửi lên API bắt buộc phải là "user" — bỏ các lượt "assistant"
  // mồ côi ở đầu mảng (không nên xảy ra trong luồng bình thường, phòng hờ).
  const firstUserIndex = trimmed.findIndex((t) => t.role === "user");
  return firstUserIndex === -1 ? [] : trimmed.slice(firstUserIndex);
}

/** Lấy ngữ cảnh kiến thức liên quan tới câu hỏi hiện tại (nếu có), best-effort. */
async function fetchKnowledgeBlock(message: string): Promise<string> {
  try {
    const topics = await selectTopicsForQuery(message, 4);
    if (!topics.length) return "";
    // Ghi nhận lượt hỏi để tính lại tier hot/longtail sau — chạy nền, không
    // chặn phản hồi cho khách; lỗi ghi nhận thì bỏ qua, không ảnh hưởng chat.
    void Promise.all(topics.map((t) => recordTopicUsage(t.id))).catch(() => {});
    return buildKnowledgeContextBlock(topics);
  } catch (err) {
    // DB chưa cấu hình hoặc lỗi truy vấn — chat vẫn hoạt động bình thường,
    // chỉ là không trả lời được câu hỏi cần kiến thức nền.
    console.warn("[order-chat] Không lấy được knowledge context:", err instanceof Error ? err.message : err);
    return "";
  }
}

function executeToolCall(
  block: Anthropic.ToolUseBlock,
  itemsById: Map<string, MenuItemForChat>,
  effects: OrderChatEffect[]
): { content: string; isError: boolean } {
  const input = (block.input ?? {}) as Record<string, unknown>;
  const itemId = typeof input.item_id === "string" ? input.item_id : "";
  const item = itemsById.get(itemId);

  if (!item) {
    return { content: `Không tìm thấy món với id "${itemId}" trong thực đơn hiện có.`, isError: true };
  }

  if (block.name === "highlight_item") {
    effects.push({ type: "highlight", itemId: item.id });
    return { content: `Đã hiển thị "${item.name}" (${formatVnd(item.priceVnd)}) cho khách xem trên thực đơn.`, isError: false };
  }

  if (block.name === "add_to_cart") {
    const rawQty = typeof input.quantity === "number" ? input.quantity : 1;
    const quantity = Math.min(20, Math.max(1, Math.round(rawQty) || 1));
    effects.push({ type: "add_to_cart", itemId: item.id, quantity });
    return { content: `Đã thêm ${quantity} "${item.name}" vào giỏ hàng của khách.`, isError: false };
  }

  return { content: `Tool "${block.name}" không tồn tại.`, isError: true };
}

export async function runOrderChat(input: {
  history: OrderChatTurn[];
  message: string;
  tableLabel?: string | null;
}): Promise<{ reply: string; effects: OrderChatEffect[] }> {
  const message = input.message.trim().slice(0, MAX_MESSAGE_CHARS);
  if (!message) {
    return { reply: "Bạn muốn nói gì với mình nhỉ? 😊", effects: [] };
  }

  const [rawItems, knowledgeBlock] = await Promise.all([getMenuItems(), fetchKnowledgeBlock(message)]);
  const items: MenuItemForChat[] = rawItems.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    priceVnd: i.priceVnd,
    isBestSeller: i.isBestSeller,
    tags: i.tags,
  }));
  const itemsById = new Map(items.map((i) => [i.id, i]));

  // Tách phần ổn định (đánh dấu cache_control) khỏi phần thay đổi theo từng
  // câu hỏi (knowledge context) — xem shared/prompt-caching.md "shared
  // prefix, varying suffix": giữ nguyên tiền tố ổn định giúp cache có ích
  // khi khách nhắn nhiều lượt liên tiếp trong cùng phiên order.
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: buildSystemPrompt(buildMenuBlock(items), input.tableLabel),
      cache_control: { type: "ephemeral" },
    },
  ];
  if (knowledgeBlock) {
    system.push({ type: "text", text: knowledgeBlock });
  }

  const messages: Anthropic.MessageParam[] = [
    ...clampHistory(input.history).map((t) => ({ role: t.role, content: t.text }) as Anthropic.MessageParam),
    { role: "user", content: message },
  ];

  const effects: OrderChatEffect[] = [];
  const createParams = { model: MODEL, max_tokens: 1024, system, tools: TOOLS, output_config: { effort: "low" as const } };

  let response = await anthropic.messages.create({ ...createParams, messages });

  let iterations = 0;
  while (response.stop_reason === "tool_use" && iterations < MAX_TOOL_ITERATIONS) {
    iterations += 1;
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((block) => {
        const { content, isError } = executeToolCall(block, itemsById, effects);
        return { type: "tool_result", tool_use_id: block.id, content, is_error: isError };
      });
    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({ ...createParams, messages });
  }

  const reply =
    response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n\n")
      .trim() || "Xin lỗi, mình chưa rõ ý bạn, bạn nói lại giúp mình nhé? 🙏";

  return { reply, effects };
}
