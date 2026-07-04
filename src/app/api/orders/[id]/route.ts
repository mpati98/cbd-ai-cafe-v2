import { NextRequest } from "next/server";
import { ApiError, noContent, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { orderUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/orders/:id — Yêu cầu đăng nhập + đúng quyền.
export const GET = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "orders");
  const { id } = await params;
  const db = requireDb();
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new ApiError(404, "Không tìm thấy đơn hàng này.");
  return ok(order);
});

// PATCH /api/orders/:id — cập nhật 4 mốc xử lý (nhận đơn/pha chế/thanh toán/giao
// món). Yêu cầu đăng nhập + đúng quyền.
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "orders");
  const { id } = await params;
  const data = await parseBody(req, orderUpdateSchema);
  const db = requireDb();
  const order = await db.order.update({ where: { id }, data, include: { items: true } });
  return ok(order);
});

// DELETE /api/orders/:id — huỷ/xoá đơn. Yêu cầu đăng nhập + đúng quyền.
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "orders");
  const { id } = await params;
  const db = requireDb();
  await db.order.delete({ where: { id } });
  return noContent();
});
