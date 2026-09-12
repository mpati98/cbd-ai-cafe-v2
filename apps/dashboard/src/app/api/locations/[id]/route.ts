import { NextRequest } from "next/server";
import { ApiError, noContent, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { locationUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

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

// PATCH /api/locations/:id — sửa nội dung VÀ/HOẶC duyệt/từ chối (field
// `status`) trong cùng 1 endpoint. STAFF chỉ được sửa location của đúng quán
// mình — kiểm tra bằng cách đọc location trước rồi so storeId.
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, "locations");
  const { id } = await params;
  const body = await parseBody(req, locationUpdateSchema);
  const db = requireDb();

  const existing = await db.location.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Không tìm thấy địa điểm này.");
  if (user.role === "STAFF" && existing.storeId !== user.storeId) {
    throw new ApiError(403, "Bạn không có quyền sửa địa điểm của quán khác.");
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.category !== undefined) data.category = body.category;
  if (body.bestTimeToVisit !== undefined) data.bestTimeToVisit = body.bestTimeToVisit;
  if (body.relatedLocationIds !== undefined) data.relatedLocationIds = body.relatedLocationIds;
  if (body.status !== undefined) {
    data.status = body.status;
    data.reviewedById = user.id;
  }

  const location = await db.location.update({ where: { id }, data, select: LOCATION_SELECT });
  return ok(location);
});

// DELETE /api/locations/:id — STAFF chỉ xoá được location của đúng quán mình.
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, "locations");
  const { id } = await params;
  const db = requireDb();

  const existing = await db.location.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Không tìm thấy địa điểm này.");
  if (user.role === "STAFF" && existing.storeId !== user.storeId) {
    throw new ApiError(403, "Bạn không có quyền xoá địa điểm của quán khác.");
  }

  await db.location.delete({ where: { id } });
  return noContent();
});
