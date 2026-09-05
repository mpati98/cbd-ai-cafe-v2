import { NextRequest } from "next/server";
import { ApiError, created, ok, parseBody, requireDb, withErrorHandling } from "@/lib/api";
import { orderCreateSchema } from "@/lib/schemas";
import { topUpFromOrder } from "@/lib/table-session";
import { enqueueOrderSync } from "@/lib/sync";
import type { OrderSyncDTO } from "@cbd/shared-types";

export const dynamic = "force-dynamic";

// GET /api/orders — danh sách đơn tại quán này (dùng bởi /ops/orders).
export const GET = withErrorHandling(async () => {
  const db = requireDb();
  const orders = await db.order.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } });
  return ok(orders);
});

// POST /api/orders — khách đặt món từ trang /order. Không cần đăng nhập (thiết
// bị LAN tại quán) — giá/tên món luôn lấy lại từ MenuItemCache tại server,
// không tin dữ liệu client gửi lên.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await parseBody(req, orderCreateSchema);
  const db = requireDb();

  const menuItemIds = [...new Set(body.items.map((i) => i.menuItemId))];
  const menuItems = await db.menuItemCache.findMany({ where: { id: { in: menuItemIds } } });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const missing = menuItemIds.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new ApiError(400, "Một số món trong giỏ hàng không còn tồn tại.", { missing });
  }

  let totalVnd = 0;
  const itemsData = body.items.map((line) => {
    const menuItem = byId.get(line.menuItemId)!;
    totalVnd += menuItem.priceVnd * line.quantity;
    return {
      menuItemId: menuItem.id,
      nameSnapshot: menuItem.name,
      priceVndSnapshot: menuItem.priceVnd,
      quantity: line.quantity,
    };
  });

  let tableId: string | null = null;
  let tableLabel: string | null = null;
  if (body.tableCode) {
    const table = await db.table.findUnique({ where: { code: body.tableCode } });
    if (table && table.isActive) {
      tableId = table.id;
      tableLabel = table.label;
    }
  }

  const order = await db.order.create({
    data: {
      customerName: body.customerName || null,
      customerNote: body.customerNote || null,
      totalVnd,
      tableId,
      tableLabel,
      items: { create: itemsData },
    },
    include: { items: true },
  });

  if (tableId) {
    void topUpFromOrder(tableId, totalVnd).catch((err) => {
      console.warn("[/api/orders] Không top-up được quota:", err instanceof Error ? err.message : err);
    });
  }

  const syncDto: OrderSyncDTO = {
    localId: order.id,
    customerName: order.customerName,
    customerNote: order.customerNote,
    adminNote: order.adminNote,
    totalVnd: order.totalVnd,
    isReceived: order.isReceived,
    isPreparing: order.isPreparing,
    isPaid: order.isPaid,
    isDelivered: order.isDelivered,
    isCancelled: order.isCancelled,
    tableLocalId: order.tableId,
    tableLabel: order.tableLabel,
    items: order.items.map((it) => ({
      localId: it.id,
      menuItemId: it.menuItemId,
      nameSnapshot: it.nameSnapshot,
      priceVndSnapshot: it.priceVndSnapshot,
      quantity: it.quantity,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
  void enqueueOrderSync(syncDto).catch((err) => {
    console.warn("[/api/orders] Không enqueue được sync:", err instanceof Error ? err.message : err);
  });

  return created(order);
});
