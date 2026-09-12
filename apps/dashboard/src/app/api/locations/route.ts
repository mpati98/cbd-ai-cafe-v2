import { NextRequest } from "next/server";
import { ApiError, created, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { locationCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const LOCATION_SELECT = {
  id: true,
  storeId: true,
  name: true,
  description: true,
  category: true,
  bestTimeToVisit: true,
  relatedLocationIds: true,
  status: true,
  createdById: true,
  createdBy: { select: { name: true } },
  reviewedById: true,
  reviewedBy: { select: { name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

// GET /api/locations?storeId=xxx — danh sách địa điểm của 1 quán. STAFF bị
// ép storeId = quán của chính họ (bỏ qua query param nếu khác) — chỉ ADMIN
// (hoặc STAFF không gán quán) mới chọn tự do qua query param.
export const GET = withErrorHandling(async (req: NextRequest) => {
  const user = await requirePermission(req, "locations");
  const db = requireDb();

  const requestedStoreId = req.nextUrl.searchParams.get("storeId");
  const storeId = user.role === "STAFF" && user.storeId ? user.storeId : requestedStoreId;

  if (!storeId) {
    throw new ApiError(400, "Thiếu storeId — chọn 1 quán để xem địa điểm.");
  }
  if (user.role === "STAFF" && !user.storeId) {
    throw new ApiError(403, "Tài khoản của bạn chưa được gán quán nào — liên hệ ADMIN.");
  }

  const locations = await db.location.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    select: LOCATION_SELECT,
  });
  return ok(locations);
});

// POST /api/locations — thêm địa điểm mới (status mặc định PENDING, chờ duyệt).
// STAFF bị ép tạo cho đúng quán của chính họ, không được chỉ định storeId khác.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requirePermission(req, "locations");
  const body = await parseBody(req, locationCreateSchema);
  const db = requireDb();

  if (user.role === "STAFF") {
    if (!user.storeId) {
      throw new ApiError(403, "Tài khoản của bạn chưa được gán quán nào — liên hệ ADMIN.");
    }
    if (body.storeId !== user.storeId) {
      throw new ApiError(403, "Bạn chỉ có thể thêm địa điểm cho quán của mình.");
    }
  }

  const location = await db.location.create({
    data: {
      storeId: body.storeId,
      name: body.name,
      description: body.description,
      category: body.category,
      bestTimeToVisit: body.bestTimeToVisit ?? null,
      relatedLocationIds: body.relatedLocationIds,
      createdById: user.id,
    },
    select: LOCATION_SELECT,
  });
  return created(location);
});
