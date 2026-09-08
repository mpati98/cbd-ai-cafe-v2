import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/health — liveness check dùng bởi Docker healthcheck (xem
// apps/pos-local/Dockerfile) và scripts/check-lan-https.sh. Cố tình không
// đụng DB/prisma ở đây — chỉ cần xác nhận Next.js server đang phục vụ request.
export const GET = async () => {
  return NextResponse.json({ status: "ok" });
};
