import { NextRequest } from "next/server";
import { ApiError, ok, requirePermission, requireDb, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/menu-items/:id/set-best-seller — bỏ cờ best-seller ở các món khác
// và gán cho món này, trong 1 transaction (tránh có lúc 2 món cùng là best-seller
// do 2 request PATCH riêng lẻ chen nhau). Yêu cầu đăng nhập + đúng quyền.
export const POST = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "menu");
  const { id } = await params;
  const db = requireDb();

  const target = await db.menuItem.findUnique({ where: { id } });
  if (!target) throw new ApiError(404, "Không tìm thấy món này.");

  const [, updated] = await db.$transaction([
    db.menuItem.updateMany({ where: { isBestSeller: true, NOT: { id } }, data: { isBestSeller: false } }),
    db.menuItem.update({ where: { id }, data: { isBestSeller: true } }),
  ]);

  return ok(updated);
});
