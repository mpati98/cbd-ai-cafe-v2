import { NextRequest, NextResponse } from "next/server";
import { ApiError, noContent, ok, parseBody, withErrorHandling } from "@/lib/api";
import { opsLoginSchema } from "@/lib/schemas";
import { createSessionToken, SESSION_COOKIE, verifyPassword } from "@/lib/ops-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ops/print-photos-auth — nhân viên đăng nhập bằng mật khẩu chung
// (PRINT_PHOTOS_PASSWORD) để vào /ops/print-photos.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const { password } = await parseBody(req, opsLoginSchema);

  if (!verifyPassword(password)) {
    throw new ApiError(401, "Sai mật khẩu.");
  }

  const res = ok({ authenticated: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return res;
});

// DELETE /api/ops/print-photos-auth — đăng xuất.
export const DELETE = withErrorHandling(async () => {
  const res = noContent() as NextResponse;
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
});
