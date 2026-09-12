import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api";

// Đăng nhập nhân viên CHỈ để bảo vệ /ops/print-photos (ảnh khuôn mặt khách,
// nhạy cảm hơn đơn hàng/bàn - những trang đó vẫn mở tự do như thiết kế gốc,
// xem lib/api.ts). 1 mật khẩu chung (PRINT_PHOTOS_PASSWORD), không có bảng
// User/tài khoản riêng — không cần thiết cho quy mô 1 quán, 1 thiết bị dùng
// chung tại quầy.
//
// Session KHÔNG lưu server-side (không cần bảng DB): cookie tự chứa
// `${expiresAtMs}.${hmac}` — hmac ký bằng chính PRINT_PHOTOS_PASSWORD làm khoá,
// xác minh lại bằng cách tính lại HMAC, không cần tra cứu gì thêm (stateless).

export const SESSION_COOKIE = "pp_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 tiếng (~1 ca làm việc)

function getSecret(): string | null {
  const secret = process.env.PRINT_PHOTOS_PASSWORD;
  return secret && secret.length > 0 ? secret : null;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createSessionToken(): string {
  const secret = getSecret();
  if (!secret) throw new ApiError(503, "Chưa cấu hình PRINT_PHOTOS_PASSWORD.");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return `${expiresAt}.${sign(String(expiresAt), secret)}`;
}

export function verifyPassword(candidate: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  return safeEqual(candidate, secret);
}

function verifyToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;
  const expiresAtRaw = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(expiresAtRaw, secret);
  return safeEqual(sig, expected);
}

/** Dùng trong Server Component (page.tsx) để redirect nếu chưa đăng nhập. */
export async function isOpsAuthed(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}

/** Dùng trong route không qua withErrorHandling (vd trả ảnh nhị phân trực tiếp). */
export function hasValidOpsSession(req: NextRequest): boolean {
  return verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
}

/** Dùng trong API route (bọc bởi withErrorHandling) — ném 401 nếu chưa đăng nhập. */
export function requireOpsAuth(req: NextRequest): void {
  if (!hasValidOpsSession(req)) {
    throw new ApiError(401, "Chưa đăng nhập.");
  }
}
