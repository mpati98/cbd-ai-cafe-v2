import { NextRequest } from "next/server";
import { ApiError, ok, withErrorHandling } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/me — thông tin user đang đăng nhập (theo cookie phiên).
export const GET = withErrorHandling(async (req: NextRequest) => {
  const user = await getSessionUser(req);
  if (!user) throw new ApiError(401, "Chưa đăng nhập.");
  return ok(user);
});
