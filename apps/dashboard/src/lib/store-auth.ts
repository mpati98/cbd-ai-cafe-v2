import { createHash, randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { ApiError, requireDb } from "@/lib/api";

/**
 * Xác thực các cuộc gọi /api/sync/* từ apps/pos-local. Mỗi quán có 1 API key
 * ngẫu nhiên cấp lúc provision (xem POST /api/stores) — chỉ hiển thị 1 lần
 * lúc tạo, sau đó chỉ lưu bản băm SHA-256 (đủ để chống lộ nếu DB bị rò rỉ; key
 * đã ngẫu nhiên 256-bit nên không cần bcrypt chậm — cần tra cứu bằng equality
 * trực tiếp qua index, bcrypt không cho phép việc này).
 */
export function hashStoreApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateStoreApiKey(): string {
  return randomBytes(32).toString("hex");
}

export async function requireStore(req: NextRequest) {
  const db = requireDb();
  const authHeader = req.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "Thiếu Bearer token của quán (Store.apiKey).");
  }

  const store = await db.store.findFirst({ where: { apiKeyHash: hashStoreApiKey(token) } });
  if (!store || !store.isActive) {
    throw new ApiError(401, "API key không hợp lệ hoặc quán đã bị vô hiệu hoá.");
  }
  return store;
}
