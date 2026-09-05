import { NextRequest } from "next/server";
import { ok, requirePermission, requireDb, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/tables — báo cáo bàn ĐÃ ĐỒNG BỘ từ mọi quán (chỉ xem). Bàn được
// tạo/quản lý tại apps/pos-local — xem POST /api/sync/push cho đường ghi
// duy nhất vào model Table ở cloud.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "tables");
  const db = requireDb();
  const tables = await db.table.findMany({
    orderBy: { createdAt: "asc" },
    include: { store: { select: { name: true } } },
  });
  return ok(tables.map(({ store, ...t }) => ({ ...t, storeName: store.name })));
});
