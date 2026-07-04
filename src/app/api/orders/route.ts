import { NextRequest } from "next/server";
import { ApiError, created, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { orderCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// GET /api/orders — danh sách đơn hàng (mới nhất trước). Yêu cầu đăng nhập + đúng quyền.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "orders");
  const db = requireDb();
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return ok(orders);
});

// POST /api/orders — khách đặt món từ trang /order. KHÔNG cần đăng nhập (khách
// hàng không có key) — giá & tên món luôn lấy lại từ DB tại server, không tin
// dữ liệu giá do client gửi lên, tránh khách tự sửa giá qua devtools.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await parseBody(req, orderCreateSchema);
  const db = requireDb();

  const menuItemIds = [...new Set(body.items.map((i) => i.menuItemId))];
  const menuItems = await db.menuItem.findMany({ where: { id: { in: menuItemIds } } });
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

  // Tra bàn từ mã QR ở server — không tin tên bàn nếu client tự gửi lên.
  // Mã không hợp lệ/bàn đã tắt thì âm thầm bỏ qua (vẫn cho đặt món bình
  // thường) chứ không chặn khách chỉ vì lỗi này.
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

  return created(order);
});
