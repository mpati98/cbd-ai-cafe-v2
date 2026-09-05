import { NextRequest } from "next/server";
import { ApiError, noContent, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { heroSlideUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/hero-slides/:id
export const GET = withErrorHandling(async (_req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const db = requireDb();
  const item = await db.heroSlide.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, "Không tìm thấy slide này.");
  return ok(item);
});

// PATCH /api/hero-slides/:id — Yêu cầu đăng nhập + đúng quyền.
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "hero");
  const { id } = await params;
  const data = await parseBody(req, heroSlideUpdateSchema);
  const db = requireDb();
  const item = await db.heroSlide.update({ where: { id }, data });
  return ok(item);
});

// DELETE /api/hero-slides/:id — Yêu cầu đăng nhập + đúng quyền.
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "hero");
  const { id } = await params;
  const db = requireDb();
  await db.heroSlide.delete({ where: { id } });
  return noContent();
});
