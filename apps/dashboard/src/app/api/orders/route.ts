import { NextRequest } from "next/server";
import { ok, requirePermission, requireDb, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/orders — báo cáo đơn ĐÃ ĐỒNG BỘ từ mọi quán (chỉ xem). Đơn được
// tạo và đổi trạng thái tại apps/pos-local — xem POST /api/sync/push cho
// đường ghi duy nhất vào model Order ở cloud.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "orders");
  const db = requireDb();
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, store: { select: { name: true } } },
  });
  return ok(
    orders.map(({ store, ...o }) => ({ ...o, storeName: store.name }))
  );
});
