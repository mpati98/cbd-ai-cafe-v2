import { NextRequest } from "next/server";
import { created, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { roadmapItemCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// GET /api/roadmap-items — list all roadmap milestones, ordered by `order`.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "roadmap");
  const db = requireDb();
  const items = await db.roadmapItem.findMany({ orderBy: { order: "asc" } });
  return ok(items);
});

// POST /api/roadmap-items — create a milestone. Yêu cầu đăng nhập + đúng quyền.
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "roadmap");
  const data = await parseBody(req, roadmapItemCreateSchema);
  const db = requireDb();
  const item = await db.roadmapItem.create({ data });
  return created(item);
});
