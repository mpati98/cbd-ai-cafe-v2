import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-types";
import { userHasPermission } from "@/lib/auth-types";

export type { SessionUser };
export { userHasPermission };

export const SESSION_COOKIE_NAME = "cbd_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

const BCRYPT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/** Tạo phiên đăng nhập mới cho user, trả về token để set vào cookie httpOnly. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  if (!prisma) throw new Error("Database not configured");
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

/** Xoá phiên (đăng xuất) — không throw nếu token không tồn tại (đã hết hạn/bị xoá trước đó). */
export async function deleteSession(token: string): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.session.delete({ where: { token } });
  } catch {
    // đã bị xoá từ trước, bỏ qua
  }
}

/**
 * Đọc cookie phiên từ request, tra cứu session còn hạn + user tương ứng.
 * Trả về null nếu chưa đăng nhập / phiên hết hạn / DB chưa cấu hình.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  if (!prisma) return null;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // phiên hết hạn — dọn luôn cho gọn, không cần chờ job riêng
    await deleteSession(token);
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "ADMIN" | "STAFF",
    permissions: user.permissions,
  };
}

