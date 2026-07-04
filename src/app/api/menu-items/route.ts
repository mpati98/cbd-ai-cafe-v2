import { NextRequest } from "next/server";
import { created, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { menuItemCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// GET /api/menu-items — list all menu items, ordered by `order`.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "menu");
  const db = requireDb();
  const items = await db.menuItem.findMany({ orderBy: { order: "asc" } });
  return ok(items);
});

// POST /api/menu-items — create a menu item. Yêu cầu đăng nhập + đúng quyền.
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "menu");
  const data = await parseBody(req, menuItemCreateSchema);
  const db = requireDb();
  const item = await db.menuItem.create({ data });
  return created(item);
});
