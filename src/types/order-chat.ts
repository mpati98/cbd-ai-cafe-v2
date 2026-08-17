/**
 * Kiểu dữ liệu dùng chung giữa client (ChatPanel) và server (API route +
 * lib/order-chat.ts) cho tính năng chat đặt món bằng Claude. Tách riêng file
 * types-only (không import Anthropic SDK/Prisma) để client component có thể
 * import an toàn mà không kéo theo code server vào bundle trình duyệt.
 */
export type OrderChatRole = "user" | "assistant";

export type OrderChatTurn = { role: OrderChatRole; text: string };

export type OrderChatEffect =
  | { type: "highlight"; itemId: string }
  | { type: "add_to_cart"; itemId: string; quantity: number };

export type OrderChatRequestBody = {
  history: OrderChatTurn[];
  message: string;
  tableLabel?: string | null;
};

export type OrderChatResponseBody = {
  reply: string;
  effects: OrderChatEffect[];
};
