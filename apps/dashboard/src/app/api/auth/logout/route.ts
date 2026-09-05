import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api";
import { deleteSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/logout — xoá phiên hiện tại + clear cookie.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) await deleteSession(token);

  const res = NextResponse.json({ ok: true, data: null });
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", expires: new Date(0) });
  return res;
});
