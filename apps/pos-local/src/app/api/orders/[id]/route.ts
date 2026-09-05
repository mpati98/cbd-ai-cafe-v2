import { NextRequest } from "next/server";
import { ApiError, noContent, ok, parseBody, requireDb, withErrorHandling } from "@/lib/api";
import { orderUpdateSchema } from "@/lib/schemas";
import { enqueueOrderSync } from "@/lib/sync";
import type { OrderSyncDTO } from "@cbd/shared-types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(async (_req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const db = requireDb();
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new ApiError(404, "Không tìm thấy đơn hàng này.");
  return ok(order);
});

// PATCH /api/orders/:id — nhân viên đổi 4 mốc xử lý/huỷ/ghi chú tại quầy
// (dùng bởi /ops/orders). Mỗi lần đổi cũng enqueue lại để đồng bộ lên dashboard.
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(req, orderUpdateSchema);
  const db = requireDb();
  const order = await db.order.update({ where: { id }, data, include: { items: true } });

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
  void enqueueOrderSync(syncDto).catch(() => {});

  return ok(order);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const db = requireDb();
  await db.order.delete({ where: { id } });
  return noContent();
});
