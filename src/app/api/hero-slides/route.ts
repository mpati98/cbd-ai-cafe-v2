import { NextRequest } from "next/server";
import { created, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { heroSlideCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// GET /api/hero-slides — list all slides, ordered by `order`.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "hero");
  const db = requireDb();
  const items = await db.heroSlide.findMany({ orderBy: { order: "asc" } });
  return ok(items);
});

// POST /api/hero-slides — create a slide. Yêu cầu đăng nhập + đúng quyền.
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "hero");
  const data = await parseBody(req, heroSlideCreateSchema);
  const db = requireDb();
  const item = await db.heroSlide.create({ data });
  return created(item);
});
