import { NextRequest } from "next/server";
import { ApiError, ok, requireDb, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

// GET /api/tables/by-code/:code — công khai (khách quét QR gọi tới đây qua
// trang /order/t/:code để hiện tên bàn). Chỉ trả về label, không lộ id/thời
// gian tạo hay các bàn khác.
export const GET = withErrorHandling(async (_req: NextRequest, { params }: Params) => {
  const { code } = await params;
  const db = requireDb();

  const table = await db.table.findUnique({ where: { code }, select: { label: true, isActive: true } });
  if (!table || !table.isActive) {
    throw new ApiError(404, "Không tìm thấy bàn này (mã QR có thể đã cũ hoặc bàn đã ngừng hoạt động).");
  }
  return ok({ label: table.label });
});
