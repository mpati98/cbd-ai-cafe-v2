import { NextRequest } from "next/server";
import { ok, requirePermission, requireDb, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/stats — số đơn, doanh thu, món bán chạy nhất. Yêu cầu đăng nhập + đúng quyền.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "orders");
  const db = requireDb();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalOrders, ordersToday, completedOrders, cancelledOrders, revenueAgg, topRaw] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: startOfToday } } }),
    db.order.count({
      where: { isReceived: true, isPreparing: true, isPaid: true, isDelivered: true, isCancelled: false },
    }),
    db.order.count({ where: { isCancelled: true } }),
    // Đơn đã huỷ không tính vào doanh thu dù đã từng đánh dấu thanh toán.
    db.order.aggregate({ where: { isPaid: true, isCancelled: false }, _sum: { totalVnd: true } }),
    db.orderItem.groupBy({
      by: ["menuItemId", "nameSnapshot"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const topItems = topRaw.map((row) => ({
    menuItemId: row.menuItemId,
    name: row.nameSnapshot,
    quantitySold: row._sum.quantity ?? 0,
  }));

  return ok({
    totalOrders,
    ordersToday,
    completedOrders,
    cancelledOrders,
    inProgressOrders: totalOrders - completedOrders - cancelledOrders,
    totalRevenueVnd: revenueAgg._sum.totalVnd ?? 0,
    topItems,
  });
});
