import { NextRequest } from "next/server";
import { ApiError, noContent, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { menuItemUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/menu-items/:id
export const GET = withErrorHandling(async (_req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const db = requireDb();
  const item = await db.menuItem.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, "Không tìm thấy món này.");
  return ok(item);
});

// PATCH /api/menu-items/:id — partial update. Yêu cầu đăng nhập + đúng quyền.
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "menu");
  const { id } = await params;
  const data = await parseBody(req, menuItemUpdateSchema);
  const db = requireDb();
  const item = await db.menuItem.update({ where: { id }, data });
  return ok(item);
});

// DELETE /api/menu-items/:id — Yêu cầu đăng nhập + đúng quyền.
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "menu");
  const { id } = await params;
  const db = requireDb();
  await db.menuItem.delete({ where: { id } });
  return noContent();
});
