/**
 * lib/table-session.ts
 * -----------------------------------------------------------------------
 * Giới hạn tài nguyên AI (token chat + lượt giọng nói) theo TỪNG BÀN, không
 * đếm số lần gọi API — 1 khách hỏi 1 câu ngắn không nên tốn quota như 1 câu
 * dài, và request thất bại/bị chặn rate-limit không nên trừ quota.
 *
 * "Phiên" (session) = 1 lượt ngồi quán của 1 bàn, khớp với khái niệm
 * `active_session:{tableId}` trong bản spec gốc (dùng Redis) — ở đây dùng
 * thẳng Postgres/Prisma vì dự án không có Redis và khối lượng request (vài
 * chục lượt/bàn/lượt ngồi) không cần tốc độ Redis mới xử lý kịp.
 *
 * KHÔNG áp dụng khi khách đặt món không qua bàn cụ thể (vd mang về, quét
 * link chung /order không có QR bàn) — những request đó chỉ chịu rate-limit
 * chung sẵn có (xem lib/rate-limit.ts), không có quota theo bàn vì không có
 * gì để scope theo.
 *
 * Phạm vi tính năng ĐANG SỐNG hiện tại: order-chat + drink-quiz (token qua
 * Claude) và voice STT/TTS (đếm lượt qua Gemini) — career-prediction/tạo ảnh
 * chưa tính vào đây vì tính năng đó đang là code mẫu chưa nối vào sản phẩm
 * thật (xem lần dọn dẹp trước).
 */
import { requireDb } from "@/lib/api";
// requireDb() ở đây trả về local Prisma client (SQLite) — cùng field name với
// bản cloud cũ nên toàn bộ query bên dưới giữ nguyên logic không đổi.

// Mặc định cấp cho 1 phiên mới, và trần tuyệt đối không được top-up vượt qua
// (dù order bao nhiêu) — số theo đề xuất trong spec gốc, có thể chỉnh sau
// nếu thấy hụt/dư khi vận hành thật.
const BASE_TOKENS_LIMIT = 5_000;
const BASE_VOICE_TURNS_LIMIT = 3;
const MAX_TOKENS_LIMIT = 30_000;
const MAX_VOICE_TURNS_LIMIT = 15;

// 2 giờ không hoạt động thì phiên tự hết hạn — khớp 1 lượt ngồi quán uống
// nước/order thông thường, gia hạn lại mỗi khi có tương tác AI mới.
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

// Top-up khi order được xác nhận: tính theo TỔNG GIÁ TRỊ đơn (server-trusted,
// xem api/orders/route.ts) thay vì map cứng theo từng món — tự áp dụng cho
// mọi món hiện có/thêm sau này mà không cần bảo trì danh sách riêng.
const TOKENS_PER_1000_VND = 100; // 1 ly ~35-50k -> +3.500-5.000 token, gần gấp đôi base
const VND_PER_BONUS_VOICE_TURN = 20_000; // +1 lượt giọng nói mỗi 20.000đ chi tiêu

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

type TableSessionRow = {
  id: string;
  tableId: string;
  aiTokensUsed: number;
  aiTokensLimit: number;
  voiceTurnsUsed: number;
  voiceTurnsLimit: number;
  expiresAt: Date;
};

/**
 * Lấy phiên đang active của 1 bàn (theo `code` QR), tạo mới nếu chưa có/đã
 * hết hạn, và gia hạn `expiresAt` nếu đã có (bất kể request có dùng quota
 * hay không — bàn còn tương tác nghĩa là còn phục vụ). Trả về `null` nếu mã
 * bàn không hợp lệ/đã tắt (âm thầm bỏ qua quota, không chặn khách).
 */
export async function getOrCreateTableSession(tableCode: string): Promise<TableSessionRow | null> {
  const db = requireDb();
  const table = await db.table.findUnique({ where: { code: tableCode } });
  if (!table || !table.isActive) return null;

  const now = new Date();
  const existing = await db.tableSession.findFirst({
    where: { tableId: table.id, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });

  const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
  if (existing) {
    return db.tableSession.update({ where: { id: existing.id }, data: { expiresAt: newExpiresAt } });
  }

  return db.tableSession.create({
    data: {
      tableId: table.id,
      aiTokensLimit: BASE_TOKENS_LIMIT,
      voiceTurnsLimit: BASE_VOICE_TURNS_LIMIT,
      expiresAt: newExpiresAt,
    },
  });
}

/** Thông báo thân thiện khi hết quota — không emoji (có thể hiện như tin nhắn bot/đọc TTS). */
const OUT_OF_TOKENS_MESSAGE =
  "Mình đã dùng hết lượt trò chuyện AI cho phiên này. Gọi thêm 1 món là bàn sẽ có thêm lượt để mình tư vấn tiếp nhé.";
const OUT_OF_VOICE_MESSAGE =
  "Mình đã dùng hết lượt giọng nói cho phiên này. Gọi thêm 1 món là bàn sẽ có thêm lượt để dùng giọng nói tiếp nhé.";

/** Ném QuotaExceededError nếu phiên đã hết token — gọi TRƯỚC khi tốn compute gọi model. */
export function assertTokenQuota(session: TableSessionRow): void {
  if (session.aiTokensUsed >= session.aiTokensLimit) {
    throw new QuotaExceededError(OUT_OF_TOKENS_MESSAGE);
  }
}

/** Trừ token THẬT sau khi có response (usage từ Claude/Gemini) — không trừ trước khi biết chắc đã dùng bao nhiêu. */
export async function deductTokens(sessionId: string, actualTokens: number): Promise<void> {
  if (actualTokens <= 0) return;
  const db = requireDb();
  await db.tableSession.update({ where: { id: sessionId }, data: { aiTokensUsed: { increment: actualTokens } } });
}

/**
 * Giữ chỗ + trừ ngay 1 lượt giọng nói (STT hoặc TTS) — không tách "reserve"
 * và "deduct" như token, vì mỗi lượt voice là 1 hành động rời rạc chi phí
 * gần cố định (không có khái niệm "ước lượng trước, trừ đúng sau" như token).
 */
export async function reserveVoiceTurn(session: TableSessionRow): Promise<void> {
  if (session.voiceTurnsUsed >= session.voiceTurnsLimit) {
    throw new QuotaExceededError(OUT_OF_VOICE_MESSAGE);
  }
  const db = requireDb();
  await db.tableSession.update({ where: { id: session.id }, data: { voiceTurnsUsed: { increment: 1 } } });
}

/**
 * Top-up quota khi 1 đơn được tạo thành công cho 1 bàn (xem api/orders/route.ts)
 * — chỉ áp dụng nếu bàn đang có phiên active; không tự tạo phiên mới (đặt món
 * không có nghĩa là đang "chat" — phiên chỉ nên tạo khi thật sự cần tương tác AI).
 */
export async function topUpFromOrder(tableId: string, totalVnd: number): Promise<void> {
  const db = requireDb();
  const now = new Date();
  const session = await db.tableSession.findFirst({
    where: { tableId, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (!session) return;

  const bonusTokens = Math.floor(totalVnd / 1000) * TOKENS_PER_1000_VND;
  const bonusVoiceTurns = Math.floor(totalVnd / VND_PER_BONUS_VOICE_TURN);
  if (bonusTokens <= 0 && bonusVoiceTurns <= 0) return;

  await db.tableSession.update({
    where: { id: session.id },
    data: {
      aiTokensLimit: Math.min(session.aiTokensLimit + bonusTokens, MAX_TOKENS_LIMIT),
      voiceTurnsLimit: Math.min(session.voiceTurnsLimit + bonusVoiceTurns, MAX_VOICE_TURNS_LIMIT),
    },
  });
}
