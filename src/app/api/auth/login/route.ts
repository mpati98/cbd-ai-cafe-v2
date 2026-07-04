import { NextRequest, NextResponse } from "next/server";
import { ApiError, parseBody, requireDb, withErrorHandling } from "@/lib/api";
import { createSession, SESSION_COOKIE_NAME, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// POST /api/auth/login — { email, password } → set cookie phiên đăng nhập.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const { email, password } = await parseBody(req, loginSchema);
  const db = requireDb();

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  // Thông báo chung chung (không nói rõ email hay mật khẩu sai) — tránh lộ
  // thông tin email nào đã tồn tại trong hệ thống cho kẻ dò quét.
  const invalid = () => new ApiError(401, "Email hoặc mật khẩu không đúng.");
  if (!user) throw invalid();

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw invalid();

  const { token, expiresAt } = await createSession(user.id);

  const res = NextResponse.json({
    ok: true,
    data: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions },
  });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return res;
});
