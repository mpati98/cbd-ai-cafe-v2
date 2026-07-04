import { NextRequest } from "next/server";
import { ApiError, noContent, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { roadmapItemUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/roadmap-items/:id
export const GET = withErrorHandling(async (_req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const db = requireDb();
  const item = await db.roadmapItem.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, "Không tìm thấy mốc roadmap này.");
  return ok(item);
});

// PATCH /api/roadmap-items/:id — Yêu cầu đăng nhập + đúng quyền.
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "roadmap");
  const { id } = await params;
  const data = await parseBody(req, roadmapItemUpdateSchema);
  const db = requireDb();
  const item = await db.roadmapItem.update({ where: { id }, data });
  return ok(item);
});

// DELETE /api/roadmap-items/:id — Yêu cầu đăng nhập + đúng quyền.
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "roadmap");
  const { id } = await params;
  const db = requireDb();
  await db.roadmapItem.delete({ where: { id } });
  return noContent();
});
