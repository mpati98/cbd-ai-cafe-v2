/**
 * Type thuần cho user đã đăng nhập — KHÔNG import gì từ prisma/bcrypt/server.
 * An toàn để dùng ở Client Component (LoginForm, AdminShell, UsersPanel...).
 * `src/lib/auth.ts` (server-only) import type này từ đây thay vì định nghĩa
 * riêng, để chỉ có 1 nguồn sự thật — xem lý do tách file ở format.ts.
 */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
  permissions: string[];
};

export function userHasPermission(user: SessionUser, key: string): boolean {
  return user.role === "ADMIN" || user.permissions.includes(key);
}
